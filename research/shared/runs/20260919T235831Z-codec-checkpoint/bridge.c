// SPDX-License-Identifier: Apache-2.0
#include <libavcodec/avcodec.h>
#include <libavutil/pixfmt.h>
#include <emscripten.h>
extern const AVCodec ff_h264_decoder;
static AVCodecContext *ctx,*saved;
extern int ff_h264_update_thread_context(AVCodecContext*,const AVCodecContext*);static AVFrame *frame;
EM_JS(void,emit,(unsigned char *y,unsigned char *u,unsigned char *v,int sy,int su,int sv,int w,int h,int pts),{Module.onFrame(y,u,v,sy,su,sv,w,h,pts);});
int vd_close(void){avcodec_free_context(&saved);av_frame_free(&frame);avcodec_free_context(&ctx);return 0;}
int vd_init(void){vd_close();ctx=avcodec_alloc_context3(&ff_h264_decoder);if(!ctx)return -1;ctx->thread_count=1;ctx->pkt_timebase=(AVRational){1,1000000};frame=av_frame_alloc();return avcodec_open2(ctx,&ff_h264_decoder,0);}
int vd_packet(unsigned char *data,int size,int pts){AVPacket *p=av_packet_alloc();if(!p)return -1;int r=av_new_packet(p,size);if(r<0){av_packet_free(&p);return r;}memcpy(p->data,data,size);p->pts=p->dts=pts;r=avcodec_send_packet(ctx,p);av_packet_free(&p);if(r<0)return r;while((r=avcodec_receive_frame(ctx,frame))>=0){if(frame->format!=AV_PIX_FMT_YUV420P)return -99;emit(frame->data[0],frame->data[1],frame->data[2],frame->linesize[0],frame->linesize[1],frame->linesize[2],frame->width,frame->height,(int)frame->pts);av_frame_unref(frame);}return r==AVERROR(EAGAIN)||r==AVERROR_EOF?0:r;}
int vd_flush(void){int r=avcodec_send_packet(ctx,0);if(r<0)return r;while((r=avcodec_receive_frame(ctx,frame))>=0){emit(frame->data[0],frame->data[1],frame->data[2],frame->linesize[0],frame->linesize[1],frame->linesize[2],frame->width,frame->height,(int)frame->pts);av_frame_unref(frame);}return r==AVERROR_EOF?0:r;}

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
