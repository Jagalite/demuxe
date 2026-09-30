#!/usr/bin/env python3
"""Isolated pinned builds; never publishes served assets."""
import argparse,hashlib,json,os,pathlib,subprocess,tarfile,time
ROOT=pathlib.Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--reconfigure',action='store_true');p.add_argument('--profile',choices=['ac3','dts','truehd','flac','remux','adaptation'],default='ac3');p.add_argument('--opt',choices=['Oz','Os','O2'],default='Oz');p.add_argument('--out',type=pathlib.Path,default=ROOT/'build/microcodec');a=p.parse_args()
out=a.out.resolve();out.mkdir(exist_ok=True,parents=True);sdk=(ROOT/'build/emsdk-4.0.14').resolve();archive=ROOT/'build/downloads/ffmpeg-adaptation.tar.gz'
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
lock=next(x for x in json.loads((ROOT/'sources.lock.json').read_text())['sources'] if x['name']=='ffmpeg-adaptation');assert sha(archive)==lock['sha256'];assert json.loads((sdk/'upstream/emscripten/emscripten-version.txt').read_text())=='4.0.14'
source=out/'source'
if not source.exists():
 with tarfile.open(archive) as t:t.extractall(source,filter='data')
 for patch in sorted((ROOT/'patches/ffmpeg-adaptation').glob('*.patch')):subprocess.run(['patch','--batch','-p1','-i',str(patch)],cwd=next(source.iterdir()),check=True)
source=next(source.iterdir());obj=out/(a.profile+'-'+a.opt);obj.mkdir(exist_ok=True)
config=out/'emscripten.config';config.write_text(f'LLVM_ROOT = {str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT = {str(sdk/"upstream")!r}\nNODE_JS = {subprocess.check_output(["which","node"],text=True).strip()!r}\nCACHE = {str(out/"cache")!r}\n')
env={**os.environ,'EM_CONFIG':str(config),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],'SOURCE_DATE_EPOCH':'1740000000'}
common=a.profile in ['remux','adaptation'];flags='-'+a.opt+' -flto -msimd128'+(' -pthread' if common else '')
args=[str(source/'configure'),'--target-os=none','--arch=wasm32','--enable-cross-compile','--cc=emcc','--cxx=em++','--ar=emar','--ranlib=emranlib','--nm=emnm','--enable-static','--disable-shared','--disable-programs','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--disable-everything','--disable-avdevice','--disable-avfilter','--disable-swscale','--disable-swresample','--enable-avcodec','--enable-avutil','--enable-avformat' if common else '--disable-avformat','--enable-pthreads' if common else '--disable-pthreads','--disable-w32threads','--disable-os2threads','--optflags=-'+a.opt,'--extra-cflags='+flags,'--extra-ldflags='+flags]
if common:args+=['--enable-demuxer=mov,matroska,mpegts','--enable-muxer=mp4,webm','--enable-parser=h264,hevc,vp8,vp9,av1,aac,mpegaudio,opus,vorbis,flac,ac3','--enable-bsf=aac_adtstoasc,extract_extradata']
decoders={'ac3':'ac3,eac3','dts':'dca','truehd':'truehd,mlp','adaptation':'ac3,eac3,dca,truehd,mlp,aac,mp3,mp3float,opus,vorbis,flac,alac,pcm_s16le,pcm_s24le,pcm_s32le,pcm_f32le,pcm_f64le'}
if a.profile in decoders:args+=['--enable-decoder='+decoders[a.profile]]
if a.profile in ['flac','adaptation']:args+=['--enable-encoder=flac']
if a.profile=='adaptation':args+=['--enable-swresample']
commands=[]
def run(cmd):
 commands.append(cmd)
 with (obj/'build.log').open('a') as log:subprocess.run(cmd,cwd=obj,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
t=time.monotonic()
if a.reconfigure or not (obj/'Makefile').exists():run(args)
run(['make','-j4'])
exports=['mc_create','mc_configure','mc_decode','mc_frame','mc_flush','mc_reset','mc_destroy','mc_info','mc_plane','malloc','free']
bridge=ROOT/'experiments/microcodec/codec.c';libs=['libavcodec','libavutil']
extra=[]
if common:
 bridge=ROOT/'native/remux/remux.c';libs=['libavformat','libavcodec']+(['libswresample'] if a.profile=='adaptation' else [])+['libavutil'];exports=['rm_error','rm_probe','rm_open','rm_start','rm_set_container','rm_step','rm_close','rm_duration','rm_video_codec','rm_audio_codec','malloc','free']
 if a.profile=='adaptation':extra+=['-DDEMUXE_FLAC_LEVEL=0','-DDEMUXE_AUDIO_TRANSCODE=1','-DDEMUXE_AUDIO_ADAPTATION=1'];exports+=['rm_adapt_audio']
if a.profile=='flac':bridge=ROOT/'experiments/microcodec/encoder.c';exports=['enc_header','enc_header_size','enc_create','enc_input','enc_encode','enc_data','enc_size','enc_destroy','malloc','free']
link=['emcc',*flags.split(),*extra,'-I'+str(obj),'-I'+str(source),str(bridge),*[str(obj/x/(x+'.a')) for x in libs],'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,worker,node','-sINITIAL_MEMORY='+str(67108864 if common else 2097152),'-sSTACK_SIZE=262144','-sALLOW_MEMORY_GROWTH=1','-sMAXIMUM_MEMORY=134217728','-sFILESYSTEM=0','-sMALLOC=emmalloc','-sSUPPORT_LONGJMP=0','-sWASM_BIGINT=1','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+x for x in exports]),'-sEXPORTED_RUNTIME_METHODS='+json.dumps(['HEAPU8','HEAPF32','HEAP32','ccall','UTF8ToString']),'-o',str(obj/'module.mjs')]
run(link)
(obj/'provenance.json').write_text(json.dumps({'source':lock,'sdk':'4.0.14','configure':args,'link':link,'buildSeconds':time.monotonic()-t,'patches':{x.name:sha(x) for x in sorted((ROOT/'patches/ffmpeg-adaptation').glob('*.patch'))},'effectiveConfig':{x:sha(obj/x) for x in ['config.h','config_components.h','ffbuild/config.mak']},'effectiveCflags':next(x for x in (obj/'ffbuild/config.mak').read_text().splitlines() if x.startswith('CFLAGS=')),'sdkResolved':str(sdk),'bridgeSha256':sha(bridge),'wasmSha256':sha(obj/'module.wasm')},indent=2))
print(obj)
