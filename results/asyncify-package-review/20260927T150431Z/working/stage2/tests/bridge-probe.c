// SPDX-License-Identifier: MIT -- registration shim, not an mpv media engine.
#include <stdint.h>
#include <mpv/stream_cb.h>
#include "common/common.h"
static mpv_stream_cb_open_ro_fn opener;
static mpv_stream_cb_info handles[64];
static unsigned char used[64];
static unsigned char buffer[1048576];
extern int web_register_stream(mpv_handle *);
int mpv_stream_cb_add_ro(mpv_handle *p,const char *protocol,void *u,mpv_stream_cb_open_ro_fn fn) {
 (void)p;(void)protocol;(void)u;opener=fn;return 0;
}
int bridge_setup(void){return web_register_stream(NULL);}
int bridge_open(int id) {
 if(id<0 || id>=64 || used[id])return -1;
 int r=opener(NULL,"brange://source",&handles[id]);if(r>=0)used[id]=1;return r;
}
int bridge_bad_uri(void){mpv_stream_cb_info x;return opener(NULL,"https://not-admitted/",&x);}
int bridge_read(int id,int start,int size) {
 assert(id>=0 && id<64 && used[id] && start>=0 && size>=0 && (unsigned)size<=sizeof(buffer)-start);
 return (int)handles[id].read_fn(handles[id].cookie,(char*)buffer+start,size);
}
int64_t bridge_seek(int id,int64_t at){assert(used[id]);return handles[id].seek_fn(handles[id].cookie,at);}
double bridge_size(int id){assert(used[id]);return (double)handles[id].size_fn(handles[id].cookie);}
void bridge_cancel(int id){assert(used[id]);handles[id].cancel_fn(handles[id].cookie);}
void bridge_close(int id){assert(used[id]);handles[id].close_fn(handles[id].cookie);used[id]=0;}
void bridge_fill(void){for(unsigned i=0;i<sizeof(buffer);i++)buffer[i]=0xcc;}
uintptr_t bridge_ptr(void){return (uintptr_t)buffer;}
