// SPDX-License-Identifier: GPL-2.0-or-later
#include "adaptive-session.h"
#include <stdio.h>
#include <libavutil/time.h>
#include <libavutil/mathematics.h>
static int open_resource(void *o,AVFormatContext *f,AVIOContext **pb,const char *url,AVDictionary **options){return avio_open2(pb,url,AVIO_FLAG_READ,&f->interrupt_callback,options);}
static void close_resource(void *o,AVFormatContext *f,AVIOContext **pb){avio_closep(pb);}
int main(int argc,char **argv){
 if(argc!=2&&argc!=3)return 2;AVFormatContext *f=NULL;AVDictionary *options=NULL;
 av_dict_set(&options,"demuxe_sparse","1",0);av_dict_set(&options,"strict_io","1",0);
 int r=avformat_open_input(&f,argv[1],NULL,&options);av_dict_free(&options);if(r<0)return 3;
 if(avformat_find_stream_info(f,NULL)<0)return 4;
 int video=-1,audio=-1,subtitle=-1,qualities[8],count=0;
 for(unsigned i=0;i<f->nb_streams;i++){
  struct AVDemuxeRepresentation d;if(!av_demuxe_hls_representation(f,i,&d)&&count<8)qualities[count++]=i;
  enum AVMediaType type=f->streams[i]->codecpar->codec_type;
  if(type==AVMEDIA_TYPE_VIDEO&&video<0)video=i;
  if(type==AVMEDIA_TYPE_AUDIO&&(audio<0||argc==3))audio=i;
  if(type==AVMEDIA_TYPE_SUBTITLE&&subtitle<0)subtitle=i;
 }
 if(video<0||audio<0||count!=3)return 5;
 for(unsigned i=0;i<f->nb_streams;i++)f->streams[i]->discard=(i==video||i==audio||i==subtitle)?AVDISCARD_DEFAULT:AVDISCARD_ALL;
 struct demuxe_adaptive_session *s=demuxe_adaptive_create(f,video,video,1,(struct demuxe_task_io){.open=open_resource,.close=close_resource});if(!s)return 6;
 int code=0;int64_t before=AV_NOPTS_VALUE,deadline=av_gettime_relative()+3000000;
 while(before==AV_NOPTS_VALUE&&av_gettime_relative()<deadline){
  struct demuxe_prepared_packet p;r=demuxe_adaptive_read(s,&p);if(r<0){code=7;break;}if(!r){av_usleep(1000);continue;}
  if(p.packet->stream_index==video)before=av_rescale_q(p.packet->pts,p.timebase,AV_TIME_BASE_Q);demuxe_packet_release(&p);
 }
 if(before==AV_NOPTS_VALUE)code=7;
 if(!code&&demuxe_adaptive_request(s,1,1,qualities[2])<0)code=8;
 deadline=av_gettime_relative()+21000000;
 while(!code&&av_gettime_relative()<deadline){r=demuxe_adaptive_poll(s);if(r<0){code=9;break;}av_usleep(250000);}
 if(!code&&argc==3){
  AVIOContext *control=NULL;r=avio_open2(&control,argv[2],AVIO_FLAG_READ,NULL,NULL);
  if(r<0)code=14;else{uint8_t byte;avio_read(control,&byte,1);avio_closep(&control);}
  deadline=av_gettime_relative()+4000000;
  while(!code&&av_gettime_relative()<deadline){r=demuxe_adaptive_poll(s);if(r<0){code=15;break;}struct demuxe_adaptive_stats now;demuxe_adaptive_stats(s,&now);if(!now.live)break;av_usleep(250000);}
  struct demuxe_adaptive_stats now;demuxe_adaptive_stats(s,&now);if(now.live)code=16;
 }
 struct demuxe_adaptive_stats stats;demuxe_adaptive_stats(s,&stats);int64_t target=stats.window_end_us-6000000;
 if(!code&&(!stats.window_known||stats.window_start_us<=before))code=10;
 r=code?0:demuxe_adaptive_seek(s,target);if(r<0){fprintf(stderr,"pending rendition seek: %s\n",av_err2str(r));code=11;}
 int64_t after=AV_NOPTS_VALUE;deadline=av_gettime_relative()+5000000;
 while(!code&&av_gettime_relative()<deadline){
  struct demuxe_prepared_packet p;r=demuxe_adaptive_read(s,&p);if(r<0){code=12;break;}if(!r){av_usleep(1000);continue;}
  if(p.packet->stream_index==video)after=av_rescale_q(p.packet->pts,p.timebase,AV_TIME_BASE_Q);demuxe_packet_release(&p);
  if(after>target+250000)break;
 }
 if(!code&&after<=target+250000)code=13;
 printf("{\"before\":%lld,\"windowStart\":%lld,\"windowEnd\":%lld,\"target\":%lld,\"after\":%lld,\"seekError\":%d,\"error\":%d}\n",(long long)before,(long long)stats.window_start_us,(long long)stats.window_end_us,(long long)target,(long long)after,r,code);
 demuxe_adaptive_destroy(s);avformat_close_input(&f);return code;
}
