// SPDX-License-Identifier: GPL-2.0-or-later
#include "adaptive-session.h"
#include "random-access.h"
#include "component-group.h"
#include "manifest-plan.h"
#include <stdlib.h>
#include <string.h>
#include <libavutil/mathematics.h>
#include <libavutil/time.h>
static void observed_call(int64_t *peak,int64_t started){int64_t elapsed=av_gettime_relative()-started;if(elapsed>*peak)*peak=elapsed;}
struct producer {struct demuxe_container_task *task;int stream,finished;int64_t next;};
struct demuxe_adaptive_session {
    AVFormatContext *parent;
    struct demuxe_task_io io;
    struct producer active,candidate;
    struct demuxe_prepared_packet video,next;
    struct demuxe_prepared_packet other;
    struct demuxe_component_group *components;
    int64_t position_us;
    int have_other,parent_eof,video_eof;
    char group[256];
    enum AVCodecID codec_id;
    struct demuxe_adaptive_stats state;
};
static int describe(AVFormatContext *f,int stream,struct AVDemuxeRepresentation *out){
    if(!strcmp(f->iformat->name,"hls"))return av_demuxe_hls_representation(f,stream,out);
    if(!strcmp(f->iformat->name,"dash"))return av_demuxe_dash_representation(f,stream,out);
    return AVERROR(ENOSYS);
}
static int plan(struct demuxe_adaptive_session *s,int stream,int64_t sequence,int64_t target,struct AVDemuxeSegment *out){
    if(!strcmp(s->parent->iformat->name,"hls"))return av_demuxe_hls_segment(s->parent,stream,sequence,target,out);
    return av_demuxe_dash_segment(s->parent,stream,sequence,target,out);
}
static int eligible(struct demuxe_adaptive_session *s,int stream){
    struct AVDemuxeRepresentation d;
    return !describe(s->parent,stream,&d)&&!strcmp(d.group,s->group)&&
        s->codec_id==AV_CODEC_ID_H264&&s->parent->streams[stream]->codecpar->codec_id==s->codec_id;
}
static int feed(struct demuxe_adaptive_session *s,struct producer *p){
    if(!p->task||p->finished)return 0;
    int refreshed=demuxe_manifest_refresh(s->parent,p->stream);if(refreshed<0){av_log(s->parent,AV_LOG_ERROR,"Adaptive manifest refresh failed: %s\n",av_err2str(refreshed));return refreshed;}
    for(;;){
        struct AVDemuxeSegment segment;int r=plan(s,p->stream,p->next,0,&segment);
        if(r==AVERROR(EAGAIN))return 0;
        if(r==AVERROR_EOF){p->finished=1;demuxe_task_end(p->task);return 0;}
        if(r<0){av_log(s->parent,AV_LOG_ERROR,"Adaptive segment plan failed at token %lld: %s\n",(long long)p->next,av_err2str(r));return r;}
        r=demuxe_task_plan(p->task,&segment);
        if(r==AVERROR(EAGAIN))return 0;
        if(r<0)return r;
        p->next=segment.sequence+1;
    }
}
static int start(struct demuxe_adaptive_session *s,struct producer *p,int stream,uint64_t request,int64_t sequence){
    *p=(struct producer){.stream=stream,.next=sequence};
    p->task=demuxe_task_create(s->state.source,request,4*1024*1024,s->io);
    if(!p->task)return AVERROR(ENOMEM);
    int r=feed(s,p);
    if(r<0){demuxe_task_destroy(p->task);p->task=NULL;}
    return r;
}
static void retire_candidate(struct demuxe_adaptive_session *s){
    demuxe_packet_release(&s->next);demuxe_task_destroy(s->candidate.task);
    s->candidate=(struct producer){0};s->state.preparing_stream=-1;
}
static void retire_resource(void *opaque,const char *url){
    struct demuxe_adaptive_session *s=opaque;
    if(s->io.retire)s->io.retire(s->io.opaque,url);
}
struct demuxe_adaptive_session *demuxe_adaptive_create(AVFormatContext *parent,int logical,int initial,uint64_t source,struct demuxe_task_io io){
    struct AVDemuxeRepresentation d;
    if(!demuxe_manifest_supported(parent)||logical<0||(unsigned)logical>=parent->nb_streams||describe(parent,initial,&d)<0||
       parent->streams[logical]->codecpar->codec_type!=AVMEDIA_TYPE_VIDEO||
       parent->streams[initial]->codecpar->codec_id!=AV_CODEC_ID_H264)return NULL;
    struct demuxe_adaptive_session *s=calloc(1,sizeof(*s));if(!s)return NULL;
    s->parent=parent;s->io=io;memcpy(s->group,d.group,sizeof(s->group));
    s->codec_id=parent->streams[initial]->codecpar->codec_id;
    s->state=(struct demuxe_adaptive_stats){.source=source,.logical_stream=logical,
        .active_stream=initial,.requested_stream=initial,.live=d.live,.preparing_stream=-1,.boundary_us=AV_NOPTS_VALUE};
    struct AVDemuxeSegment first;
    if(demuxe_manifest_handoff(parent)<0){demuxe_adaptive_destroy(s);return NULL;}
    if(d.live){
        struct AVDemuxeWindow window;
        if(demuxe_manifest_window(parent,initial,&window)<0||!window.known){demuxe_adaptive_destroy(s);return NULL;}
        int64_t target=FFMAX(window.start_us,window.end_us-6000000);
        if(plan(s,initial,-1,target,&first)<0){demuxe_adaptive_destroy(s);return NULL;}
    }else if(plan(s,initial,d.first_sequence,0,&first)<0){demuxe_adaptive_destroy(s);return NULL;}
    s->position_us=first.start_us;
    s->components=demuxe_components_create(parent,source,io);
    if(!s->components||start(s,&s->active,initial,0,first.sequence)<0){demuxe_adaptive_destroy(s);return NULL;}
    demuxe_manifest_retirement(parent,retire_resource,s);
    return s;
}
int demuxe_adaptive_request(struct demuxe_adaptive_session *s,uint64_t source,uint64_t request,int stream){
    if(source!=s->state.source||request<=s->state.request)return AVERROR(EINVAL);
    if(!eligible(s,stream))return AVERROR(ENOSYS);
    retire_candidate(s);s->state.request=request;s->state.requested_stream=stream;s->state.switch_error=0;
    if(stream==s->active.stream)s->state.accepted_request=request;
    // Preparation starts on the next owning demux read. A paused/cache-full
    // player retains the request without changing its presented quality.
    return 0;
}
static int prepare_candidate(struct demuxe_adaptive_session *s){
    if(s->candidate.task||s->state.requested_stream==s->active.stream||!s->video.packet)return 0;
    if(s->video.packet->pts==AV_NOPTS_VALUE)return AVERROR_INVALIDDATA;
    struct AVDemuxeSegment segment;
    int64_t target=av_rescale_q(s->video.packet->pts,s->video.timebase,AV_TIME_BASE_Q);
    int r=demuxe_manifest_refresh(s->parent,s->state.requested_stream);if(r<0)return r;
    r=plan(s,s->state.requested_stream,-1,target,&segment);
    if(r==AVERROR(EAGAIN))return 0;
    if(r<0)return r;
    r=start(s,&s->candidate,s->state.requested_stream,s->state.request,segment.sequence+1);
    if(r>=0)s->state.preparing_stream=s->candidate.stream;
    return r;
}
static void reject_candidate(struct demuxe_adaptive_session *s,int error){
    retire_candidate(s);s->state.switch_error=error;
    // Keep the requested policy observable, but do not retry it on every packet.
}
int demuxe_adaptive_read(struct demuxe_adaptive_session *s,struct demuxe_prepared_packet *out){
    *out=(struct demuxe_prepared_packet){0};
    int64_t observed=av_gettime_relative();
    int r=feed(s,&s->active);observed_call(&s->state.max_feed_us,observed);if(r<0)return r;
    if(s->candidate.task&&(r=feed(s,&s->candidate))<0)reject_candidate(s,r);
    // Every selected component now uses copied plans from the same parent.
    // No parent av_read_frame can wait at a live boundary ahead of ready video.
    observed=av_gettime_relative();
    r=demuxe_components_sync(s->components,s->position_us);if(r==AVERROR(EAGAIN))return 0;if(r<0)return r;
    if(!s->have_other&&!s->parent_eof){
        r=demuxe_components_take(s->components,&s->other);
        if(r==AVERROR_EOF)s->parent_eof=1;else if(r<0)return r;else if(r)s->have_other=1;
    }
    observed_call(&s->state.max_components_us,observed);
    if(!s->video.packet&&!s->video_eof){
        r=demuxe_task_take(s->active.task,&s->video,10);
        if(r==AVERROR_EOF)s->video_eof=1;else if(r<0)return r;else if(!r)return 0;
    }
    observed=av_gettime_relative();
    if(!s->state.switch_error&&(r=prepare_candidate(s))<0)reject_candidate(s,r);
    observed_call(&s->state.max_candidate_us,observed);
    if(s->video.packet&&s->video.packet->pts==AV_NOPTS_VALUE)return AVERROR_INVALIDDATA;
    if(s->candidate.task&&s->video.packet){
        for(;;){
            if(!s->next.packet){r=demuxe_task_take(s->candidate.task,&s->next,0);if(!r)break;if(r<0){reject_candidate(s,r);break;}}
            if(s->next.packet->pts==AV_NOPTS_VALUE){reject_candidate(s,AVERROR_INVALIDDATA);break;}
            if(!demuxe_h264_random_access(s->next.packet,demuxe_packet_codec(&s->next))||av_compare_ts(s->next.packet->pts,s->next.timebase,s->video.packet->pts,s->video.timebase)<0){demuxe_packet_release(&s->next);continue;}
            break;
        }
        if(s->next.packet&&demuxe_h264_random_access(s->video.packet,demuxe_packet_codec(&s->video))&&
           !av_compare_ts(s->next.packet->pts,s->next.timebase,s->video.packet->pts,s->video.timebase)){
            observed=av_gettime_relative();
            demuxe_packet_release(&s->video);demuxe_task_destroy(s->active.task);observed_call(&s->state.max_retire_us,observed);s->active=s->candidate;s->candidate=(struct producer){0};
            s->video=s->next;s->next=(struct demuxe_prepared_packet){0};
            s->state.active_stream=s->active.stream;s->state.preparing_stream=-1;s->state.accepted_request=s->state.request;s->state.accepted_switches++;
            s->state.boundary_us=av_rescale_q(s->video.packet->pts,s->video.timebase,AV_TIME_BASE_Q);
        }
    }
    if(!s->video.packet&&!s->have_other)return s->video_eof&&s->parent_eof?AVERROR_EOF:0;
    int other_first=!s->video.packet;
    if(s->video.packet&&s->have_other){
        AVPacket *v=s->video.packet,*a=s->other.packet;
        int64_t vp=v->dts==AV_NOPTS_VALUE?v->pts:v->dts,ap=a->dts==AV_NOPTS_VALUE?a->pts:a->dts;
        other_first=ap==AV_NOPTS_VALUE||av_compare_ts(ap,s->other.timebase,vp,s->video.timebase)<0;
    }
    if(other_first){
        *out=s->other;s->other=(struct demuxe_prepared_packet){0};s->have_other=0;
    }else{
        s->position_us=av_rescale_q(s->video.packet->pts,s->video.timebase,AV_TIME_BASE_Q);
        *out=s->video;s->video=(struct demuxe_prepared_packet){0};out->packet->stream_index=s->state.logical_stream;
    }
    return 1;
}
int demuxe_adaptive_seek(struct demuxe_adaptive_session *s,int64_t target){
    struct AVDemuxeSegment segment,first;int stream=s->state.requested_stream;
    struct AVDemuxeRepresentation descriptor;
    int r=demuxe_manifest_refresh(s->parent,stream);if(r<0)return r;
    r=describe(s->parent,stream,&descriptor);
    if(r<0)return r;
    if(descriptor.live){
        // The first advertised segment may already have expired while a rolling
        // manifest was in flight. Validate the requested position against the
        // current native window, not an unrelated earliest catalog resource.
        struct AVDemuxeWindow window;r=demuxe_manifest_window(s->parent,stream,&window);
        if(r<0)return r;if(!window.known)return AVERROR(EAGAIN);
        if(target<window.start_us||target>=window.end_us)return AVERROR(ERANGE);
    }else{
        r=plan(s,stream,descriptor.first_sequence,0,&first);if(r<0)return r;
        // mpv refresh seeks may overlap before the VOD presentation start.
        if(target<first.start_us)target=first.start_us;
    }
    r=plan(s,stream,-1,target,&segment);
    if(r<0)return r;
    // Validate first, then retire speculative work before allocating a seek
    // replacement. At most two packet queues exist, including during seeks.
    retire_candidate(s);
    struct producer replacement={0};
    r=start(s,&replacement,stream,s->state.request,segment.sequence);
    if(r<0)return r;
    demuxe_task_destroy(s->active.task);s->active=replacement;
    demuxe_packet_release(&s->video);demuxe_packet_release(&s->other);
    demuxe_components_destroy(s->components);s->components=demuxe_components_create(s->parent,s->state.source,s->io);
    if(!s->components)return AVERROR(ENOMEM);
    s->position_us=segment.start_us;s->have_other=s->parent_eof=s->video_eof=0;
    s->state.active_stream=stream;s->state.accepted_request=s->state.request;s->state.switch_error=0;s->state.boundary_us=segment.start_us;
    return 0;
}
int demuxe_adaptive_poll(struct demuxe_adaptive_session *s){
    if(!s->state.live)return 0;
    int r=demuxe_manifest_refresh(s->parent,s->active.stream);
    if(r<0){s->state.window_error=r;return r;}
    // Preserve packet-established component anchors across a pause longer than
    // the DVR window. Audio segment durations need not equal video durations.
    r=demuxe_components_refresh(s->components);
    if(r<0){s->state.window_error=r;return r;}
    struct AVDemuxeWindow window;
    r=demuxe_manifest_window(s->parent,s->active.stream,&window);
    if(r<0){s->state.window_error=r;return r;}
    s->state.window_error=0;s->state.window_known=window.known;
    s->state.window_revision=window.revision;s->state.live=window.live;
    if(window.known){s->state.window_start_us=window.start_us;s->state.window_end_us=window.end_us;}
    return 0;
}
void demuxe_adaptive_tracks_changed(struct demuxe_adaptive_session *s){
    s->parent_eof=0;
    if(s->other.packet&&s->parent->streams[s->other.packet->stream_index]->discard==AVDISCARD_ALL){demuxe_packet_release(&s->other);s->have_other=0;}
}
void demuxe_adaptive_stats(struct demuxe_adaptive_session *s,struct demuxe_adaptive_stats *out){
    *out=s->state;struct demuxe_task_stats stats;
    out->component_packet_bytes=demuxe_components_queued_bytes(s->components);
    if(s->active.task){demuxe_task_stats(s->active.task,&stats);out->active_packet_bytes=stats.queued_bytes;}
    if(s->candidate.task){demuxe_task_stats(s->candidate.task,&stats);out->candidate_packet_bytes=stats.queued_bytes;}
}
void demuxe_adaptive_destroy(struct demuxe_adaptive_session *s){
    if(!s)return;demuxe_manifest_retirement(s->parent,NULL,NULL);demuxe_packet_release(&s->video);demuxe_packet_release(&s->next);
    demuxe_task_destroy(s->active.task);demuxe_task_destroy(s->candidate.task);demuxe_packet_release(&s->other);demuxe_components_destroy(s->components);free(s);
}
