/* SPDX-License-Identifier: MIT -- test support only, not production allocator. */
#include "common/common.h"
#include "osdep/timer.h"
__attribute__((import_module("test"),import_name("now"))) extern double host_now(void);
int64_t mp_time_ns(void){return (int64_t)(host_now()*1e6);}
int64_t mp_time_ns_add(int64_t t,double s){return s>(INT64_MAX-t)/1e9?INT64_MAX:t+(int64_t)(s*1e9);}
void *memset(void *d,int c,size_t n){unsigned char *p=d;for(size_t i=0;i<n;i++)p[i]=(unsigned char)c;return d;}
void *memcpy(void *d,const void *s,size_t n){unsigned char *p=d;const unsigned char *q=s;for(size_t i=0;i<n;i++)p[i]=q[i];return d;}
/* Small bounded pool with proper parent/child destruction, enough for unit tests.
 * Fixed 8 KiB blocks avoid using any untested platform allocator or pthreads. */
#define N 512
#define SZ 8192
struct allocation {void (*dtor)(void *);int parent;int used;size_t size;};
static struct allocation meta[N];
static _Alignas(32) unsigned char blocks[N][SZ];
static int idx(void *p){if(!p)return -1;for(int i=0;i<N;i++)if(p==blocks[i])return i;assert(0);return -1;}
void *ta_alloc(void *parent,size_t size){assert(size<=SZ);for(int i=0;i<N;i++)if(!meta[i].used){meta[i]=(struct allocation){.parent=idx(parent),.used=1,.size=size};memset(blocks[i],0,SZ);return blocks[i];}assert(0);return NULL;}
void *ta_resize(void *parent,void *p,size_t size){assert(size<=SZ);if(!p)return ta_alloc(parent,size);int i=idx(p);assert(meta[i].used);if(size>meta[i].size)memset(blocks[i]+meta[i].size,0,size-meta[i].size);meta[i].size=size;return p;}
void *talloc_steal(void *parent,void *p){if(p)meta[idx(p)].parent=idx(parent);return p;}
void talloc_set_destructor(void *p,void (*fn)(void *)){meta[idx(p)].dtor=fn;}
void talloc_free(void *p){if(!p)return;int i=idx(p);assert(meta[i].used);void (*dtor)(void *)=meta[i].dtor;meta[i].dtor=NULL;if(dtor)dtor(p);for(int j=0;j<N;j++)if(meta[j].used&&meta[j].parent==i)talloc_free(blocks[j]);meta[i].used=0;}
int test_allocations(void){int n=0;for(int i=0;i<N;i++)n+=!!meta[i].used;return n;}
