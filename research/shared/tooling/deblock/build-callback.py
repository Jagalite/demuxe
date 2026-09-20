# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,os,shutil,sys
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True);build=Path('build/research-deblock').resolve();build.mkdir(exist_ok=True);src=Path('/Volumes/seed2/Projects/webmpv/build/sources/ffmpeg');obj=Path('/Volumes/seed2/Projects/webmpv/build/obj-software-full-ffmpeg');tool=Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14/upstream/emscripten');env=dict(os.environ,EM_CONFIG=str(Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/emscripten.config').resolve()),EM_CACHE=str(Path('build/research-prefix-emcache').resolve()))
original=(src/'libavcodec/h264dsp.c').read_text();decl='''
#include <emscripten.h>
EM_JS(void,demuxe_edge,(int k,unsigned char *p,int s,int a,int b,int t0,int t1,int t2,int t3),{if(Module.onEdge)Module.onEdge(k,p,s,a,b,t0,t1,t2,t3);});
static void(*demuxe_n[2])(uint8_t*,ptrdiff_t,int,int,int8_t*);
static void(*demuxe_i[2])(uint8_t*,ptrdiff_t,int,int);
'''
for k in range(4):
 if k<2:decl+=f'static void demuxe_{k}(uint8_t*p,ptrdiff_t s,int a,int b,int8_t*t){{demuxe_edge({k},p,s,a,b,t[0],t[1],t[2],t[3]);demuxe_n[{k}](p,s,a,b,t);}}\n'
 else:decl+=f'static void demuxe_{k}(uint8_t*p,ptrdiff_t s,int a,int b){{demuxe_edge({k},p,s,a,b,0,0,0,0);demuxe_i[{k-2}](p,s,a,b);}}\n'
decl+='EMSCRIPTEN_KEEPALIVE void demuxe_replay(int k,uint8_t*p,int s,int a,int b,int t0,int t1,int t2,int t3){int8_t t[4]={t0,t1,t2,t3};if(k<2)demuxe_n[k](p,s,a,b,t);else demuxe_i[k-2](p,s,a,b);}\n'
candidate=original.replace('av_cold void ff_h264dsp_init',decl+'\nav_cold void ff_h264dsp_init',1);pos=candidate.rfind('}');install='\nif(bit_depth==8){\n'
for k,name in enumerate(['h264_v_loop_filter_luma','h264_h_loop_filter_luma','h264_v_loop_filter_luma_intra','h264_h_loop_filter_luma_intra']):install+=f'demuxe_{"n" if k<2 else "i"}[{k%2}]=c->{name};c->{name}=demuxe_{k};\n'
candidate=candidate[:pos]+install+'}\n'+candidate[pos:];(out/'h264dsp.c').write_text(candidate);shutil.copyfile(src/'COPYING.LGPLv2.1',out/'COPYING.LGPLv2.1')
bridge=Path('research/shared/tooling/wasm-video-prefix.c').read_text().replace('int vd_close(void)', 'EMSCRIPTEN_KEEPALIVE void vd_skip(int skip){ctx->skip_loop_filter=skip?AVDISCARD_ALL:AVDISCARD_DEFAULT;}\nint vd_close(void)');(out/'bridge.c').write_text(bridge);records=[]
def run(cmd):
 r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=240);records.append({'command':cmd,'exit':r.returncode,'stderr':r.stderr});(out/'build-result.json').write_text(json.dumps(records,indent=2));assert r.returncode==0,r.stderr
run([str(tool/'emcc'),'-O3','-pthread','-msimd128','-std=c17','-DHAVE_AV_CONFIG_H','-D_ISOC11_SOURCE','-D_FILE_OFFSET_BITS=64','-D_LARGEFILE_SOURCE','-D_POSIX_C_SOURCE=200112','-D_XOPEN_SOURCE=600','-DZLIB_CONST','-I'+str(obj),'-I'+str(src),'-I'+str(src/'libavcodec'),'-I'+str(src/'compat/stdbit'),'-fno-math-errno','-fno-signed-zeros','-c',str(out/'h264dsp.c'),'-o',str(build/'h264dsp.o')]);archive=build/'libavcodec.a';shutil.copyfile(obj/'libavcodec/libavcodec.a',archive);run([str(tool/'emar'),'r',str(archive),str(build/'h264dsp.o')]);link=json.loads(Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/build-result.json').read_text())['command'];run([str(out/'bridge.c') if x=='research/shared/tooling/wasm-video-prefix.c' else str(archive) if x==str(obj/'libavcodec/libavcodec.a') else str(out/'decoder.mjs') if x.endswith('/decoder.mjs') else x for x in link]);print('built')
