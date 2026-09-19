// SPDX-License-Identifier: GPL-3.0-or-later
#include "transition.h"
#include <assert.h>
#include <stdio.h>
#include <libavutil/avutil.h>
static AVPacket *packet(int64_t pts,int key){AVPacket *p=av_packet_alloc();assert(p);assert(!av_new_packet(p,32));p->pts=p->dts=pts;p->flags=key?AV_PKT_FLAG_KEY:0;return p;}
static void feed(struct demuxe_transition *s,int rep,int64_t pts,int key,AVRational tb){demuxe_transition_push(s,1,rep,packet(pts,key),tb);}
static void take(struct demuxe_transition *s,int rep,int64_t pts){struct demuxe_packet p=demuxe_transition_take(s);assert(p.packet&&p.representation==rep&&p.packet->pts==pts);av_packet_free(&p.packet);}
int main(void){
 const AVRational ms={1,1000},ticks={1,90000};struct demuxe_transition s;
 for(int order=0;order<2;order++){
  demuxe_transition_init(&s,1,0,4096);feed(&s,0,1000,1,ms);take(&s,0,1000);
  assert(demuxe_transition_request(&s,1,1,1));assert(!demuxe_transition_request(&s,2,2,2));
  feed(&s,1,90000,1,ticks);assert(!s.ready.count); // obsolete candidate GOP
  feed(&s,0,1900,0,ms);take(&s,0,1900);
  if(order){feed(&s,1,180000,1,ticks);feed(&s,1,183000,0,ticks);feed(&s,0,2000,1,ms);}
  else{feed(&s,0,2000,1,ms);feed(&s,0,2033,0,ms);feed(&s,1,180000,1,ticks);}
  assert(s.active==1&&s.phase==DEMUXE_ACCEPTED);take(&s,1,180000);if(order)take(&s,1,183000);
  feed(&s,0,2066,0,ms);assert(!s.ready.count); // retired output never escapes
  feed(&s,1,186000,0,ticks);take(&s,1,186000);assert(s.peak_bytes<=s.budget);
  demuxe_transition_destroy(&s);
 }
 demuxe_transition_init(&s,1,0,4096);assert(demuxe_transition_request(&s,1,1,1));
 feed(&s,0,2000,1,ms);feed(&s,0,2033,0,ms);feed(&s,1,180090,1,ticks);
 assert(s.active==0&&s.phase==DEMUXE_REJECTED);take(&s,0,2000);take(&s,0,2033);
 assert(demuxe_transition_request(&s,1,2,1));feed(&s,0,4000,1,ms);
 assert(!demuxe_transition_request(&s,1,4,2));
 assert(!demuxe_transition_request(&s,1,3,1));take(&s,0,4000);
 assert(!demuxe_transition_request(&s,1,3,1));assert(demuxe_transition_request(&s,1,4,2));
 demuxe_transition_cancel(&s,"seek");assert(!s.ready.count);demuxe_transition_destroy(&s);
 // Bound both queue count and allocation ownership; preserve all old packets
 // when candidate preparation exceeds the budget.
 demuxe_transition_init(&s,1,0,512);assert(demuxe_transition_request(&s,1,1,1));
 feed(&s,0,2000,1,ms);int n=1;
 while(s.phase==DEMUXE_PREPARING){feed(&s,0,2000+n,0,ms);n++;}
 for(int i=0;i<n;i++)take(&s,0,2000+i);
 assert(s.active==0&&s.peak_bytes<=s.budget);demuxe_transition_destroy(&s);
 demuxe_transition_init(&s,1,0,1024*1024);assert(demuxe_transition_request(&s,1,1,1));
 feed(&s,0,0,1,ms);for(int i=1;i<256;i++)feed(&s,0,i,0,ms);
 assert(s.phase==DEMUXE_REJECTED);for(int i=0;i<256;i++)take(&s,0,i);demuxe_transition_destroy(&s);
 // Missing timestamps reject preparation, but never discard the old stream.
 demuxe_transition_init(&s,1,0,4096);assert(demuxe_transition_request(&s,1,1,1));
 feed(&s,0,AV_NOPTS_VALUE,0,ms);take(&s,0,AV_NOPTS_VALUE);assert(s.phase==DEMUXE_REJECTED);
 demuxe_transition_push(&s,2,0,packet(1,0),ms);assert(!s.ready.count);demuxe_transition_destroy(&s);
 puts("PASS: aligned rational boundaries, arrival orders, stale packets, mismatch, supersession, byte/count budgets, ownership");
}
