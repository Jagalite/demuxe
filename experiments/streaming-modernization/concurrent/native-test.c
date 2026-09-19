// SPDX-License-Identifier: GPL-3.0-or-later
// Native ownership/error regression. Real C bridge, mocked AVIO allocation and
// futex/Fetch peer; this is not Wasm or browser playback qualification.
#include <assert.h>
#include <time.h>
#include <unistd.h>
#ifndef DEMUXE_BRIDGE_SOURCE
#define DEMUXE_BRIDGE_SOURCE "files/native/stream_bridge.c"
#endif
#include DEMUXE_BRIDGE_SOURCE
static _Atomic int force_timeout;
double emscripten_get_now(void){static _Atomic int ticks;return atomic_load(&force_timeout)?atomic_fetch_add(&ticks,70000):0;}
int emscripten_futex_wake(void *p,int count){return 0;}
int emscripten_futex_wait(void *p,uint32_t value,double timeout){usleep(100);return 0;}
int mpv_stream_cb_add_ro(mpv_handle *p,const char *protocol,void *opaque,mpv_stream_cb_open_ro_fn open){return 0;}
void *av_malloc(size_t n){return malloc(n);}
void av_free(void *p){free(p);}
void av_freep(void *p){free(*(void**)p);*(void**)p=NULL;}
AVDictionaryEntry *av_dict_get(const AVDictionary *d,const char *key,const AVDictionaryEntry *prev,int flags){return NULL;}
AVIOContext *avio_alloc_context(unsigned char *buffer,int size,int write,void *opaque,int(*read)(void*,uint8_t*,int),int(*put)(void*,const uint8_t*,int),int64_t(*seek)(void*,int64_t,int)){
    AVIOContext *p=calloc(1,sizeof(*p));p->buffer=buffer;p->opaque=opaque;return p;
}
void avio_context_free(AVIOContext **p){free(*p);*p=NULL;}
static struct source *make_source(int session,int resource) {
    struct source *s=calloc(1,sizeof(*s));s->session=session;s->resource=resource;
    s->total=-1;s->end=-1;s->seekable=0;return s;
}
struct task {struct source *source;int count,result;_Atomic int done;};
static void *read_task(void *arg) {
    struct task *task=arg;char bytes[16];
    for(int i=0;i<task->count;i++) {
        task->result=read_data(task->source,bytes,sizeof(bytes));
        if(task->result<0)break;
        assert(task->result==7);
        for(int j=0;j<7;j++)assert(bytes[j]==task->source->resource);
    }
    atomic_store(&task->done,1);return NULL;
}
struct peer {_Atomic int stop,held;int blocked;};
static void *serve(void *arg) {
    struct peer *peer=arg;
    while(!atomic_load(&peer->stop)) {
        for(int i=0;i<WEB_IO_LANES;i++) {
            struct web_io_mailbox *m=&web_io_lanes[i];int ticket=atomic_load(&m->state);
            if((ticket&7)!=1)continue;
            if(m->resource==peer->blocked){atomic_store(&peer->held,1);continue;}
            if(!atomic_compare_exchange_strong(&m->state,&ticket,ticket+3))continue;
            memset(m->data,m->resource,7);atomic_store(&m->result,7);
            atomic_store(&m->state,ticket+1);
        }
        usleep(100);
    }
    return NULL;
}
static void await_pending(int resource) {
    for(int tries=0;tries<10000;tries++) {
        for(int i=1;i<WEB_IO_LANES;i++) {
            struct web_io_mailbox *m=&web_io_lanes[i];
            if((atomic_load(&m->state)&7)==1&&m->resource==resource)return;
        }
        usleep(100);
    }
    assert(!"request did not become pending");
}
static int callback_cancel(void *opaque){return atomic_load((_Atomic int*)opaque);}
struct open_task {_Atomic int stop;int result;};
static void *open_pending(void *opaque){
    struct open_task *task=opaque;
    AVFormatContext context={.interrupt_callback={callback_cancel,&task->stop}};
    AVIOContext *pb=NULL;
    task->result=web_resource_avio_open_for_session(4,&context,&pb,"https://fixture.example/pending.m4s",AVIO_FLAG_READ,NULL);
    assert(!pb);return NULL;
}
int main(void) {
    web_io_configure(1,12345);web_io_root(1,"https://fixture.example/master.m3u8",1);
    struct peer peer={.blocked=3};pthread_t network;
    assert(!pthread_create(&network,NULL,serve,&peer));
    struct task tasks[3];pthread_t threads[3];
    for(int i=0;i<3;i++) {
        tasks[i]=(struct task){.source=make_source(1,i+1),.count=i==2?1:100};
        assert(!pthread_create(&threads[i],NULL,read_task,&tasks[i]));
    }
    await_pending(3);
    pthread_join(threads[0],NULL);pthread_join(threads[1],NULL);
    assert(atomic_load(&peer.held));assert(!atomic_load(&tasks[2].done));
    assert(tasks[0].source->position==700&&tasks[1].source->position==700);
    AVIOContext candidate={.opaque=tasks[2].source};web_resource_avio_cancel(&candidate);
    pthread_join(threads[2],NULL);assert(tasks[2].result==IO_CANCELLED);
    assert(!session_cancelled(1));
    // A retired candidate's callback cannot cancel independent active resources.
    tasks[0].count=20;assert(!pthread_create(&threads[0],NULL,read_task,&tasks[0]));
    pthread_join(threads[0],NULL);assert(tasks[0].source->position==840);
    atomic_store(&peer.stop,1);pthread_join(network,NULL);
    web_io_cancel();for(int i=0;i<3;i++)close_data(tasks[i].source);
    // Pool exhaustion is bounded; source retirement wakes both leased requests
    // and callers waiting to acquire a lane.
    web_io_configure(2,999);web_io_root(1,"https://fixture.example/next.mpd",1);
    struct task blocked[WEB_IO_LANES+1];pthread_t waiting[WEB_IO_LANES+1];
    for(int i=0;i<WEB_IO_LANES+1;i++) {
        blocked[i]=(struct task){.source=make_source(2,i+10),.count=1};
        assert(!pthread_create(&waiting[i],NULL,read_task,&blocked[i]));
    }
    usleep(20000);web_io_cancel();
    for(int i=0;i<WEB_IO_LANES+1;i++){pthread_join(waiting[i],NULL);assert(blocked[i].result==IO_CANCELLED);}
    web_io_configure(3,777);
    for(int i=0;i<WEB_IO_LANES+1;i++){cancel_data(blocked[i].source);close_data(blocked[i].source);}
    assert(!session_cancelled(3));
    // A nested open result must not overwrite the root resource's size.
    web_io_lanes[1].total=22;mpv_stream_cb_info info={0};
    assert(!open_data(NULL,"brange://source/3",&info));assert(info.size_fn(info.cookie)==777);
    web_io_cancel();info.close_fn(info.cookie);
    web_io_configure(4,999);web_io_root(1,"https://fixture.example/interrupt.mpd",1);
    struct open_task pending={0};pthread_t opener;
    assert(!pthread_create(&opener,NULL,open_pending,&pending));
    usleep(10000);atomic_store(&pending.stop,1);pthread_join(opener,NULL);
    assert(pending.result==AVERROR_EXIT);assert(!session_cancelled(4));web_io_cancel();
    puts("PASS: independent progress, scoped cancellation, exhausted-pool retirement, stale-session callbacks, root metadata");
}
