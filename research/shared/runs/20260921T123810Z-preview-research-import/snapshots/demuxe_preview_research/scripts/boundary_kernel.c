/* SPDX-License-Identifier: Apache-2.0
 * Research-only integer inverse-transform kernel experiment.
 * Implements the H.264-style 4x4 separable integer inverse transform mathematics,
 * not a bitstream decoder. Inputs are bounded already-dequantized coefficients.
 * No CABAC/CAVLC, prediction, 8x8 transform, filtering, chroma or file parsing.
 * Diagnostic comparison is our own full C kernel, NOT FFmpeg's SIMD decoder.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#if defined(__GNUC__)
#define NOINLINE __attribute__((noinline))
#else
#define NOINLINE
#endif
static const int keep[7]={3,7,11,12,13,14,15};
static uint32_t rng=19823471;
static uint32_t next_rand(void){rng^=rng<<13;rng^=rng>>17;rng^=rng<<5;return rng;}
static void column_pass(const int32_t *in,int32_t *t){
 for(int x=0;x<4;x++){
  int32_t even_sum=in[x]+in[8+x],even_diff=in[x]-in[8+x];
  int32_t odd_diff=(in[4+x]>>1)-in[12+x];
  int32_t odd_sum=in[4+x]+(in[12+x]>>1);
  t[x]=even_sum+odd_sum;t[4+x]=even_diff+odd_diff;
  t[8+x]=even_diff-odd_diff;t[12+x]=even_sum-odd_sum;
 }
}
NOINLINE void full(const int32_t *in,int32_t *out){
 int32_t t[16];column_pass(in,t);
 for(int y=0;y<4;y++){
  const int32_t *p=t+4*y;
  int32_t es=p[0]+p[2],ed=p[0]-p[2];
  int32_t od=(p[1]>>1)-p[3],os=p[1]+(p[3]>>1);
  out[4*y]=(es+os+32)>>6;out[4*y+1]=(ed+od+32)>>6;
  out[4*y+2]=(ed-od+32)>>6;out[4*y+3]=(es-os+32)>>6;
 }
}
NOINLINE void boundary(const int32_t *in,int32_t *out){
 int32_t t[16];column_pass(in,t);
 for(int y=0;y<3;y++){
  const int32_t *p=t+4*y;
  out[4*y+3]=(p[0]+p[2]-p[1]-(p[3]>>1)+32)>>6;
 }
 const int32_t *p=t+12;
 int32_t es=p[0]+p[2],ed=p[0]-p[2];
 int32_t od=(p[1]>>1)-p[3],os=p[1]+(p[3]>>1);
 out[12]=(es+os+32)>>6;out[13]=(ed+od+32)>>6;
 out[14]=(ed-od+32)>>6;out[15]=(es-os+32)>>6;
}
static double now_ms(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1000.0+t.tv_nsec/1e6;}
static int clip(int v){return v<0?0:v>255?255:v;}
static volatile int64_t sink=0;
static double bench(void (*fn)(const int32_t*,int32_t*),const int32_t *pool,size_t blocks){
 int32_t out[16]={0};int64_t sum=0;double start=now_ms();
 for(int cycle=0;cycle<16;cycle++)for(size_t k=0;k<blocks;k++){
  fn(pool+16*k,out);for(int j=0;j<7;j++)sum+=out[keep[j]];
 }
 sink=sum;return now_ms()-start;
}
int main(int argc,char **argv){
 if((-3>>1)!=-2){fprintf(stderr,"requires arithmetic signed right shift\n");return 2;}
 const size_t blocks=65536;int32_t *pool=malloc(blocks*16*sizeof(*pool));
 if(!pool)return 2;
 for(size_t i=0;i<blocks*16;i++)pool[i]=(int32_t)(next_rand()&65535)-32768;
 size_t cases=1000000;int32_t input[16],a[16],b[16];
 for(size_t k=0;k<cases;k++){
  for(int j=0;j<16;j++)input[j]=(int32_t)(next_rand()&65535)-32768;
  if(k<16){memset(input,0,sizeof(input));input[k]=1024;}
  if(k==16)memset(input,0,sizeof(input));
  full(input,a);boundary(input,b);
  for(int j=0;j<7;j++){
   int at=keep[j],pred=(int)(next_rand()&255);
   if(a[at]!=b[at]||clip(a[at]+pred)!=clip(b[at]+pred)){
    fprintf(stderr,"mismatch at %zu/%d\n",k,at);free(pool);return 1;
   }
  }
 }
 printf("{\"correctness_cases\":%zu,\"boundary_residual_checks\":%zu,\"clipped_prediction_checks\":%zu,\"mismatches\":0,\"kernel_calls_per_trial\":%zu,\"trials\":[",cases,cases*7,cases*7,blocks*16);
 if(argc<2||strcmp(argv[1],"--check-only")!=0){
  bench(full,pool,blocks);bench(boundary,pool,blocks);
  for(int i=0;i<9;i++){
   double f,p;
   if(i%2){p=bench(boundary,pool,blocks);f=bench(full,pool,blocks);}
   else{f=bench(full,pool,blocks);p=bench(boundary,pool,blocks);}
   printf("%s{\"full_ms\":%.6f,\"boundary_ms\":%.6f}",i?",":"",f,p);
  }
 }
 printf("],\"checksum\":%lld}\n",(long long)sink);free(pool);return 0;
}
