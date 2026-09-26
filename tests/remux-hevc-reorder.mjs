// SPDX-License-Identifier: Apache-2.0
// Compile the production lookahead and DTS reconstruction with packet-I/O mocks.
import test from 'node:test';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('HEVC seek lookahead retains packets, avoids synthetic collisions and rejects invalid input',async()=>{
 const source=await readFile(new URL('../native/remux/remux.c',import.meta.url),'utf8');
 const seed=source.slice(source.indexOf('static int seed_hevc_reorder('),source.indexOf('static int repair_audio('));
 const repairStart=source.indexOf('   if(repair_dts){',source.indexOf('int rm_step('));
 const repairEnd=source.indexOf('  double time=',repairStart);
 const repair=source.slice(repairStart,repairEnd).replace('\n  }\n  if(packet->dts','\n  if(packet->dts');
 const directory=await mkdtemp(path.join(tmpdir(),'demuxe-hevc-reorder-'));
 try{
  await writeFile(path.join(directory,'reorder.c'),`
#include <assert.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#define AV_NOPTS_VALUE INT64_MIN
#define AVERROR(x) (-(x))
#define AVERROR_EOF (-12345)
#define FFMIN(a,b) ((a)<(b)?(a):(b))
typedef struct {int stream_index,size,flags;int64_t pts,dts,duration;} AVPacket;
static int repair_dts=1,hevc_video=1,reorder=2,video=0,prefetch_at,prefetched;
static int read_at,read_count,read_error=AVERROR_EOF,live;
static AVPacket input[300],*prefetch[256];
static int64_t pts_queue[17],last_dts[64];
static void *in;
static int reject(const char *message){(void)message;return -1;}
static int idr(const AVPacket*q){return q->flags;}
static AVPacket *av_packet_alloc(void){live++;return calloc(1,sizeof(AVPacket));}
static void av_packet_free(AVPacket**q){if(*q){live--;free(*q);*q=NULL;}}
static int av_read_frame(void *ctx,AVPacket*q){(void)ctx;if(read_at==read_count)return read_error;*q=input[read_at++];return 0;}
${seed}
static int decode_timestamp(AVPacket *packet){int idx=0;
${repair}
return 0;}
static void reset(void){
 for(int i=0;i<prefetched;i++)av_packet_free(&prefetch[i]);
 assert(live==0);prefetched=prefetch_at=read_at=0;read_count=3;read_error=AVERROR_EOF;
 memset(input,0,sizeof(input));
 for(int i=0;i<300;i++)input[i]=(AVPacket){0,100,i==0,3000+i*33,AV_NOPTS_VALUE,33};
 for(int i=0;i<17;i++)pts_queue[i]=AV_NOPTS_VALUE;
 for(int i=0;i<64;i++)last_dts[i]=AV_NOPTS_VALUE;
 repair_dts=hevc_video=1;reorder=2;
}
int main(void){
 reset();input[1].pts=2967;input[2].pts=3133;
 AVPacket originals[3];memcpy(originals,input,sizeof(originals));
 assert(seed_hevc_reorder()==0);assert(read_at==3&&prefetched==3);
 assert(pts_queue[0]==2901&&pts_queue[1]==2934);
 for(int i=0;i<3;i++){assert(!memcmp(prefetch[i],&originals[i],sizeof(AVPacket)));assert(decode_timestamp(prefetch[i])==0);assert(prefetch[i]->pts==originals[i].pts);}
 // A real duplicate timestamp still reaches the unchanged discontinuity guard.
 reset();input[0].pts=input[1].pts=input[2].pts=3000;
 assert(seed_hevc_reorder()==0);
 for(int i=0;i<3;i++)assert(decode_timestamp(prefetch[i])==0);
 AVPacket duplicate=input[2];assert(decode_timestamp(&duplicate)<0);
 // Compact consumed slots and preserve interleaved audio without counting it.
 reset();read_count=4;input[1].stream_index=1;input[2].pts=2967;input[3].pts=3133;
 prefetch[0]=av_packet_alloc();prefetch[1]=av_packet_alloc();*prefetch[1]=input[0];
 prefetched=2;prefetch_at=1;read_at=1;
 assert(seed_hevc_reorder()==0);assert(prefetch_at==0&&prefetched==4&&live==4);
 for(int i=0;i<4;i++)assert(!memcmp(prefetch[i],&input[i],sizeof(AVPacket)));
 // A short final GOP may end before a full reorder window.
 reset();read_count=1;assert(seed_hevc_reorder()==0);assert(prefetched==1);
 reset();read_count=0;assert(seed_hevc_reorder()<0);
 reset();read_count=0;read_error=-42;assert(seed_hevc_reorder()==-42);
 reset();input[0].flags=0;assert(seed_hevc_reorder()<0);
 reset();input[1].pts=AV_NOPTS_VALUE;assert(seed_hevc_reorder()<0);
 reset();input[0].duration=0;assert(seed_hevc_reorder()<0);
 reset();input[0].duration=INT64_MAX;assert(seed_hevc_reorder()<0);
 reset();input[0].pts=INT64_MIN+1;assert(seed_hevc_reorder()<0);
 reset();input[0].size=2*1024*1024+1;assert(seed_hevc_reorder()<0);assert(live==0);
 reset();read_count=300;for(int i=0;i<300;i++)input[i].stream_index=1;
 assert(seed_hevc_reorder()<0);assert(read_at==256&&live==256);
 reset();hevc_video=0;assert(seed_hevc_reorder()==0&&read_at==0);
 reset();reorder=0;assert(seed_hevc_reorder()==0&&read_at==0);
 reset();return 0;
}
`);
  const binary=path.join(directory,'reorder');
  execFileSync(process.env.CC??'cc',['-std=c11','-Wall','-Wextra','-fsanitize=address,undefined',path.join(directory,'reorder.c'),'-o',binary]);
  execFileSync(binary);
 }finally{await rm(directory,{recursive:true,force:true});}
});
