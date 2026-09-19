// SPDX-License-Identifier: GPL-3.0-or-later
#include "transition.h"
#include <assert.h>
#include <string.h>
#include <libavutil/buffer.h>
#include <libavutil/mathematics.h>
#include <libavutil/avutil.h>
static void clear(struct demuxe_packet_queue *q){for(unsigned i=0;i<q->count;i++)av_packet_free(&q->packets[i].packet);memset(q,0,sizeof(*q));}
static size_t cost(AVPacket *p){
 size_t bytes=sizeof(struct demuxe_packet)+(p->buf?p->buf->size:(size_t)p->size);
 for(int i=0;i<p->side_data_elems;i++){
  if(p->side_data[i].size>SIZE_MAX-bytes)return SIZE_MAX;
  bytes+=p->side_data[i].size;
 }
 return bytes;
}
static void move(struct demuxe_packet_queue *to,struct demuxe_packet_queue *from){assert(!to->count);*to=*from;memset(from,0,sizeof(*from));}
static int append(struct demuxe_transition *s,struct demuxe_packet_queue *q,struct demuxe_packet p){
 size_t n=cost(p.packet),used=s->old_packets.bytes+s->new_packets.bytes+s->ready.bytes;
 unsigned cap=q==&s->old_packets?DEMUXE_TRANSITION_PACKETS-1:DEMUXE_TRANSITION_PACKETS;
 if(q->count>=cap||used>s->budget||n>s->budget-used)return 0;
 q->packets[q->count++]=p;q->bytes+=n;if(used+n>s->peak_bytes)s->peak_bytes=used+n;return 1;
}
void demuxe_transition_init(struct demuxe_transition *s,uint64_t source,int active,size_t budget){
 *s=(struct demuxe_transition){.source=source,.active=active,.candidate=-1,.budget=budget,.last_pts=AV_NOPTS_VALUE,.old_key=AV_NOPTS_VALUE,.new_key=AV_NOPTS_VALUE};
}
void demuxe_transition_cancel(struct demuxe_transition *s,const char *reason){
 // The adapter must drain prior output before changing policy.
 assert(!s->ready.count);clear(&s->new_packets);move(&s->ready,&s->old_packets);
 s->candidate=-1;s->old_key=s->new_key=AV_NOPTS_VALUE;s->phase=DEMUXE_REJECTED;s->reason=reason;
}
int demuxe_transition_request(struct demuxe_transition *s,uint64_t source,uint64_t request,int representation){
 if(source!=s->source||request<=s->request||request<s->latest_request||representation<0)return 0;
 // Remember the newest intent even when the caller must first drain output.
 // An intervening older request must not replace that reserved policy.
 s->latest_request=request;
 if(s->ready.count)return 0;
 // Superseding a prepared boundary first releases the old stream. Caller drains
 // it and retries; a new request must not discard already accepted old packets.
 if(s->candidate>=0){demuxe_transition_cancel(s,"superseded");return 0;}
 s->request=request;s->candidate=representation;s->reason=NULL;
 s->phase=representation==s->active?DEMUXE_STABLE:DEMUXE_PREPARING;
 if(representation==s->active)s->candidate=-1;
 return 1;
}
static void decide(struct demuxe_transition *s){
 if(s->old_key==AV_NOPTS_VALUE||s->new_key==AV_NOPTS_VALUE)return;
 if(av_compare_ts(s->old_key,s->old_tb,s->new_key,s->new_tb)){
  demuxe_transition_cancel(s,"unaligned-keyframes");return;
 }
 clear(&s->old_packets);move(&s->ready,&s->new_packets);s->active=s->candidate;s->candidate=-1;s->phase=DEMUXE_ACCEPTED;
 s->last_pts=s->new_key;s->last_tb=s->new_tb;s->old_key=s->new_key=AV_NOPTS_VALUE;
}
void demuxe_transition_push(struct demuxe_transition *s,uint64_t source,int representation,AVPacket *packet,AVRational tb){
 assert(!s->ready.count);struct demuxe_packet p={packet,tb,representation};
 if(source!=s->source||!packet){av_packet_free(&packet);return;}
 if(packet->pts==AV_NOPTS_VALUE||tb.num<=0||tb.den<=0){
  if(s->candidate>=0)demuxe_transition_cancel(s,"missing-presentation-timestamp");
  if(representation==s->active){
   assert(s->ready.count<DEMUXE_TRANSITION_PACKETS);
   s->ready.packets[s->ready.count++]=p;s->ready.bytes+=cost(packet);
  }else av_packet_free(&packet);
  return;
 }
 int key=!!(packet->flags&AV_PKT_FLAG_KEY);
 if(representation==s->active){
  if(s->candidate<0||(!key&&s->old_key==AV_NOPTS_VALUE)){
   // Immediate output has a separate caller-owned packet allocation. A packet
   // larger than the preparation budget need not be retained to pass through.
   s->ready.packets[0]=p;s->ready.count=1;s->ready.bytes=cost(packet);
   if(s->last_pts==AV_NOPTS_VALUE||av_compare_ts(packet->pts,tb,s->last_pts,s->last_tb)>0){s->last_pts=packet->pts;s->last_tb=tb;}
   return;
  }
  if(s->old_key==AV_NOPTS_VALUE){s->old_key=packet->pts;s->old_tb=tb;}
  if(!append(s,&s->old_packets,p)){
   demuxe_transition_cancel(s,"packet-budget");
   // Leave ownership explicit: append the current old packet after the bounded
   // withheld queue using the reserved final slot, or reject the entire adapter.
   assert(s->ready.count<DEMUXE_TRANSITION_PACKETS);
   s->ready.packets[s->ready.count++]=p;s->ready.bytes+=cost(packet);return;
  }
  decide(s);return;
 }
 if(representation!=s->candidate){av_packet_free(&packet);return;}
 if(s->new_key==AV_NOPTS_VALUE){
  if(!key||(s->last_pts!=AV_NOPTS_VALUE&&av_compare_ts(packet->pts,tb,s->last_pts,s->last_tb)<=0)){
   av_packet_free(&packet);return;
  }
  s->new_key=packet->pts;s->new_tb=tb;
 }
 if(!append(s,&s->new_packets,p)){av_packet_free(&packet);demuxe_transition_cancel(s,"packet-budget");return;}
 decide(s);
}
struct demuxe_packet demuxe_transition_take(struct demuxe_transition *s){
 if(!s->ready.count)return (struct demuxe_packet){0};
 struct demuxe_packet p=s->ready.packets[0];s->ready.bytes-=cost(p.packet);s->ready.count--;
 if(p.representation==s->active&&p.packet->pts!=AV_NOPTS_VALUE&&p.timebase.num>0&&p.timebase.den>0&&
    (s->last_pts==AV_NOPTS_VALUE||av_compare_ts(p.packet->pts,p.timebase,s->last_pts,s->last_tb)>0)){
  s->last_pts=p.packet->pts;s->last_tb=p.timebase;
 }
 memmove(s->ready.packets,s->ready.packets+1,s->ready.count*sizeof(p));return p;
}
void demuxe_transition_destroy(struct demuxe_transition *s){clear(&s->old_packets);clear(&s->new_packets);clear(&s->ready);memset(s,0,sizeof(*s));}
