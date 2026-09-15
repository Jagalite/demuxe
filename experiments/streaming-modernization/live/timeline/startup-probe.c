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
 f->probesize=32;f->max_analyze_duration=1;
 if(avformat_find_stream_info(f,NULL)<0)return 4;
 int video=-1,audio=-1,subtitle=-1,qualities[8],count=0;
 for(unsigned i=0;i<f->nb_streams;i++){
  struct AVDemuxeRepresentation d;if(!av_demuxe_hls_representation(f,i,&d)&&count<8)qualities[count++]=i;
  enum AVMediaType type=f->streams[i]->codecpar->codec_type;
  if(type==AVMEDIA_TYPE_VIDEO&&video<0)video=i;
  if(type==AVMEDIA_TYPE_AUDIO)audio=i;
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
 for(unsigned i=0;i<f->nb_streams;i++){
  struct AVDemuxeWindow w;int e=av_demuxe_hls_window(f,i,&w);
  if(!e)fprintf(stderr,"window %u %lld..%lld live %d known %d\n",i,(long long)w.start_us,(long long)w.end_us,w.live,w.known);
 }
 struct AVDemuxeWindow video_window;av_demuxe_hls_window(f,video,&video_window);
 if(!code&&video_window.live&&demuxe_adaptive_seek(s,video_window.start_us-1)!=AVERROR(ERANGE))code=17;
 r=code?0:demuxe_adaptive_seek(s,video_window.start_us);if(r<0)code=11;
 int packets=0,video_packets=0,audio_packets=0,subtitle_packets=0;deadline=av_gettime_relative()+3000000;
 while(!code&&packets<80&&av_gettime_relative()<deadline){
  struct demuxe_prepared_packet packet;r=demuxe_adaptive_read(s,&packet);
  if(r<0){fprintf(stderr,"read: %s\n",av_err2str(r));code=12;break;}
  if(!r){av_usleep(1000);continue;}packets++;video_packets+=packet.packet->stream_index==video;audio_packets+=packet.packet->stream_index==audio;subtitle_packets+=packet.packet->stream_index==subtitle;demuxe_packet_release(&packet);
 }
 if(!code&&(packets<80||!video_packets||!audio_packets||!subtitle_packets))code=13;
 printf("{\"before\":%lld,\"packets\":%d,\"video\":%d,\"audio\":%d,\"subtitles\":%d,\"error\":%d}\n",(long long)before,packets,video_packets,audio_packets,subtitle_packets,code);
 demuxe_adaptive_destroy(s);avformat_close_input(&f);return code;
}
