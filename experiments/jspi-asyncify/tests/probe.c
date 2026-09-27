/* SPDX-License-Identifier: MIT */
#include "common/common.h"
#include "threads-coop.h"
#include "dispatch.h"
#include "thread_pool.h"
#include <errno.h>
extern int test_allocations(void);
__attribute__((import_module("test"),import_name("read")))
extern int test_async_read(unsigned char *dst,int offset,int size,int delayed);
__attribute__((import_module("test"),import_name("live"))) extern int host_live(void);
static mp_mutex mu=MP_STATIC_MUTEX_INITIALIZER;
static mp_cond cond=MP_STATIC_COND_INITIALIZER;
static mp_once once=MP_STATIC_ONCE_INITIALIZER;
static int value,seen,stage,quit,job_done,protected_value,callback_busy;
static struct mp_dispatch_queue *queue;
static mp_thread_id target_id;
static int yield_rounds=3;

static void sleep_ms(int ms){mp_mutex local=MP_STATIC_MUTEX_INITIALIZER;mp_cond c=MP_STATIC_COND_INITIALIZER;mp_mutex_lock(&local);mp_cond_timedwait(&c,&local,(int64_t)ms*1000000);mp_mutex_unlock(&local);mp_cond_destroy(&c);mp_mutex_destroy(&local);}
__attribute__((noinline)) static void stack_frame(int depth,unsigned seed){
 volatile uint32_t words[257];for(int i=0;i<257;i++)words[i]=seed+(unsigned)i*7919;
 if(depth)stack_frame(depth-1,seed+104729);
 else for(int j=0;j<yield_rounds;j++)demuxe_coop_yield();
 for(int i=0;i<257;i++)assert(words[i]==seed+(unsigned)i*7919);
}
static void *stack_task(void *arg){stack_frame(6,(uintptr_t)arg);seen++;return (void*)73;}
static void *producer(void *arg){(void)arg;for(int i=1;i<=100;i++){mp_mutex_lock(&mu);while(value)mp_cond_wait(&cond,&mu);value=i;mp_cond_broadcast(&cond);mp_mutex_unlock(&mu);demuxe_coop_yield();}return NULL;}
static void *consumer(void *arg){(void)arg;for(int i=1;i<=100;i++){mp_mutex_lock(&mu);while(!value)mp_cond_wait(&cond,&mu);assert(value==i);seen++;value=0;mp_cond_broadcast(&cond);mp_mutex_unlock(&mu);}return NULL;}
static void initialize_once(void){stage++;for(int j=0;j<5;j++)demuxe_coop_yield();value=9876;}
static void *once_task(void *arg){(void)arg;mp_exec_once(&once,initialize_once);assert(value==9876);seen++;return NULL;}
static void *signal_task(void *arg){(void)arg;demuxe_coop_yield();mp_mutex_lock(&mu);value=1;mp_cond_signal(&cond);mp_mutex_unlock(&mu);return NULL;}
static void *detached_task(void *arg){(void)arg;stack_frame(2,996);seen++;return NULL;}
static void core_wakeup(void *arg){mp_dispatch_interrupt(arg);}
static void *core_task(void *arg){(void)arg;target_id=mp_thread_current_id();while(!quit)mp_dispatch_queue_process(queue,1);return NULL;}
static void increment(void *arg){assert(mp_thread_current_id()==target_id);protected_value+=(uintptr_t)arg;}
static void stop_core(void *arg){(void)arg;quit=1;}
static void delayed_callback(void *arg){
 (void)arg;assert(mp_thread_current_id()==target_id);callback_busy=1;
 volatile uint32_t guards[257];for(int i=0;i<257;i++)guards[i]=0xba000000u+i;
 unsigned char data[173];int n=test_async_read(data,37,sizeof(data),1);assert(n==(int)sizeof(data));
 for(int i=0;i<n;i++)assert(data[i]==((unsigned)(37+i)*73+17)%256);
 for(int i=0;i<257;i++)assert(guards[i]==0xba000000u+i);
 protected_value++;callback_busy=0;
}
static void *locking_client(void *arg){(void)arg;mp_dispatch_lock(queue);assert(!callback_busy);int v=protected_value;demuxe_coop_yield();assert(protected_value==v);protected_value++;mp_dispatch_unlock(queue);return NULL;}
static void *dispatch_client(void *arg){for(int i=0;i<20;i++)mp_dispatch_run(queue,increment,arg);return NULL;}
static mp_thread start_core(void){queue=mp_dispatch_create(NULL);mp_dispatch_set_wakeup_fn(queue,core_wakeup,queue);mp_thread t;assert(!mp_thread_create(&t,core_task,NULL));return t;}
static void end_core(mp_thread t){mp_dispatch_run(queue,stop_core,NULL);assert(!mp_thread_join(t));talloc_free(queue);queue=NULL;assert(!test_allocations());}
static void pool_job(void *arg){volatile uint32_t local=(uintptr_t)arg;demuxe_coop_yield();assert(local==(uintptr_t)arg);mp_mutex_lock(&mu);job_done++;mp_cond_broadcast(&cond);mp_mutex_unlock(&mu);}

int test_run(int which){
 assert(!test_allocations());
 switch(which){
 case 0: {
  assert(!mp_mutex_lock(&mu));assert(mp_mutex_trylock(&mu)==EBUSY);assert(!mp_mutex_unlock(&mu));assert(!mp_mutex_trylock(&mu));mp_mutex_unlock(&mu);mp_mutex_destroy(&mu);break;
 }
 case 1: {
  mp_thread a,b;assert(!mp_thread_create(&a,producer,NULL));assert(!mp_thread_create(&b,consumer,NULL));mp_thread_join(a);mp_thread_join(b);assert(seen==100 && !value);mp_cond_destroy(&cond);mp_mutex_destroy(&mu);break;
 }
 case 2: {
  for(int batch=0;batch<50;batch++){mp_thread ts[8];for(int i=0;i<8;i++)assert(!mp_thread_create(&ts[i],stack_task,(void*)(uintptr_t)(batch*8+i+1)));for(int i=0;i<8;i++)assert(!mp_thread_join(ts[i]));}assert(seen==400);break;
 }
 case 3: {
  mp_thread ts[8];for(int i=0;i<8;i++)assert(!mp_thread_create(&ts[i],once_task,NULL));for(int i=0;i<8;i++)mp_thread_join(ts[i]);assert(stage==1 && seen==8);break;
 }
 case 4: {
  for(int i=0;i<10;i++){mp_mutex_lock(&mu);int64_t end=mp_time_ns()+10000000;int r;do{r=mp_cond_timedwait_until(&cond,&mu,end);}while(!r);assert(r==ETIMEDOUT);assert(mp_time_ns()>=end);assert(mu.owner==mp_thread_current_id());mp_mutex_unlock(&mu);}break;
 }
 case 5: {
  for(int i=0;i<50;i++){value=0;mp_thread t;mp_thread_create(&t,signal_task,NULL);mp_mutex_lock(&mu);while(!value)assert(!mp_cond_timedwait(&cond,&mu,1000000000));mp_mutex_unlock(&mu);mp_thread_join(t);}sleep_ms(5);break;
 }
 case 6: {
  mp_thread core=start_core(),clients[4];
  for(int i=0;i<4;i++)mp_thread_create(&clients[i],dispatch_client,(void*)(uintptr_t)(i+1));
  for(int i=0;i<4;i++)mp_thread_join(clients[i]);assert(protected_value==200);
  mp_dispatch_lock(queue);int saved=protected_value;demuxe_coop_yield();assert(saved==protected_value);mp_dispatch_unlock(queue);
  end_core(core);break;
 }
 case 7: {
  mp_thread core=start_core();
  mp_dispatch_lock(queue);
  for(int i=0;i<20;i++)mp_dispatch_enqueue_notify(queue,increment,(void*)7);
  mp_dispatch_enqueue(queue,increment,(void*)1000);
  mp_dispatch_cancel_fn(queue,increment,(void*)1000);
  mp_dispatch_unlock(queue);
  mp_dispatch_run(queue,increment,(void*)1);assert(protected_value==8);end_core(core);break;
 }
 case 8: {
  mp_thread core=start_core(),client;
  mp_dispatch_enqueue(queue,delayed_callback,NULL);
  while(!callback_busy)demuxe_coop_yield();
  mp_thread_create(&client,locking_client,NULL);
  mp_thread_join(client);assert(protected_value==2&&!callback_busy);end_core(core);break;
 }
 case 9: {
  struct mp_thread_pool *pool=mp_thread_pool_create(NULL,0,1,4);assert(pool);
  for(int i=0;i<100;i++)assert(mp_thread_pool_queue(pool,pool_job,(void*)(uintptr_t)(i+1)));
  mp_mutex_lock(&mu);while(job_done<100)mp_cond_wait(&cond,&mu);mp_mutex_unlock(&mu);
  talloc_free(pool);assert(job_done==100&&!test_allocations());break;
 }
 case 10: {
  mp_thread t;mp_thread_create(&t,detached_task,NULL);assert(!mp_thread_detach(t));
  while(!seen)demuxe_coop_yield();demuxe_coop_yield();assert(seen==1);break;
 }
 case 11: {
  struct mp_thread_pool *pool=mp_thread_pool_create(NULL,0,0,2);assert(pool);
  assert(mp_thread_pool_queue(pool,pool_job,(void*)1));
  mp_mutex_lock(&mu);while(job_done<1)mp_cond_wait(&cond,&mu);mp_mutex_unlock(&mu);
  sleep_ms(10200);assert(host_live()==1);talloc_free(pool);assert(!test_allocations());break;
 }
 case 12: {
  for(int cycle=0;cycle<100;cycle++){
   quit=0;mp_thread core=start_core();mp_dispatch_run(queue,increment,(void*)1);end_core(core);
  }assert(protected_value==100);break;
 }
 case 13: {
  unsigned char data[31];int n=test_async_read(data,0,sizeof(data),2);assert(n==-1);seen=1;break;
 }
 case 14: {
  mp_thread ts[24];int n=0;
  for(;n<24;n++)if(mp_thread_create(&ts[n],stack_task,(void*)(uintptr_t)(n+1)))break;
  assert(n==23);for(int i=0;i<n;i++)mp_thread_join(ts[i]);assert(seen==23);break;
 }
 default:assert(0);
 }
 assert(!test_allocations());return 0;
}
