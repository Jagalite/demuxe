// SPDX-License-Identifier: GPL-3.0-or-later
/* Native all-period parsing/plans; this is not playback qualification. */
#include <stdio.h>
#include <string.h>
#include <libavformat/avformat.h>
#include <libavformat/demuxe.h>
int main(int argc,char **argv){
 if(argc!=2)return 2;AVFormatContext *f=NULL;AVDictionary *options=NULL;
 av_dict_set(&options,"demuxe_sparse","1",0);av_dict_set(&options,"strict_io","1",0);
 int r=avformat_open_input(&f,argv[1],NULL,&options);av_dict_free(&options);if(r<0)return 3;
 if(av_demuxe_dash_period_count(f)!=2)return 4;
 struct AVDemuxePeriod a,b;
 if(av_demuxe_dash_period_info(f,0,&a)<0||av_demuxe_dash_period_info(f,1,&b)<0)return 5;
 if(a.start_us!=0||a.duration_us!=16000000||b.start_us!=16000000||b.duration_us!=16000000)return 6;
 if(a.counts[0]!=3||a.counts[1]!=2||memcmp(a.counts,b.counts,sizeof(a.counts)))return 7;
 int plans=0;
 for(int type=0;type<2;type++)for(int representation=0;representation<a.counts[type];representation++)for(int sequence=1;sequence<=8;sequence++){
  struct AVDemuxeSegment x,y;
  if(av_demuxe_dash_period_plan(f,0,type,representation,sequence,&x)<0||av_demuxe_dash_period_plan(f,1,type,representation,sequence,&y)<0)return 8;
  if(y.start_us-x.start_us!=16000000||x.duration_us!=y.duration_us||strcmp(x.url,y.url)||strcmp(x.init_url,y.init_url))return 9;
  plans+=2;
 }
 printf("{\"periods\":2,\"plans\":%d,\"startOffsetUs\":16000000,\"passed\":true}\n",plans);
 avformat_close_input(&f);return 0;
}
