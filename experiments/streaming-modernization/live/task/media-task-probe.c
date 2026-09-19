// SPDX-License-Identifier: GPL-3.0-or-later
// Actual container parsing in bounded tasks; no decoder or browser qualification.
#include "container-task.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libavutil/mathematics.h>
static int open_resource(void *o,AVFormatContext *f,AVIOContext **pb,const char *url,AVDictionary **options){return avio_open2(pb,url,AVIO_FLAG_READ,&f->interrupt_callback,options);}
static void close_resource(void *o,AVFormatContext *f,AVIOContext **pb){avio_closep(pb);}
int main(int argc,char **argv){
 if(argc!=3)return 2;
 int oversized=!strcmp(argv[1],"oversized");int subtitle=oversized||!strcmp(argv[1],"subtitle");enum AVMediaType type=subtitle?AVMEDIA_TYPE_SUBTITLE:AVMEDIA_TYPE_AUDIO;
 struct demuxe_container_task *t=demuxe_task_create_media(1,1,256*1024,(struct demuxe_task_io){.open=open_resource,.close=close_resource},type,subtitle?DEMUXE_CONTAINER_WEBVTT:DEMUXE_CONTAINER_MOV);
 if(!t)return 3;
 for(int i=0;i<3;i++){
  struct AVDemuxeSegment p={.abi=AV_DEMUXE_PLAN_ABI,.stream_index=7,.sequence=i,.offset=0,.size=-1,.init_offset=0,.init_size=-1};
  if(subtitle)snprintf(p.url,sizeof(p.url),"%s/cue-%d.vtt",argv[2],i);
  else{snprintf(p.url,sizeof(p.url),"%s/english/%03d.m4s",argv[2],i);snprintf(p.init_url,sizeof(p.init_url),"%s/english/init.mp4",argv[2]);}
  if(demuxe_task_plan(t,&p)<0)return 4;
 }
 demuxe_task_end(t);int count=0,r;int64_t last=INT64_MIN;
 for(;;){
  struct demuxe_prepared_packet p;r=demuxe_task_take(t,&p,1000);
  if(!r)continue;if(r<0)break;
  if(!demuxe_packet_codec(&p)||demuxe_packet_codec(&p)->codec_type!=type)return 5;
  int64_t pts=av_rescale_q(p.packet->pts,p.timebase,AV_TIME_BASE_Q);
  if(p.packet->pts==AV_NOPTS_VALUE||pts<last)return 6;last=pts;
  if(p.source!=1||p.request!=1||p.representation!=7)return 7;
  count++;demuxe_packet_release(&p);
 }
 struct demuxe_task_stats stats;demuxe_task_stats(t,&stats);demuxe_task_destroy(t);
 printf("{\"packets\":%d,\"lastPTS\":%lld,\"containers\":%u,\"peakPacketBytes\":%zu,\"error\":%d}\n",count,(long long)last,stats.containers,stats.peak_queued_bytes,r);
 if(oversized)return r==AVERROR(ENOBUFS)&&stats.consumed_bytes<=65537&&count==0?0:9;
 return r==AVERROR_EOF&&stats.containers==3&&count>=(subtitle?3:200)&&last>4000000&&stats.peak_queued_bytes<=256*1024?0:8;
}
