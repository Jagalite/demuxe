#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Link one local mpv candidate with Hybrid, selective audio, YUV and RGB modes.

Existing native dependencies are read from --native-root. Every generated source,
object, archive and output is written to a fresh --output directory.
"""
import argparse, hashlib, json, os, shlex, shutil, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--native-root',type=Path,required=True)
p.add_argument('--sdk',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[1];native=a.native_root.resolve();sdk=a.sdk.resolve();out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
config=out/'emscripten.config.py'
config.write_text('\n'.join(f'{key} = {str(value)!r}' for key,value in {'NODE_JS':sdk/'node/22.16.0_64bit/bin/node','LLVM_ROOT':sdk/'upstream/bin','BINARYEN_ROOT':sdk/'upstream','EMSCRIPTEN_ROOT':sdk/'upstream/emscripten','CACHE':out/'cache'}.items())+'\n')
env=dict(os.environ,EM_CONFIG=str(config),EM_CACHE=str(out/'cache'),PKG_CONFIG_LIBDIR=str(native/'build/prefix/lib/pkgconfig'),PKG_CONFIG_PATH=str(native/'build/prefix/lib/pkgconfig'))
env['PATH']=str(sdk/'upstream/emscripten')+os.pathsep+env['PATH']
commands=json.loads((native/'build/obj-mpv/compile_commands.json').read_text());record={'schema':1,'qualification':'local-candidate','inputs':{},'commands':[]}
def read(file):
 data=file.read_bytes();record['inputs'][str(file)]=hashlib.sha256(data).hexdigest();return data.decode()
def replace(source,old,new):
 if source.count(old)!=1:raise RuntimeError('Native patch anchor changed: '+old[:100])
 return source.replace(old,new)
def run(command,cwd=out):
 record['commands'].append({'cwd':str(cwd),'argv':list(map(str,command))});subprocess.run(list(map(str,command)),cwd=cwd,env=env,check=True)
def compile_source(suffix,source,name,extra=()):
 entry=next(e for e in commands if e['file'].endswith(suffix));args=shlex.split(entry['command']);obj=out/(name+'.o');src=out/(name+'.c');src.write_text(source)
 cmd=[str(sdk/'upstream/emscripten/emcc'),'-I'+str(root/'native'),'-I'+str(native/'build/sources/mpv'),'-I'+str(native/'build/sources/mpv/video/out'),'-I'+str(native/'build/sources/mpv/audio/out'),*extra];i=1
 while i<len(args):
  arg=args[i]
  if arg in ['-MQ','-MF']:i+=2;continue
  if arg=='-MD':i+=1;continue
  if arg in ['-o','-c']:cmd.extend([arg,str(obj if arg=='-o' else src)]);i+=2;continue
  cmd.append(arg);i+=1
 run(cmd,Path(entry['directory']));return obj,Path(entry['output']).name
# Preserve the selective audio timestamp ABI while sharing the decoder archive.
ao=read(root/'native/ao_browser.c')
ao=replace(ao,'struct web_audio_ring web_audio;', '''struct web_audio_ring web_audio;
static double sync_ring[8192][2], sync_stage[8192][2];
EMSCRIPTEN_KEEPALIVE uintptr_t web_sync_ptr(void) { return (uintptr_t)sync_ring; }
void web_sync_stage(int offset,int count,double pts,double rate,double speed) {
 for(int i=0;i<count && offset+i<8192;i++){sync_stage[offset+i][0]=pts+i/rate;sync_stage[offset+i][1]=speed;}
}''')
ao=replace(ao,'unsigned at = ((w+n) % WEB_AUDIO_CAPACITY)*web_audio_channels;', '''unsigned index=(w+n)%WEB_AUDIO_CAPACITY;
        sync_ring[index][0]=sync_stage[n][0];sync_ring[index][1]=sync_stage[n][1];
        unsigned at=index*web_audio_channels;''')
buffer=read(native/'build/sources/mpv/audio/out/buffer.c')
buffer=replace(buffer,'static int read_buffer(', 'extern void web_sync_stage(int,int,double,double,double);\nstatic int read_buffer(')
buffer=replace(buffer,'        mp_aframe_skip_samples(p->pending, copy);','        web_sync_stage(pos,copy,mp_aframe_get_pts(p->pending),mp_aframe_get_effective_rate(p->pending),mp_aframe_get_speed(p->pending));\n        mp_aframe_skip_samples(p->pending, copy);')
archive=out/'libmpv-unified.a';original=native/'build/prefix/lib/libmpv.a';record['inputs'][str(original)]=hashlib.sha256(original.read_bytes()).hexdigest();shutil.copy2(original,archive)
for suffix,source,name in [('audio/out/ao_browser.c',ao,'ao'),('audio/out/buffer.c',buffer,'buffer')]:
 obj,member=compile_source(suffix,source,name);named=out/member;shutil.copy2(obj,named);run([sdk/'upstream/bin/llvm-ar','r',archive,named])
# Each Wasm instance retains one selected rendering mode for its lifetime.
mode=out/'mode.c';mode.write_text('''#include <emscripten.h>
#include <stdatomic.h>
static _Atomic int mode, locked;
EMSCRIPTEN_KEEPALIVE int web_set_render_mode(int value) {
 if(value<0||value>2||atomic_load(&locked))return -1;
 atomic_store(&mode,value);return 0;
}
int web_unified_render_mode(void){atomic_store(&locked,1);return atomic_load(&mode);}
''')
vo=read(root/'experiments/retained-subtitles/vo_libmpv.c')
vo=replace(vo,'static int preinit(struct vo *vo)\n{','''static int preinit(struct vo *vo)
{
    extern int web_unified_render_mode(void);
    static struct vo_driver selected_driver;
    selected_driver=*vo->driver;
    if(web_unified_render_mode()==0)selected_driver.caps=0;
    vo->driver=&selected_driver;''')
vo_obj,_=compile_source('/vo_libmpv.c',vo,'vo')
yuv=read(root/'native/yuv-backend.c')
yuv=replace(yuv,'static int render(struct render_backend *ctx,mpv_render_param *params,struct vo_frame *frame){','''static int render(struct render_backend *ctx,mpv_render_param *params,struct vo_frame *frame){
 extern int web_unified_render_mode(void);
 if(web_unified_render_mode()!=1)return render_backend_rgb.render(&((struct priv*)ctx->priv)->rgb,params,frame);''')
yuv_obj,_=compile_source('/libmpv_sw.c',yuv,'yuv')
rgb_obj,_=compile_source('/libmpv_sw.c',read(native/'build/sources/mpv/video/out/libmpv_sw.c'),'rgb',['-Drender_backend_sw=render_backend_rgb'])
libs=shlex.split(subprocess.check_output(['pkg-config','--cflags','--libs','--static','mpv'],env=env,text=True))
for i,value in enumerate(libs):
 if value=='-lmpv':libs[i]=str(archive)
 elif value in ['-lavcodec','-lavformat','-lavfilter','-lavutil','-lswresample','-lswscale']:libs[i]=str(native/'build/obj-software-full-ffmpeg'/('lib'+value[2:])/('lib'+value[2:]+'.a'))
inputs=[root/'experiments/retained-subtitles/player.c',root/'native/events.c',root/'native/stream_bridge.c',root/'native/subtitles/bitmap.c',root/'native/vd_browser.c']
simd=[root/'native/simd'/name for name in ['h264-chroma.c','h264-biweight.c','h264-deblock.c','h264-dsp.c','h264-qpel.c']]
exports=['web_create','web_command_args','web_event','web_render','web_presented','web_destroy','web_audio_ptr','web_sync_ptr','web_set_render_mode','malloc','free']
cmd=[sdk/'upstream/emscripten/emcc','-O2','--profiling-funcs','-pthread','-msimd128','-I'+str(root/'native'),'-I'+str(native/'build/sources/mpv'),'-I'+str(native/'build/obj-mpv'),'-I'+str(native/'build/sources/ffmpeg'),*inputs,mode,vo_obj,yuv_obj,rgb_obj,*simd,'-Wl,--wrap=ff_h264chroma_init','-Wl,--wrap=ff_h264dsp_init','-Wl,--wrap=ff_h264qpel_init',*libs,native/'build/prefix-playback/lib/libdav1d.a',native/'build/prefix-playback/lib/libzimg.a','-lstdc++','-fexceptions','-Wl,-Map,'+str(out/'unified.map'),'-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=createEngine','-sENVIRONMENT=worker','-sPTHREAD_POOL_SIZE=8','-sPTHREAD_POOL_SIZE_STRICT=2','-sINITIAL_MEMORY=134217728','-sMAXIMUM_MEMORY=1073741824','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sDEFAULT_PTHREAD_STACK_SIZE=2097152','-sWASM_BIGINT=1','-sWASMFS=1','-sFORCE_FILESYSTEM=1','-sEXIT_RUNTIME=0','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+x for x in exports]),'-sEXPORTED_RUNTIME_METHODS='+json.dumps(['ccall','UTF8ToString','FS','PThread','HEAPU8','HEAPU32','HEAPF32']),'-o',out/'player.mjs']
for file in [*inputs,*simd,*[Path(x) for x in libs if str(x).endswith('.a')]]:record['inputs'][str(file)]=hashlib.sha256(file.read_bytes()).hexdigest()
try:run(cmd)
finally:(out/'build-record.json').write_text(json.dumps(record,indent=2)+'\n')
record['outputs']={name:{'bytes':(out/name).stat().st_size,'sha256':hashlib.sha256((out/name).read_bytes()).hexdigest()} for name in ['player.mjs','player.wasm']}
(out/'build-record.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record['outputs'],indent=2))
