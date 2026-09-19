// SPDX-License-Identifier: Apache-2.0
#include <libavcodec/avcodec.h>
#include <libavutil/channel_layout.h>
#include <emscripten.h>
#include <string.h>
static AVCodecContext *ctx;static AVFrame *frame;
EM_JS(void,emit_pcm,(int a,int b,int n,int fmt),{if(fmt!==6)throw Error('Expected signed16 planar');const h=HEAP16,pcm=new Int16Array(n*2);for(let i=0;i<n;i++){pcm[i*2]=h[(a>>1)+i];pcm[i*2+1]=h[(b>>1)+i];}Module.chunks.push(pcm);});
void close_decoder(void){av_frame_free(&frame);avcodec_free_context(&ctx);}
int open_decoder(int kind,const uint8_t *extra,int size){close_decoder();if(size<0||size>65536)return -1;const AVCodec*c=avcodec_find_decoder(kind?AV_CODEC_ID_FLAC:AV_CODEC_ID_ALAC);if(!c)return -2;ctx=avcodec_alloc_context3(c);if(!ctx)return -3;ctx->sample_rate=48000;av_channel_layout_default(&ctx->ch_layout,2);ctx->extradata=av_mallocz(size+AV_INPUT_BUFFER_PADDING_SIZE);if(!ctx->extradata)return -4;memcpy(ctx->extradata,extra,size);ctx->extradata_size=size;frame=av_frame_alloc();return avcodec_open2(ctx,c,NULL);}
int decode_packet(const uint8_t *data,int size){if(!ctx||size<0||size>1048576)return -1;AVPacket*p=av_packet_alloc();if(!p)return -2;int ret=av_new_packet(p,size);if(ret<0){av_packet_free(&p);return ret;}memcpy(p->data,data,size);ret=avcodec_send_packet(ctx,p);av_packet_free(&p);if(ret<0)return ret;while((ret=avcodec_receive_frame(ctx,frame))>=0){if(frame->ch_layout.nb_channels!=2||frame->format!=AV_SAMPLE_FMT_S16P)return -3;emit_pcm((int)frame->data[0],(int)frame->data[1],frame->nb_samples,frame->format);av_frame_unref(frame);}return ret==AVERROR(EAGAIN)||ret==AVERROR_EOF?0:ret;}
