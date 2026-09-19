# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import os,subprocess,json,shutil,hashlib
root=Path.cwd();out=root/'build/top100-jspi';out.mkdir(exist_ok=True);sdk=Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14');prefix=out/'prefix';prefix.mkdir(exist_ok=True)
config=out/'emscripten.config';config.write_text(f"LLVM_ROOT = {str(sdk/'upstream/bin')!r}\nBINARYEN_ROOT = {str(sdk/'upstream')!r}\nNODE_JS = {shutil.which('node')!r}\nCACHE = {str(out/'cache')!r}\n")
env={**os.environ,'EM_CONFIG':str(config),'EM_CACHE':str(out/'cache'),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],'CFLAGS':'-O2','AR':'emar','RANLIB':'emranlib','PKG_CONFIG_LIBDIR':str(prefix/'lib/pkgconfig'),'EM_PKG_CONFIG_PATH':str(prefix/'lib/pkgconfig')}
commands=[]
def run(cmd,cwd):
 commands.append([str(x) for x in cmd]);(root/'results/top100/jspi-commands.json').write_text(json.dumps(commands,indent=2)+'\n');subprocess.run(cmd,cwd=cwd,env=env,check=True)
a=Path('/Volumes/seed2/Projects/webmpv/build/downloads/zlib.tar.gz');lock=json.load(open('sources.lock.json'));expected=next(x['sha256'] for x in lock['sources'] if x['name']=='zlib');assert hashlib.sha256(a.read_bytes()).hexdigest()==expected
z=out/'zlib';z.mkdir(exist_ok=True);run(['tar','-xf',str(a),'--strip-components=1','-C',str(z)],root);run(['emconfigure','./configure','--uname=wasm32','--static','--prefix='+str(prefix)],z);run(['emmake','make','clean'],z);run(['emmake','make','-j4','libz.a'],z);run(['emmake','make','install'],z)
f=out/'ffmpeg';f.mkdir(exist_ok=True)
run(['emconfigure',str(root/'build/sources/ffmpeg/configure'),'--target-os=none','--arch=wasm32','--enable-cross-compile','--cc=emcc','--cxx=em++','--ar=emar','--ranlib=emranlib','--nm=emnm','--enable-static','--disable-shared','--disable-programs','--disable-doc','--disable-debug','--disable-autodetect','--disable-network','--disable-asm','--disable-everything','--disable-avdevice','--disable-avfilter','--disable-swscale','--disable-swresample','--disable-postproc','--enable-avformat','--enable-avcodec','--enable-avutil','--disable-pthreads','--enable-demuxer=mov,matroska,mpegts,mp3,flac,ogg,aac,loas','--enable-muxer=mp4,webm','--enable-parsers','--enable-bsfs','--enable-zlib','--extra-cflags=-O2 -I'+str(prefix/'include'),'--extra-ldflags=-L'+str(prefix/'lib')],f)
run(['emmake','make','-j4'],f)
s=(root/'native/remux/remux.c').read_text();start=s.index('EM_JS(int, source_read');end=s.index('EM_JS(void, emit_bytes',start)
s=s[:start]+'''EM_ASYNC_JS(int, source_read, (uint8_t *dst, int count, double offset), {
 if(Module.cancelled)return -1;
 const bytes=await Module.readAsync(offset,count);
 if(Module.cancelled)return -1;
 if(bytes.length>count)throw Error('Read overflow');
 HEAPU8.set(bytes,dst);return bytes.length;
});
'''+s[end:];(out/'remux.c').write_text(s);runtime=out/'runtime';runtime.mkdir(exist_ok=True)
run(['emcc','-O2','-I'+str(f),'-I'+str(root/'build/sources/ffmpeg'),str(out/'remux.c'),*[str(f/x/(x+'.a')) for x in ['libavformat','libavcodec','libavutil']],str(prefix/'lib/libz.a'),'-sJSPI=1','-sJSPI_EXPORTS=["rm_open","rm_probe","rm_start","rm_step"]','-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=createRemux','-sENVIRONMENT=worker','-sINITIAL_MEMORY=67108864','-sMAXIMUM_MEMORY=134217728','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sWASM_BIGINT=1','-sFILESYSTEM=0','-sEXPORTED_FUNCTIONS=["_rm_error","_rm_probe","_rm_open","_rm_start","_rm_set_container","_rm_step","_rm_close","_rm_duration","_rm_video_codec","_rm_audio_codec","_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["HEAPU8","ccall","UTF8ToString"]','-o',str(runtime/'remux.mjs')],root)
print('Built isolated non-pthread JSPI remux with zlib:',runtime)
