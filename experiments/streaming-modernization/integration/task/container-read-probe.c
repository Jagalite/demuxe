// SPDX-License-Identifier: GPL-2.0-or-later
// A real MOV parser + software decoder test, not mpv/browser playback proof.
#include "rewind-reader.h"
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/mem.h>
struct input {FILE *file;const char *names[2];int phase,chunk;};
static int read_input(void *opaque,uint8_t *buf,int cap){
 struct input *r=opaque;
 for(;;){
  if(!r->file){if(r->phase==2)return AVERROR_EOF;r->file=fopen(r->names[r->phase],"rb");if(!r->file)return AVERROR(EIO);}
  int n=fread(buf,1,cap>r->chunk?r->chunk:cap,r->file);if(n)return n;
  if(ferror(r->file))return AVERROR(EIO);
  fclose(r->file);r->file=NULL;r->phase++;
 }
}
static int frames;
static void receive(AVCodecContext *decoder,AVFrame *frame){int r;while((r=avcodec_receive_frame(decoder,frame))>=0){assert(frame->width==320&&frame->height==180);frames++;av_frame_unref(frame);}assert(r==AVERROR(EAGAIN)||r==AVERROR_EOF);}
int main(int argc,char **argv){
 assert(argc==4);int chunk=atoi(argv[3]);assert(chunk>0);
 struct input in={.names={argv[1],argv[2]},.chunk=chunk};
 struct demuxe_rewind_reader *rewind=av_mallocz(sizeof(*rewind));assert(rewind);rewind->opaque=&in;rewind->read=read_input;
 AVFormatContext *f=avformat_alloc_context();assert(f);
 AVIOContext *pb=avio_alloc_context(av_malloc(32768),32768,0,rewind,demuxe_rewind_read,NULL,demuxe_rewind_seek);assert(pb);pb->seekable=0;
 f->pb=pb;f->flags|=AVFMT_FLAG_CUSTOM_IO;
 assert(avformat_open_input(&f,"",av_find_input_format("mov"),NULL)>=0);
 assert(f->nb_streams==1);AVCodecParameters *parameters=f->streams[0]->codecpar;
 assert(parameters->extradata_size==46&&parameters->extradata[0]==1);
 AVCodecContext *decoder=avcodec_alloc_context3(avcodec_find_decoder(parameters->codec_id));assert(decoder);
 assert(avcodec_parameters_to_context(decoder,parameters)>=0);decoder->thread_count=1;assert(avcodec_open2(decoder,NULL,NULL)>=0);
 AVPacket *packet=av_packet_alloc();AVFrame *frame=av_frame_alloc();int r,packets=0;
 while((r=av_read_frame(f,packet))>=0){assert(avcodec_send_packet(decoder,packet)>=0);receive(decoder,frame);packets++;av_packet_unref(packet);}
 assert(r==AVERROR_EOF);assert(avcodec_send_packet(decoder,NULL)>=0);receive(decoder,frame);assert(frames==48&&packets==48);
 printf("{\"chunk\":%d,\"extradata\":%d,\"packets\":%d,\"decodedFrames\":%d,\"passed\":true}\n",chunk,parameters->extradata_size,packets,frames);
 if(in.file)fclose(in.file);avcodec_free_context(&decoder);av_packet_free(&packet);av_frame_free(&frame);f->pb=NULL;avformat_close_input(&f);av_freep(&pb->buffer);avio_context_free(&pb);av_free(rewind);return 0;
}
