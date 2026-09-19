// SPDX-License-Identifier: GPL-3.0-or-later
#include "adaptive-session.h"
#include <stdio.h>
#include <libavutil/time.h>
#include <libavutil/mathematics.h>
static int open_resource(void *o,AVFormatContext *f,AVIOContext **pb,const char *url,AVDictionary **options){return avio_open2(pb,url,AVIO_FLAG_READ,&f->interrupt_callback,options);}
static void close_resource(void *o,AVFormatContext *f,AVIOContext **pb){avio_closep(pb);}
int main(int argc,char **argv){
 if(argc!=2)return 2;AVFormatContext *f=NULL;AVDictionary *options=NULL;
 av_dict_set(&options,"demuxe_sparse","1",0);av_dict_set(&options,"strict_io","1",0);
 int r=avformat_open_input(&f,argv[1],NULL,&options);av_dict_free(&options);if(r<0)return 3;
 if(avformat_find_stream_info(f,NULL)<0)return 4;
 int video=-1,audio=-1,subtitle=-1;
 for(unsigned i=0;i<f->nb_streams;i++){enum AVMediaType t=f->streams[i]->codecpar->codec_type;if(t==AVMEDIA_TYPE_VIDEO&&video<0)video=i;if(t==AVMEDIA_TYPE_AUDIO&&audio<0)audio=i;if(t==AVMEDIA_TYPE_SUBTITLE&&subtitle<0)subtitle=i;}
 if(video<0||audio<0)return 5;
 for(unsigned i=0;i<f->nb_streams;i++)f->streams[i]->discard=(i==video||i==audio||i==subtitle)?AVDISCARD_DEFAULT:AVDISCARD_ALL;
 struct demuxe_adaptive_session *s=demuxe_adaptive_create(f,video,video,1,(struct demuxe_task_io){.open=open_resource,.close=close_resource});if(!s)return 6;
 struct demuxe_adaptive_stats w={0};int code=0;int64_t deadline=av_gettime_relative()+3000000;
 do{struct demuxe_prepared_packet p;r=demuxe_adaptive_read(s,&p);demuxe_packet_release(&p);if(r<0){code=7;break;}demuxe_adaptive_poll(s);demuxe_adaptive_stats(s,&w);if(w.window_known)break;av_usleep(1000);}while(av_gettime_relative()<deadline);
 if(!code&&(!w.window_known||!w.live))code=8;
 int strict=code?0:demuxe_adaptive_seek(s,w.window_start_us-1000000);
 int end=code?0:demuxe_adaptive_seek_preroll(s,w.window_end_us);
 if(!code&&(strict!=AVERROR(ERANGE)||end!=AVERROR(ERANGE)))code=9;
 int overlap=code?0:demuxe_adaptive_seek_preroll(s,w.window_start_us-1000000);
 if(!code&&overlap<0)code=10;
 // A decoder offset must never turn an invalid user target into a valid seek.
 if(!code&&demuxe_adaptive_seek_window(s,w.window_start_us-1,21333,0)!=AVERROR(ERANGE))code=13;
 if(!code&&demuxe_adaptive_seek_window(s,w.window_end_us,21333,0)!=AVERROR(ERANGE))code=14;
 if(!code&&demuxe_adaptive_seek_window(s,w.window_start_us,21333,0)<0)code=15;
 int64_t first=AV_NOPTS_VALUE;unsigned audio_packets=0;deadline=av_gettime_relative()+3000000;
 while(!code&&av_gettime_relative()<deadline){struct demuxe_prepared_packet p;r=demuxe_adaptive_read(s,&p);if(r<0){code=11;break;}if(!r){av_usleep(1000);continue;}
  if(p.packet->stream_index==video&&first==AV_NOPTS_VALUE)first=av_rescale_q(p.packet->pts,p.timebase,AV_TIME_BASE_Q);
  if(p.packet->stream_index==audio)audio_packets++;demuxe_packet_release(&p);if(first!=AV_NOPTS_VALUE&&audio_packets)break;
 }
 if(!code&&(first<w.window_start_us||first>w.window_start_us+250000||!audio_packets))code=12;
 printf("{\"error\":%d,\"strictRejected\":%s,\"endRejected\":%s,\"prerollAccepted\":%s,\"windowStart\":%lld,\"windowEnd\":%lld,\"firstVideo\":%lld,\"audioPackets\":%u}\n",code,strict==AVERROR(ERANGE)?"true":"false",end==AVERROR(ERANGE)?"true":"false",overlap==0?"true":"false",(long long)w.window_start_us,(long long)w.window_end_us,(long long)first,audio_packets);
 demuxe_adaptive_destroy(s);avformat_close_input(&f);return code;
}
