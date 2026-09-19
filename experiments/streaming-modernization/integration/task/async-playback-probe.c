// SPDX-License-Identifier: GPL-3.0-or-later
// Real native containers/decoders, paced output; still no mpv clock or audio device.
#include "container-task.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <libavcodec/avcodec.h>
#include <libavutil/time.h>
struct decoder {
    AVCodecContext *context;
    AVFrame *frame;
    AVRational timebase;
    int representation, frames, regressions, errors, changes;
    double last, max_gap;
};

static int receive(struct decoder *d)
{
    int ret;
    while ((ret = avcodec_receive_frame(d->context, d->frame)) >= 0) {
        if (d->frame->best_effort_timestamp != AV_NOPTS_VALUE) {
            double pts = d->frame->best_effort_timestamp * av_q2d(d->timebase);
            if (d->frames) {
                if (pts <= d->last) d->regressions++;
                if (pts - d->last > d->max_gap) d->max_gap = pts - d->last;
                if (d->context->codec_type == AVMEDIA_TYPE_AUDIO && pts - d->last > 0.03)
                    printf("{\"event\":\"audio-gap\",\"previousPTS\":%.9f,\"pts\":%.9f}\n", d->last, pts);
            }
            d->last = pts;
        }
        d->frames++;
        av_frame_unref(d->frame);
    }
    if (ret != AVERROR_EOF && ret != AVERROR(EAGAIN)) d->errors++;
    return ret;
}

static int decode(struct decoder *d, AVStream *stream, AVPacket *packet)
{
    if (!d->context || d->representation != stream->index) {
        if (d->context) {
            if (avcodec_send_packet(d->context, NULL) < 0) return -1;
            receive(d);
            avcodec_free_context(&d->context);
            d->changes++;
        }
        const AVCodec *codec = avcodec_find_decoder(stream->codecpar->codec_id);
        if (!codec) return -1;
        d->context = avcodec_alloc_context3(codec);
        if (!d->context || avcodec_parameters_to_context(d->context, stream->codecpar) < 0) return -1;
        d->timebase = d->context->pkt_timebase = stream->time_base;
        d->context->thread_count = 1;
        d->representation = stream->index;
        if (avcodec_open2(d->context, codec, NULL) < 0) return -1;
    }
    int ret = avcodec_send_packet(d->context, packet);
    if (ret < 0) { d->errors++; return ret; }
    receive(d);
    return 0;
}

static int open_resource(void *unused,AVFormatContext *s,AVIOContext **pb,const char *url,AVDictionary **options){
    return avio_open2(pb,url,AVIO_FLAG_READ,&s->interrupt_callback,options);
}
static void close_resource(void *unused,AVFormatContext *s,AVIOContext **pb){avio_closep(pb);}
struct producer {
    struct demuxe_container_task *task;
    int stream,finished;
    int64_t next;
};
static int representation(AVFormatContext *f,int stream,struct AVDemuxeRepresentation *out){
    return !strcmp(f->iformat->name,"hls")?av_demuxe_hls_representation(f,stream,out):av_demuxe_dash_representation(f,stream,out);
}
static int plan(AVFormatContext *f,int stream,int64_t sequence,int64_t target,struct AVDemuxeSegment *out){
    return !strcmp(f->iformat->name,"hls")?av_demuxe_hls_segment(f,stream,sequence,target,out):av_demuxe_dash_segment(f,stream,sequence,target,out);
}
static int feed(AVFormatContext *f,struct producer *p){
    if(p->finished)return 0;
    for(;;){
        struct AVDemuxeSegment segment;int r=plan(f,p->stream,p->next,0,&segment);
        if(r==AVERROR_EOF){p->finished=1;demuxe_task_end(p->task);return 0;}
        if(r<0)return r;
        r=demuxe_task_plan(p->task,&segment);
        if(r==AVERROR(EAGAIN))return 0;
        if(r<0)return r;
        p->next++;
    }
}
static struct producer create(AVFormatContext *f,int stream,uint64_t request,int64_t sequence){
    struct producer p={.stream=stream,.next=sequence};
    p.task=demuxe_task_create(1,request,4*1024*1024,(struct demuxe_task_io){.open=open_resource,.close=close_resource});
    assert(p.task);assert(feed(f,&p)>=0);return p;
}
static double pts(struct demuxe_prepared_packet *p){return p->packet->pts*av_q2d(p->timebase);}
int main(int argc,char **argv){
    if(argc!=2)return 2;
    AVFormatContext *f=NULL;AVDictionary *options=NULL;
    av_dict_set(&options,"strict_io","1",0);av_dict_set(&options,"continuous_fmp4","1",0);
    av_dict_set(&options,"extension_picky","0",0);av_dict_set(&options,"allowed_extensions","ALL",0);
    if(avformat_open_input(&f,argv[1],NULL,&options)<0)return 3;av_dict_free(&options);
    if(avformat_find_stream_info(f,NULL)<0)return 4;
    int videos[3],nv=0,audio=-1;
    struct AVDemuxeRepresentation descriptors[3];
    for(unsigned i=0;i<f->nb_streams;i++){
        struct AVDemuxeRepresentation d;
        if(nv<3&&!representation(f,i,&d)){videos[nv]=i;descriptors[nv++]=d;}
        if(audio<0&&f->streams[i]->codecpar->codec_type==AVMEDIA_TYPE_AUDIO)audio=i;
    }
    if(nv!=3||audio<0){fprintf(stderr,"eligible=%d audio=%d\n",nv,audio);return 5;}
    for(int i=0;i<3;i++)for(int j=i+1;j<3;j++)if(f->streams[videos[j]]->codecpar->width<f->streams[videos[i]]->codecpar->width){
        int swap=videos[i];videos[i]=videos[j];videos[j]=swap;
        struct AVDemuxeRepresentation d=descriptors[i];descriptors[i]=descriptors[j];descriptors[j]=d;
    }
    for(int i=1;i<3;i++)assert(!strcmp(descriptors[0].group,descriptors[i].group));
    // Parent still owns the one manifest and its audio demux. It no longer
    // downloads/decodes the private video representations after discovery.
    for(unsigned i=0;i<f->nb_streams;i++)f->streams[i]->discard=(int)i==audio?AVDISCARD_DEFAULT:AVDISCARD_ALL;
    struct producer active=create(f,videos[0],0,descriptors[0].first_sequence),candidate={0};
    struct demuxe_prepared_packet video_packet={0},candidate_packet={0};
    struct decoder video={.frame=av_frame_alloc(),.representation=-1},sound={.frame=av_frame_alloc(),.representation=-1};
    AVPacket *audio_packet=av_packet_alloc();int have_audio=0,audio_eof=0,video_eof=0;
    int requested=0,accepted=0,error=0,frames_while_preparing=0;
    int targets[]={2,1,0};double times[]={3,10,17},began=av_gettime_relative()/1000000.0;
    double last_video_wall=0,max_video_wall_gap=0;size_t peak=0;
    while(!audio_eof||have_audio||!video_eof||video_packet.packet){
        if(feed(f,&active)<0||(candidate.task&&feed(f,&candidate)<0)){error=1;break;}
        if(!have_audio&&!audio_eof){
            int r;
            do{av_packet_unref(audio_packet);r=av_read_frame(f,audio_packet);}while(r>=0&&audio_packet->stream_index!=audio);
            if(r==AVERROR_EOF)audio_eof=1;else if(r<0){error=2;break;}else have_audio=1;
        }
        if(!video_packet.packet&&!video_eof){
            int r=demuxe_task_take(active.task,&video_packet,10);
            if(r==AVERROR_EOF)video_eof=1;else if(r<0){error=3;break;}
            if(!r)continue;
        }
        if(candidate.task&&video_packet.packet){
            for(;;){
                if(!candidate_packet.packet){
                    int r=demuxe_task_take(candidate.task,&candidate_packet,0);
                    if(!r)break;
                    if(r<0){error=4;break;}
                }
                if(!(candidate_packet.packet->flags&AV_PKT_FLAG_KEY)||
                   av_compare_ts(candidate_packet.packet->pts,candidate_packet.timebase,video_packet.packet->pts,video_packet.timebase)<0){
                    demuxe_packet_release(&candidate_packet);continue;
                }
                break;
            }
            if(error)break;
            if(candidate_packet.packet&&(video_packet.packet->flags&AV_PKT_FLAG_KEY)&&
               !av_compare_ts(candidate_packet.packet->pts,candidate_packet.timebase,video_packet.packet->pts,video_packet.timebase)){
                struct demuxe_task_stats stats;demuxe_task_stats(active.task,&stats);if(stats.peak_queued_bytes>peak)peak=stats.peak_queued_bytes;
                demuxe_packet_release(&video_packet);demuxe_task_destroy(active.task);active=candidate;candidate=(struct producer){0};
                video_packet=candidate_packet;candidate_packet=(struct demuxe_prepared_packet){0};accepted++;
                printf("{\"event\":\"accepted\",\"videoPTS\":%.9f,\"audioPTS\":%.9f,\"stream\":%d}\n",pts(&video_packet),sound.last,active.stream);
            }
        }
        double v=video_packet.packet?pts(&video_packet):INFINITY;
        double a=have_audio?audio_packet->pts*av_q2d(f->streams[audio]->time_base):INFINITY;
        double next=fmin(v,a);if(!isfinite(next))break;
        double elapsed=av_gettime_relative()/1000000.0-began;
        if(next>elapsed)av_usleep((next-elapsed)*1000000);
        if(a<v){if(decode(&sound,f->streams[audio],audio_packet)<0){error=5;break;}av_packet_unref(audio_packet);have_audio=0;}
        else{
            double now=av_gettime_relative()/1000000.0;
            if(last_video_wall&&now-last_video_wall>max_video_wall_gap)max_video_wall_gap=now-last_video_wall;
            last_video_wall=now;if(candidate.task)frames_while_preparing++;
            const AVCodecParameters *parameters=demuxe_packet_codec(&video_packet);
            assert(parameters->width==f->streams[active.stream]->codecpar->width);
            if(decode(&video,f->streams[active.stream],video_packet.packet)<0){error=6;break;}
            demuxe_packet_release(&video_packet);
        }
        if(requested<3&&!candidate.task&&video.last>=times[requested]){
            int stream=videos[targets[requested]];struct AVDemuxeSegment next;
            if(plan(f,stream,-1,video.last*1000000,&next)<0){error=7;break;}
            candidate=create(f,stream,requested+1,next.sequence+1);requested++;
            printf("{\"event\":\"requested\",\"videoPTS\":%.9f,\"stream\":%d,\"firstSequence\":%lld}\n",video.last,stream,(long long)next.sequence+1);
        }
    }
    if(video.context){avcodec_send_packet(video.context,NULL);receive(&video);}
    if(sound.context){avcodec_send_packet(sound.context,NULL);receive(&sound);}
    struct demuxe_task_stats stats;demuxe_task_stats(active.task,&stats);if(stats.peak_queued_bytes>peak)peak=stats.peak_queued_bytes;
    int passed=!error&&accepted==3&&video.frames==576&&!video.errors&&!sound.errors&&!video.regressions&&!sound.regressions&&video.max_gap<0.05&&sound.max_gap<0.03&&max_video_wall_gap<0.5;
    printf("{\"event\":\"result\",\"passed\":%s,\"error\":%d,\"accepted\":%d,\"videoFrames\":%d,\"audioFrames\":%d,\"videoChanges\":%d,\"audioChanges\":%d,\"videoMaxGap\":%.9f,\"audioMaxGap\":%.9f,\"maxVideoWallGap\":%.6f,\"framesDuringPreparation\":%d,\"peakQueueBytes\":%zu}\n",passed?"true":"false",error,accepted,video.frames,sound.frames,video.changes,sound.changes,video.max_gap,sound.max_gap,max_video_wall_gap,frames_while_preparing,peak);
    demuxe_packet_release(&video_packet);demuxe_packet_release(&candidate_packet);demuxe_task_destroy(active.task);demuxe_task_destroy(candidate.task);
    av_packet_free(&audio_packet);avcodec_free_context(&video.context);avcodec_free_context(&sound.context);av_frame_free(&video.frame);av_frame_free(&sound.frame);avformat_close_input(&f);
    return passed?0:1;
}
