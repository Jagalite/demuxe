// SPDX-License-Identifier: GPL-2.0-or-later
#include "adaptive-session.h"
#include <stdio.h>
#include <stdlib.h>
#include <libavutil/time.h>
#include <libavutil/mathematics.h>
static int open_resource(void *o,AVFormatContext *f,AVIOContext **pb,const char *url,AVDictionary **options){return avio_open2(pb,url,AVIO_FLAG_READ,&f->interrupt_callback,options);}
static void close_resource(void *o,AVFormatContext *f,AVIOContext **pb){avio_closep(pb);}
int main(int argc,char **argv){
 if(argc!=3)return 2;int fault=atoi(argv[2]),wait_test=fault==2;fault=wait_test?0:fault;AVFormatContext *f=NULL;AVDictionary *options=NULL;
 av_dict_set(&options,"demuxe_sparse","1",0);av_dict_set(&options,"strict_io","1",0);
 int r=avformat_open_input(&f,argv[1],NULL,&options);av_dict_free(&options);if(r<0)return 3;
 f->probesize=32;f->max_analyze_duration=1;if(avformat_find_stream_info(f,NULL)<0)return 4;
 int video=-1,audio=-1,subtitle=-1,qualities[8],count=0;
 for(unsigned i=0;i<f->nb_streams;i++){
  struct AVDemuxeRepresentation d;if(!av_demuxe_hls_representation(f,i,&d)&&count<8)qualities[count++]=i;
  enum AVMediaType t=f->streams[i]->codecpar->codec_type;
  if(t==AVMEDIA_TYPE_VIDEO&&video<0)video=i;if(t==AVMEDIA_TYPE_AUDIO)audio=i;if(t==AVMEDIA_TYPE_SUBTITLE)subtitle=i;
 }
 if(video<0||audio<0||subtitle<0||count!=3)return 5;
 for(unsigned i=0;i<f->nb_streams;i++)f->streams[i]->discard=(i==video||i==audio||i==subtitle)?AVDISCARD_DEFAULT:AVDISCARD_ALL;
 struct demuxe_adaptive_session *s=demuxe_adaptive_create(f,video,video,1,(struct demuxe_task_io){.open=open_resource,.close=close_resource});if(!s)return 6;
 int code=0,requested=0,terminal=0,video_packets=0,audio_packets=0,subtitle_packets=0;
 int calls=0;int64_t v=0,a=0,lead=0,deadline=av_gettime_relative()+(wait_test?350000:15000000);
 while(av_gettime_relative()<deadline){
  struct demuxe_prepared_packet p;calls++;r=demuxe_adaptive_read(s,&p);
  if(r<0){terminal=r;if(!fault||r==AVERROR_EOF||r==AVERROR_EXIT)code=7;break;}
  if(!r){if(!wait_test)av_usleep(1000);continue;}
  int64_t pts=av_rescale_q(p.packet->pts,p.timebase,AV_TIME_BASE_Q);
  if(p.packet->stream_index==video){v=pts;video_packets++;if(v-a>lead)lead=v-a;}
  if(p.packet->stream_index==audio){a=pts;audio_packets++;}
  if(p.packet->stream_index==subtitle)subtitle_packets++;
  demuxe_packet_release(&p);if(wait_test){code=12;break;}av_usleep(1000); // controlled consumer pacing, not a throughput benchmark
  if(!fault&&lead>250000){code=8;break;}
  struct demuxe_adaptive_stats stats;demuxe_adaptive_stats(s,&stats);
  if(!fault&&requested<3&&stats.accepted_switches==(unsigned)requested&&v>500000+requested*2500000){
   int target=(int[]){2,1,0}[requested];requested++;
   if(demuxe_adaptive_request(s,1,requested,qualities[target])<0){code=9;break;}
  }
  if(v>8500000&&a>8000000)break;
 }
 struct demuxe_adaptive_stats stats;demuxe_adaptive_stats(s,&stats);
 if(wait_test){if(calls>100)code=11;}
 else if(!code&&(fault?terminal>=0:stats.accepted_switches!=3||v<8500000||a<8000000||!subtitle_packets))code=10;
 printf("{\"readCalls\":%d,\"video\":%d,\"audio\":%d,\"subtitles\":%d,\"videoTimeUs\":%lld,\"audioTimeUs\":%lld,\"maxVideoLeadUs\":%lld,\"switches\":%u,\"terminal\":%d,\"error\":%d}\n",calls,video_packets,audio_packets,subtitle_packets,(long long)v,(long long)a,(long long)lead,stats.accepted_switches,terminal,code);
 demuxe_adaptive_destroy(s);avformat_close_input(&f);return code;
}
