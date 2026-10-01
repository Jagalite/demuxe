/* SPDX-License-Identifier: MIT
 * EXPERIMENTAL mpv mp_* thread backend, not a POSIX pthread implementation.
 * All callers must run under the single-Worker continuation scheduler in scheduler.mjs.
 */
#pragma once
#include <stdint.h>
#include <stddef.h>
#include "osdep/timer.h"

typedef struct { uint32_t owner; } mp_mutex;
typedef mp_mutex mp_static_mutex;
typedef struct { uint32_t reserved; } mp_cond;
typedef struct { uint32_t state, owner; } mp_once;
typedef uint32_t mp_thread;
typedef uint32_t mp_thread_id;
#define MP_STATIC_MUTEX_INITIALIZER {0}
#define MP_STATIC_COND_INITIALIZER {0}
#define MP_STATIC_ONCE_INITIALIZER {0}
#define MP_THREAD_VOID void *
#define MP_THREAD_RETURN() return NULL
#define mp_thread_id_equal(a,b) ((a)==(b))
#define mp_thread_get_id(t) (t)

int mp_mutex_init(mp_mutex *m);
int mp_mutex_destroy(mp_mutex *m);
int mp_mutex_lock(mp_mutex *m);
int mp_mutex_trylock(mp_mutex *m);
int mp_mutex_unlock(mp_mutex *m);
int mp_cond_init(mp_cond *c);
int mp_cond_destroy(mp_cond *c);
int mp_cond_signal(mp_cond *c);
int mp_cond_broadcast(mp_cond *c);
int mp_cond_wait(mp_cond *c, mp_mutex *m);
int mp_cond_timedwait(mp_cond *c, mp_mutex *m, int64_t ns);
int mp_cond_timedwait_until(mp_cond *c, mp_mutex *m, int64_t until);
int mp_exec_once(mp_once *o, void (*fn)(void));
int mp_thread_create(mp_thread *t, void *(*fn)(void *), void *arg);
int mp_thread_join(mp_thread t);
int mp_thread_detach(mp_thread t);
mp_thread_id mp_thread_current_id(void);
void mp_thread_set_name(const char *name);
int64_t mp_thread_cpu_time_ns(mp_thread_id t);
void demuxe_coop_yield(void);
uintptr_t demuxe_coop_invoke(uintptr_t fn, uintptr_t arg);
uintptr_t demuxe_coop_stack_base(int slot);
uintptr_t demuxe_coop_stack_top(int slot);

int demuxe_coop_stack_count(void);
