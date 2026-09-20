# SPDX-License-Identifier: Apache-2.0
"""Isolated YUV link using retained engine-build-01 dependency archives."""
import pathlib, subprocess, json, shlex, os, sys, hashlib, time
root=pathlib.Path.cwd(); base=root/'build/head-to-head/engine-build-01'
out=(root/sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=False)
env=dict(os.environ,EM_CONFIG=str(base/'build/beta.emscripten'),EMCC_CORES='2')
sdk=pathlib.Path('/Volumes/seed2/Projects/demuxe-release-closeout-20260916/build/emsdk-4.0.14')
env['PATH']=str(sdk/'upstream/emscripten')+os.pathsep+env['PATH']
env['PKG_CONFIG_LIBDIR']=str(base/'build/prefix-playback/lib/pkgconfig')+':'+str(base/'build/prefix/lib/pkgconfig')
env['PKG_CONFIG_PATH']=env['PKG_CONFIG_LIBDIR']
records=[]
def run(cmd,cwd):
    started=time.time();p=subprocess.run(cmd,cwd=cwd,env=env,text=True,capture_output=True)
    records.append(dict(command=cmd,cwd=str(cwd),exit=p.returncode,seconds=time.time()-started,stdout=p.stdout,stderr=p.stderr))
    (out/'commands.json').write_text(json.dumps(records,indent=2)+'\n')
    if p.returncode:raise RuntimeError(p.stderr[-10000:])
    return p.stdout
entry=next(e for e in json.loads((base/'build/obj-mpv/compile_commands.json').read_text()) if e['file'].endswith('/libmpv_sw.c'))
args=shlex.split(entry['command']);cmd=[];i=0
while i<len(args):
    a=args[i]
    if a in ('-MQ','-MF'):i+=2;continue
    if a=='-MD':i+=1;continue
    if a=='-o':cmd+=['-o',str(out/'yuv.o')];i+=2;continue
    if a=='-c':cmd+=['-c',str(root/'native/yuv-backend.c')];i+=2;continue
    cmd.append(a);i+=1
run(cmd,entry['directory'])
rgb=cmd.copy();rgb[rgb.index('-c')+1]=str(base/'build/sources/mpv/video/out/libmpv_sw.c');rgb[rgb.index('-o')+1]=str(out/'rgb.o');rgb.insert(1,'-Drender_backend_sw=render_backend_rgb');run(rgb,entry['directory'])
libs=shlex.split(run(['pkg-config','--cflags','--libs','--static','mpv'],base))
names={'avcodec','avformat','avfilter','avutil','swresample','swscale','postproc'}
libs=[str(base/f'build/obj-software-full-ffmpeg/lib{x[2:]}/lib{x[2:]}.a') if x.startswith('-l') and x[2:] in names else x for x in libs]
cmd=[args[0],'-O2','-pthread','-msimd128','-Inative','-Ibuild/sources/mpv','-Ibuild/obj-mpv',str(out/'yuv.o'),str(out/'rgb.o'),'native/player.c','native/events.c','native/stream_bridge.c','experiments/retained-subtitles/subtitles.c','-Ibuild/sources/ffmpeg','native/simd/h264-chroma.c','-Wl,--wrap=ff_h264chroma_init','native/simd/h264-biweight.c','native/simd/h264-deblock.c','native/simd/h264-dsp.c','-Wl,--wrap=ff_h264dsp_init','native/simd/h264-qpel.c','-Wl,--wrap=ff_h264qpel_init']+libs+[str(base/'build/obj-software-full-ffmpeg/libpostproc/libpostproc.a'),str(base/'build/prefix-playback/lib/libdav1d.a'),str(base/'build/prefix-playback/lib/libzimg.a'),'-lstdc++','-fexceptions','-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=createEngine','-sENVIRONMENT=worker','-sPTHREAD_POOL_SIZE=8','-sPTHREAD_POOL_SIZE_STRICT=2','-sINITIAL_MEMORY=134217728','-sMAXIMUM_MEMORY=1073741824','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sDEFAULT_PTHREAD_STACK_SIZE=2097152','-sWASM_BIGINT=1','-sWASMFS=1','-sFORCE_FILESYSTEM=1','-sEXIT_RUNTIME=0','-sEXPORTED_FUNCTIONS='+json.dumps(['_web_create','_web_command_args','_web_event','_web_render','_web_presented','_web_destroy','_web_audio_ptr','_malloc','_free']),'-sEXPORTED_RUNTIME_METHODS='+json.dumps(['ccall','UTF8ToString','FS','PThread','HEAPU8','HEAPU32','HEAPF32']),'-o',str(out/'player.mjs')]
run(cmd,base)
manifest={str(p.relative_to(out)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in out.iterdir() if p.is_file()}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
