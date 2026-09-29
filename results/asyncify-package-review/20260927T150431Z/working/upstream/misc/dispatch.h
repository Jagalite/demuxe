/* UNIT TEST declaration shim. Actual upstream .c is byte-verified separately. */
#pragma once
#include <stdint.h>
typedef void (*mp_dispatch_fn)(void *);
struct mp_dispatch_queue;
struct mp_dispatch_queue *mp_dispatch_create(void *);
void mp_dispatch_set_wakeup_fn(struct mp_dispatch_queue *,void (*)(void *),void *);
void mp_dispatch_set_onlock_fn(struct mp_dispatch_queue *,void (*)(void *),void *);
void mp_dispatch_enqueue(struct mp_dispatch_queue *,mp_dispatch_fn,void *);
void mp_dispatch_enqueue_autofree(struct mp_dispatch_queue *,mp_dispatch_fn,void *);
void mp_dispatch_enqueue_notify(struct mp_dispatch_queue *,mp_dispatch_fn,void *);
void mp_dispatch_cancel_fn(struct mp_dispatch_queue *,mp_dispatch_fn,void *);
void mp_dispatch_run(struct mp_dispatch_queue *,mp_dispatch_fn,void *);
void mp_dispatch_queue_process(struct mp_dispatch_queue *,double);
void mp_dispatch_interrupt(struct mp_dispatch_queue *);
void mp_dispatch_adjust_timeout(struct mp_dispatch_queue *,int64_t);
void mp_dispatch_lock(struct mp_dispatch_queue *);
void mp_dispatch_unlock(struct mp_dispatch_queue *);
