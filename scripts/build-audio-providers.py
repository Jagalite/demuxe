#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build fine or bundled audio providers from one pinned FFmpeg and bridge source.

Outputs stay in build/. This does not grant playback qualification or install assets.
"""
import argparse, hashlib, json, os, pathlib, shutil, subprocess, tarfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--sdk', type=pathlib.Path, required=True)
p.add_argument('--archive', type=pathlib.Path, required=True)
p.add_argument('--profile', choices=['ac3', 'dts', 'flac', 'common', 'truehd-mlp', 'dts-hd', 'aac', 'opus-vorbis', 'lossless', 'mp3', 'pcm', 'legacy', 'archive', 'archive-more', 'archive-next', 'archive-historical', 'adpcm-wave', 'adpcm-qt', 'g726', 'telephony', 'speech', 'wma-advanced', 'opus-encoder'], required=True)
p.add_argument('--out', type=pathlib.Path, default=ROOT/'build/audio-providers')
a = p.parse_args(); sdk=a.sdk.resolve(); archive=a.archive.resolve(); out=a.out.resolve()
lock=next(s for s in json.loads((ROOT/'sources.lock.json').read_text())['sources'] if s['name']=='ffmpeg-adaptation')
if digest(archive)!=lock['sha256']: raise ValueError('Pinned FFmpeg archive mismatch')
if json.loads((sdk/'upstream/emscripten/emscripten-version.txt').read_text())!='4.0.14': raise ValueError('SDK version mismatch')
patches=sorted((ROOT/'patches/ffmpeg-adaptation').glob('*.patch'))
inputs={str(f.relative_to(ROOT)):digest(f) for f in patches+[ROOT/'native/audio-codecs/decoder.c',ROOT/'native/audio-codecs/encoder.c',ROOT/'scripts/build-audio-providers.py']}
source_key=hashlib.sha256(json.dumps([lock,inputs],sort_keys=True).encode()).hexdigest()
work=out/source_key; work.mkdir(parents=True,exist_ok=True)
source_cache=out/'sources'/hashlib.sha256(json.dumps([lock,{str(f.relative_to(ROOT)):digest(f) for f in patches}],sort_keys=True).encode()).hexdigest()
source_cache.mkdir(parents=True,exist_ok=True)
source=source_cache/'source'
if not source.exists():
 stage=source_cache/'source-partial'
 if stage.exists(): shutil.rmtree(stage)
 with tarfile.open(archive) as t: t.extractall(stage,filter='data')
 tree=next(stage.iterdir())
 for patch in patches: subprocess.run(['patch','--batch','-p1','-i',str(patch)],cwd=tree,check=True)
 stage.rename(source)
source=next(source.iterdir()); obj=work/a.profile; obj.mkdir(exist_ok=True)
config=work/'emscripten.config'; config.write_text(f'LLVM_ROOT = {str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT = {str(sdk/"upstream")!r}\nNODE_JS = {shutil.which("node")!r}\nCACHE = {str(work/"cache")!r}\n')
temporary=obj/'tmp';temporary.mkdir(exist_ok=True)
env={**os.environ,'TMPDIR':str(temporary),'EM_CONFIG':str(config),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],'SOURCE_DATE_EPOCH':'1740000000'}
flags=['-Oz','-flto','-msimd128']
configure=[str(source/'configure'),'--target-os=none','--arch=wasm32','--enable-cross-compile','--cc=emcc','--cxx=em++','--ar=emar','--ranlib=emranlib','--nm=emnm','--enable-static','--disable-shared','--disable-programs','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--disable-everything','--disable-avdevice','--disable-avfilter','--disable-swscale','--disable-swresample','--disable-avformat','--enable-avcodec','--enable-avutil','--disable-pthreads','--disable-w32threads','--disable-os2threads','--optflags=-Oz','--extra-cflags='+' '.join(flags),'--extra-ldflags='+' '.join(flags)]
decoder_profiles = {
 'ac3': ('ac3,eac3', ['ac3','eac3']), 'dts': ('dca', ['dts-core']),
 'common': ('ac3,eac3,dca', ['ac3','eac3','dts-core']),
 'truehd-mlp': ('truehd,mlp', ['truehd','mlp']), 'dts-hd': ('dca', ['dts-hd']),
 'aac': ('aac', ['aac']), 'opus-vorbis': ('opus,vorbis', ['opus','vorbis']),
 'lossless': ('flac,alac', ['flac','alac']), 'mp3': ('mp3float', ['mp3']),
 'archive': ('ape,wavpack', ['ape','wavpack']),
 'archive-more': ('tta', ['tta']),
 'archive-next': ('tak', ['tak']),
 'archive-historical': ('shorten', ['shorten']),
 'speech': ('speex,amrnb,amrwb', ['speex','amrnb','amrwb']),
 'telephony': ('pcm_alaw,pcm_mulaw,gsm,gsm_ms', ['pcm-alaw','pcm-mulaw','gsm','gsm-ms']),
 'adpcm-qt': ('adpcm_ima_qt', ['adpcm-ima-qt']),
 'g726': ('adpcm_g726,adpcm_g726le', ['adpcm-g726','adpcm-g726le']),
 'adpcm-wave': ('adpcm_ms,adpcm_ima_wav', ['adpcm-ms','adpcm-ima-wav']),
 'wma-advanced': ('wmapro,wmalossless,wmavoice', ['wmapro','wmalossless','wmavoice']),
 'legacy': ('mp1float,mp2float,wmav1,wmav2', ['mp1','mp2','wmav1','wmav2']),
 'pcm': ('pcm_s16le,pcm_s24le,pcm_s32le,pcm_f32le,pcm_f64le,pcm_u8,pcm_s8', ['pcm-s16le','pcm-s24le','pcm-s32le','pcm-f32le','pcm-f64le','pcm-u8','pcm-s8']),
}
if a.profile=='opus-vorbis':
 configure.remove('--disable-swresample'); configure+=['--enable-swresample']
capabilities=[]; bridges=[]; exports=['malloc','free']
if a.profile in decoder_profiles:
 decoders, names = decoder_profiles[a.profile]
 configure+=['--enable-decoder='+decoders]
 capabilities+=['audio.decode.'+name for name in names]
 bridges.append(ROOT/'native/audio-codecs/decoder.c')
 exports+=['mc_create','mc_create_config','mc_configure','mc_decode','mc_frame','mc_flush','mc_reset','mc_destroy','mc_info','mc_plane']
if a.profile in ['legacy','wma-advanced','adpcm-wave', 'adpcm-qt','g726','telephony']: exports+=['mc_create_config_v2']
if a.profile in ['flac','common','opus-encoder']:
 encoder='opus' if a.profile=='opus-encoder' else 'flac'
 configure+=['--enable-encoder='+encoder]; capabilities.append('audio.encode.'+encoder); bridges.append(ROOT/'native/audio-codecs/encoder.c')
 exports+=['ae_create','ae_create_config','ae_destroy','ae_size','ae_input','ae_send','ae_receive','ae_data','ae_bytes','ae_pts','ae_duration','ae_header','ae_header_size']
if a.profile=='opus-encoder': exports+=['ae_preskip']
commands=[]
def run(cmd):
 commands.append(cmd)
 with (obj/'build.log').open('a') as log: subprocess.run(cmd,cwd=obj,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
if not (obj/'Makefile').exists(): run(configure)
components=(obj/'config_components.h').read_text()
for arg in configure:
 if arg.startswith(('--enable-decoder=', '--enable-encoder=')):
  category=arg.split('=')[0].split('-')[-1].upper()
  for name in arg.split('=')[1].split(','):
   if f'#define CONFIG_{name.upper()}_{category} 1' not in components: raise ValueError('Requested codec not enabled: '+name)
run(['make','-j2'])
link=['emcc',*flags,*(['-DDEMUXE_OPUS_ENCODER=1'] if a.profile=='opus-encoder' else []),*(['-DDEMUXE_DTS_FULL=1'] if a.profile=='dts-hd' else []),'-I'+str(obj),'-I'+str(source),*map(str,bridges),str(obj/'libavcodec/libavcodec.a'),*([str(obj/'libswresample/libswresample.a')] if a.profile=='opus-vorbis' else []),str(obj/'libavutil/libavutil.a'),'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,worker,node','-sINITIAL_MEMORY=2097152','-sSTACK_SIZE=262144','-sALLOW_MEMORY_GROWTH=1','-sMAXIMUM_MEMORY=134217728','-sFILESYSTEM=0','-sMALLOC=emmalloc','-sSUPPORT_LONGJMP=0','-sWASM_BIGINT=1','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+s for s in exports]),'-sEXPORTED_RUNTIME_METHODS='+json.dumps(['HEAPU8','HEAPF32','HEAP32']),'-o',str(obj/'module.mjs')]
run(link)
record={'schema':1,'source':lock,'sourceKey':source_key,'sdk':'4.0.14','inputs':inputs,'configure':configure,'link':link,'capabilities':capabilities,'profile':a.profile,'qualification':'build-only','artifacts':{s:{'sha256':digest(obj/s),'bytes':(obj/s).stat().st_size} for s in ['module.mjs','module.wasm']},'effectiveConfig':{s:digest(obj/s) for s in ['config.h','config_components.h','ffbuild/config.mak']}}
(obj/'build-record.json').write_text(json.dumps(record,indent=2)+'\n')
(out/(a.profile+'.json')).write_text(json.dumps({'directory':str(obj),'recordSHA256':digest(obj/'build-record.json')},indent=2)+'\n')
print(obj)
