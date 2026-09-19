// SPDX-License-Identifier: GPL-3.0-or-later
// Real child MOV parsing with injected short reads and transport termination.
#include "container-task.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libavutil/mem.h>
#include <libavutil/time.h>
struct policy { int chunk, error, header; };
struct input { FILE *file; struct policy policy; int media, position; };
static int read_input(void *opaque,uint8_t *buffer,int capacity){
    struct input *in=opaque;
    if((in->media||in->policy.header)&&in->policy.error&&in->position>=(in->policy.header?32:8193))return in->policy.error;
    if(capacity>in->policy.chunk)capacity=in->policy.chunk;
    if((in->media||in->policy.header)&&in->policy.error&&capacity>(in->policy.header?32:8193)-in->position)capacity=(in->policy.header?32:8193)-in->position;
    int n=fread(buffer,1,capacity,in->file);in->position+=n;
    return n?n:ferror(in->file)?AVERROR(EIO):AVERROR_EOF;
}
static int open_input(void *opaque,AVFormatContext *f,AVIOContext **pb,const char *url,AVDictionary **options){
    struct input *in=av_mallocz(sizeof(*in));if(!in)return AVERROR(ENOMEM);
    in->file=fopen(url,"rb");in->policy=*(struct policy*)opaque;in->media=strstr(url,".m4s")!=NULL;
    if(!in->file){av_free(in);return AVERROR(EIO);}
    *pb=avio_alloc_context(av_malloc(32768),32768,0,in,read_input,NULL,NULL);
    if(!*pb){fclose(in->file);av_free(in);return AVERROR(ENOMEM);}
    (*pb)->seekable=0;return 0;
}
static void close_input(void *opaque,AVFormatContext *f,AVIOContext **pb){
    struct input *in=(*pb)->opaque;fclose(in->file);av_free(in);av_freep(&(*pb)->buffer);avio_context_free(pb);
}
int main(int argc,char **argv){
    if(argc!=5)return 2;
    struct policy policy={.chunk=atoi(argv[2]),.header=!strcmp(argv[4],"header"),.error=!strcmp(argv[3],"cancel")?AVERROR_EXIT:!strcmp(argv[3],"timeout")?AVERROR(ETIMEDOUT):!strcmp(argv[3],"io")?AVERROR(EIO):!strcmp(argv[3],"eof")?AVERROR_EOF:0};
    struct demuxe_task_io io={.opaque=&policy,.open=open_input,.close=close_input};
    struct demuxe_container_task *task=demuxe_task_create(1,1,4*1024*1024,io);if(!task)return 3;
    struct AVDemuxeSegment plan={.abi=AV_DEMUXE_PLAN_ABI,.size=-1,.init_size=-1};
    snprintf(plan.url,sizeof(plan.url),"%s/low/000.m4s",argv[1]);snprintf(plan.init_url,sizeof(plan.init_url),"%s/low/init.mp4",argv[1]);
    if(demuxe_task_plan(task,&plan)<0)return 4;demuxe_task_end(task);
    int r=0,packets=0;int64_t deadline=av_gettime_relative()+10000000;
    while(av_gettime_relative()<deadline){struct demuxe_prepared_packet packet;r=demuxe_task_take(task,&packet,100);if(r<0)break;if(r>0){packets++;demuxe_packet_release(&packet);}}
    struct demuxe_task_stats stats;demuxe_task_stats(task,&stats);demuxe_task_destroy(task);
    int expected=policy.error==AVERROR_EOF?AVERROR_INVALIDDATA:policy.error?policy.error:AVERROR_EOF;
    int passed=r==expected&&(policy.error||packets==48);
    printf("{\"passed\":%s,\"packets\":%d,\"terminal\":%d,\"expected\":%d,\"taskError\":%d}\n",passed?"true":"false",packets,r,expected,stats.error);
    return passed?0:5;
}
