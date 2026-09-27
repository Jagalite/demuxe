/* UNIT TEST declaration shim. Actual upstream .c is byte-verified separately. */
#pragma once
#include <stdbool.h>
struct mp_thread_pool;
struct mp_thread_pool *mp_thread_pool_create(void *,int,int,int);
bool mp_thread_pool_queue(struct mp_thread_pool *,void (*)(void *),void *);
bool mp_thread_pool_run(struct mp_thread_pool *,void (*)(void *),void *);
