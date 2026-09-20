// SPDX-License-Identifier: Apache-2.0
// Benchmark wrapper only. Included historical baseline/candidate retain their LGPL-2.1-or-later notices.
#define main retained_correctness_main
#include "../../../../results/full-completion/r202/oracle.c"
#undef main
#include <time.h>
static int16_t inputs[4096][16];
int main(int argc,char**argv){if(argc!=3)return 2;int narrow=atoi(argv[1]);unsigned loops=(unsigned)atoi(argv[2]),seed=1337;for(int n=0;n<4096;n++){for(int j=0;j<16;j++){seed=1664525u*seed+1013904223u;inputs[n][j]=(seed%5345)-2672;}if(n&1)inputs[n][n%16]=3000;}
// Independent pinned baseline compared on every generated block before timed work.
for(int n=0;n<4096;n++){int16_t a[16],b[16];uint8_t x[16],y[16];memcpy(a,inputs[n],32);memcpy(b,inputs[n],32);memset(x,127,16);memset(y,127,16);ff_h264_idct_add(x,a,4);if(guard(b))candidate(y,b,4);else ff_h264_idct_add(y,b,4);assert(!memcmp(x,y,16)&&!memcmp(a,b,32));}
struct timespec start,end;clock_gettime(CLOCK_MONOTONIC,&start);uint64_t sum=0;unsigned accepted=0,fallback=0;
for(unsigned n=0;n<loops;n++){int16_t b[16];uint8_t x[16];memcpy(b,inputs[n%4096],32);memset(x,127,16);if(narrow&&guard(b)){candidate(x,b,4);accepted++;}else{ff_h264_idct_add(x,b,4);fallback++;}for(int i=0;i<16;i++)sum+=x[i];}
clock_gettime(CLOCK_MONOTONIC,&end);double ms=(end.tv_sec-start.tv_sec)*1000.0+(end.tv_nsec-start.tv_nsec)/1e6;printf("{\"candidate\":%s,\"kernel_ms\":%.9f,\"checksum\":%llu,\"blocks\":%u,\"narrow_blocks\":%u,\"fallback_blocks\":%u,\"correctness_blocks\":4096}\n",narrow?"true":"false",ms,(unsigned long long)sum,loops,accepted,fallback);return 0;}
