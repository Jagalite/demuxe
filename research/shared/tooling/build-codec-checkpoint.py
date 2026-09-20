# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,os,sys
out=pathlib.Path(sys.argv[1]).resolve();s=pathlib.Path('research/shared/tooling/wasm-video-prefix.c').read_text().replace('static AVCodecContext *ctx;','static AVCodecContext *ctx,*saved;\nextern int ff_h264_update_thread_context(AVCodecContext*,const AVCodecContext*);')
s=s.replace('int vd_close(void){','int vd_close(void){avcodec_free_context(&saved);')
s+='''
static AVCodecContext *clone_state(const AVCodecContext *source,int *error){
    AVCodecContext *copy=avcodec_alloc_context3(&ff_h264_decoder);
    AVCodecParameters *parameters=avcodec_parameters_alloc();
    if(!copy||!parameters){*error=-1;goto fail;}
    *error=avcodec_parameters_from_context(parameters,source);if(*error<0)goto fail;
    *error=avcodec_parameters_to_context(copy,parameters);if(*error<0)goto fail;
    copy->thread_count=1;copy->pkt_timebase=source->pkt_timebase;
    *error=avcodec_open2(copy,&ff_h264_decoder,0);if(*error<0)goto fail;
    *error=ff_h264_update_thread_context(copy,source);if(*error<0)goto fail;
    avcodec_parameters_free(&parameters);return copy;
fail: avcodec_parameters_free(&parameters);avcodec_free_context(&copy);return 0;
}
EMSCRIPTEN_KEEPALIVE int vd_save(void){int error=0;if(!ctx)return -1;avcodec_free_context(&saved);saved=clone_state(ctx,&error);return saved?0:error;}
EMSCRIPTEN_KEEPALIVE int vd_restore(void){int error=0;if(!saved)return -1;AVCodecContext *next=clone_state(saved,&error);if(!next)return error;avcodec_free_context(&ctx);ctx=next;av_frame_unref(frame);return 0;}
EMSCRIPTEN_KEEPALIVE int vd_drop(void){avcodec_free_context(&saved);return 0;}
''';(out/'bridge.c').write_text(s)
cmd=json.loads(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/build-result.json').read_text())['command'];cmd=[str(out/'bridge.c') if x=='research/shared/tooling/wasm-video-prefix.c' else str(out/'decoder.mjs') if x.endswith('/decoder.mjs') else x for x in cmd];env=dict(os.environ,EM_CONFIG=str(pathlib.Path('research/shared/runs/20260919T230620Z-software-prefix-libraries/emscripten.config').resolve()),EM_CACHE=str(pathlib.Path('build/research-prefix-emcache').resolve()));r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=180);(out/'build-result.json').write_text(json.dumps({'command':cmd,'exit':r.returncode,'stderr':r.stderr},indent=2)+'\n');assert r.returncode==0,r.stderr;print('codec-aware checkpoint built')
