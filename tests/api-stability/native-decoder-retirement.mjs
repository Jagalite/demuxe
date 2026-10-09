// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('actual native decoder cancellation wakes in-flight requests and rejects later work without another ticket',async()=>{
 const source=await readFile(new URL('../../native/vd_browser.c',import.meta.url),'utf8');
 const enable=source.slice(source.indexOf('EMSCRIPTEN_KEEPALIVE void web_decoder_enable'),source.indexOf('int web_decoder_enabled'));
 const request=source.slice(source.indexOf('static int request(int operation)'),source.indexOf('struct browser_priv'));
 const directory=await mkdtemp(join(tmpdir(),'demuxe-native-decoder-retirement-'));
 try{
  const code=`
#define _POSIX_C_SOURCE 200809L
#include <assert.h>
#include <stdatomic.h>
#include <pthread.h>
#include <stdint.h>
#include <errno.h>
#include <time.h>
#define EMSCRIPTEN_KEEPALIVE
#define AVERROR(value) (-(value))
static _Atomic int enabled,cancelled,wakes;
static struct { _Atomic int state; int serial,operation,result; } web_decoder;
static double emscripten_get_now(void) {struct timespec now;clock_gettime(CLOCK_MONOTONIC,&now);return now.tv_sec*1000.0+now.tv_nsec/1000000.0;}
static void emscripten_futex_wake(_Atomic int *state,int count) {(void)state;(void)count;atomic_fetch_add(&wakes,1);}
static void emscripten_futex_wait(_Atomic int *state,int ticket,double ms) {(void)state;(void)ticket;(void)ms;struct timespec delay={0,1000000};nanosleep(&delay,0);}
${enable}
${request}
static int result;
static void *run(void *operation) {result=request((int)(intptr_t)operation);return 0;}
static void pending(void) {double deadline=emscripten_get_now()+1000;while((atomic_load(&web_decoder.state)&3)!=1){assert(emscripten_get_now()<deadline);struct timespec delay={0,1000000};nanosleep(&delay,0);}}
int main(void) {
 for(int i=0;i<100;i++){
  web_decoder_enable(2);assert(!atomic_load(&cancelled));pthread_t thread;
  assert(!pthread_create(&thread,0,run,(void *)(intptr_t)4));pending();
  double started=emscripten_get_now();web_decoder_cancel();assert(!pthread_join(thread,0));
  assert(result==AVERROR(EIO));assert(emscripten_get_now()-started<1000);assert(atomic_load(&web_decoder.state)==0);
  int serial=web_decoder.serial;assert(request(5)==0);assert(request(2)==AVERROR(EIO));assert(web_decoder.serial==serial);
 }
 web_decoder_enable(2);pthread_t thread;assert(!pthread_create(&thread,0,run,(void *)(intptr_t)4));pending();
 web_decoder.result=42;atomic_fetch_add(&web_decoder.state,1);assert(!pthread_join(thread,0));assert(result==42);
 assert(atomic_load(&wakes)>=100);
 return 0;
}
`;
  await writeFile(join(directory,'test.c'),code);
  execFileSync(process.env.CC||'cc',['-std=c11','-pthread','-Wall','-Wextra','-Werror',join(directory,'test.c'),'-o',join(directory,'test')],{timeout:30000});
  assert.equal(execFileSync(join(directory,'test'),[],{timeout:5000,encoding:'utf8'}),'');
 }finally{await rm(directory,{recursive:true,force:true});}
});
