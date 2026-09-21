// SPDX-License-Identifier: Apache-2.0
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <libavcodec/avcodec.h>
static uint32_t checksum;
static int count;
static int drain(AVCodecContext *c, AVFrame *f) {
 int r;
 while ((r=avcodec_receive_frame(c,f))>=0) {
  for(int y=0;y<f->height;y++)for(int x=0;x<f->width;x++)checksum=checksum*16777619u ^ f->data[0][y*f->linesize[0]+x];
  count++;av_frame_unref(f);
 }
 return r==AVERROR(EAGAIN)||r==AVERROR_EOF?0:r;
}
uint32_t get_checksum(void){return checksum;}
int decode_fixture(const uint8_t *input,int length) {
 checksum=2166136261u;count=0;
 const AVCodec *codec=avcodec_find_decoder(AV_CODEC_ID_H264);
 if(!codec)return -100;
 AVCodecContext *c=avcodec_alloc_context3(codec);AVCodecParserContext *p=av_parser_init(AV_CODEC_ID_H264);AVPacket *packet=av_packet_alloc();AVFrame *f=av_frame_alloc();
 uint8_t *data=av_mallocz(length+AV_INPUT_BUFFER_PADDING_SIZE);memcpy(data,input,length);
 c->thread_count=2;c->thread_type=FF_THREAD_SLICE;
 int result=avcodec_open2(c,codec,0),left=length;uint8_t *cursor=data;
 if(result<0)goto done;
 while(left>0){
  int n=av_parser_parse2(p,c,&packet->data,&packet->size,cursor,left,AV_NOPTS_VALUE,AV_NOPTS_VALUE,0);
  if(n<0){result=n;goto done;}cursor+=n;left-=n;
  if(packet->size){result=avcodec_send_packet(c,packet);if(result<0)goto done;result=drain(c,f);if(result<0)goto done;}
  if(n==0&&!packet->size){result=-101;goto done;}
 }
 av_parser_parse2(p,c,&packet->data,&packet->size,0,0,AV_NOPTS_VALUE,AV_NOPTS_VALUE,0);
 if(packet->size){avcodec_send_packet(c,packet);drain(c,f);}
 avcodec_send_packet(c,0);drain(c,f);result=count;
done:av_free(data);av_frame_free(&f);av_packet_free(&packet);av_parser_close(p);avcodec_free_context(&c);return result;
}
