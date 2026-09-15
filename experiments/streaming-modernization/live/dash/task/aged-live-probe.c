// SPDX-License-Identifier: GPL-2.0-or-later
// Synthetic stale-MPD admission: valid targets must not depend on expired first entries.
#include "adaptive-session.h"
#include <stdio.h>
#include <libavutil/time.h>
#include <libavutil/mathematics.h>
static int open_resource(void *o,AVFormatContext *f,AVIOContext **pb,const char *url,AVDictionary **options){return avio_open2(pb,url,AVIO_FLAG_READ,&f->interrupt_callback,options);}
static void close_resource(void *o,AVFormatContext *f,AVIOContext **pb){avio_closep(pb);}
int main(int argc,char **argv){
 if(argc!=2)return 2;AVFormatContext *f=NULL;AVDictionary *options=NULL;av_dict_set(&options,"demuxe_sparse","1",0);av_dict_set(&options,"strict_io","1",0);
 int r=avformat_open_input(&f,argv[1],NULL,&options);av_dict_free(&options);if(r<0)return 3;
 struct AVDemuxeRepresentation rep;int video=-1;
 for(unsigned i=0;i<f->nb_streams;i++){f->streams[i]->discard=AVDISCARD_ALL;if(video<0&&!av_demuxe_dash_representation(f,i,&rep))video=i;}
 if(video<0)return 4;f->streams[video]->discard=AVDISCARD_DEFAULT;
 struct AVDemuxeSegment first;
 if(av_demuxe_dash_segment(f,video,rep.first_sequence,0,&first)!=AVERROR(ERANGE))return 5;
 struct demuxe_adaptive_session *session=demuxe_adaptive_create(f,video,video,1,(struct demuxe_task_io){.open=open_resource,.close=close_resource});if(!session)return 6;
 if(demuxe_adaptive_poll(session)<0)return 7;
 struct demuxe_adaptive_stats state;demuxe_adaptive_stats(session,&state);if(!state.window_known)return 8;
 int64_t target=state.window_end_us-4000000;
 if(demuxe_adaptive_seek(session,target)<0)return 9;
 int found=0;int64_t deadline=av_gettime_relative()+3000000;
 while(av_gettime_relative()<deadline){struct demuxe_prepared_packet packet;r=demuxe_adaptive_read(session,&packet);if(r<0)return 10;if(!r){av_usleep(1000);continue;}
  int64_t pts=av_rescale_q(packet.packet->pts,packet.timebase,AV_TIME_BASE_Q);demuxe_packet_release(&packet);
  if(pts>=target&&pts<target+2000000){found=1;break;}
 }
 demuxe_adaptive_destroy(session);avformat_close_input(&f);printf("{\"expiredFirstEntry\":true,\"targetUs\":%lld,\"presentablePacket\":%s}\n",(long long)target,found?"true":"false");return found?0:11;
}
