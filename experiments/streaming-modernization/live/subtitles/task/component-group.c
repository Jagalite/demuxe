// SPDX-License-Identifier: GPL-2.0-or-later
#include "component-group.h"
#include "manifest-plan.h"
#include "cue-budget.h"
#include <stdlib.h>
#include <string.h>
#include <libavutil/mathematics.h>
#define COMPONENTS 3
struct component {
 int stream,finished;
 int64_t next;
 struct demuxe_container_task *task;
 struct demuxe_prepared_packet head;
 struct demuxe_cue_budget cues;
};
struct demuxe_component_group {
 AVFormatContext *parent;uint64_t source;struct demuxe_task_io io;
 struct component active[COMPONENTS];
 int (*map)(void *,struct demuxe_prepared_packet *);void *map_opaque;
};
static void retire(struct component *c){demuxe_packet_release(&c->head);demuxe_task_destroy(c->task);*c=(struct component){0};}
static int selected(AVFormatContext *f,int stream){
 enum AVMediaType type=f->streams[stream]->codecpar->codec_type;
 return f->streams[stream]->discard!=AVDISCARD_ALL&&(type==AVMEDIA_TYPE_AUDIO||type==AVMEDIA_TYPE_SUBTITLE);
}
static int feed(struct demuxe_component_group *g,struct component *c){
 if(c->finished)return 0;
 int r=demuxe_manifest_refresh(g->parent,c->stream);if(r<0)return r;
 for(;;){
  struct AVDemuxeSegment plan;r=demuxe_manifest_segment(g->parent,c->stream,c->next,0,&plan);
  if(r==AVERROR(EAGAIN))return 0;
  if(r==AVERROR_EOF){c->finished=1;demuxe_task_end(c->task);return 0;}
  if(r<0)return r;
  r=demuxe_task_plan(c->task,&plan);if(r==AVERROR(EAGAIN))return 0;if(r<0)return r;c->next=plan.sequence+1;
 }
}
struct demuxe_component_group *demuxe_components_create(AVFormatContext *parent,uint64_t source,struct demuxe_task_io io){
 if(!demuxe_manifest_supported(parent)||!source)return NULL;
 struct demuxe_component_group *g=calloc(1,sizeof(*g));if(g){g->parent=parent;g->source=source;g->io=io;}return g;
}
void demuxe_components_mapper(struct demuxe_component_group *g,int (*map)(void *,struct demuxe_prepared_packet *),void *opaque){g->map=map;g->map_opaque=opaque;}
int demuxe_components_refresh(struct demuxe_component_group *g){
 for(unsigned i=0;i<g->parent->nb_streams;i++)if(selected(g->parent,i)){
  int r=demuxe_manifest_refresh(g->parent,i);if(r<0)return r;
 }
 return 0;
}
int demuxe_components_sync(struct demuxe_component_group *g,int video_stream,int64_t target){
 int selected_count=0;
 for(unsigned i=0;i<g->parent->nb_streams;i++)selected_count+=selected(g->parent,i);
 if(selected_count>COMPONENTS)return AVERROR(ENOBUFS);
 for(int i=0;i<COMPONENTS;i++)if(g->active[i].task&&!selected(g->parent,g->active[i].stream))retire(&g->active[i]);
 for(unsigned stream=0;stream<g->parent->nb_streams;stream++){
  if(!selected(g->parent,stream))continue;
  int exists=0,slot=-1;
  for(int i=0;i<COMPONENTS;i++){if(g->active[i].task&&g->active[i].stream==stream)exists=1;if(!g->active[i].task&&slot<0)slot=i;}
  if(exists)continue;if(slot<0)return AVERROR(ENOBUFS);
  struct AVDemuxeSegment plan;int r=demuxe_manifest_refresh(g->parent,stream);if(r<0)return r;
  r=demuxe_manifest_segment(g->parent,stream,-1,target,&plan);
  if(r==AVERROR(ERANGE)){
   // Admit component preroll only through an available, overlapping video
   // segment. Independent AAC/frame boundaries need not share the first DTS.
   // This neither shifts timestamps nor revives an expired video position.
   struct AVDemuxeWindow window;
   struct AVDemuxeSegment video,component;
   if(!demuxe_manifest_window(g->parent,stream,&window)&&window.known&&
      target<window.start_us&&
      !demuxe_manifest_segment(g->parent,video_stream,-1,target,&video)&&
      !demuxe_manifest_segment(g->parent,stream,window.first_sequence,0,&component)&&
      video.duration_us>0&&component.duration_us>0&&
      video.start_us<=INT64_MAX-video.duration_us&&
      component.start_us<=INT64_MAX-component.duration_us&&
      video.start_us<component.start_us+component.duration_us&&
      component.start_us<video.start_us+video.duration_us){plan=component;r=0;}
  }
  if(r<0){
   struct AVDemuxeWindow w={0};demuxe_manifest_window(g->parent,stream,&w);
   if(r!=AVERROR(EAGAIN))av_log(g->parent,AV_LOG_ERROR,"Adaptive component %u target %lld rejected (%s); window %lld..%lld live %d known %d\n",stream,(long long)target,av_err2str(r),(long long)w.start_us,(long long)w.end_us,w.live,w.known);
   return r;
  }
  enum AVMediaType type=g->parent->streams[stream]->codecpar->codec_type;
  struct component *c=&g->active[slot];*c=(struct component){.stream=stream,.next=plan.sequence};
  c->task=demuxe_task_create_media(g->source,0,256*1024,g->io,type,type==AVMEDIA_TYPE_SUBTITLE&&!plan.init_url[0]?DEMUXE_CONTAINER_WEBVTT:DEMUXE_CONTAINER_MOV);
  if(!c->task)return AVERROR(ENOMEM);
 }
 return 0;
}
int demuxe_components_take(struct demuxe_component_group *g,struct demuxe_prepared_packet *out,int *audio_wait,int video_eof){
 *out=(struct demuxe_prepared_packet){0};*audio_wait=0;int best=-1,waiting=0,live=0,mapping_wait=0,audio_mapping_wait=0;
 for(int i=0;i<COMPONENTS;i++){
  struct component *c=&g->active[i];if(!c->task)continue;
  int r=feed(g,c);if(r<0)return r;
  // Audio is an ordering barrier. Wait on its producer instead of telling
  // mpv that a tight empty-read loop made progress. Pending subtitles remain
  // nonblocking while video can advance; after video EOF they may wait too.
  unsigned wait_ms=video_eof||g->parent->streams[c->stream]->codecpar->codec_type==AVMEDIA_TYPE_AUDIO?10:0;
  if(!c->head.packet){r=demuxe_task_take(c->task,&c->head,wait_ms);if(r<0&&r!=AVERROR_EOF)return r;if(!r){waiting=1;if(g->parent->streams[c->stream]->codecpar->codec_type==AVMEDIA_TYPE_AUDIO)*audio_wait=1;}}
  if(!c->finished)live=1;
  if(!c->head.packet)continue;
  if(g->map){r=g->map(g->map_opaque,&c->head);if(r==AVERROR(EAGAIN)){mapping_wait=1;if(g->parent->streams[c->stream]->codecpar->codec_type==AVMEDIA_TYPE_AUDIO)audio_mapping_wait=1;continue;}if(r<0)return r;}
  if(c->head.packet->pts==AV_NOPTS_VALUE)return AVERROR_INVALIDDATA;
  if(best<0||av_compare_ts(c->head.packet->pts,c->head.timebase,g->active[best].head.packet->pts,g->active[best].head.timebase)<0)best=i;
 }
 // Do not hand a distant subtitle cue to the video coordinator while an
 // earlier audio head is unresolved. Otherwise that cached cue can force a
 // minute of video-only read-ahead and postpone quality switches by a minute.
 if(*audio_wait)return 0;
 if(audio_mapping_wait)return AVERROR(EAGAIN);
 if(best<0)return mapping_wait?AVERROR(EAGAIN):waiting||live?0:AVERROR_EOF;
 struct component *c=&g->active[best];
 if(demuxe_packet_codec(&c->head)->codec_type==AVMEDIA_TYPE_SUBTITLE){
  enum AVCodecID codec=demuxe_packet_codec(&c->head)->codec_id;
  if(codec!=AV_CODEC_ID_WEBVTT&&codec!=AV_CODEC_ID_MOV_TEXT)return AVERROR(ENOSYS);
  int64_t pts=av_rescale_q(c->head.packet->pts,c->head.timebase,AV_TIME_BASE_Q);
  int64_t duration=av_rescale_q(c->head.packet->duration,c->head.timebase,AV_TIME_BASE_Q);
  int err=demuxe_cue_admit(&c->cues,pts,duration,c->head.packet->size);if(err)return AVERROR(err);
 }
 *out=c->head;c->head=(struct demuxe_prepared_packet){0};out->packet->stream_index=c->stream;return 1;
}
void demuxe_components_destroy(struct demuxe_component_group *g){if(!g)return;for(int i=0;i<COMPONENTS;i++)retire(&g->active[i]);free(g);}

size_t demuxe_components_queued_bytes(struct demuxe_component_group *g){
 size_t bytes=0;if(!g)return 0;
 for(int i=0;i<COMPONENTS;i++)if(g->active[i].task){struct demuxe_task_stats stats;demuxe_task_stats(g->active[i].task,&stats);bytes+=stats.queued_bytes;}
 return bytes;
}
