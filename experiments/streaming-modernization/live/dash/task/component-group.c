// SPDX-License-Identifier: GPL-3.0-or-later
#include "component-group.h"
#include "manifest-plan.h"
#include <stdlib.h>
#include <string.h>
#include <libavutil/mathematics.h>
#define COMPONENTS 3
struct component {
 int stream,finished;
 int64_t next;
 struct demuxe_container_task *task;
 struct demuxe_prepared_packet head;
};
struct demuxe_component_group {
 AVFormatContext *parent;uint64_t source;struct demuxe_task_io io;
 struct component active[COMPONENTS];
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
int demuxe_components_refresh(struct demuxe_component_group *g){
 for(unsigned i=0;i<g->parent->nb_streams;i++)if(selected(g->parent,i)){
  int r=demuxe_manifest_refresh(g->parent,i);if(r<0)return r;
 }
 return 0;
}
int demuxe_components_sync(struct demuxe_component_group *g,int64_t target){
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
  r=demuxe_manifest_segment(g->parent,stream,-1,target,&plan);if(r<0)return r;
  enum AVMediaType type=g->parent->streams[stream]->codecpar->codec_type;
  struct component *c=&g->active[slot];*c=(struct component){.stream=stream,.next=plan.sequence};
  c->task=demuxe_task_create_media(g->source,0,256*1024,g->io,type,type==AVMEDIA_TYPE_SUBTITLE&&!plan.init_url[0]?DEMUXE_CONTAINER_WEBVTT:DEMUXE_CONTAINER_MOV);
  if(!c->task)return AVERROR(ENOMEM);
 }
 return 0;
}
int demuxe_components_take(struct demuxe_component_group *g,struct demuxe_prepared_packet *out){
 *out=(struct demuxe_prepared_packet){0};int best=-1,waiting=0,live=0;
 for(int i=0;i<COMPONENTS;i++){
  struct component *c=&g->active[i];if(!c->task)continue;
  int r=feed(g,c);if(r<0)return r;
  if(!c->head.packet){r=demuxe_task_take(c->task,&c->head,0);if(r<0&&r!=AVERROR_EOF)return r;if(!r)waiting=1;}
  if(!c->finished)live=1;
  if(!c->head.packet)continue;
  if(c->head.packet->pts==AV_NOPTS_VALUE)return AVERROR_INVALIDDATA;
  if(best<0||av_compare_ts(c->head.packet->pts,c->head.timebase,g->active[best].head.packet->pts,g->active[best].head.timebase)<0)best=i;
 }
 if(best<0)return waiting||live?0:AVERROR_EOF;
 struct component *c=&g->active[best];*out=c->head;c->head=(struct demuxe_prepared_packet){0};out->packet->stream_index=c->stream;return 1;
}
void demuxe_components_destroy(struct demuxe_component_group *g){if(!g)return;for(int i=0;i<COMPONENTS;i++)retire(&g->active[i]);free(g);}

size_t demuxe_components_queued_bytes(struct demuxe_component_group *g){
 size_t bytes=0;if(!g)return 0;
 for(int i=0;i<COMPONENTS;i++)if(g->active[i].task){struct demuxe_task_stats stats;demuxe_task_stats(g->active[i].task,&stats);bytes+=stats.queued_bytes;}
 return bytes;
}
