// SPDX-License-Identifier: Apache-2.0
#include <libavcodec/avcodec.h>
#include <libavutil/pixfmt.h>
#include <libavcodec/h264dec.h>
#include <emscripten.h>
extern const AVCodec ff_h264_decoder;
static AVCodecContext *ctx;static AVFrame *frame;
EM_JS(void,emit,(unsigned char *y,unsigned char *u,unsigned char *v,int sy,int su,int sv,int w,int h,int pts),{Module.onFrame(y,u,v,sy,su,sv,w,h,pts);});
int vd_close(void){av_frame_free(&frame);avcodec_free_context(&ctx);return 0;}
int vd_init(void){vd_close();ctx=avcodec_alloc_context3(&ff_h264_decoder);if(!ctx)return -1;ctx->thread_count=1;ctx->pkt_timebase=(AVRational){1,1000000};frame=av_frame_alloc();return avcodec_open2(ctx,&ff_h264_decoder,0);}
int vd_packet(unsigned char *data,int size,int pts){AVPacket *p=av_packet_alloc();if(!p)return -1;int r=av_new_packet(p,size);if(r<0){av_packet_free(&p);return r;}memcpy(p->data,data,size);p->pts=p->dts=pts;r=avcodec_send_packet(ctx,p);av_packet_free(&p);if(r<0)return r;while((r=avcodec_receive_frame(ctx,frame))>=0){if(frame->format!=AV_PIX_FMT_YUV420P)return -99;emit(frame->data[0],frame->data[1],frame->data[2],frame->linesize[0],frame->linesize[1],frame->linesize[2],frame->width,frame->height,(int)frame->pts);av_frame_unref(frame);}return r==AVERROR(EAGAIN)||r==AVERROR_EOF?0:r;}
int vd_flush(void){int r=avcodec_send_packet(ctx,0);if(r<0)return r;while((r=avcodec_receive_frame(ctx,frame))>=0){emit(frame->data[0],frame->data[1],frame->data[2],frame->linesize[0],frame->linesize[1],frame->linesize[2],frame->width,frame->height,(int)frame->pts);av_frame_unref(frame);}return r==AVERROR_EOF?0:r;}

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
