// SPDX-License-Identifier: GPL-2.0-or-later
#include "stream_bridge.h"
#include <mpv/stream_cb.h>
#include <emscripten.h>
#include <emscripten/threading.h>
#include <libavformat/avformat.h>
#include <libavutil/mem.h>
#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <errno.h>
#include <stdio.h>
#include <limits.h>
#include <time.h>

#define IO_ERROR (-1)
#define IO_CANCELLED (-2)
#define IO_TIMEOUT (-3)
#define IO_NOSEEK (-4)
struct web_io_mailbox web_io_lanes[WEB_IO_LANES] = {
    {.cancelled=WEB_IO_ABI, .interrupt=WEB_IO_LANES}
};
_Static_assert(offsetof(struct web_io_mailbox,data)==64,"IO mailbox ABI");
_Static_assert(offsetof(struct web_io_mailbox,resource)==262208,"Resource mailbox ABI");
_Static_assert(offsetof(struct web_io_mailbox,url)==262232,"Resource URL mailbox ABI");
_Static_assert(sizeof(struct web_io_mailbox)==266328,"Mailbox lane stride");
struct source {
    int session,resource,seekable;
    int64_t position,total,start,end;
    _Atomic int cancelled,request;
    AVIOInterruptCB interrupt_callback;
};
static int source_interrupted(struct source *s) {
    return s && (atomic_load(&s->cancelled) ||
        (s->interrupt_callback.callback && s->interrupt_callback.callback(s->interrupt_callback.opaque)));
}
static pthread_mutex_t pool_lock=PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t pool_changed=PTHREAD_COND_INITIALIZER;
static int leased[WEB_IO_LANES];
static _Atomic uint64_t session_gate;
static _Atomic int next_serial;
static int root_resource,root_seekable;
static int64_t root_total;
static char root_url[4096];

static int session_cancelled(int session) {
    return session<=0 || atomic_load(&session_gate)!=((uint64_t)(unsigned)session<<1);
}
static void wake(struct web_io_mailbox *m) {
    emscripten_futex_wake((void*)&m->state,100);
}
static void cancel_session(int session) {
    if(session<=0)return;
    uint64_t expected=(uint64_t)(unsigned)session<<1;
    if(!atomic_compare_exchange_strong(&session_gate,&expected,expected|1))return;
    for(int i=0;i<WEB_IO_LANES;i++)wake(&web_io_lanes[i]);
    pthread_mutex_lock(&pool_lock);
    pthread_cond_broadcast(&pool_changed);
    pthread_mutex_unlock(&pool_lock);
}
// Lane 0 serializes the single direct-file reader. Independent nested resources
// use lanes 1..7: video, audio, subtitles, one candidate, and manifest refresh.
// Every lane remains independently cancellable; no pool lock spans network I/O.
static struct web_io_mailbox *acquire(int session,int nested,struct source *source) {
    pthread_mutex_lock(&pool_lock);
    for(;;) {
        if(session_cancelled(session)||source_interrupted(source)){pthread_mutex_unlock(&pool_lock);return NULL;}
        for(int i=nested?1:0;i<(nested?WEB_IO_LANES:1);i++)if(!leased[i]) {
            leased[i]=1;pthread_mutex_unlock(&pool_lock);return &web_io_lanes[i];
        }
        struct timespec until;clock_gettime(CLOCK_REALTIME,&until);
        until.tv_nsec+=100000000L;if(until.tv_nsec>=1000000000L){until.tv_sec++;until.tv_nsec-=1000000000L;}
        pthread_cond_timedwait(&pool_changed,&pool_lock,&until);
    }
}
static void release(struct web_io_mailbox *m) {
    pthread_mutex_lock(&pool_lock);
    leased[m-web_io_lanes]=0;
    pthread_cond_broadcast(&pool_changed);
    pthread_mutex_unlock(&pool_lock);
}
EMSCRIPTEN_KEEPALIVE uintptr_t web_io_ptr(void){return (uintptr_t)web_io_lanes;}
EMSCRIPTEN_KEEPALIVE void web_io_cancel(void){cancel_session(atomic_load(&web_io.session));}
EMSCRIPTEN_KEEPALIVE void web_io_root(int id,const char *url,int seekable) {
    pthread_mutex_lock(&pool_lock);root_resource=id;root_seekable=seekable;
    snprintf(root_url,sizeof(root_url),"%s",url?url:"");pthread_mutex_unlock(&pool_lock);
}
EMSCRIPTEN_KEEPALIVE void web_io_configure(int session,int64_t size) {
    // Host must retire the previous session/worker first. A claimed old writer
    // must not survive into the new shared-memory generation.
    pthread_mutex_lock(&pool_lock);
    for(;;) {
        int busy=0;for(int i=0;i<WEB_IO_LANES;i++)busy|=leased[i];
        if(!busy)break;
        pthread_cond_wait(&pool_changed,&pool_lock);
    }
    root_total=size;
    for(int i=0;i<WEB_IO_LANES;i++) {
        struct web_io_mailbox *m=&web_io_lanes[i];
        atomic_store(&m->state,0);atomic_store(&m->session,session);m->total=size;wake(m);
    }
    atomic_store(&session_gate,((uint64_t)(unsigned)session<<1));
    pthread_cond_broadcast(&pool_changed);pthread_mutex_unlock(&pool_lock);
}
int web_resource_session(const char *uri) {
    const char *prefix="brange://source/";
    if(!uri||strncmp(uri,prefix,strlen(prefix)))return 0;
    char *end;errno=0;long id=strtol(uri+strlen(prefix),&end,10);
    return errno||*end||id<=0||id>INT_MAX?0:(int)id;
}
const char *web_resource_url(int session) {
    static _Thread_local char captured[4096];
    pthread_mutex_lock(&pool_lock);
    int valid=root_resource&&!session_cancelled(session);
    if(valid)snprintf(captured,sizeof(captured),"%s",root_url);
    pthread_mutex_unlock(&pool_lock);return valid?captured:NULL;
}
EMSCRIPTEN_KEEPALIVE int web_io_interrupt(int serial) {
    if(serial<=0||serial>=INT_MAX/8)return 0;
    for(int i=0;i<WEB_IO_LANES;i++) {
        struct web_io_mailbox *m=&web_io_lanes[i];
        int ticket=serial*8+1;
        if(!atomic_compare_exchange_strong(&m->state,&ticket,serial*8+4))continue;
        atomic_fetch_add(&m->epoch,1);atomic_fetch_add(&web_io.interruptions,1);
        atomic_store(&m->state,serial*8+5);wake(m);
        emscripten_futex_wake((void*)&m->epoch,100);return 1;
    }
    return 0;
}
void web_io_abandon_read(const char *uri) {
    int serials[WEB_IO_LANES];
    for(int i=0;i<WEB_IO_LANES;i++)serials[i]=atomic_load(&web_io_lanes[i].serial);
    if(session_cancelled(web_resource_session(uri)))return;
    for(int i=0;i<WEB_IO_LANES;i++)web_io_interrupt(serials[i]);
}
static int transact(struct web_io_mailbox *m,int session,int operation,struct source *source) {
    if(session_cancelled(session))return IO_CANCELLED;
    int serial=atomic_fetch_add(&next_serial,1)+1;
    if(serial<=0||serial>=INT_MAX/8){cancel_session(session);return IO_ERROR;}
    atomic_store(&m->reserved,operation);atomic_store(&m->serial,serial);
    if(source)atomic_store(&source->request,serial);
    int ticket=serial*8+1;
    double deadline=emscripten_get_now()+65000;
    atomic_store(&m->state,ticket);wake(m);
    int result=IO_CANCELLED;
    for(;;) {
        int state=atomic_load(&m->state);
        if(session_cancelled(session))break;
        if(source_interrupted(source))web_io_interrupt(serial);
        if(state!=ticket&&state!=ticket+3) {
            if((state==ticket+1||state==ticket+2)&&!source_interrupted(source))result=atomic_load(&m->result);
            break;
        }
        if(emscripten_get_now()>=deadline){cancel_session(session);result=IO_TIMEOUT;break;}
        emscripten_futex_wait((void*)&m->state,state,100);
    }
    if(source)atomic_store(&source->request,0);
    atomic_store(&m->state,0);wake(m);return result;
}
static int64_t read_data(void *cookie,char *buffer,uint64_t capacity) {
    struct source *s=cookie;
    if(session_cancelled(s->session)||source_interrupted(s))return IO_CANCELLED;
    if((s->total>=0&&s->position>=s->total)||(s->end>=0&&s->position>=s->end))return 0;
    struct web_io_mailbox *m=acquire(s->session,!!s->resource,s);
    if(!m)return IO_CANCELLED;
    if(capacity>WEB_IO_CAPACITY)capacity=WEB_IO_CAPACITY;
    atomic_store(&m->capacity,capacity);m->offset=s->position;m->resource=s->resource;
    atomic_fetch_add(&web_io.reads,1);
    int result=transact(m,s->session,s->resource?2:0,s);
    if(result<IO_NOSEEK||result>(int)capacity)result=IO_ERROR;
    if(result>0){memcpy(buffer,m->data,result);s->position+=result;}
    release(m);return result;
}
static int64_t seek_data(void *cookie,int64_t position) {
    struct source *s=cookie;
    if(!s->seekable||position<s->start||session_cancelled(s->session)||source_interrupted(s))return MPV_ERROR_GENERIC;
    atomic_fetch_add(&web_io.seeks,1);s->position=position;return position;
}
static int64_t size_data(void *cookie){return ((struct source*)cookie)->total;}
static void cancel_data(void *cookie){cancel_session(((struct source*)cookie)->session);}
static void close_data(void *cookie) {
    struct source *s=cookie;
    if(s->resource) {
        struct web_io_mailbox *m=acquire(s->session,1,NULL);
        if(m){m->resource=s->resource;transact(m,s->session,3,NULL);release(m);}
    }
    free(s);
}
// Only the owner of an abandoned preparation task may call this. Join that task
// before closing/freeing its AVIO. Active mpv reads still use accepted-seek cancel.
void web_resource_avio_cancel(AVIOContext *pb) {
    struct source *s=pb->opaque;
    atomic_store(&s->cancelled,1);
    int serial=atomic_load(&s->request);
    if(!session_cancelled(s->session))web_io_interrupt(serial);
    pthread_mutex_lock(&pool_lock);pthread_cond_broadcast(&pool_changed);pthread_mutex_unlock(&pool_lock);
}
static int open_data(void *unused,char *uri,mpv_stream_cb_info *info) {
    int session=web_resource_session(uri);
    pthread_mutex_lock(&pool_lock);
    if(session_cancelled(session)||root_total==0||root_total< -1){pthread_mutex_unlock(&pool_lock);return MPV_ERROR_LOADING_FAILED;}
    struct source *s=calloc(1,sizeof(*s));
    if(!s){pthread_mutex_unlock(&pool_lock);return MPV_ERROR_NOMEM;}
    s->session=session;s->total=root_total;s->resource=root_resource;s->end=-1;s->seekable=root_resource?root_seekable:1;
    pthread_mutex_unlock(&pool_lock);
    *info=(mpv_stream_cb_info){.cookie=s,.read_fn=read_data,.seek_fn=s->seekable?seek_data:NULL,.size_fn=size_data,.cancel_fn=cancel_data,.close_fn=close_data};return 0;
}
int web_register_stream(mpv_handle *p){return mpv_stream_cb_add_ro(p,"brange",NULL,open_data);}
static int avio_read_resource(void *cookie,uint8_t *buffer,int size) {
    int n=read_data(cookie,(char*)buffer,size);
    return n>0?n:n==0?AVERROR_EOF:n==IO_CANCELLED?AVERROR_EXIT:n==IO_TIMEOUT?AVERROR(ETIMEDOUT):n==IO_NOSEEK?AVERROR(ESPIPE):AVERROR(EIO);
}
static int64_t avio_seek_resource(void *cookie,int64_t offset,int whence) {
    struct source *s=cookie;
    if(session_cancelled(s->session)||source_interrupted(s))return AVERROR_EXIT;
    if(whence==AVSEEK_SIZE)return s->total>=0?s->total:AVERROR(ENOSYS);
    if(!s->seekable)return AVERROR(ESPIPE);
    whence&=~AVSEEK_FORCE;
    int64_t base=whence==SEEK_SET?0:whence==SEEK_CUR?s->position:whence==SEEK_END?s->total:-1;
    if(base<0||(offset>0&&base>INT64_MAX-offset)||(offset<0&&offset< -base))return AVERROR(EINVAL);
    int64_t position=base+offset;
    if(position<s->start||(s->end>=0&&position>s->end))return AVERROR(EINVAL);
    s->position=position;return position;
}
int web_resource_avio_open(AVFormatContext *s,AVIOContext **pb,const char *url,int flags,AVDictionary **options){return AVERROR(EACCES);}
int web_resource_avio_open_for_session(int session,AVFormatContext *context,AVIOContext **pb,const char *url,int flags,AVDictionary **options) {
    if(flags!=AVIO_FLAG_READ||strlen(url)>=sizeof(web_io.url)||session_cancelled(session))return AVERROR(EACCES);
    struct source *s=calloc(1,sizeof(*s));if(!s)return AVERROR(ENOMEM);
    s->session=session;s->start=-1;s->end=-1;
    if(context)s->interrupt_callback=context->interrupt_callback;
    AVDictionaryEntry *start=options?av_dict_get(*options,"offset",NULL,0):NULL;
    AVDictionaryEntry *end=options?av_dict_get(*options,"end_offset",NULL,0):NULL;
    if(start||end) {
        char *tail;errno=0;s->start=start?strtoll(start->value,&tail,10):0;
        if(start&&(errno||tail==start->value||*tail||s->start<0)){free(s);return AVERROR(EINVAL);}
        errno=0;s->end=end?strtoll(end->value,&tail,10):-1;
        if(!end||errno||tail==end->value||*tail||s->end<=s->start){free(s);return AVERROR(EINVAL);}
    }
    struct web_io_mailbox *m=acquire(session,1,s);
    if(!m){free(s);return AVERROR_EXIT;}
    pthread_mutex_lock(&pool_lock);int valid=root_resource&&!session_cancelled(session);pthread_mutex_unlock(&pool_lock);
    if(!valid){release(m);free(s);return AVERROR_EXIT;}
    snprintf(m->url,sizeof(m->url),"%s",url);m->range_start=s->start;m->range_end=s->end;
    int id=transact(m,session,1,s);s->total=m->total;s->seekable=m->padding&1;release(m);
    if(id<=0){free(s);return id==IO_CANCELLED?AVERROR_EXIT:id==IO_TIMEOUT?AVERROR(ETIMEDOUT):AVERROR(EIO);}
    s->resource=id;s->position=s->start=s->start<0?0:s->start;
    unsigned char *buffer=av_malloc(32768);
    *pb=buffer?avio_alloc_context(buffer,32768,0,s,avio_read_resource,NULL,avio_seek_resource):NULL;
    if(!*pb){av_free(buffer);close_data(s);return AVERROR(ENOMEM);}
    (*pb)->pos=s->position;(*pb)->seekable=s->seekable?AVIO_SEEKABLE_NORMAL:0;return 0;
}
int web_resource_avio_close(AVFormatContext *s,AVIOContext *pb) {
    close_data(pb->opaque);av_freep(&pb->buffer);avio_context_free(&pb);return 0;
}
void web_resource_retire_for_session(int session,const char *url) {
    if(!url||strlen(url)>=sizeof(web_io.url)||session_cancelled(session))return;
    struct source source={.session=session};
    struct web_io_mailbox *m=acquire(session,1,&source);if(!m)return;
    snprintf(m->url,sizeof(m->url),"%s",url);
    transact(m,session,4,&source);release(m);
}
