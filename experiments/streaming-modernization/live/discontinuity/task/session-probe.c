// SPDX-License-Identifier: GPL-3.0-or-later
// Real native manifest/container execution. This measures packets, not rendered A/V.
#include "adaptive-session.h"
#include <stdio.h>
#include <stdlib.h>
#include <libavutil/time.h>
#include <libavutil/mathematics.h>
static int open_resource(void *o,AVFormatContext *f,AVIOContext **pb,const char *url,AVDictionary **options){return avio_open2(pb,url,AVIO_FLAG_READ,&f->interrupt_callback,options);}
static void close_resource(void *o,AVFormatContext *f,AVIOContext **pb){avio_closep(pb);}
int main(int argc,char **argv){
 if(argc!=2)return 2;
 AVFormatContext *f=NULL;AVDictionary *options=NULL;av_dict_set(&options,"demuxe_sparse","1",0);av_dict_set(&options,"strict_io","1",0);
 int r=avformat_open_input(&f,argv[1],NULL,&options);av_dict_free(&options);if(r<0)return 3;
 if(avformat_find_stream_info(f,NULL)<0)return 4;
 int video=-1,audio=-1,subtitle=-1,qualities[8],count=0;
 for(unsigned i=0;i<f->nb_streams;i++){
  struct AVDemuxeRepresentation d;
  if(!av_demuxe_hls_representation(f,i,&d)&&count<8)qualities[count++]=i;
  enum AVMediaType type=f->streams[i]->codecpar->codec_type;
  if(type==AVMEDIA_TYPE_VIDEO&&video<0)video=i;
  if(type==AVMEDIA_TYPE_AUDIO&&audio<0)audio=i;
  if(type==AVMEDIA_TYPE_SUBTITLE&&subtitle<0)subtitle=i;
 }
 if(video<0||audio<0||count!=3)return 5;
 for(unsigned i=0;i<f->nb_streams;i++)f->streams[i]->discard=(i==video||i==audio||i==subtitle)?AVDISCARD_DEFAULT:AVDISCARD_ALL;
 struct demuxe_adaptive_session *s=demuxe_adaptive_create(f,video,video,1,(struct demuxe_task_io){.open=open_resource,.close=close_resource});if(!s)return 6;
 int64_t started=av_gettime_relative(),last[64],first[64],max_read=0;unsigned packets[64]={0};for(int i=0;i<64;i++){last[i]=AV_NOPTS_VALUE;first[i]=AV_NOPTS_VALUE;}
 unsigned request=0;int code=0;
 while(av_gettime_relative()-started<24000000){
  int64_t elapsed=av_gettime_relative()-started;
  if(request<3&&last[video]>(request+1)*7000000LL){r=demuxe_adaptive_request(s,1,request+1,qualities[2-request]);if(r<0){code=7;break;}request++;}
  int64_t before=av_gettime_relative();struct demuxe_prepared_packet p;r=demuxe_adaptive_read(s,&p);int64_t spent=av_gettime_relative()-before;if(spent>max_read)max_read=spent;
  if(r==AVERROR_EOF)break;if(r<0){fprintf(stderr,"adaptive read %d\n",r);for(unsigned j=0;j<f->nb_streams;j++){struct AVDemuxeWindow w;if(!av_demuxe_hls_window(f,j,&w))fprintf(stderr,"failure window stream=%u type=%d known=%d start=%lld end=%lld\n",j,f->streams[j]->codecpar->codec_type,w.known,(long long)w.start_us,(long long)w.end_us);}code=8;break;}if(!r){av_usleep(1000);continue;}
  int index=p.packet->stream_index;if(index<0||index>=64){code=9;demuxe_packet_release(&p);break;}
  int64_t stamp=p.packet->dts==AV_NOPTS_VALUE?p.packet->pts:p.packet->dts;
  stamp=av_rescale_q(stamp,p.timebase,AV_TIME_BASE_Q);
  if(last[index]!=AV_NOPTS_VALUE&&stamp<last[index]){fprintf(stderr,"regression stream %d: %lld -> %lld\n",index,(long long)last[index],(long long)stamp);code=10;demuxe_packet_release(&p);break;}
  if(first[index]==AV_NOPTS_VALUE)first[index]=stamp;last[index]=stamp;packets[index]++;demuxe_packet_release(&p);av_usleep(3000);
 }
 struct demuxe_adaptive_stats stats;demuxe_adaptive_stats(s,&stats);
 fprintf(stderr,"max feed=%lld components=%lld candidate=%lld retire=%lld us\n",(long long)stats.max_feed_us,(long long)stats.max_components_us,(long long)stats.max_candidate_us,(long long)stats.max_retire_us);
 fprintf(stderr,"final requested=%d preparing=%d active=%d request=%llu switch_error=%d\n",stats.requested_stream,stats.preparing_stream,stats.active_stream,(unsigned long long)stats.request,stats.switch_error);
 printf("{\"videoPackets\":%u,\"audioPackets\":%u,\"subtitlePackets\":%u,\"firstVideo\":%lld,\"lastVideo\":%lld,\"switches\":%u,\"maxReadUs\":%lld,\"error\":%d}\n",packets[video],packets[audio],subtitle>=0?packets[subtitle]:0,(long long)first[video],(long long)last[video],stats.accepted_switches,(long long)max_read,code);
 fprintf(stderr,"subtitle timestamps: %lld -> %lld us\n",(long long)(subtitle>=0?first[subtitle]:0),(long long)(subtitle>=0?last[subtitle]:0));
 if(!code&&subtitle>=0&&(llabs(first[subtitle]-250000)>1000||llabs(last[subtitle]-30250000)>1000))code=12;
 if(!code&&(packets[video]<400||packets[audio]<800||subtitle<0||packets[subtitle]<16||stats.accepted_switches<3||last[video]-first[video]<31000000))code=11;
 demuxe_adaptive_destroy(s);avformat_close_input(&f);return code;
}
