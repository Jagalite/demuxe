// SPDX-License-Identifier: GPL-2.0-or-later
#include "container-task.h"
#include <assert.h>
#include <stdatomic.h>
#include <stdio.h>
#include <string.h>
#include <libavutil/time.h>
static _Atomic int opening;
static int open_resource(void *unused,AVFormatContext *owner,AVIOContext **pb,const char *url,AVDictionary **options){
    if(!strcmp(url,"stalled")){
        atomic_store(&opening,1);
        while(!owner->interrupt_callback.callback(owner->interrupt_callback.opaque))av_usleep(1000);
        return AVERROR_EXIT;
    }
    return avio_open2(pb,url,AVIO_FLAG_READ,&owner->interrupt_callback,options);
}
static void close_resource(void *unused,AVFormatContext *owner,AVIOContext **pb){avio_closep(pb);}
int main(int argc,char **argv){
    assert(argc==2);
    struct demuxe_task_io io={.open=open_resource,.close=close_resource};
    struct AVDemuxeSegment plan={.abi=1,.size=-1,.init_size=-1};
    snprintf(plan.init_url,sizeof(plan.init_url),"%s/low/init.mp4",argv[1]);
    snprintf(plan.url,sizeof(plan.url),"%s/low/000.m4s",argv[1]);
    struct demuxe_container_task *active=demuxe_task_create(1,0,4*1024*1024,io),*candidate=demuxe_task_create(1,1,4*1024*1024,io);
    assert(active&&candidate);assert(!demuxe_task_plan(active,&plan));demuxe_task_end(active);
    strcpy(plan.init_url,"stalled");assert(!demuxe_task_plan(candidate,&plan));demuxe_task_end(candidate);
    int64_t began=av_gettime_relative();while(!atomic_load(&opening)){assert(av_gettime_relative()-began<2000000);av_usleep(1000);}
    struct demuxe_prepared_packet packet={0};int r;
    do{r=demuxe_task_take(active,&packet,10);}while(!r);
    assert(r==1&&demuxe_packet_codec(&packet));demuxe_packet_release(&packet);
    began=av_gettime_relative();demuxe_task_destroy(candidate);assert(av_gettime_relative()-began<500000);
    int packets=1;
    while((r=demuxe_task_take(active,&packet,10))!=AVERROR_EOF){assert(r>=0);if(r){packets++;demuxe_packet_release(&packet);}}
    assert(packets==48);struct demuxe_task_stats stats;demuxe_task_stats(active,&stats);assert(!stats.error&&stats.queued_bytes==0);
    demuxe_task_destroy(active);return 0;
}
