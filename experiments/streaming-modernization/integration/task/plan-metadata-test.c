// SPDX-License-Identifier: GPL-2.0-or-later
#include <stdio.h>
#include <string.h>
#include <assert.h>
#include <libavformat/avformat.h>
#include <libavformat/demuxe.h>
int main(int argc,char **argv){
 assert(argc==2);AVFormatContext *f=NULL;
 assert(avformat_open_input(&f,argv[1],NULL,NULL)>=0);
 assert(avformat_find_stream_info(f,NULL)>=0);
 struct AVDemuxeRepresentation before={0},after={0};int stream=-1;
 for(unsigned i=0;i<f->nb_streams;i++)if(!av_demuxe_dash_representation(f,i,&before)){stream=i;break;}
 assert(stream>=0);
 // A consumer may take ownership of descriptive metadata. Plans must not
 // depend on the lifetime of that separately owned dictionary.
 for(unsigned i=0;i<f->nb_streams;i++)av_dict_free(&f->streams[i]->metadata);
 int r=av_demuxe_dash_representation(f,stream,&after);
 int passed=r>=0&&!strcmp(before.id,after.id)&&!strcmp(before.group,after.group);
 struct AVDemuxeSegment segment;
 if(passed)passed=av_demuxe_dash_segment(f,stream,after.first_sequence,0,&segment)>=0;
 printf("{\"passed\":%s,\"result\":%d}\n",passed?"true":"false",r);
 avformat_close_input(&f);return passed?0:1;
}
