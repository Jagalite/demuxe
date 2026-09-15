// SPDX-License-Identifier: GPL-2.0-or-later
// Real native containers/decoders, paced output; still no mpv clock or audio device.
#include "adaptive-session.h"
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
int main(int argc,char **argv){
    if(argc!=2&&(argc!=3||strcmp(argv[2],"--sparse")))return 2;
    AVFormatContext *f=NULL;AVDictionary *options=NULL;
    av_dict_set(&options,"strict_io","1",0);av_dict_set(&options,"continuous_fmp4","1",0);
    if(argc==3)av_dict_set(&options,"demuxe_sparse","1",0);
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
    struct demuxe_adaptive_session *session=demuxe_adaptive_create(f,videos[0],videos[0],1,
        (struct demuxe_task_io){.open=open_resource,.close=close_resource});
    assert(session);
    assert(!demuxe_adaptive_seek(session,-1000000));
    assert(!demuxe_adaptive_seek(session,0));
    assert(!demuxe_adaptive_request(session,1,1,videos[0]));
    struct demuxe_adaptive_stats initial;demuxe_adaptive_stats(session,&initial);assert(initial.accepted_request==1&&initial.accepted_switches==0);
    // Rejected stale/foreign intent must never retire accepted work.
    assert(demuxe_adaptive_request(session,2,1,videos[2])<0);
    struct decoder video={.frame=av_frame_alloc(),.representation=-1},sound={.frame=av_frame_alloc(),.representation=-1};
    int requested=0,accepted=0,error=0,frames_while_preparing=0;
    int targets[]={2,1,0};double times[]={3,10,17},began=av_gettime_relative()/1000000.0;
    double last_video_wall=0,max_video_wall_gap=0;size_t peak=0;
    struct demuxe_adaptive_stats state={0};
    for(;;){
        struct demuxe_prepared_packet packet={0};
        int r=demuxe_adaptive_read(session,&packet);
        if(r==AVERROR_EOF)break;
        if(r<0){error=1;break;}
        if(!r)continue;
        demuxe_adaptive_stats(session,&state);
        if(state.switch_error){error=2;demuxe_packet_release(&packet);break;}
        if(state.accepted_switches!=accepted){
            accepted=state.accepted_switches;
            printf("{\"event\":\"accepted\",\"videoPTS\":%.9f,\"audioPTS\":%.9f,\"stream\":%d}\n",state.boundary_us/1000000.0,sound.last,state.active_stream);
        }
        size_t queued=state.active_packet_bytes+state.candidate_packet_bytes;
        if(queued>peak)peak=queued;
        double next=packet.packet->pts*av_q2d(packet.timebase);
        double elapsed=av_gettime_relative()/1000000.0-began;
        if(next>elapsed)av_usleep((next-elapsed)*1000000);
        if(packet.packet->stream_index==audio){
            if(decode(&sound,f->streams[audio],packet.packet)<0)error=3;
        }else{
            double now=av_gettime_relative()/1000000.0;
            if(last_video_wall&&now-last_video_wall>max_video_wall_gap)max_video_wall_gap=now-last_video_wall;
            last_video_wall=now;if(state.preparing_stream>=0)frames_while_preparing++;
            const AVCodecParameters *parameters=demuxe_packet_codec(&packet);
            assert(parameters&&parameters->width==f->streams[state.active_stream]->codecpar->width);
            if(!video.frames)fprintf(stderr,"Child codec initialization: extradata=%d first=%d packet-side-data=%d\n",parameters->extradata_size,parameters->extradata_size?parameters->extradata[0]:-1,packet.packet->side_data_elems);
            AVStream actual={.index=state.active_stream,.codecpar=(AVCodecParameters*)parameters,.time_base=packet.timebase};
            if(decode(&video,&actual,packet.packet)<0)error=4;
        }
        demuxe_packet_release(&packet);if(error)break;
        if(requested<3&&state.preparing_stream<0&&video.last>=times[requested]){
            int stream=videos[targets[requested]];
            r=demuxe_adaptive_request(session,1,requested+2,stream);
            if(r<0){error=5;break;}
            requested++;
            assert(demuxe_adaptive_request(session,1,requested+1,videos[0])<0);
            printf("{\"event\":\"requested\",\"videoPTS\":%.9f,\"stream\":%d}\n",video.last,stream);
        }
    }
    if(video.context){avcodec_send_packet(video.context,NULL);receive(&video);}
    if(sound.context){avcodec_send_packet(sound.context,NULL);receive(&sound);}
    int passed=!error&&accepted==3&&video.frames==576&&!video.errors&&!sound.errors&&!video.regressions&&!sound.regressions&&video.max_gap<0.05&&sound.max_gap<0.03&&max_video_wall_gap<0.5;
    printf("{\"event\":\"result\",\"passed\":%s,\"error\":%d,\"accepted\":%d,\"videoFrames\":%d,\"audioFrames\":%d,\"videoChanges\":%d,\"audioChanges\":%d,\"videoMaxGap\":%.9f,\"audioMaxGap\":%.9f,\"maxVideoWallGap\":%.6f,\"framesDuringPreparation\":%d,\"peakQueueBytes\":%zu}\n",passed?"true":"false",error,accepted,video.frames,sound.frames,video.changes,sound.changes,video.max_gap,sound.max_gap,max_video_wall_gap,frames_while_preparing,peak);
    demuxe_adaptive_destroy(session);
    avcodec_free_context(&video.context);avcodec_free_context(&sound.context);av_frame_free(&video.frame);av_frame_free(&sound.frame);avformat_close_input(&f);
    return passed?0:1;
}
