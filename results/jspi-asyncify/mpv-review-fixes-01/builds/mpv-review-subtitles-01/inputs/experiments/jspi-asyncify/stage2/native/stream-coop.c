// SPDX-License-Identifier: Apache-2.0
// Restricted brange://source adapter. No network, futex, SAB, or pthread calls.
#include <stdint.h>
#include <stddef.h>
#include <mpv/stream_cb.h>
#define HOST(name) __attribute__((import_module("demuxe_source"),import_name("demuxe_source_" #name)))
HOST(open) extern int source_open(void);
HOST(size) extern double source_size(int handle);
HOST(valid) extern int source_valid(int handle);
HOST(read) extern int source_read(int handle,uintptr_t ptr,int capacity,double offset);
HOST(cancel) extern void source_cancel(int handle);
HOST(close) extern void source_close(int handle);
HOST(cancel_all) extern void source_cancel_all(void);
struct source {int handle,used,reading,closed;int64_t pos,total;};
static struct source sources[64];
static int same_string(const char *a,const char *b) {
    while(*a && *a==*b){a++;b++;}return *a==*b;
}
static int64_t read_data(void *cookie,char *buf,uint64_t capacity) {
    struct source *s=cookie;
    if(s->closed || s->reading || !s->used || !source_valid(s->handle))return -1;
    if(s->pos>=s->total)return 0;
    if(capacity>262144)capacity=262144;
    if(capacity>(uint64_t)(s->total-s->pos))capacity=s->total-s->pos;
    if(!capacity)return 0;
    s->reading=1;
    int n=source_read(s->handle,(uintptr_t)buf,(int)capacity,(double)s->pos);
    s->reading=0;
    if(s->closed){s->used=0;return -1;}
    if(n<=0 || (uint64_t)n>capacity)return -1;
    s->pos+=n;return n;
}
static int64_t seek_data(void *cookie,int64_t offset) {
    struct source *s=cookie;
    if(!s->used || s->closed || s->reading || !source_valid(s->handle) || offset<0 || offset>s->total)return MPV_ERROR_GENERIC;
    // JS cancellation is checked by subsequent reads; seek cannot revive a source.
    s->pos=offset;return offset;
}
static int64_t size_data(void *cookie) {return ((struct source *)cookie)->total;}
static void cancel_data(void *cookie) {source_cancel(((struct source *)cookie)->handle);}
static void close_data(void *cookie) {
    struct source *s=cookie;if(!s->used || s->closed)return;
    s->closed=1;source_close(s->handle);if(!s->reading)s->used=0;
}
static int open_data(void *unused,char *uri,mpv_stream_cb_info *info) {
    (void)unused;
    if(!same_string(uri,"brange://source"))return MPV_ERROR_LOADING_FAILED;
    struct source *s=NULL;
    for(unsigned i=0;i<64;i++)if(!sources[i].used){s=&sources[i];break;}
    if(!s)return MPV_ERROR_LOADING_FAILED;
    int handle=source_open();if(handle<0)return MPV_ERROR_LOADING_FAILED;
    double total=source_size(handle);
    if(!(total>=0 && total<=9007199254740991.0)) {source_close(handle);return MPV_ERROR_LOADING_FAILED;}
    *s=(struct source){.handle=handle,.used=1,.total=(int64_t)total};
    *info=(mpv_stream_cb_info){.cookie=s,.read_fn=read_data,.seek_fn=seek_data,
       .size_fn=size_data,.cancel_fn=cancel_data,.close_fn=close_data};
    return 0;
}
int web_register_stream(mpv_handle *player) {return mpv_stream_cb_add_ro(player,"brange",NULL,open_data);}
void web_io_cancel(void) {source_cancel_all();}
int demuxe_source_live(void) {int n=0;for(unsigned i=0;i<64;i++)n+=!!sources[i].used;return n;}
