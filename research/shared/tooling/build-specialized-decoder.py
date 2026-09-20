# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,os,shutil,sys
out=pathlib.Path(sys.argv[1]).resolve();build=pathlib.Path('build/research-specialized-decoder').resolve();build.mkdir(exist_ok=True);src=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/sources/ffmpeg');obj=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/obj-software-full-ffmpeg');tool=pathlib.Path('/Volumes/seed2/Projects/webmpv/build/emsdk-4.0.14/upstream/emscripten');env=dict(os.environ,EM_CONFIG=str(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/emscripten.config').resolve()),EM_CACHE=str(pathlib.Path('build/research-prefix-emcache').resolve()))
original=(src/'libavcodec/h264_slice.c').read_text();guard='''    extern int demuxe_profile_rejected;
    if (h->ps.pps->cabac || h->ps.sps->bit_depth_luma != 8 || h->ps.sps->chroma_format_idc != 1 || !h->ps.sps->frame_mbs_only_flag) {
        demuxe_profile_rejected = 1;
        return AVERROR_INVALIDDATA;
    }
''';candidate=original.replace('    sl->linesize   = h->cur_pic_ptr->f->linesize[0];',guard+'    sl->linesize   = h->cur_pic_ptr->f->linesize[0];').replace('    if (h->ps.pps->cabac) {','    if (0) {');assert candidate!=original
bridge=pathlib.Path('research/shared/tooling/wasm-video-prefix.c').read_text().replace('static AVCodecContext','int demuxe_profile_rejected;\nstatic AVCodecContext').replace('int vd_init(void){vd_close();','int vd_init(void){vd_close();demuxe_profile_rejected=0;').replace('av_packet_free(&p);if(r<0)return r;while','av_packet_free(&p);if(demuxe_profile_rejected)return -199;if(r<0)return r;while');(out/'bridge.c').write_text(bridge)
link=json.loads(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/build-result.json').read_text())['command'];records=[]
def run(cmd):
 r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=180);records.append({'command':cmd,'exit':r.returncode,'stderr':r.stderr});(out/'build-result.json').write_text(json.dumps(records,indent=2)+'\n');assert r.returncode==0,r.stderr
for mode,text in [('baseline',original),('specialized',candidate)]:
 d=out/mode;d.mkdir(exist_ok=True);c=d/'h264_slice.c';c.write_text(text);o=build/mode/'h264_slice.o';o.parent.mkdir(exist_ok=True)
 cmd=[str(tool/'emcc'),'-O3','-pthread','-msimd128','-std=c17','-D_ISOC11_SOURCE','-D_FILE_OFFSET_BITS=64','-D_LARGEFILE_SOURCE','-D_POSIX_C_SOURCE=200112','-D_XOPEN_SOURCE=600','-DZLIB_CONST','-I'+str(obj),'-I'+str(src),'-I'+str(src/'libavcodec'),'-I'+str(src/'compat/stdbit'),'-fno-math-errno','-fno-signed-zeros','-c',str(c),'-o',str(o)];run(cmd)
 archive=o.parent/'libavcodec.a';shutil.copyfile(obj/'libavcodec/libavcodec.a',archive);run([str(tool/'emar'),'r',str(archive),str(o)])
 cmd=[str(out/'bridge.c') if x=='research/shared/tooling/wasm-video-prefix.c' else str(archive) if x==str(obj/'libavcodec/libavcodec.a') else str(d/'decoder.mjs') if x.endswith('/decoder.mjs') else x for x in link];run(cmd)
print(json.dumps({mode:(out/mode/'decoder.wasm').stat().st_size for mode in ['baseline','specialized']}))
