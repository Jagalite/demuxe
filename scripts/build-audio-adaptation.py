#!/usr/bin/env python3
"""Build the optional FLAC preparation profile from the SAME locked FFmpeg sources.
Does not install or replace any served engine. Use a fresh output per qualification.
"""
import argparse,hashlib,json,os,pathlib,subprocess,tarfile,time,shutil
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--sdk',type=pathlib.Path,required=True);p.add_argument('--archive',type=pathlib.Path,required=True);p.add_argument('--resume',action='store_true');p.add_argument('--libraries-only',action='store_true');a=p.parse_args()
out=a.output.resolve();sdk=a.sdk.resolve();archive=a.archive.resolve();digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
lock=next(x for x in json.loads((root/'sources.lock.json').read_text())['sources'] if x['name']=='ffmpeg')
assert digest(archive)==lock['sha256'],'FFmpeg archive differs from lock'
assert json.loads((sdk/'upstream/emscripten/emscripten-version.txt').read_text())=='4.0.14','SDK version mismatch'
patches=sorted((root/'patches/ffmpeg').glob('*.patch'));inputs={'ffmpeg':lock,'patches':{str(x.relative_to(root)):digest(x) for x in patches},'sdk':'4.0.14'}
if a.resume:
 assert json.loads((out/'inputs.json').read_text())==inputs,'Resume inputs changed'
else:
 if out.exists():raise SystemExit('Output must be new (or --resume exact build inputs)')
 out.mkdir(parents=True);(out/'inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
 with tarfile.open(archive) as tar:tar.extractall(out/'source',filter='data')
 source=next((out/'source').iterdir())
 for patch in patches:subprocess.run(['patch','--batch','--forward','-p1','-i',str(patch)],cwd=source,check=True)
source=next((out/'source').iterdir());obj=out/'ffmpeg';obj.mkdir(exist_ok=True)
config=out/'emscripten.config';config.write_text(f"LLVM_ROOT = {str(sdk/'upstream/bin')!r}\nBINARYEN_ROOT = {str(sdk/'upstream')!r}\nNODE_JS = {subprocess.check_output(['which','node'],text=True).strip()!r}\nCACHE = {str(out/'cache')!r}\n")
env={**os.environ,'EM_CONFIG':str(config),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],'SOURCE_DATE_EPOCH':'1740000000'}
if not (obj/'Makefile').exists():
 args=[str(source/'configure'),'--target-os=none','--arch=wasm32','--enable-cross-compile','--cc=emcc','--cxx=em++','--ar=emar','--ranlib=emranlib','--nm=emnm','--enable-static','--disable-shared','--disable-programs','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--disable-everything','--disable-avdevice','--disable-avfilter','--disable-swscale','--disable-swresample','--enable-avformat','--enable-avcodec','--enable-avutil','--enable-pthreads','--enable-demuxers','--enable-muxer=mp4,webm','--enable-parsers','--enable-bsfs','--enable-decoder=pcm_s16le,pcm_s24le,pcm_s32le,flac,dca','--enable-encoder=flac','--extra-cflags=-O2 -pthread -msimd128 -ffile-prefix-map='+str(out)+'=/demuxe-adaptation','--extra-ldflags=-pthread']
 subprocess.run(args,cwd=obj,env=env,check=True)
subprocess.run(['make','-j4'],cwd=obj,env=env,check=True)
if a.libraries_only:raise SystemExit(0)
engine=out/('engine-'+str(time.time_ns()));engine.mkdir()
exports=['rm_error','rm_probe','rm_open','rm_start','rm_set_container','rm_step','rm_close','rm_duration','rm_video_codec','rm_audio_codec','rm_adapt_audio','malloc','free']
args=['emcc','-O2','-DDEMUXE_AUDIO_ADAPTATION=1','-ffile-prefix-map='+str(root)+'=/demuxe','-pthread','-msimd128','-I'+str(obj),'-I'+str(source),str(root/'native/remux/remux.c'),*[str(obj/x/f'{x}.a') for x in ['libavformat','libavcodec','libavutil']],'-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=createRemux','-sENVIRONMENT=worker','-sINITIAL_MEMORY=67108864','-sMAXIMUM_MEMORY=134217728','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sWASM_BIGINT=1','-sFILESYSTEM=0','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+x for x in exports]),'-sEXPORTED_RUNTIME_METHODS=["HEAPU8","ccall","UTF8ToString"]','-o',str(engine/'remux.mjs')]
subprocess.run(args,cwd=root,env=env,check=True)
subprocess.run(['node','--input-type=module','-e','import fs from "node:fs";if(!WebAssembly.validate(fs.readFileSync(process.argv[1])))throw Error("Invalid Wasm")',str(engine/'remux.wasm')],check=True)
files=[root/'native/remux/remux.c',root/'native/adaptation/flac.h',root/'scripts/build-audio-adaptation.py',obj/'config.h',engine/'remux.mjs',engine/'remux.wasm']
(engine/'manifest.json').write_text(json.dumps({'inputs':inputs,'files':{str(x):{'sha256':digest(x),'bytes':x.stat().st_size} for x in files},'scope':'Experimental FLAC preparation; no video decoder/encoder configured; not released'},indent=2)+'\n')

for original in [root/'native/remux/remux.c',root/'native/adaptation/flac.h',root/'scripts/build-audio-adaptation.py']:
 target=engine/'sources'/original.relative_to(root);target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(original,target)
(out/'latest.json').write_text(json.dumps({'engine':str(engine)},indent=2)+'\n')
print(str(engine))
