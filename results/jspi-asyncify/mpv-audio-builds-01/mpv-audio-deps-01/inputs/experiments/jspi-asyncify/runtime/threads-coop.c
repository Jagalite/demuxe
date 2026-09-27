/* SPDX-License-Identifier: MIT */
#include "threads-coop.h"
#include <errno.h>


/* Explicit imports make the ABI auditable. They are not pthread imports. */
#define HOST(name) __attribute__((import_module("demuxe_coop"),import_name(#name)))
HOST(panic) __attribute__((noreturn)) extern void host_panic(const char *expression,int line);
#define COOP_CHECK(x) do { if(!(x)) host_panic(#x,__LINE__); } while(0)
HOST(self) extern uint32_t host_self(void);
HOST(wait) extern int host_wait(uintptr_t key, double timeout_ms);
HOST(wake) extern void host_wake(uintptr_t key, int all);
HOST(waiters) extern int host_waiters(uintptr_t key);
HOST(create) extern uint32_t host_create(uintptr_t fn, uintptr_t arg);
HOST(join) extern int host_join(uint32_t task);
HOST(detach) extern int host_detach(uint32_t task);
HOST(name) extern void host_name(const char *name);
HOST(yield) extern void host_yield(void);

/* Fixed capacity is intentional for this bounded experiment. Reuse only after
 * completion. No stack is freed while a suspended continuation still references it.
 */
#ifndef DEMUXE_COOP_SLOTS
#define DEMUXE_COOP_SLOTS 24
#endif
#ifndef DEMUXE_COOP_STACK_SIZE
#define DEMUXE_COOP_STACK_SIZE (512*1024)
#endif
_Static_assert(DEMUXE_COOP_SLOTS >= 1 && DEMUXE_COOP_SLOTS <= 256, "slot budget");
_Static_assert(DEMUXE_COOP_STACK_SIZE >= 128 && DEMUXE_COOP_STACK_SIZE % 32 == 0,
               "C stack must preserve array alignment");
static _Alignas(32) unsigned char stacks[DEMUXE_COOP_SLOTS][DEMUXE_COOP_STACK_SIZE];
int demuxe_coop_stack_count(void) { return DEMUXE_COOP_SLOTS; }
uintptr_t demuxe_coop_stack_base(int slot) {
    COOP_CHECK(slot>=0 && slot<DEMUXE_COOP_SLOTS); return (uintptr_t)stacks[slot];
}
uintptr_t demuxe_coop_stack_top(int slot) {
    return demuxe_coop_stack_base(slot)+DEMUXE_COOP_STACK_SIZE;
}
uintptr_t demuxe_coop_invoke(uintptr_t fn, uintptr_t arg) {
    return (uintptr_t)((void *(*)(void *))fn)((void *)arg);
}
mp_thread_id mp_thread_current_id(void) { return host_self(); }
int mp_mutex_init(mp_mutex *m) { m->owner=0; return 0; }
int mp_mutex_destroy(mp_mutex *m) {
    COOP_CHECK(!m->owner && !host_waiters((uintptr_t)m)); return 0;
}
int mp_mutex_trylock(mp_mutex *m) {
    uint32_t me=host_self(); COOP_CHECK(me);
    if(m->owner) return EBUSY;
    m->owner=me; return 0;
}
int mp_mutex_lock(mp_mutex *m) {
    uint32_t me=host_self(); COOP_CHECK(me && m->owner!=me);
    while(m->owner) host_wait((uintptr_t)m,-1);
    m->owner=me; return 0;
}
int mp_mutex_unlock(mp_mutex *m) {
    COOP_CHECK(m->owner==host_self()); m->owner=0;
    host_wake((uintptr_t)m,1); return 0;
}
int mp_cond_init(mp_cond *c) { c->reserved=0; return 0; }
int mp_cond_destroy(mp_cond *c) {
    COOP_CHECK(!host_waiters((uintptr_t)c)); return 0;
}
int mp_cond_signal(mp_cond *c) { host_wake((uintptr_t)c,0); return 0; }
int mp_cond_broadcast(mp_cond *c) { host_wake((uintptr_t)c,1); return 0; }
int mp_cond_timedwait(mp_cond *c,mp_mutex *m,int64_t ns) {
    /* Single JS agent: unlock and registration cannot be interleaved with
     * another coroutine until host_wait actually returns a Promise to Wasm. */
    double ms=ns>INT64_C(86400000000000000)?-1:(ns>0?ns/1e6:0);
    mp_mutex_unlock(m);
    int result=host_wait((uintptr_t)c,ms);
    mp_mutex_lock(m); return result ? ETIMEDOUT : 0;
}
int mp_cond_wait(mp_cond *c,mp_mutex *m) {
    return mp_cond_timedwait(c,m,INT64_MAX);
}
int mp_cond_timedwait_until(mp_cond *c,mp_mutex *m,int64_t until) {
    int64_t now=mp_time_ns();
    return mp_cond_timedwait(c,m,until>now?until-now:0);
}
int mp_exec_once(mp_once *o,void (*fn)(void)) {
    while(o->state==1) {
        COOP_CHECK(o->owner!=host_self()); host_wait((uintptr_t)o,-1);
    }
    if(o->state==2) return 0;
    COOP_CHECK(o->state==0); o->state=1; o->owner=host_self();
    fn(); /* May suspend; other callers must wait for COMPLETE, not STARTED. */
    o->state=2; o->owner=0; host_wake((uintptr_t)o,1); return 0;
}
int mp_thread_create(mp_thread *t,void *(*fn)(void *),void *arg) {
    *t=host_create((uintptr_t)fn,(uintptr_t)arg); return *t?0:EAGAIN;
}
int mp_thread_join(mp_thread t) { int r=host_join(t); return r==2?EDEADLK:r?EINVAL:0; }
int mp_thread_detach(mp_thread t) { return host_detach(t)?EINVAL:0; }
void mp_thread_set_name(const char *name) { host_name(name); }
int64_t mp_thread_cpu_time_ns(mp_thread_id t) { (void)t; return -1; }
void demuxe_coop_yield(void) { host_yield(); }
