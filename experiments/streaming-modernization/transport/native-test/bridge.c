// Native ownership/error regression. Real C bridge, mocked AVIO allocation and
// futex/Fetch peer; this is not Wasm or browser playback qualification.
#include <assert.h>
#include <time.h>
#include <unistd.h>
#include "stream_bridge.c"
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
static struct source *source(int session,int resource){
    struct source *p=calloc(1,sizeof(*p));*p=(struct source){.session=session,.resource=resource,.seekable=1,.total=100,.end=-1};return p;
}
static void *close_thread(void *p){close_data(p);return NULL;}
static void *reply_thread(void *opaque){
    int result=*(int*)opaque,ticket;
    do{ticket=atomic_load(&web_io.state);usleep(100);}while((ticket&7)!=1);
    assert(atomic_compare_exchange_strong(&web_io.state,&ticket,ticket+3));
    memset(web_io.data,73,16);atomic_store(&web_io.result,result);
    atomic_store(&web_io.state,ticket+(result<0?2:1));return NULL;
}
static void *cancel_claimed(void *opaque){
    int ticket;
    do{ticket=atomic_load(&web_io.state);usleep(100);}while((ticket&7)!=1);
    assert(atomic_compare_exchange_strong(&web_io.state,&ticket,ticket+3));
    cancel_data(opaque);return NULL;
}
static int read_result(struct source *p,int code){
    pthread_t worker;assert(!pthread_create(&worker,NULL,reply_thread,&code));
    uint8_t bytes[16];int n=avio_read_resource(p,bytes,sizeof(bytes));pthread_join(worker,NULL);
    if(code>0)for(int i=0;i<code;i++)assert(bytes[i]==73);return n;
}
int main(void){
    web_io_configure(1,100);web_io_root(0,"",0);
    struct source *old=source(1,0);
    web_io_configure(2,100);cancel_data(old);assert(!cancelled());
    assert(seek_data(old,0)==MPV_ERROR_GENERIC);
    assert(avio_seek_resource(old,0,AVSEEK_SIZE)==AVERROR_EXIT);
    char bytes[16];assert(read_data(old,bytes,16)==IO_CANCELLED);close_data(old);
    mpv_stream_cb_info info={0};assert(open_data(NULL,"brange://source/1",&info)==MPV_ERROR_LOADING_FAILED);
    assert(open_data(NULL,"brange://source/2",&info)==0);info.close_fn(info.cookie);
    // Old close waits for the mailbox while configure accepts a new source.
    pthread_mutex_lock(&mailbox_lock);old=source(2,99);pthread_t closer;
    assert(!pthread_create(&closer,NULL,close_thread,old));usleep(1000);
    atomic_store(&web_io.session,3);atomic_store(&session_gate,6);
    int serial=atomic_load(&web_io.serial);pthread_mutex_unlock(&mailbox_lock);
    pthread_join(closer,NULL);assert(atomic_load(&web_io.serial)==serial);
    struct source *current=source(3,0);
    assert(read_result(current,7)==7);assert(current->position==7);
    assert(read_result(current,0)==AVERROR_EOF);
    assert(read_result(current,IO_CANCELLED)==AVERROR_EXIT);
    assert(read_result(current,IO_TIMEOUT)==AVERROR(ETIMEDOUT));
    assert(read_result(current,IO_NOSEEK)==AVERROR(ESPIPE));
    assert(read_result(current,IO_ERROR)==AVERROR(EIO));
    current->total=-1;current->seekable=0;
    assert(avio_seek_resource(current,0,AVSEEK_SIZE)==AVERROR(ENOSYS));
    assert(avio_seek_resource(current,0,SEEK_SET)==AVERROR(ESPIPE));
    // Stale cancellation cannot interrupt the accepted session's ticket.
    atomic_store(&web_io.serial,100);atomic_store(&web_io.state,801);
    web_io_abandon_read("brange://source/2");assert(atomic_load(&web_io.state)==801);
    web_io_abandon_read("brange://source/3");assert(atomic_load(&web_io.state)==805);
    atomic_store(&web_io.state,0);cancel_data(current);assert(cancelled());
    web_io_configure(4,100);cancel_data(current);assert(!cancelled());close_data(current);
    web_io_root(1,"https://fixture.example/new.m3u8",1);
    assert(!web_resource_url(3));assert(!strcmp(web_resource_url(4),"https://fixture.example/new.m3u8"));
    AVIOContext *pb=NULL;assert(web_resource_avio_open_for_session(3,NULL,&pb,"https://fixture.example/old",AVIO_FLAG_READ,NULL)==AVERROR(EACCES));assert(!pb);
    current=source(4,0);pthread_t claimed;
    assert(!pthread_create(&claimed,NULL,cancel_claimed,current));
    assert(avio_read_resource(current,(uint8_t*)bytes,sizeof(bytes))==AVERROR_EXIT);
    pthread_join(claimed,NULL);close_data(current);
    web_io_configure(5,100);current=source(5,0);atomic_store(&force_timeout,1);
    assert(avio_read_resource(current,(uint8_t*)bytes,sizeof(bytes))==AVERROR(ETIMEDOUT));assert(cancelled());close_data(current);
    puts("PASS: stale root/nested/close/cancel ownership, short reads, EOF/error distinctions, unknown size, seekability, deadline");
}
