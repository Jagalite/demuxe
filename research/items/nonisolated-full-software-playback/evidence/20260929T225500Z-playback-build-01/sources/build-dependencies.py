#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Build a private, non-pthread restricted mpv dependency closure."""
import argparse,datetime,hashlib,json,os,pathlib,shutil,subprocess,tarfile
from provenance import link_inputs

REPO=pathlib.Path(__file__).resolve().parents[4]
EXP=REPO/'experiments/jspi-asyncify'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main(a):
    out=a.out.resolve();sdk=a.sdk.resolve();cache=a.downloads.resolve()
    if out.exists() or out==REPO or REPO in out.parents:raise ValueError('Fresh external output required')
    out.mkdir(parents=True)
    for name in ['sources','objects','prefix','logs','inputs']:(out/name).mkdir()
    lock=json.loads((REPO/'sources.lock.json').read_text())
    names=['zlib','freetype','fribidi','harfbuzz','libass','libplacebo','vulkan-headers','ffmpeg','mpv']
    sources={x['name']:x for x in lock['sources'] if x['name'] in names}
    state={'status':'building','scope':'Private '+a.profile+' dependencies; not a playback qualification','profile':a.profile,
           'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':sources,'commands':[]}
    for name,spec in sources.items():
        archive=cache/(name+'.tar.gz')
        if digest(archive)!=spec['sha256']:raise ValueError('Archive identity mismatch: '+name)
        temp=out/'sources'/('extract-'+name);temp.mkdir()
        with tarfile.open(archive) as tar:tar.extractall(temp,filter='data')
        entries=list(temp.iterdir())
        if len(entries)!=1 or not entries[0].is_dir():raise ValueError('Unexpected archive layout')
        entries[0].rename(out/'sources'/name);temp.rmdir()
    input_paths=[REPO/'sources.lock.json',pathlib.Path(__file__),pathlib.Path(__file__).with_name('provenance.py'),*sorted((REPO/'patches').glob('*.patch')),
                 *sorted((REPO/'patches/ffmpeg').glob('*.patch')),
                 REPO/'native/ao_browser.c',REPO/'native/audio_bridge.h',
                 EXP/'runtime/threads-coop.c',EXP/'runtime/threads-coop.h',EXP/'upstream/osdep/threads.h']
    for p in input_paths:
        dest=out/'inputs'/p.relative_to(REPO);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
    state['inputSHA256']={str(p.relative_to(out)):digest(p) for p in (out/'inputs').rglob('*') if p.is_file()}
    node=shutil.which('node');em=sdk/'upstream/emscripten';prefix=out/'prefix'
    config=out/'emscripten.config';config.write_text(f'LLVM_ROOT={str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT={str(sdk/"upstream")!r}\nNODE_JS={node!r}\nCACHE={str(out/"em-cache")!r}\n')
    env={**os.environ,'PATH':str(em)+os.pathsep+str(a.tools.resolve())+os.pathsep+os.environ['PATH'],
         'EM_CONFIG':str(config),'EM_CACHE':str(out/'em-cache'),'PKG_CONFIG_LIBDIR':str(prefix/'lib/pkgconfig'),
         'PKG_CONFIG_PATH':'','EM_PKG_CONFIG_PATH':str(prefix/'lib/pkgconfig'),'SOURCE_DATE_EPOCH':'1740000000',
         'CFLAGS':'','CXXFLAGS':'','LDFLAGS':'','CPPFLAGS':'','LIBS':'','EMCC_CFLAGS':''}
    env.pop('EMMAKEN_CFLAGS',None)
    state['toolchain']={'emcc':subprocess.check_output([str(em/'emcc'),'--version'],env=env,text=True),'sdk':str(sdk),
                        'emccSHA256':digest(em/'emcc.py'),'clangSHA256':digest(sdk/'upstream/bin/clang'),'wasmOptSHA256':digest(sdk/'upstream/bin/wasm-opt')}
    def save():(out/'build-result.json').write_text(json.dumps(state,indent=2)+'\n')
    def run(argv,cwd=out):
        argv=list(map(str,argv));log=f'{len(state["commands"])+1:03d}.log'
        entry={'argv':argv,'cwd':str(cwd),'log':log};state['commands'].append(entry);save()
        with (out/'logs'/log).open('w') as f:entry['returncode']=subprocess.run(argv,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
        save()
        if entry['returncode']:raise RuntimeError('Build failed: '+log)
    flags=['-O2','-msimd128','-ffile-prefix-map='+str(out)+'=/demuxe-mpv-private']
    env.update(CHOST='wasm32-unknown-emscripten',AR=str(em/'emar'),RANLIB=str(em/'emranlib'),CFLAGS=' '.join(flags),CXXFLAGS=' '.join(flags))
    cross=out/'cross.ini'
    cross.write_text('[binaries]\n'+''.join(f'{key} = {str(em/exe)!r}\n' for key,exe in [('c','emcc'),('cpp','em++'),('ar','emar'),('strip','emstrip')])+f"pkg-config = {shutil.which('pkg-config')!r}\n"+
        "[host_machine]\nsystem = 'emscripten'\ncpu_family = 'wasm32'\ncpu = 'wasm32'\nendian = 'little'\n[properties]\nneeds_exe_wrapper = true\n[built-in options]\n"+
        f'c_args = {flags!r}\ncpp_args = {flags!r}\nc_link_args = []\ncpp_link_args = []\n')
    def meson(name,args):
        obj=out/'objects'/name
        run(['meson','setup',obj,out/'sources'/name,'--cross-file',cross,'--prefix',prefix,'--libdir','lib','--default-library','static','--buildtype','release','--wrap-mode','nofallback','-Dauto_features=disabled',*args])
        if name=='mpv':
            header=obj/'config.h';header.write_text(header.read_text().replace(str(out),'/demuxe-mpv-private'))
        run(['ninja','-C',obj,'-j',a.jobs]);run(['meson','install','-C',obj])
    try:
        for component,folder in [('mpv',out/'inputs/patches'),('ffmpeg',out/'inputs/patches/ffmpeg')]:
            for patch in sorted(folder.glob('*.patch')):run(['patch','--batch','--forward','-p1','-i',patch],out/'sources'/component)
        mpv=out/'sources/mpv'
        for name in ['ao_browser.c','audio_bridge.h']:shutil.copyfile(out/'inputs/native'/name,mpv/'audio/out'/name)
        for name in ['threads-coop.c','threads-coop.h']:shutil.copyfile(out/'inputs/experiments/jspi-asyncify/runtime'/name,mpv/'osdep'/name)
        p=mpv/'osdep/threads-coop.h';p.write_text(p.read_text().replace('#pragma once','#pragma once\n#include "common/common.h"'))
        p=mpv/'osdep/threads-coop.c';p.write_text(p.read_text().replace('import_name(#name)','import_name("demuxe_coop_" #name)'))
        shutil.copyfile(out/'inputs/experiments/jspi-asyncify/upstream/osdep/threads.h',mpv/'osdep/threads.h')
        p=mpv/'meson.build';text=p.read_text();assert text.count("pthreads = dependency('threads')")==1
        text=text.replace("pthreads = dependency('threads')","pthreads = declare_dependency(compile_args: ['-DDEMUXE_COOP_THREADS=1'])")
        text=text.replace("files('osdep/threads-posix.c')","files('osdep/threads-coop.c')");p.write_text(text)
        # libplacebo's CPU utilities do not suspend or launch rendering threads
        # in this subtitle-only service. Use libc's non-pthread build, not -pthread.
        p=out/'sources/libplacebo/meson.build';text=p.read_text();assert text.count("pthreads = dependency('threads')")==1
        p.write_text(text.replace("pthreads = dependency('threads')","pthreads = declare_dependency()"))
        p=out/'sources/harfbuzz/meson.build';text=p.read_text();assert text.count("dependency('threads', required: false)")==1
        p.write_text(text.replace("dependency('threads', required: false)","declare_dependency()"))
        shutil.copytree(out/'sources/vulkan-headers',out/'sources/libplacebo/3rdparty/Vulkan-Headers',dirs_exist_ok=True)
        state['adaptationSHA256']={str(p.relative_to(out)):digest(p) for p in [mpv/'meson.build',mpv/'osdep/threads.h',out/'sources/libplacebo/meson.build']};save()
        z=out/'objects/zlib';z.mkdir()
        run(['emconfigure',out/'sources/zlib/configure','--static','--prefix='+str(prefix)],z)
        run(['emmake','make','-j',a.jobs,'libz.a'],z);run(['emmake','make','install'],z)
        run(['emcmake','cmake','-S',out/'sources/freetype','-B',out/'objects/freetype','-G','Ninja','-DCMAKE_INSTALL_PREFIX='+str(prefix),'-DCMAKE_BUILD_TYPE=Release','-DBUILD_SHARED_LIBS=OFF','-DFT_DISABLE_ZLIB=TRUE','-DFT_DISABLE_BZIP2=TRUE','-DFT_DISABLE_PNG=TRUE','-DFT_DISABLE_HARFBUZZ=TRUE','-DFT_DISABLE_BROTLI=TRUE'])
        run(['cmake','--build',out/'objects/freetype','-j',a.jobs]);run(['cmake','--install',out/'objects/freetype'])
        meson('fribidi',['-Ddocs=false','-Dbin=false','-Dtests=false'])
        meson('harfbuzz',['-Dfreetype=enabled','-Dtests=disabled','-Dutilities=disabled'])
        meson('libass',['-Drequire-system-font-provider=false'])
        meson('libplacebo',['-Ddemos=false','-Dtests=false'])
        ff=out/'objects/ffmpeg';ff.mkdir()
        run(['/bin/bash',out/'sources/ffmpeg/configure','--prefix='+str(prefix),'--target-os=none','--arch=wasm32','--enable-cross-compile','--cc=emcc','--cxx=em++','--ar=emar','--ranlib=emranlib','--nm=emnm','--enable-static','--disable-shared','--disable-programs','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--disable-everything','--disable-pthreads','--disable-w32threads','--disable-os2threads','--disable-avdevice','--enable-demuxers','--enable-decoder=ass,ssa,subrip,movtext,pgssub,dvdsub,webvtt'+(',aac,ac3,pcm_s16le,pcm_s24le,pcm_f32le' if a.profile in ('audio','playback') else ''),*(['--enable-decoder=mpeg2video,mpeg4,prores,mp2,mp3', '--enable-parser=mpegvideo,mpeg4video,mpegaudio,aac,ac3'] if a.profile=='playback' else []),'--enable-protocol=file','--enable-filter=aresample,aformat,format,scale,anull,null','--extra-cflags='+' '.join(flags)],ff)
        header=ff/'config.h';header.write_text(header.read_text().replace(str(out),'/demuxe-mpv-private'))
        run(['make','-j',a.jobs],ff);run(['make','install'],ff)
        meson('mpv',['-Dgpl=false','-Dlibmpv=true','-Dcplayer=false','-Dgl=disabled','-Dlua=disabled','-Dbuild-date=false','-Dzlib=enabled'])
        state['archives']={str(p.relative_to(out)):digest(p) for p in (prefix/'lib').glob('*.a')}
        state['linkInputSHA256']=link_inputs(out)
        for name,wanted in state['inputSHA256'].items():
            if digest(out/name)!=wanted:raise ValueError('Dependency original input drift')
        state['status']='built_dependencies_only'
    except Exception as error:state.update(status='failed',error=str(error));raise
    finally:save()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--sdk',type=pathlib.Path,required=True);p.add_argument('--downloads',type=pathlib.Path,required=True);p.add_argument('--tools',type=pathlib.Path,required=True);p.add_argument('--jobs',type=int,default=4);p.add_argument('--profile',choices=['subtitles','audio','playback'],default='subtitles')
    main(p.parse_args())
