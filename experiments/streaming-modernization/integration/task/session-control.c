// SPDX-License-Identifier: GPL-2.0-or-later
#include "session-control.h"
#include <pthread.h>
#include <stdio.h>
#include <string.h>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif
#define MAX_QUALITIES 64
static pthread_mutex_t lock=PTHREAD_MUTEX_INITIALIZER;
static struct {
    int source,enabled,count,request,requested;
    int streams[MAX_QUALITIES],widths[MAX_QUALITIES],heights[MAX_QUALITIES],bitrates[MAX_QUALITIES];
    struct demuxe_adaptive_stats state;
    struct demuxe_quality_tag selected,presented;
} control;
EMSCRIPTEN_KEEPALIVE void web_quality_configure(int source,int enabled){
    pthread_mutex_lock(&lock);memset(&control,0,sizeof(control));control.source=source;
    control.enabled=source>0&&enabled;control.requested=-1;pthread_mutex_unlock(&lock);
}
int demuxe_control_enabled(uint64_t source){pthread_mutex_lock(&lock);int yes=control.enabled&&source==(uint64_t)control.source;pthread_mutex_unlock(&lock);return yes;}
int demuxe_control_bind(uint64_t source,const int *streams,const int *widths,const int *heights,const int *bitrates,int count){
    pthread_mutex_lock(&lock);int ok=control.enabled&&source==(uint64_t)control.source&&count>1&&count<=MAX_QUALITIES;
    if(ok){control.count=count;memcpy(control.streams,streams,count*sizeof(int));memcpy(control.widths,widths,count*sizeof(int));memcpy(control.heights,heights,count*sizeof(int));memcpy(control.bitrates,bitrates,count*sizeof(int));}
    pthread_mutex_unlock(&lock);return ok;
}
EMSCRIPTEN_KEEPALIVE int web_quality_request(int source,int request,int representation){
    pthread_mutex_lock(&lock);
    int ok=control.enabled&&source==control.source&&request>control.request&&representation>=0&&representation<control.count;
    if(ok){control.request=request;control.requested=representation;}
    pthread_mutex_unlock(&lock);return ok?0:-1;
}
int demuxe_control_poll(uint64_t source,uint64_t after,uint64_t *request,int *stream){
    pthread_mutex_lock(&lock);int yes=source==(uint64_t)control.source&&control.requested>=0&&(uint64_t)control.request>after;
    if(yes){*request=control.request;*stream=control.streams[control.requested];}
    pthread_mutex_unlock(&lock);return yes;
}
void demuxe_control_update(const struct demuxe_adaptive_stats *s){pthread_mutex_lock(&lock);if(s->source==(uint64_t)control.source)control.state=*s;pthread_mutex_unlock(&lock);}
void demuxe_control_close(uint64_t source){pthread_mutex_lock(&lock);if(source==(uint64_t)control.source){control.enabled=0;control.count=0;}pthread_mutex_unlock(&lock);}
void demuxe_control_selected(struct demuxe_quality_tag tag){
    pthread_mutex_lock(&lock);
    control.selected=control.enabled&&tag.source==(uint64_t)control.source?tag:(struct demuxe_quality_tag){0};
    pthread_mutex_unlock(&lock);
}
EMSCRIPTEN_KEEPALIVE const char *web_quality_selected(void){
    static char json[160];pthread_mutex_lock(&lock);
    snprintf(json,sizeof(json),"{\"source\":%llu,\"request\":%llu,\"representation\":%d}",(unsigned long long)control.selected.source,(unsigned long long)control.selected.request,control.selected.representation);
    pthread_mutex_unlock(&lock);return json;
}
EMSCRIPTEN_KEEPALIVE void web_quality_presented(int source,int request,int representation){
    pthread_mutex_lock(&lock);
    if(control.enabled&&source==control.source&&request==-1){control.presented=(struct demuxe_quality_tag){0};}
    else if(control.enabled&&source==control.source&&request>=0&&request<=control.request){
        for(int i=0;i<control.count;i++)if(control.streams[i]==representation){
            control.presented=(struct demuxe_quality_tag){source,request,representation};break;
        }
    }
    pthread_mutex_unlock(&lock);
}
EMSCRIPTEN_KEEPALIVE const char *web_quality_status(void){
    // Only the engine command worker calls this serializer. The demux thread
    // updates the protected structure and never writes the returned buffer.
    static char json[8192];pthread_mutex_lock(&lock);
    int active=-1,preparing=-1,presented=-1;
    for(int i=0;i<control.count;i++){if(control.presented.source==(uint64_t)control.source&&control.streams[i]==control.presented.representation)presented=i;if(control.streams[i]==control.state.active_stream)active=i;if(control.streams[i]==control.state.preparing_stream)preparing=i;}
    int at=snprintf(json,sizeof(json),"{\"source\":%d,\"available\":%s,\"request\":%d,\"requested\":%d,\"preparing\":%d,\"demuxed\":%d,\"acceptedRequest\":%llu,\"switches\":%u,\"error\":%d,\"qualities\":[",control.source,control.count>1?"true":"false",control.request,control.requested,preparing,active,(unsigned long long)control.state.accepted_request,control.state.accepted_switches,control.state.switch_error);
    for(int i=0;i<control.count;i++)at+=snprintf(json+at,sizeof(json)-at,"%s{\"index\":%d,\"width\":%d,\"height\":%d,\"bitrate\":%d}",i?",":"",i,control.widths[i],control.heights[i],control.bitrates[i]);
    snprintf(json+at,sizeof(json)-at,"],\"presented\":%d,\"presentedRequest\":%llu}",presented,(unsigned long long)control.presented.request);pthread_mutex_unlock(&lock);return json;
}
