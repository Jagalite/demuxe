// SPDX-License-Identifier: GPL-3.0-or-later
#include "adaptive-session.h"
#include "random-access.h"
#include <stdlib.h>
#include <string.h>
#include <libavutil/mathematics.h>
struct producer {struct demuxe_container_task *task;int stream,finished;int64_t next;};
struct demuxe_adaptive_session {
    AVFormatContext *parent;
    struct demuxe_task_io io;
    struct producer active,candidate;
    struct demuxe_prepared_packet video,next;
    AVPacket *other;
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
    for(;;){
        struct AVDemuxeSegment segment;int r=plan(s,p->stream,p->next,0,&segment);
        if(r==AVERROR_EOF){p->finished=1;demuxe_task_end(p->task);return 0;}
        if(r<0)return r;
        r=demuxe_task_plan(p->task,&segment);
        if(r==AVERROR(EAGAIN))return 0;
        if(r<0)return r;
        p->next++;
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
struct demuxe_adaptive_session *demuxe_adaptive_create(AVFormatContext *parent,int logical,int initial,uint64_t source,struct demuxe_task_io io){
    struct AVDemuxeRepresentation d;
    if(!parent||logical<0||(unsigned)logical>=parent->nb_streams||describe(parent,initial,&d)<0||
       parent->streams[logical]->codecpar->codec_type!=AVMEDIA_TYPE_VIDEO||
       parent->streams[initial]->codecpar->codec_id!=AV_CODEC_ID_H264)return NULL;
    struct demuxe_adaptive_session *s=calloc(1,sizeof(*s));if(!s)return NULL;
    s->parent=parent;s->io=io;memcpy(s->group,d.group,sizeof(s->group));
    s->codec_id=parent->streams[initial]->codecpar->codec_id;
    s->state=(struct demuxe_adaptive_stats){.source=source,.logical_stream=logical,
        .active_stream=initial,.requested_stream=initial,.preparing_stream=-1,.boundary_us=AV_NOPTS_VALUE};
    s->other=av_packet_alloc();
    if(!s->other||start(s,&s->active,initial,0,d.first_sequence)<0){demuxe_adaptive_destroy(s);return NULL;}
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
    int r=plan(s,s->state.requested_stream,-1,target,&segment);
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
    int r=feed(s,&s->active);if(r<0)return r;
    if(s->candidate.task&&(r=feed(s,&s->candidate))<0)reject_candidate(s,r);
    // Suppress the parent's private video representations. Its existing selected
    // audio/subtitle streams, parser updates and timing remain authoritative.
    for(unsigned i=0;i<s->parent->nb_streams;i++)if(eligible(s,i))s->parent->streams[i]->discard=AVDISCARD_ALL;
    if(!s->have_other&&!s->parent_eof){
        do{av_packet_unref(s->other);r=av_read_frame(s->parent,s->other);}
        while(r>=0&&(eligible(s,s->other->stream_index)||
            s->parent->streams[s->other->stream_index]->discard==AVDISCARD_ALL));
        if(r==AVERROR_EOF)s->parent_eof=1;else if(r<0)return r;else s->have_other=1;
    }
    if(!s->video.packet&&!s->video_eof){
        r=demuxe_task_take(s->active.task,&s->video,10);
        if(r==AVERROR_EOF)s->video_eof=1;else if(r<0)return r;else if(!r)return 0;
    }
    if(!s->state.switch_error&&(r=prepare_candidate(s))<0)reject_candidate(s,r);
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
            demuxe_packet_release(&s->video);demuxe_task_destroy(s->active.task);s->active=s->candidate;s->candidate=(struct producer){0};
            s->video=s->next;s->next=(struct demuxe_prepared_packet){0};
            s->state.active_stream=s->active.stream;s->state.preparing_stream=-1;s->state.accepted_request=s->state.request;s->state.accepted_switches++;
            s->state.boundary_us=av_rescale_q(s->video.packet->pts,s->video.timebase,AV_TIME_BASE_Q);
        }
    }
    if(!s->video.packet&&!s->have_other)return s->video_eof&&s->parent_eof?AVERROR_EOF:0;
    int other_first=!s->video.packet;
    if(s->video.packet&&s->have_other){
        AVPacket *v=s->video.packet,*a=s->other;
        int64_t vp=v->dts==AV_NOPTS_VALUE?v->pts:v->dts,ap=a->dts==AV_NOPTS_VALUE?a->pts:a->dts;
        other_first=ap==AV_NOPTS_VALUE||av_compare_ts(ap,s->parent->streams[a->stream_index]->time_base,vp,s->video.timebase)<0;
    }
    if(other_first){
        AVPacket *packet=av_packet_alloc();if(!packet)return AVERROR(ENOMEM);
        out->timebase=s->parent->streams[s->other->stream_index]->time_base;
        av_packet_move_ref(packet,s->other);out->packet=packet;out->source=s->state.source;s->have_other=0;
    }else{
        *out=s->video;s->video=(struct demuxe_prepared_packet){0};out->packet->stream_index=s->state.logical_stream;
    }
    return 1;
}
int demuxe_adaptive_seek(struct demuxe_adaptive_session *s,int64_t target){
    struct AVDemuxeSegment segment,first;int stream=s->state.requested_stream;
    struct AVDemuxeRepresentation descriptor;
    int r=describe(s->parent,stream,&descriptor);
    if(r<0)return r;
    r=plan(s,stream,descriptor.first_sequence,0,&first);
    if(r<0)return r;
    // mpv refresh seeks intentionally overlap before the presentation start.
    // The source API validates user windows separately; a demux seek to/before
    // VOD start must prepare its first segment, just like the parent demuxer.
    if(target<first.start_us)target=first.start_us;
    r=plan(s,stream,-1,target,&segment);
    if(r<0)return r;
    // Validate first, then retire speculative work before allocating a seek
    // replacement. At most two packet queues exist, including during seeks.
    retire_candidate(s);
    struct producer replacement={0};
    r=start(s,&replacement,stream,s->state.request,segment.sequence);
    if(r<0)return r;
    demuxe_task_destroy(s->active.task);s->active=replacement;
    demuxe_packet_release(&s->video);av_packet_unref(s->other);s->have_other=s->parent_eof=s->video_eof=0;
    s->state.active_stream=stream;s->state.accepted_request=s->state.request;s->state.switch_error=0;s->state.boundary_us=segment.start_us;
    return 0;
}
void demuxe_adaptive_tracks_changed(struct demuxe_adaptive_session *s){s->parent_eof=0;}
void demuxe_adaptive_stats(struct demuxe_adaptive_session *s,struct demuxe_adaptive_stats *out){
    *out=s->state;struct demuxe_task_stats stats;
    if(s->active.task){demuxe_task_stats(s->active.task,&stats);out->active_packet_bytes=stats.queued_bytes;}
    if(s->candidate.task){demuxe_task_stats(s->candidate.task,&stats);out->candidate_packet_bytes=stats.queued_bytes;}
}
void demuxe_adaptive_destroy(struct demuxe_adaptive_session *s){
    if(!s)return;demuxe_packet_release(&s->video);demuxe_packet_release(&s->next);
    demuxe_task_destroy(s->active.task);demuxe_task_destroy(s->candidate.task);av_packet_free(&s->other);free(s);
}
