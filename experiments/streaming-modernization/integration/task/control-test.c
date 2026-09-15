// SPDX-License-Identifier: GPL-2.0-or-later
#include "session-control.h"
#include <assert.h>
#include <pthread.h>
#include <string.h>
static void *reader(void *unused){
    for(int i=0;i<10000;i++){
        uint64_t request;int stream;
        demuxe_control_poll(7,0,&request,&stream);
        assert(demuxe_control_enabled(7));
    }
    return NULL;
}
int main(void){
    int streams[]={3,7,8},widths[]={320,640,1280},heights[]={180,360,720},rates[]={200000,600000,1600000};
    web_quality_configure(7,1);
    assert(demuxe_control_bind(7,streams,widths,heights,rates,3));
    assert(web_quality_request(8,1,2)<0);assert(web_quality_request(7,1,3)<0);
    assert(!web_quality_request(7,1,2));assert(web_quality_request(7,1,0)<0);
    uint64_t request;int stream;
    assert(demuxe_control_poll(7,0,&request,&stream)&&request==1&&stream==8);
    assert(!demuxe_control_poll(7,1,&request,&stream));
    pthread_t thread;assert(!pthread_create(&thread,NULL,reader,NULL));
    for(int i=2;i<10000;i++)assert(!web_quality_request(7,i,i%3));
    pthread_join(thread,NULL);
    struct demuxe_adaptive_stats s={.source=7,.active_stream=7,.preparing_stream=-1,.accepted_request=4};
    demuxe_control_update(&s);assert(strstr(web_quality_status(),"\"demuxed\":1"));
    demuxe_control_selected((struct demuxe_quality_tag){7,4,7});
    assert(strstr(web_quality_selected(),"\"request\":4"));
    assert(strstr(web_quality_status(),"\"presented\":-1"));
    web_quality_presented(7,4,7);assert(strstr(web_quality_status(),"\"presented\":1"));
    demuxe_control_selected((struct demuxe_quality_tag){7,5,8});
    assert(strstr(web_quality_status(),"\"presented\":1")); // selection is not presentation
    web_quality_presented(7,3,3);assert(strstr(web_quality_status(),"\"presented\":0")); // delayed/cached old output
    web_quality_presented(8,5,8);assert(strstr(web_quality_status(),"\"presented\":0"));
    web_quality_presented(7,-1,-1);assert(strstr(web_quality_status(),"\"presented\":-1"));
    web_quality_configure(8,1);demuxe_control_update(&s);demuxe_control_close(7);
    assert(demuxe_control_enabled(8));assert(!demuxe_control_enabled(7));
    assert(!demuxe_control_poll(7,0,&request,&stream));
    assert(strstr(web_quality_status(),"\"available\":false"));
    demuxe_control_close(8);assert(!demuxe_control_enabled(8));
    return 0;
}
