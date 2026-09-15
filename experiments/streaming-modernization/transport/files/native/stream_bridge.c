#include "stream_bridge.h"
#include <mpv/stream_cb.h>
#include <emscripten.h>
#include <emscripten/threading.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <pthread.h>
#include <libavformat/avformat.h>
#include <libavutil/mem.h>
#include <errno.h>
#include <stdio.h>
#include <limits.h>
// Transport result ABI: -1 I/O, -2 cancellation, -3 timeout, -4 unsupported seek.
#define IO_ERROR (-1)
#define IO_CANCELLED (-2)
#define IO_TIMEOUT (-3)
#define IO_NOSEEK (-4)
struct web_io_mailbox web_io;
_Static_assert(offsetof(struct web_io_mailbox,data)==64,"IO mailbox ABI");
_Static_assert(offsetof(struct web_io_mailbox,resource)==262208,"Resource mailbox ABI");
_Static_assert(offsetof(struct web_io_mailbox,url)==262232,"Resource URL mailbox ABI");
struct source {int session,resource,seekable;int64_t position,total,start,end;};
static pthread_mutex_t mailbox_lock=PTHREAD_MUTEX_INITIALIZER;
// One atomic identity+cancel bit: an old callback cannot cancel a new session
// between a generation check and a separate cancellation store.
static _Atomic uint64_t session_gate;
static int session_cancelled(int session){
    return session<=0 || atomic_load(&session_gate)!=((uint64_t)(unsigned)session<<1);
}
static int cancelled(void){return session_cancelled(atomic_load(&web_io.session));}
static int root_resource, root_seekable;
static char root_url[4096];
EMSCRIPTEN_KEEPALIVE void web_io_root(int id,const char *url,int seekable){
    pthread_mutex_lock(&mailbox_lock);root_resource=id;root_seekable=seekable;
    snprintf(root_url,sizeof(root_url),"%s",url?url:"");pthread_mutex_unlock(&mailbox_lock);
}
int web_resource_session(const char *uri){
    const char *prefix="brange://source/";
    if(strncmp(uri,prefix,strlen(prefix)))return 0;
    char *end;errno=0;long id=strtol(uri+strlen(prefix),&end,10);
    return errno||*end||id<=0||id>INT_MAX?0:(int)id;
}
const char *web_resource_url(int session){
    static _Thread_local char captured[4096];
    pthread_mutex_lock(&mailbox_lock);
    int valid=root_resource&&!session_cancelled(session);
    if(valid)snprintf(captured,sizeof(captured),"%s",root_url);
    pthread_mutex_unlock(&mailbox_lock);return valid?captured:NULL;
}
static void wake(void){emscripten_futex_wake((void*)&web_io.state,100);}
EMSCRIPTEN_KEEPALIVE uintptr_t web_io_ptr(void){return (uintptr_t)&web_io;}
EMSCRIPTEN_KEEPALIVE void web_io_configure(int session,int64_t size){
    // Caller has cancelled/terminated the old I/O worker. Join any in-flight
    // mailbox transaction before admitting a new session; no libmpv calls here.
    pthread_mutex_lock(&mailbox_lock);
    atomic_store(&web_io.cancelled,0);atomic_store(&web_io.interrupt,0);
    atomic_store(&web_io.state,0);atomic_store(&web_io.session,session);
    atomic_store(&session_gate,((uint64_t)(unsigned)session<<1));
    web_io.total=size;wake();pthread_mutex_unlock(&mailbox_lock);
}
EMSCRIPTEN_KEEPALIVE int web_io_interrupt(int serial){
    if(serial<=0||serial>=INT_MAX/8)return 0;
    int ticket=serial*8+1;
    // Reserve this exact pending ticket before advancing its epoch. The demux
    // thread must not publish its next request until the epoch is committed.
    if(!atomic_compare_exchange_strong(&web_io.state,&ticket,serial*8+4))return 0;
    atomic_fetch_add(&web_io.epoch,1);
    atomic_fetch_add(&web_io.interruptions,1);
    atomic_store(&web_io.state,serial*8+5);wake();
    emscripten_futex_wake((void*)&web_io.epoch,100);return 1;
}
// mpv calls this only after it marks a seek pending under its demux lock.
// Its packet reader then discards the abandoned packet/EOF before executing
// the accepted seek. No libmpv API is called from a stream callback.
void web_io_abandon_read(const char *uri){
    int session=uri?web_resource_session(uri):0;
    // Capture the globally unique ticket before validating its session. A new
    // configure/request after this check cannot reuse the captured ticket.
    int serial=atomic_load(&web_io.serial);
    if(!session_cancelled(session))web_io_interrupt(serial);
}
static void cancel_session(int session){
    if(session<=0)return;
    uint64_t expected=(uint64_t)(unsigned)session<<1;
    if(atomic_compare_exchange_strong(&session_gate,&expected,expected|1))wake();
}
EMSCRIPTEN_KEEPALIVE void web_io_cancel(void){cancel_session(atomic_load(&web_io.session));}
static int transact(int operation){
    atomic_store(&web_io.reserved,operation);
    int serial=atomic_fetch_add(&web_io.serial,1)+1;
    if(serial<=0||serial>=INT_MAX/8){web_io_cancel();return IO_ERROR;}
    int ticket=serial*8+1;
    double deadline=emscripten_get_now()+65000;
    atomic_store(&web_io.state,ticket);wake();
    while(atomic_load(&web_io.state)==ticket||atomic_load(&web_io.state)==ticket+3){
        if(cancelled()){
            // The entire session is retired, including a claimed writer. No
            // subsequent read is admitted; configure requires the old worker
            // to be terminated before it reuses this mailbox.
            atomic_fetch_add(&web_io.interruptions,1);atomic_store(&web_io.state,0);wake();return IO_CANCELLED;
        }
        if(emscripten_get_now()>=deadline){
            // Retire the entire transport, including a stalled claimed writer.
            // The host must terminate its I/O worker before configure/reuse.
            web_io_cancel();return IO_TIMEOUT;
        }
        int waiting=atomic_load(&web_io.state);
        emscripten_futex_wait((void*)&web_io.state,waiting,100);
    }
    int state=atomic_load(&web_io.state);
    int result=!cancelled()&&(state==ticket+1||state==ticket+2)?atomic_load(&web_io.result):IO_CANCELLED;
    atomic_store(&web_io.state,0);wake();return result;
}
static int64_t read_locked(void *cookie,char *buffer,uint64_t capacity){
    struct source *source=cookie;
    if(cancelled()||source->session!=atomic_load(&web_io.session))return IO_CANCELLED;
    if(source->total>=0&&source->position>=source->total)return 0;
    if(capacity>WEB_IO_CAPACITY)capacity=WEB_IO_CAPACITY;
    atomic_store(&web_io.capacity,capacity);web_io.offset=source->position;
    web_io.resource=source->resource;atomic_fetch_add(&web_io.reads,1);
    if(source->end>=0&&source->position>=source->end)return 0;
    int result=transact(source->resource?2:0);
    if(result<IO_NOSEEK||result>(int)capacity)result=IO_ERROR;
    if(result>0){memcpy(buffer,web_io.data,result);source->position+=result;}
    atomic_store(&web_io.state,0);wake();return result;
}
static int64_t read_data(void *cookie,char *buffer,uint64_t capacity){
    pthread_mutex_lock(&mailbox_lock);int64_t r=read_locked(cookie,buffer,capacity);
    pthread_mutex_unlock(&mailbox_lock);return r;
}
static int64_t seek_data(void *cookie,int64_t position){
    struct source *source=cookie;
    if(!source->seekable||position<source->start||session_cancelled(source->session))return MPV_ERROR_GENERIC;
    atomic_fetch_add(&web_io.seeks,1);source->position=position;return position;
}
static int64_t size_data(void *cookie){return ((struct source*)cookie)->total;}
static void cancel_data(void *cookie){cancel_session(((struct source*)cookie)->session);}
static void close_data(void *cookie){
    struct source *source=cookie;
    if(source->resource){
        pthread_mutex_lock(&mailbox_lock);
        if(!session_cancelled(source->session)){web_io.resource=source->resource;transact(3);}
        pthread_mutex_unlock(&mailbox_lock);
    }
    free(cookie);
}
static int open_data(void *unused,char *uri,mpv_stream_cb_info *info){
    int session=web_resource_session(uri);
    pthread_mutex_lock(&mailbox_lock);
    if(session_cancelled(session)||web_io.total==0||web_io.total< -1){pthread_mutex_unlock(&mailbox_lock);return MPV_ERROR_LOADING_FAILED;}
    struct source *source=calloc(1,sizeof(*source));
    if(!source){pthread_mutex_unlock(&mailbox_lock);return MPV_ERROR_NOMEM;}
    source->session=session;source->total=web_io.total;source->resource=root_resource;source->end=-1;source->seekable=root_resource?root_seekable:1;
    pthread_mutex_unlock(&mailbox_lock);
    *info=(mpv_stream_cb_info){.cookie=source,.read_fn=read_data,.seek_fn=source->seekable?seek_data:NULL,.size_fn=size_data,.cancel_fn=cancel_data,.close_fn=close_data};return 0;
}
int web_register_stream(mpv_handle *player){return mpv_stream_cb_add_ro(player,"brange",NULL,open_data);}

// Called exclusively from mpv's nested AVIO seam, on its demux pthread.
static int avio_read_resource(void *cookie,uint8_t *buffer,int size){
    int n=read_data(cookie,(char*)buffer,size);
    return n>0?n:n==0?AVERROR_EOF:n==IO_CANCELLED?AVERROR_EXIT:n==IO_TIMEOUT?AVERROR(ETIMEDOUT):n==IO_NOSEEK?AVERROR(ESPIPE):AVERROR(EIO);
}
static int64_t avio_seek_resource(void *cookie,int64_t offset,int whence){
    struct source *source=cookie;
    if(session_cancelled(source->session))return AVERROR_EXIT;
    if(whence==AVSEEK_SIZE)return source->total>=0?source->total:AVERROR(ENOSYS);
    if(!source->seekable)return AVERROR(ESPIPE);
    whence &= ~AVSEEK_FORCE;
    int64_t base=whence==SEEK_SET?0:whence==SEEK_CUR?source->position:whence==SEEK_END?source->total:-1;
    if(base<0||(offset>0&&base>INT64_MAX-offset)||(offset<0&&offset< -base))return AVERROR(EINVAL);
    int64_t position=base+offset;
    if(position<source->start||(source->end>=0&&position>source->end))return AVERROR(EINVAL);
    source->position=position;return position;
}
// An unbound callback must never borrow the newly accepted session.
int web_resource_avio_open(AVFormatContext *s,AVIOContext **pb,const char *url,int flags,AVDictionary **options){return AVERROR(EACCES);}
int web_resource_avio_open_for_session(int session,AVFormatContext *s,AVIOContext **pb,const char *url,int flags,AVDictionary **options){
    if(flags!=AVIO_FLAG_READ||strlen(url)>=sizeof(web_io.url)||session_cancelled(session))return AVERROR(EACCES);
    struct source *source=calloc(1,sizeof(*source));if(!source)return AVERROR(ENOMEM);
    source->session=session;source->start=-1;source->end=-1;
    AVDictionaryEntry *start=options?av_dict_get(*options,"offset",NULL,0):NULL;
    AVDictionaryEntry *end=options?av_dict_get(*options,"end_offset",NULL,0):NULL;
    if(start||end){
        char *tail;
        errno=0;source->start=start?strtoll(start->value,&tail,10):0;
        if(start&&(errno||tail==start->value||*tail||source->start<0)){free(source);return AVERROR(EINVAL);}
        errno=0;source->end=end?strtoll(end->value,&tail,10):-1;
        if(!end||errno||tail==end->value||*tail||source->end<=source->start){free(source);return AVERROR(EINVAL);}
    }
    pthread_mutex_lock(&mailbox_lock);
    if(!root_resource||session_cancelled(session)){
        pthread_mutex_unlock(&mailbox_lock);free(source);return AVERROR_EXIT;
    }
    snprintf(web_io.url,sizeof(web_io.url),"%s",url);
    web_io.range_start=source->start;web_io.range_end=source->end;
    int id=transact(1);source->total=web_io.total;source->seekable=web_io.padding&1;
    pthread_mutex_unlock(&mailbox_lock);
    if(id<=0){free(source);return id==IO_CANCELLED?AVERROR_EXIT:id==IO_TIMEOUT?AVERROR(ETIMEDOUT):AVERROR(EIO);}
    source->resource=id;source->position=source->start=source->start<0?0:source->start;
    unsigned char *buffer=av_malloc(32768);
    *pb=buffer?avio_alloc_context(buffer,32768,0,source,avio_read_resource,NULL,avio_seek_resource):NULL;
    if(!*pb){av_free(buffer);close_data(source);return AVERROR(ENOMEM);}
    (*pb)->pos=source->position;(*pb)->seekable=source->seekable?AVIO_SEEKABLE_NORMAL:0;
    return 0;
}
int web_resource_avio_close(AVFormatContext *s,AVIOContext *pb){
    close_data(pb->opaque);av_freep(&pb->buffer);avio_context_free(&pb);return 0;
}
