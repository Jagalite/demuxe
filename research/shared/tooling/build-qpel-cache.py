# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,os,shutil,sys
out=pathlib.Path(sys.argv[1]).resolve();build=pathlib.Path('build/research-qpel-cache').resolve();build.mkdir(exist_ok=True);src=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/sources/ffmpeg');obj=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/obj-software-full-ffmpeg');tool=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14/upstream/emscripten');env=dict(os.environ,EM_CONFIG=str(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/emscripten.config').resolve()),EM_CACHE=str(pathlib.Path('build/research-prefix-emcache').resolve()))
original=(src/'libavcodec/h264qpel.c').read_text();decl='''
#include <string.h>
#include <stdint.h>
static qpel_mc_func demuxe_original[4][16];
static struct { int valid,n,phase; const uint8_t *ptr; ptrdiff_t stride; uint8_t key[441], output[256]; } demuxe_cache[512];
static int demuxe_calls,demuxe_hits;
void ff_demuxe_cache_reset(void){memset(demuxe_cache,0,sizeof(demuxe_cache));demuxe_calls=demuxe_hits=0;}
int ff_demuxe_cache_calls(void){return demuxe_calls;}
int ff_demuxe_cache_hits(void){return demuxe_hits;}
static void demuxe_run(uint8_t *dst,const uint8_t *src,ptrdiff_t stride,int index,int phase){
 int n=16>>index,k=n+5; uint8_t key[441];unsigned hash=2166136261u;
 demuxe_calls++;
 for(int y=0;y<k;y++){memcpy(key+y*k,src+(y-2)*stride-2,k);for(int x=0;x<k;x++)hash=(hash^key[y*k+x])*16777619u;}
 hash^=(unsigned)(uintptr_t)src;hash^=phase*31+n;unsigned slot=hash&511;
 if(demuxe_cache[slot].valid&&demuxe_cache[slot].n==n&&demuxe_cache[slot].phase==phase&&demuxe_cache[slot].ptr==src&&demuxe_cache[slot].stride==stride&&!memcmp(demuxe_cache[slot].key,key,k*k)){
  demuxe_hits++;for(int y=0;y<n;y++)memcpy(dst+y*stride,demuxe_cache[slot].output+y*n,n);return;
 }
 demuxe_original[index][phase](dst,src,stride);
 demuxe_cache[slot].valid=1;demuxe_cache[slot].n=n;demuxe_cache[slot].phase=phase;demuxe_cache[slot].ptr=src;demuxe_cache[slot].stride=stride;memcpy(demuxe_cache[slot].key,key,k*k);
 for(int y=0;y<n;y++)memcpy(demuxe_cache[slot].output+y*n,dst+y*stride,n);
}
'''
for index in range(4):
 for phase in range(1,16):decl+=f'static void demuxe_{index}_{phase}(uint8_t*d,const uint8_t*s,ptrdiff_t stride){{demuxe_run(d,s,stride,{index},{phase});}}\n'
install='\nif(bit_depth==8){\n'
for i in range(4):
 for ph in range(1,16):install+=f'demuxe_original[{i}][{ph}]=c->put_h264_qpel_pixels_tab[{i}][{ph}];c->put_h264_qpel_pixels_tab[{i}][{ph}]=demuxe_{i}_{ph};\n'
install+='}\n'
candidate=original.replace('av_cold void ff_h264qpel_init',decl+'\nav_cold void ff_h264qpel_init',1);at=candidate.rfind('}');candidate=candidate[:at]+install+candidate[at:]
base=original.replace('av_cold void ff_h264qpel_init','void ff_demuxe_cache_reset(void){}\nint ff_demuxe_cache_calls(void){return 0;}\nint ff_demuxe_cache_hits(void){return 0;}\nav_cold void ff_h264qpel_init',1)
bridge=pathlib.Path('research/shared/tooling/wasm-video-prefix.c').read_text().replace('static AVCodecContext','extern void ff_demuxe_cache_reset(void);\nextern int ff_demuxe_cache_calls(void), ff_demuxe_cache_hits(void);\nEMSCRIPTEN_KEEPALIVE int vd_calls(void){return ff_demuxe_cache_calls();}\nEMSCRIPTEN_KEEPALIVE int vd_hits(void){return ff_demuxe_cache_hits();}\nstatic AVCodecContext').replace('int vd_init(void){vd_close();','int vd_init(void){vd_close();ff_demuxe_cache_reset();');(out/'bridge.c').write_text(bridge)
link=json.loads(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/build-result.json').read_text())['command'];records=[]
def run(cmd):
 r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=180);records.append({'command':cmd,'exit':r.returncode,'stderr':r.stderr});(out/'build-result.json').write_text(json.dumps(records,indent=2)+'\n');assert r.returncode==0,r.stderr
for mode,text in [('baseline',base),('candidate',candidate)]:
 d=out/mode;d.mkdir(exist_ok=True);c=d/'h264qpel.c';c.write_text(text);o=build/mode/'h264qpel.o';o.parent.mkdir(exist_ok=True)
 run([str(tool/'emcc'),'-O3','-pthread','-msimd128','-std=c17','-DHAVE_AV_CONFIG_H','-D_ISOC11_SOURCE','-D_FILE_OFFSET_BITS=64','-D_LARGEFILE_SOURCE','-D_POSIX_C_SOURCE=200112','-D_XOPEN_SOURCE=600','-DZLIB_CONST','-I'+str(obj),'-I'+str(src),'-I'+str(src/'libavcodec'),'-I'+str(src/'compat/stdbit'),'-fno-math-errno','-fno-signed-zeros','-c',str(c),'-o',str(o)])
 archive=o.parent/'libavcodec.a';shutil.copyfile(obj/'libavcodec/libavcodec.a',archive);run([str(tool/'emar'),'r',str(archive),str(o)])
 cmd=[str(out/'bridge.c') if x=='research/shared/tooling/wasm-video-prefix.c' else str(archive) if x==str(obj/'libavcodec/libavcodec.a') else str(d/'decoder.mjs') if x.endswith('/decoder.mjs') else x for x in link];run(cmd)
print('both qpel variants built')
