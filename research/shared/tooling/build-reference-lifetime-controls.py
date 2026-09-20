# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,os,sys
out=pathlib.Path(sys.argv[1]).resolve();s=pathlib.Path('research/shared/tooling/wasm-video-prefix.c').read_text();s=s.replace('#include <libavutil/pixfmt.h>','#include <libavutil/pixfmt.h>\n#include <libavcodec/h264dec.h>')
s+='''
EMSCRIPTEN_KEEPALIVE int vd_prune(int unsafe){
 if(!ctx)return -1;H264Context*h=ctx->priv_data;int freed=0;
 for(int i=unsafe?0:1;i<h->short_ref_count;i++){
  H264Picture*p=h->short_ref[i];AVFrame*f=p->f;
  if(!f||!f->buf[0]||f->buf[0]->size<=1||(av_buffer_get_ref_count(f->buf[0])!=1&&!unsafe))continue;
  AVBufferRef*marker=av_buffer_alloc(1);if(!marker)return -2;
  int frame_num=p->frame_num,poc=p->poc,reference=p->reference;
  freed+=f->buf[0]->size;
  for(int j=0;j<AV_NUM_DATA_POINTERS;j++){av_buffer_unref(&f->buf[j]);f->data[j]=0;}
  f->buf[0]=marker;
  if(frame_num!=p->frame_num||poc!=p->poc||reference!=p->reference)return -3;
 }
 return freed;
}
EMSCRIPTEN_KEEPALIVE int vd_pixels(void){
 if(!ctx)return 0;H264Context*h=ctx->priv_data;int bytes=0;
 for(int i=0;i<h->short_ref_count;i++){AVFrame*f=h->short_ref[i]->f;if(f&&f->buf[0])bytes+=f->buf[0]->size;}
 return bytes;
}
EMSCRIPTEN_KEEPALIVE int vd_metadata(void){if(!ctx)return 0;return ((H264Context*)ctx->priv_data)->short_ref_count;}
''';(out/'bridge.c').write_text(s)
cmd=json.loads(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/build-result.json').read_text())['command'];cmd=[str(out/'bridge.c') if x=='research/shared/tooling/wasm-video-prefix.c' else str(out/'decoder.mjs') if x.endswith('/decoder.mjs') else x for x in cmd];cmd.insert(1,'-DHAVE_AV_CONFIG_H');env=dict(os.environ,EM_CONFIG=str(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/emscripten.config').resolve()),EM_CACHE=str(pathlib.Path('build/research-prefix-emcache').resolve()));r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=180);(out/'build-result.json').write_text(json.dumps({'command':cmd,'exit':r.returncode,'stderr':r.stderr},indent=2)+'\n');assert r.returncode==0,r.stderr;print('reference lifetime bridge built')
