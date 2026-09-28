#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Prepared isolated-prefix FFmpeg build; invoke the copy in a prepared output.
No actual FFmpeg build/codec execution has been performed in the review container.
"""
import argparse,datetime,hashlib,json,os,pathlib,re,shlex,shutil,subprocess
from suspension_profile import suspension_flags

def main(a):
    out=pathlib.Path(__file__).resolve().parent;sdk=a.sdk.resolve()
    inputs=json.loads((out/'inputs.json').read_text());transcode=inputs['profile']=='transcode'
    suspension=inputs['suspension']
    if suspension not in ('jspi','asyncify'):raise ValueError('Unrecognized suspension profile')
    if out==sdk or sdk in out.parents:raise ValueError('Build output must be outside SDK')
    if (out/'objects').exists():raise ValueError('Objects already exist: prepare a fresh output')
    node=shutil.which('node')
    if not node:raise ValueError('Node is missing')
    config=out/'emscripten.config';config.write_text(f'LLVM_ROOT = {str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT = {str(sdk/"upstream")!r}\nNODE_JS = {node!r}\nCACHE = {str(out/"em-cache")!r}\n')
    em=sdk/'upstream/emscripten';env={**os.environ,'PATH':str(em)+os.pathsep+os.environ['PATH'],'EM_CONFIG':str(config),'EM_CACHE':str(out/'em-cache'),'PKG_CONFIG_LIBDIR':str(out/'prefix/lib/pkgconfig'),'PKG_CONFIG_PATH':'','CFLAGS':'','CXXFLAGS':'','LDFLAGS':'','CPPFLAGS':'','LIBS':'','EMCC_CFLAGS':'','EMMAKEN_CFLAGS':'','SOURCE_DATE_EPOCH':'1740000000'}
    # Emscripten rejects this obsolete variable even when its value is empty.
    env.pop('EMMAKEN_CFLAGS',None)
    version=subprocess.check_output([str(em/'emcc'),'--version'],env=env,text=True)
    if not re.search(r'\b4\.0\.14\b',version):raise ValueError('Emscripten 4.0.14 required')
    obj=out/'objects';obj.mkdir();engine=out/'engine';engine.mkdir();logs=out/'logs';logs.mkdir()
    commands=[];status={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'building','suspension':suspension,'savedStackBytes':a.saved_stack_bytes,'mediaExecuted':False}
    status['toolchain']={'emcc':version,'sdk':str(sdk),'node':subprocess.check_output([node,'--version'],text=True).strip()}
    for name in ['clang','wasm-opt']:
        tool=sdk/'upstream/bin'/name
        status['toolchain'][name]={'version':subprocess.check_output([str(tool),'--version'],text=True).strip(),'sha256':hashlib.sha256(tool.read_bytes()).hexdigest()}
    status['sourceSHA256']={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [out/'native/remux/remux.c',out/'native/adaptation/flac.h',out/'build-ffmpeg.py',out/'suspension_profile.py',out/'audit-wasm.mjs',out/'inputs.json',*sorted((out/'patches').rglob('*.patch'))]}
    def run(args,cwd=obj):
        args=list(map(str,args))
        if args[0]==str(out/'source/configure'):args=['/bin/bash',*args]
        entry={'argv':args,'cwd':str(cwd)};commands.append(entry)
        with (logs/f'{len(commands):02d}.log').open('w') as f:rc=subprocess.run(args,cwd=cwd,env=env,stdout=f,stderr=subprocess.STDOUT).returncode
        entry['returncode']=rc;(out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
        if rc:raise RuntimeError('Build failed; inspect '+str(logs))
    flags=['-O2','-msimd128','-ffile-prefix-map='+str(out)+'=/demuxe-ffmpeg']
    try:
        args=[out/'source/configure','--target-os=none','--arch=wasm32','--enable-cross-compile','--cc=emcc','--cxx=em++','--ar=emar','--ranlib=emranlib','--nm=emnm','--enable-static','--disable-shared','--disable-programs','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--disable-everything','--disable-avdevice','--disable-avfilter','--disable-swscale','--enable-swresample' if transcode else '--disable-swresample','--enable-avformat','--enable-avcodec','--enable-avutil','--disable-pthreads','--disable-w32threads','--disable-os2threads','--enable-demuxers','--enable-muxer=mp4,webm','--enable-parsers','--enable-bsfs','--extra-cflags='+shlex.join(flags)]
        if transcode:args+=['--enable-decoder=ac3,eac3,dca,truehd,mlp,aac,mp3,mp3float,opus,vorbis,flac,alac,pcm_s16le,pcm_s24le,pcm_s32le,pcm_f32le,pcm_f64le','--enable-encoder=flac,opus']
        run(args)
        header=obj/'config.h';header.write_text(header.read_text().replace(str(out),'/demuxe-ffmpeg'))
        run(['make','-j',a.jobs])
        if re.search(r'#define HAVE_(?:PTHREADS|W32THREADS|OS2THREADS) 1',(obj/'config.h').read_text()):raise ValueError('Threaded FFmpeg rejected')
        exports=['rm_error','rm_probe','rm_open','rm_start','rm_set_container','rm_step','rm_close','rm_duration','rm_video_codec','rm_audio_codec','malloc','free']+(['rm_adapt_audio'] if transcode else [])
        libs=['libavformat','libavcodec']+(['libswresample'] if transcode else [])+['libavutil']
        link=['emcc',*flags,*(['-DDEMUXE_AUDIO_ADAPTATION=1','-DDEMUXE_AUDIO_TRANSCODE=1','-DDEMUXE_FLAC_LEVEL='+str(a.flac_level)] if transcode else []),'-I'+str(obj),'-I'+str(out/'source'),out/'native/remux/remux.c',*[obj/l/(l+'.a') for l in libs],'-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=createRemux','-sENVIRONMENT=worker',*suspension_flags(suspension,[x for x in exports if x.startswith('rm_')],a.saved_stack_bytes),'-sASSERTIONS=1','-sINITIAL_MEMORY=67108864','-sMAXIMUM_MEMORY=134217728','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sFILESYSTEM=0','-sWASM_BIGINT=1','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+x for x in exports]),'-sEXPORTED_RUNTIME_METHODS=["HEAPU8","ccall","UTF8ToString"]','-Wl,-Map,'+str(engine/'remux.map'),'-o',engine/'remux.mjs']
        link=list(map(str,link))
        link_inputs=[obj/l/(l+'.a') for l in libs]+[obj/'config.h',obj/'config_components.h']
        status['relinkInputsSHA256']={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in link_inputs}
        status['linkCommand']=link
        status['linkSettings']={'flacLevel':a.flac_level} if transcode else {}
        run(link)
        run([node,out/'audit-wasm.mjs',engine/'remux.wasm','--emscripten','--backend='+suspension,'--profile='+inputs['profile']])
        for name,wanted in {**status['sourceSHA256'],**status['relinkInputsSHA256']}.items():
            if hashlib.sha256((out/name).read_bytes()).hexdigest()!=wanted:raise ValueError('Build input changed: '+name)
        status['commandsSHA256']=hashlib.sha256((out/'commands.json').read_bytes()).hexdigest()
        status.update(status='build_completed_only',fullFFmpegBuilt=True,artifacts={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in engine.iterdir() if p.is_file()})
    except Exception as error:status.update(status='build_failed',error=str(error));raise
    finally:(out/'build-result.json').write_text(json.dumps(status,indent=2)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--sdk',type=pathlib.Path,required=True);p.add_argument('--jobs',type=int,default=4);p.add_argument('--saved-stack-bytes',type=int,default=65536);p.add_argument('--flac-level',type=int,choices=range(9),default=5);a=p.parse_args()
    if not 1<=a.jobs<=32:p.error('--jobs must be 1..32')
    suspension_flags('asyncify',['rm_open'],a.saved_stack_bytes)
    main(a)
