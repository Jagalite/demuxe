// SPDX-License-Identifier: MIT
#include "threads-coop.h"
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <emscripten.h>
#include <emscripten/stack.h>
int64_t mp_time_ns(void) { return (int64_t)(emscripten_get_now()*1000000); }
static mp_mutex mutex;
static int completed,failures;
static void *child(void *arg) {
    int token=(int)(uintptr_t)arg;
    volatile int local[512];for(int i=0;i<512;i++)local[i]=token+i;
    char *heap=malloc(1024);memset(heap,token,1024);
    errno=token;
    for(int round=0;round<5;round++){
        demuxe_coop_yield();
        if(errno!=token)failures++;
        for(int i=0;i<512;i++)if(local[i]!=token+i)failures++;
        for(int i=0;i<1024;i++)if((unsigned char)heap[i]!=token)failures++;
        if(emscripten_stack_get_current()>emscripten_stack_get_base() || emscripten_stack_get_current()<emscripten_stack_get_end())failures++;
    }
    free(heap);mp_mutex_lock(&mutex);completed++;mp_mutex_unlock(&mutex);return NULL;
}
int context_probe(void) {
    completed=failures=0;mp_thread a,b;mp_mutex_init(&mutex);errno=77;
    if(mp_thread_create(&a,child,(void *)11)||mp_thread_create(&b,child,(void *)22))return -1;
    if(mp_thread_join(a)||mp_thread_join(b))return -2;
    if(errno!=77)failures++;
    mp_mutex_destroy(&mutex);return completed==2&&!failures?1:-3;
}
