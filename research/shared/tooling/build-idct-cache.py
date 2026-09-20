# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,os,shutil,sys
out=pathlib.Path(sys.argv[1]).resolve();build=pathlib.Path('build/research-idct-cache').resolve();build.mkdir(exist_ok=True);src=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/sources/ffmpeg');obj=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/obj-software-full-ffmpeg');tool=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14/upstream/emscripten');env=dict(os.environ,EM_CONFIG=str(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/emscripten.config').resolve()),EM_CACHE=str(pathlib.Path('build/research-prefix-emcache').resolve()))
original=(src/'libavcodec/h264idct_template.c').read_text();decl='''
#if BIT_DEPTH == 8
static struct { int valid; int16_t key[16]; int residual[16]; } demuxe_cache[1024];
static int demuxe_calls, demuxe_hits;
void ff_demuxe_cache_reset(void) { memset(demuxe_cache, 0, sizeof(demuxe_cache)); demuxe_calls=demuxe_hits=0; }
int ff_demuxe_cache_calls(void) { return demuxe_calls; }
int ff_demuxe_cache_hits(void) { return demuxe_hits; }
#endif
'''
lookup='''
#if BIT_DEPTH == 8
    unsigned hash=2166136261u;
    int cache_slot;
    int non_dc=0;
    for(i=1;i<16;i++) non_dc |= block[i];
    if (non_dc) {
        demuxe_calls++;
        for(i=0;i<16;i++) hash=(hash^(uint16_t)block[i])*16777619u;
        cache_slot=hash&1023;
        if(demuxe_cache[cache_slot].valid && !memcmp(demuxe_cache[cache_slot].key,block,32)) {
            demuxe_hits++;
            for(i=0;i<16;i++) dst[(i>>2)*stride+(i&3)]=av_clip_pixel(dst[(i>>2)*stride+(i&3)]+demuxe_cache[cache_slot].residual[i]);
            memset(block,0,32);return;
        }
        memcpy(demuxe_cache[cache_slot].key,block,32);demuxe_cache[cache_slot].valid=1;
    }
#endif
'''
candidate=original.replace('void FUNCC(ff_h264_idct_add)',decl+'\nvoid FUNCC(ff_h264_idct_add)',1).replace('    block[0] += 1 << 5;',lookup+'\n    block[0] += 1 << 5;',1)
for n,expr in enumerate(['z0 + z3','z1 + z2','z1 - z2','z0 - z3']):
 line=f'        dst[i + {n}*stride]= av_clip_pixel(dst[i + {n}*stride] + ((int)({expr}) >> 6));'
 assert line in candidate
 candidate=candidate.replace(line,line+f'\n#if BIT_DEPTH == 8\n        if(non_dc) demuxe_cache[cache_slot].residual[{n}*4+i]=((int)({expr}) >> 6);\n#endif',1)
base=original.replace('void FUNCC(ff_h264_idct_add)','''#if BIT_DEPTH == 8
void ff_demuxe_cache_reset(void) {}
int ff_demuxe_cache_calls(void) { return 0; }
int ff_demuxe_cache_hits(void) { return 0; }
#endif
void FUNCC(ff_h264_idct_add)''',1)
bridge=pathlib.Path('research/shared/tooling/wasm-video-prefix.c').read_text().replace('static AVCodecContext','extern void ff_demuxe_cache_reset(void);\nextern int ff_demuxe_cache_calls(void), ff_demuxe_cache_hits(void);\nEMSCRIPTEN_KEEPALIVE int vd_calls(void){return ff_demuxe_cache_calls();}\nEMSCRIPTEN_KEEPALIVE int vd_hits(void){return ff_demuxe_cache_hits();}\nstatic AVCodecContext').replace('int vd_init(void){vd_close();','int vd_init(void){vd_close();ff_demuxe_cache_reset();');(out/'bridge.c').write_text(bridge)
link=json.loads(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/build-result.json').read_text())['command'];records=[]
def run(cmd):
 r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=180);records.append({'command':cmd,'exit':r.returncode,'stderr':r.stderr});(out/'build-result.json').write_text(json.dumps(records,indent=2)+'\n');assert r.returncode==0,r.stderr
for mode,text in [('baseline',base),('candidate',candidate)]:
 d=out/mode;d.mkdir(exist_ok=True);(d/'h264idct_template.c').write_text(text);c=d/'h264idct.c';c.write_text((src/'libavcodec/h264idct.c').read_text());o=build/mode/'h264idct.o';o.parent.mkdir(exist_ok=True)
 run([str(tool/'emcc'),'-O3','-pthread','-msimd128','-std=c17','-DHAVE_AV_CONFIG_H','-D_ISOC11_SOURCE','-D_FILE_OFFSET_BITS=64','-D_LARGEFILE_SOURCE','-D_POSIX_C_SOURCE=200112','-D_XOPEN_SOURCE=600','-DZLIB_CONST','-I'+str(obj),'-I'+str(src),'-I'+str(src/'libavcodec'),'-I'+str(src/'compat/stdbit'),'-fno-math-errno','-fno-signed-zeros','-c',str(c),'-o',str(o)])
 archive=o.parent/'libavcodec.a';shutil.copyfile(obj/'libavcodec/libavcodec.a',archive);run([str(tool/'emar'),'r',str(archive),str(o)])
 cmd=[str(out/'bridge.c') if x=='research/shared/tooling/wasm-video-prefix.c' else str(archive) if x==str(obj/'libavcodec/libavcodec.a') else str(d/'decoder.mjs') if x.endswith('/decoder.mjs') else x for x in link];run(cmd)
print('both exact residual-cache variants built')
