// SPDX-License-Identifier: GPL-3.0-or-later
// Container execution only: plans come from the one authoritative manifest owner.
#include "container-task.h"
#include "rewind-reader.h"
#include <pthread.h>
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <time.h>
#include <libavutil/mem.h>
#include <libavutil/time.h>
#include <libavutil/mathematics.h>
#define PLAN_CAPACITY 4
#define PACKET_CAPACITY 128
struct demuxe_codec {_Atomic unsigned references;AVCodecParameters *parameters;};
struct demuxe_container_task {
    pthread_t thread;
    pthread_mutex_t lock;
    pthread_cond_t changed;
    _Atomic int cancelled;
    uint64_t source,request;
    enum AVMediaType media_type;
    enum demuxe_container_kind container;
    struct demuxe_task_io io;
    struct AVDemuxeSegment plans[PLAN_CAPACITY];
    unsigned plan_head,plan_count,packet_head,packet_count;
    struct demuxe_prepared_packet packets[PACKET_CAPACITY];
    size_t budget,bytes,peak_bytes;
    int plans_done,error,finished;
    unsigned containers;
    _Atomic uint64_t consumed;
};
static int interrupted(void *opaque){return atomic_load(&((struct demuxe_container_task*)opaque)->cancelled);}
static void codec_release(struct demuxe_codec *c){
    if(c&&atomic_fetch_sub(&c->references,1)==1){avcodec_parameters_free(&c->parameters);free(c);}
}
void demuxe_packet_release(struct demuxe_prepared_packet *p){av_packet_free(&p->packet);codec_release(p->codec);memset(p,0,sizeof(*p));}
const AVCodecParameters *demuxe_packet_codec(const struct demuxe_prepared_packet *p){return p->codec?p->codec->parameters:NULL;}
size_t demuxe_codec_bytes(const AVCodecParameters *c){
    if(c->extradata_size<0||c->nb_coded_side_data<0)return SIZE_MAX;
    size_t n=sizeof(*c)+(size_t)c->extradata_size+AV_INPUT_BUFFER_PADDING_SIZE;
    for(int i=0;i<c->nb_coded_side_data;i++){
        size_t bytes=c->coded_side_data[i].size;
        if(bytes>SIZE_MAX-sizeof(AVPacketSideData)||bytes+sizeof(AVPacketSideData)>SIZE_MAX-n)return SIZE_MAX;
        n+=bytes+sizeof(AVPacketSideData);
    }
    return n;
}
static size_t packet_cost(const struct demuxe_prepared_packet *p){
    // Charge shared codec data per reference conservatively; a single context
    // and current producer packet remain separate fixed/in-flight allocations.
    size_t n=demuxe_codec_bytes(p->codec->parameters);
    if(n>SIZE_MAX-sizeof(*p)-sizeof(AVPacket))return SIZE_MAX;
    n+=sizeof(*p)+sizeof(AVPacket);
    size_t payload=p->packet->buf?p->packet->buf->size:p->packet->size;
    if(payload>SIZE_MAX-n)return SIZE_MAX;n+=payload;
    for(int i=0;i<p->packet->side_data_elems;i++){
        if(p->packet->side_data[i].size>SIZE_MAX-n)return SIZE_MAX;
        n+=p->packet->side_data[i].size;
    }
    return n;
}
static int push(struct demuxe_container_task *t,struct demuxe_prepared_packet *p){
    size_t cost=packet_cost(p);if(cost>t->budget)return AVERROR(ENOBUFS);
    pthread_mutex_lock(&t->lock);
    while(!interrupted(t)&&(t->packet_count==PACKET_CAPACITY||cost>t->budget-t->bytes))
        pthread_cond_wait(&t->changed,&t->lock);
    if(interrupted(t)){pthread_mutex_unlock(&t->lock);return AVERROR_EXIT;}
    t->packets[(t->packet_head+t->packet_count)%PACKET_CAPACITY]=*p;
    t->packet_count++;t->bytes+=cost;if(t->bytes>t->peak_bytes)t->peak_bytes=t->bytes;
    memset(p,0,sizeof(*p));pthread_cond_broadcast(&t->changed);pthread_mutex_unlock(&t->lock);return 0;
}
struct reader {
    struct demuxe_container_task *task;
    const struct AVDemuxeSegment *plan;
    AVFormatContext *owner;
    AVIOContext *input;
    int phase;
    size_t text_bytes; // WebVTT header parsing otherwise materializes the entire resource
    char text_header[4096];size_t header_bytes,line_bytes;int header_complete,last_cr;
};
static void close_resource(struct reader *r){if(r->input)r->task->io.close(r->task->io.opaque,r->owner,&r->input);}
static int read_bytes(void *opaque,uint8_t *buffer,int capacity){
    struct reader *r=opaque;
    for(;;){
        if(interrupted(r->task))return AVERROR_EXIT;
        if(r->phase==2)return AVERROR_EOF;
        if(!r->input){
            const char *url=r->phase?r->plan->url:r->plan->init_url;
            int64_t offset=r->phase?r->plan->offset:r->plan->init_offset;
            int64_t size=r->phase?r->plan->size:r->plan->init_size;
            AVDictionary *options=NULL;
            if(size>=0){
                if(size==0||offset<0||offset>INT64_MAX-size)return AVERROR_INVALIDDATA;
                av_dict_set_int(&options,"offset",offset,0);av_dict_set_int(&options,"end_offset",offset+size,0);
            }
            int result=r->task->io.open(r->task->io.opaque,r->owner,&r->input,url,&options);
            av_dict_free(&options);if(result<0)return result;
        }
        if(r->task->container==DEMUXE_CONTAINER_WEBVTT){
            // Read at most one byte beyond the limit to distinguish exact-size
            // EOF from oversize input. Never disguise exhaustion as successful EOF.
            size_t left=65536-r->text_bytes;
            if((size_t)capacity>left+1)capacity=left+1;
        }
        int n=avio_read_partial(r->input,buffer,capacity);
        if(n>0){
            atomic_fetch_add(&r->task->consumed,n);
            if(r->task->container==DEMUXE_CONTAINER_WEBVTT){
                if((size_t)n>65536-r->text_bytes)return AVERROR(ENOBUFS);
                r->text_bytes+=n;
                for(int i=0;i<n&&!r->header_complete;i++){
                    if(r->header_bytes==sizeof(r->text_header))return AVERROR(ENOBUFS);
                    char ch=buffer[i];r->text_header[r->header_bytes++]=ch;
                    if(ch=='\n'&&r->last_cr){r->last_cr=0;continue;}
                    r->last_cr=ch=='\r';
                    if(ch=='\n'||ch=='\r'){
                        if(!r->line_bytes)r->header_complete=1;
                        r->line_bytes=0;
                    }else r->line_bytes++;
                }
            }
            return n;
        }
        if(r->input->error<0&&r->input->error!=AVERROR_EOF)return r->input->error;
        if(n<0&&n!=AVERROR_EOF)return n;
        if(!n&&!avio_feof(r->input))return AVERROR(EAGAIN);
        close_resource(r);r->phase++;
    }
}
static int nested_forbidden(AVFormatContext *s,AVIOContext **pb,const char *url,int flags,AVDictionary **options){return AVERROR(EACCES);}
static int consume(struct demuxe_container_task *t,const struct AVDemuxeSegment *plan){
    int result=0;struct demuxe_webvtt_map subtitle_map={0};
    AVFormatContext *f=avformat_alloc_context();AVIOContext *pb=NULL;
    struct demuxe_codec *codec=NULL;
    AVFormatContext resource_owner={.interrupt_callback={interrupted,t}};
    struct reader reader={.task=t,.plan=plan,.owner=&resource_owner,.phase=t->container==DEMUXE_CONTAINER_WEBVTT};
    if(!f)return AVERROR(ENOMEM);
    f->interrupt_callback=(AVIOInterruptCB){interrupted,t};
    f->error_recognition|=AV_EF_EXPLODE;
    unsigned char *buffer=av_malloc(32768);
    if(!buffer){result=AVERROR(ENOMEM);goto end;}
    struct demuxe_rewind_reader rewind={.opaque=&reader,.read=read_bytes};
    pb=avio_alloc_context(buffer,32768,0,&rewind,demuxe_rewind_read,NULL,demuxe_rewind_seek);
    if(!pb){av_free(buffer);result=AVERROR(ENOMEM);goto end;}
    pb->seekable=0;f->pb=pb;f->flags|=AVFMT_FLAG_CUSTOM_IO;f->io_open=nested_forbidden;
    result=avformat_open_input(&f,"",av_find_input_format(t->container==DEMUXE_CONTAINER_WEBVTT?"webvtt":"mov"),NULL);
    // Transport context lifetime is independent of avformat_open_input failure.
    if(result<0){
        if(pb->error<0&&pb->error!=AVERROR_EOF)result=pb->error;
        else if(result==AVERROR_EOF)result=AVERROR_INVALIDDATA;
        goto end;
    }
    if(t->container==DEMUXE_CONTAINER_WEBVTT){result=demuxe_webvtt_header(reader.text_header,reader.header_bytes,&subtitle_map);if(result<0)goto end;}
    if(f->nb_streams!=1||f->streams[0]->codecpar->codec_type!=t->media_type){result=AVERROR(ENOSYS);goto end;}
    if(demuxe_codec_bytes(f->streams[0]->codecpar)>t->budget){result=AVERROR(ENOBUFS);goto end;}
    codec=calloc(1,sizeof(*codec));if(!codec){result=AVERROR(ENOMEM);goto end;}
    codec->parameters=avcodec_parameters_alloc();atomic_init(&codec->references,1);
    if(!codec->parameters){result=AVERROR(ENOMEM);goto end;}
    result=avcodec_parameters_copy(codec->parameters,f->streams[0]->codecpar);if(result<0)goto end;
    pthread_mutex_lock(&t->lock);t->containers++;pthread_mutex_unlock(&t->lock);
    for(;;){
        struct demuxe_prepared_packet packet={.packet=av_packet_alloc(),.codec=codec,
            .timebase=f->streams[0]->time_base,.sequence=plan->sequence,.representation=plan->stream_index,.source=t->source,.request=t->request,
            .presentation_start_us=plan->presentation_start_us,.presentation_end_us=plan->presentation_end_us,
            .subtitle_map=subtitle_map,.timeline_id=plan->timeline_id,.timeline_mapping=plan->timeline_mapping,.timeline_start_us=plan->timeline_start_us};
        atomic_fetch_add(&codec->references,1);
        if(!packet.packet){demuxe_packet_release(&packet);result=AVERROR(ENOMEM);break;}
        result=av_read_frame(f,packet.packet);
        // A partial packet can accompany a transport failure. Preserve its
        // cause before treating an otherwise successful short packet as corrupt.
        if(pb->error<0&&pb->error!=AVERROR_EOF)result=pb->error;
        if(result>=0&&(packet.packet->flags&AV_PKT_FLAG_CORRUPT))result=AVERROR_INVALIDDATA;
        if(result<0){demuxe_packet_release(&packet);if(result==AVERROR_EOF&&pb->error<0&&pb->error!=AVERROR_EOF)result=pb->error;break;}
        if(packet.packet->stream_index!=0){demuxe_packet_release(&packet);result=AVERROR_INVALIDDATA;break;}
        int64_t shift=av_rescale_q(plan->timestamp_offset_us,AV_TIME_BASE_Q,packet.timebase);
        int64_t *stamps[]={&packet.packet->pts,&packet.packet->dts};
        if(shift==INT64_MIN){demuxe_packet_release(&packet);result=AVERROR_INVALIDDATA;break;}
        for(int n=0;n<2;n++)if(*stamps[n]!=AV_NOPTS_VALUE){
            if((shift>0&&*stamps[n]>INT64_MAX-shift)||(shift<0&&*stamps[n]<INT64_MIN-shift)){result=AVERROR_INVALIDDATA;break;}
            *stamps[n]+=shift;
        }
        if(result<0){demuxe_packet_release(&packet);break;}
        result=push(t,&packet);demuxe_packet_release(&packet);if(result<0)break;
    }
end:
    // AVIO owns its possibly resized buffer; AVFormat never owns CUSTOM_IO.
    if(f)f->pb=NULL;
    close_resource(&reader);avformat_close_input(&f);
    if(pb){av_freep(&pb->buffer);avio_context_free(&pb);}
    codec_release(codec);return result==AVERROR_EOF?0:result;
}
static void *run(void *opaque){
    struct demuxe_container_task *t=opaque;
    for(;;){
        pthread_mutex_lock(&t->lock);
        while(!interrupted(t)&&!t->plan_count&&!t->plans_done)pthread_cond_wait(&t->changed,&t->lock);
        if(interrupted(t)||(!t->plan_count&&t->plans_done)){pthread_mutex_unlock(&t->lock);break;}
        struct AVDemuxeSegment plan=t->plans[t->plan_head];t->plan_head=(t->plan_head+1)%PLAN_CAPACITY;t->plan_count--;
        pthread_cond_broadcast(&t->changed);pthread_mutex_unlock(&t->lock);
        int result=consume(t,&plan);
        if(result<0){pthread_mutex_lock(&t->lock);t->error=result;pthread_mutex_unlock(&t->lock);break;}
    }
    pthread_mutex_lock(&t->lock);t->finished=1;pthread_cond_broadcast(&t->changed);pthread_mutex_unlock(&t->lock);return NULL;
}
struct demuxe_container_task *demuxe_task_create(uint64_t source,uint64_t request,size_t budget,struct demuxe_task_io io){
    return demuxe_task_create_media(source,request,budget,io,AVMEDIA_TYPE_VIDEO,DEMUXE_CONTAINER_MOV);
}
struct demuxe_container_task *demuxe_task_create_media(uint64_t source,uint64_t request,size_t budget,struct demuxe_task_io io,enum AVMediaType media_type,enum demuxe_container_kind container){
    if(!((container==DEMUXE_CONTAINER_MOV&&(media_type==AVMEDIA_TYPE_VIDEO||media_type==AVMEDIA_TYPE_AUDIO||media_type==AVMEDIA_TYPE_SUBTITLE))||
         (container==DEMUXE_CONTAINER_WEBVTT&&media_type==AVMEDIA_TYPE_SUBTITLE)))return NULL;
    if(!source||!budget||!io.open||!io.close)return NULL;
    struct demuxe_container_task *t=calloc(1,sizeof(*t));if(!t)return NULL;
    t->media_type=media_type;t->container=container;
    t->source=source;t->request=request;t->budget=budget;t->io=io;
    if(pthread_mutex_init(&t->lock,NULL)){free(t);return NULL;}
    if(pthread_cond_init(&t->changed,NULL)){pthread_mutex_destroy(&t->lock);free(t);return NULL;}
    if(pthread_create(&t->thread,NULL,run,t)){pthread_cond_destroy(&t->changed);pthread_mutex_destroy(&t->lock);free(t);return NULL;}
    return t;
}
int demuxe_task_plan(struct demuxe_container_task *t,const struct AVDemuxeSegment *p){
    if(!p||p->abi!=AV_DEMUXE_PLAN_ABI||!memchr(p->url,0,sizeof(p->url))||!memchr(p->init_url,0,sizeof(p->init_url))||!p->url[0]||(t->container==DEMUXE_CONTAINER_MOV&&!p->init_url[0])||(t->container==DEMUXE_CONTAINER_WEBVTT&&p->init_url[0]))return AVERROR(EINVAL);
    pthread_mutex_lock(&t->lock);int result=0;
    if(interrupted(t))result=AVERROR_EXIT;
    else if(t->error)result=t->error;
    else if(t->finished||t->plans_done)result=AVERROR_EOF;
    else if(t->plan_count==PLAN_CAPACITY)result=AVERROR(EAGAIN);
    else{t->plans[(t->plan_head+t->plan_count)%PLAN_CAPACITY]=*p;t->plan_count++;pthread_cond_broadcast(&t->changed);}
    pthread_mutex_unlock(&t->lock);return result;
}
void demuxe_task_end(struct demuxe_container_task *t){pthread_mutex_lock(&t->lock);t->plans_done=1;pthread_cond_broadcast(&t->changed);pthread_mutex_unlock(&t->lock);}
int demuxe_task_take(struct demuxe_container_task *t,struct demuxe_prepared_packet *out,unsigned wait_ms){
    *out=(struct demuxe_prepared_packet){0};pthread_mutex_lock(&t->lock);
    if(!t->packet_count&&!t->finished&&!interrupted(t)&&wait_ms){
        struct timespec until;clock_gettime(CLOCK_REALTIME,&until);
        until.tv_sec+=wait_ms/1000;until.tv_nsec+=(wait_ms%1000)*1000000L;
        if(until.tv_nsec>=1000000000L){until.tv_sec++;until.tv_nsec-=1000000000L;}
        while(!t->packet_count&&!t->finished&&!interrupted(t))
            if(pthread_cond_timedwait(&t->changed,&t->lock,&until)==ETIMEDOUT)break;
    }
    int result=0;
    if(interrupted(t))result=AVERROR_EXIT;
    else if(t->packet_count){*out=t->packets[t->packet_head];t->packet_head=(t->packet_head+1)%PACKET_CAPACITY;t->packet_count--;t->bytes-=packet_cost(out);result=1;pthread_cond_broadcast(&t->changed);}
    else if(t->finished)result=t->error?t->error:AVERROR_EOF;
    pthread_mutex_unlock(&t->lock);return result;
}
void demuxe_task_stats(struct demuxe_container_task *t,struct demuxe_task_stats *out){
    pthread_mutex_lock(&t->lock);*out=(struct demuxe_task_stats){.queued_bytes=t->bytes,.peak_queued_bytes=t->peak_bytes,
        .queued_packets=t->packet_count,.queued_plans=t->plan_count,.containers=t->containers,.consumed_bytes=atomic_load(&t->consumed),.error=t->error,.finished=t->finished};pthread_mutex_unlock(&t->lock);
}
void demuxe_task_cancel(struct demuxe_container_task *t){atomic_store(&t->cancelled,1);pthread_mutex_lock(&t->lock);pthread_cond_broadcast(&t->changed);pthread_mutex_unlock(&t->lock);}
void demuxe_task_destroy(struct demuxe_container_task *t){
    if(!t)return;demuxe_task_cancel(t);pthread_join(t->thread,NULL);
    for(unsigned i=0;i<t->packet_count;i++)demuxe_packet_release(&t->packets[(t->packet_head+i)%PACKET_CAPACITY]);
    pthread_cond_destroy(&t->changed);pthread_mutex_destroy(&t->lock);free(t);
}
