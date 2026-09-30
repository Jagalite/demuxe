// SPDX-License-Identifier: MIT
// Freestanding continuation oracle. No libmpv/FFmpeg/media dependency.
#include <stdint.h>
#define HOST(mod,name) __attribute__((import_module(mod),import_name(name)))
HOST("review_io","value") extern int host_value(int token);
HOST("test","now") extern double host_now(void);
int64_t mp_time_ns(void){return (int64_t)(host_now()*1000000);}
static int entered,after,finished;
int probe_entered(void){return entered;}
int probe_after(void){return after;}
int probe_finished(void){return finished;}
__attribute__((noinline)) int probe_no_suspend(int token){return token+7;}
__attribute__((noinline)) int probe_once(int token){
    entered++;
    int value=host_value(token);
    after++;
    finished++;
    return value;
}
__attribute__((noinline)) int probe_recursive(int depth,int token){
    volatile uint32_t local[32];
    for(int i=0;i<32;i++)local[i]=(uint32_t)token*17u+(uint32_t)i*31u+(uint32_t)depth;
    int result=depth ? probe_recursive(depth-1,token+1) : probe_once(token);
    for(int i=0;i<32;i++)
        if(local[i]!=(uint32_t)token*17u+(uint32_t)i*31u+(uint32_t)depth)__builtin_trap();
    return result;
}
static __attribute__((noinline)) int indirect0(int token){return probe_once(token);}
static __attribute__((noinline)) int indirect1(int token){return probe_once(token+1);}
static int (*volatile callbacks[2])(int)={indirect0,indirect1};
__attribute__((noinline)) int probe_indirect(int which,int token){
    entered++; // distinguish correct rewind from replaying the entire export
    int result=callbacks[which&1](token);
    after++;
    return result;
}
int probe_trap(int token){probe_once(token);__builtin_trap();}
