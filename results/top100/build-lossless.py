# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,os,json
root=Path.cwd();base=root/'build/top100-lossless';f=base/'ffmpeg';f.mkdir(parents=True,exist_ok=True);sdk=Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14');env={**os.environ,'EM_CONFIG':str(root/'build/top100-jspi/emscripten.config'),'EM_CACHE':str(root/'build/top100-jspi/cache'),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH']};commands=[]
def run(cmd,cwd):
 commands.append(cmd);(root/'results/top100/lossless/commands.json').write_text(json.dumps(commands,indent=2));subprocess.run(cmd,cwd=cwd,env=env,check=True)
run(['emconfigure',str(root/'build/sources/ffmpeg/configure'),'--target-os=none','--arch=wasm32','--enable-cross-compile','--cc=emcc','--cxx=em++','--ar=emar','--ranlib=emranlib','--nm=emnm','--enable-static','--disable-shared','--disable-programs','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--disable-everything','--disable-avdevice','--disable-avfilter','--disable-avformat','--disable-swscale','--disable-swresample','--disable-postproc','--disable-pthreads','--enable-decoder=alac,flac','--extra-cflags=-O2'],f)
run(['emmake','make','-j4'],f)
runtime=base/'runtime';runtime.mkdir(exist_ok=True)
run(['emcc','-O2','-I'+str(f),'-I'+str(root/'build/sources/ffmpeg'),str(root/'results/top100/lossless/decoder.c'),str(f/'libavcodec/libavcodec.a'),str(f/'libavutil/libavutil.a'),'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,worker','-sALLOW_MEMORY_GROWTH=1','-sINITIAL_MEMORY=33554432','-sMAXIMUM_MEMORY=67108864','-sFILESYSTEM=0','-sEXPORTED_FUNCTIONS=["_open_decoder","_decode_packet","_close_decoder","_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]','-o',str(runtime/'lossless.mjs')],root)
