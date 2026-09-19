// SPDX-License-Identifier: GPL-3.0-or-later
/* All session plans reference the accepted native catalog. Sequence tokens are
 * source-private: high 31 bits identify a retained period, low 32 bits preserve
 * that representation's SegmentTemplate numbering. No URL scheduling in JS. */
static struct representation *demuxe_dash_bound_rep(DASHContext *c,int period,int stream,int *type_out,int *index_out){
    if(period<0||period>=c->demuxe_period_count)return NULL;
    struct demuxe_dash_catalog_period *book=&c->demuxe_periods[period];
    for(int type=0;type<3;type++)for(int i=0;i<book->counts[type];i++){
        struct representation *p=book->lists[type][i];
        if(p->nb_assoc_stream==1&&p->assoc_stream[0]->index==stream){
            if(type_out)*type_out=type;if(index_out)*index_out=i;return p;
        }
    }
    return NULL;
}
static int demuxe_dash_sequence_bounds(struct representation *p,int64_t *first,int64_t *last){
    if(p->first_seq_no<0||p->first_seq_no>UINT32_MAX||p->n_timelines<=0||p->n_timelines>10000)return AVERROR(ENOSYS);
    int64_t count=0;
    for(int i=0;i<p->n_timelines;i++){
        if(p->timelines[i]->repeat<0||p->timelines[i]->repeat>=10000||p->timelines[i]->duration<=0)return AVERROR(ENOSYS);
        count+=p->timelines[i]->repeat+1;if(count>10000)return AVERROR(ENOBUFS);
    }
    if(p->first_seq_no>UINT32_MAX-count)return AVERROR(ENOSYS);
    *first=p->first_seq_no;*last=*first+count-1;return 0;
}
static int64_t demuxe_dash_token(struct demuxe_dash_catalog_period *p,int64_t sequence){return ((int64_t)p->serial<<32)|sequence;}
static int demuxe_dash_catalog_plan(AVFormatContext *s,int period,int stream,int64_t sequence,struct AVDemuxeSegment *out){
    DASHContext *c=s->priv_data;int type,index;
    struct representation *p=demuxe_dash_bound_rep(c,period,stream,&type,&index);if(!p)return AVERROR(ENOSYS);
    int r=av_demuxe_dash_period_plan(s,period,type,index,sequence,out);if(r<0)return r;
    out->sequence=demuxe_dash_token(&c->demuxe_periods[period],sequence);out->stream_index=stream;
    out->presentation_start_us=c->demuxe_periods[period].timing.start_us;
    int64_t duration=c->demuxe_periods[period].timing.duration_us;
    out->presentation_end_us=duration==AV_NOPTS_VALUE?AV_NOPTS_VALUE:out->presentation_start_us+duration;
    return demuxe_dash_map_timestamp(0,p->presentation_timeoffset,p->fragment_timescale,c->demuxe_periods[period].timing.start_us,&out->timestamp_offset_us);
}
int av_demuxe_dash_component(AVFormatContext *s,int stream,struct AVDemuxeRepresentation *out){
    int count=av_demuxe_dash_period_count(s);if(count<=0||stream<0||stream>=s->nb_streams)return AVERROR(ENOSYS);
    DASHContext *c=s->priv_data;struct representation *p=demuxe_dash_bound_rep(c,0,stream,NULL,NULL);int64_t first,last;
    if(!p||!p->init_section||p->demuxe_protected||!p->id||strlen(p->id)>=sizeof(out->id)||demuxe_dash_sequence_bounds(p,&first,&last)<0)return AVERROR(ENOSYS);
    *out=(struct AVDemuxeRepresentation){.abi=AV_DEMUXE_PLAN_ABI,.stream_index=stream,.live=c->is_live,.bandwidth=p->bandwidth,.segments=last-first+1,.first_sequence=demuxe_dash_token(&c->demuxe_periods[0],first)};
    av_strlcpy(out->group,p->demuxe_group,sizeof(out->group));av_strlcpy(out->id,p->id,sizeof(out->id));return 0;
}
int av_demuxe_dash_representation(AVFormatContext *s,int stream,struct AVDemuxeRepresentation *out){
    if(stream<0||stream>=s->nb_streams||s->streams[stream]->codecpar->codec_type!=AVMEDIA_TYPE_VIDEO)return AVERROR(ENOSYS);
    return av_demuxe_dash_component(s,stream,out);
}
static int demuxe_dash_available(DASHContext *c,const struct AVDemuxeSegment *segment){
    if(!c->is_live||c->demuxe_availability_us==AV_NOPTS_VALUE)return 0;
    int64_t now=av_gettime();if(now<c->demuxe_availability_us)return AVERROR(EAGAIN);
    int64_t edge=now-c->demuxe_availability_us;
    if(segment->start_us>INT64_MAX-segment->duration_us)return AVERROR_INVALIDDATA;
    int64_t end=segment->start_us+segment->duration_us;
    if(end>edge)return AVERROR(EAGAIN);
    if(c->demuxe_dvr_us>0&&end<=edge-c->demuxe_dvr_us)return AVERROR(ERANGE);
    return 0;
}
/* First segment whose end exceeds a presentation cutoff. O(log N) lookups,
 * never a full sequence-by-sequence scan inside another timeline scan. */
static int demuxe_dash_after(AVFormatContext *s,int period,int stream,int64_t first,int64_t last,int64_t cutoff,int64_t *sequence){
    int64_t lo=first,hi=last+1;
    while(lo<hi){
        int64_t mid=lo+(hi-lo)/2;struct AVDemuxeSegment segment;
        int r=demuxe_dash_catalog_plan(s,period,stream,mid,&segment);if(r<0)return r;
        if(segment.start_us+segment.duration_us<=cutoff)lo=mid+1;else hi=mid;
    }
    *sequence=lo;return 0;
}
int av_demuxe_dash_window(AVFormatContext *s,int stream,struct AVDemuxeWindow *out){
    int count=av_demuxe_dash_period_count(s);if(count<=0)return AVERROR(ENOSYS);
    DASHContext *c=s->priv_data;*out=(struct AVDemuxeWindow){.abi=AV_DEMUXE_WINDOW_ABI,.live=c->is_live,.complete=!c->is_live,.revision=c->demuxe_revision};
    int64_t edge=INT64_MAX,expired=INT64_MIN;
    if(c->is_live&&c->demuxe_availability_us!=AV_NOPTS_VALUE){
        int64_t now=av_gettime();if(now<c->demuxe_availability_us)return 0;
        edge=now-c->demuxe_availability_us;if(c->demuxe_dvr_us>0)expired=edge-c->demuxe_dvr_us;
    }
    for(int period=0;period<count;period++){
        struct representation *p=demuxe_dash_bound_rep(c,period,stream,NULL,NULL);int64_t first,last,begin,end;
        if(!p||demuxe_dash_sequence_bounds(p,&first,&last)<0)return AVERROR(ENOSYS);
        int r=demuxe_dash_after(s,period,stream,first,last,expired,&begin);if(r<0)return r;
        r=demuxe_dash_after(s,period,stream,first,last,edge,&end);if(r<0)return r;
        if(begin>=end)continue;
        struct AVDemuxeSegment a,b;
        r=demuxe_dash_catalog_plan(s,period,stream,begin,&a);if(r<0)return r;
        r=demuxe_dash_catalog_plan(s,period,stream,end-1,&b);if(r<0)return r;
        if(!out->known){out->start_us=FFMAX(0,a.start_us);out->first_sequence=a.sequence;out->known=1;}
        out->end_us=b.start_us+b.duration_us;out->last_sequence=b.sequence;
    }
    return 0;
}
int av_demuxe_dash_segment(AVFormatContext *s,int stream,int64_t sequence,int64_t target_us,struct AVDemuxeSegment *out){
    int count=av_demuxe_dash_period_count(s);if(count<=0)return AVERROR(ENOSYS);
    DASHContext *c=s->priv_data;int period=-1;
    if(sequence>=0){
        uint32_t serial=(uint64_t)sequence>>32;
        for(int i=0;i<count;i++)if(c->demuxe_periods[i].serial==serial){period=i;break;}
        if(period<0)return AVERROR(ERANGE);
    }else{
        struct AVDemuxeWindow window;int r=av_demuxe_dash_window(s,stream,&window);if(r<0)return r;
        if(!window.known)return AVERROR(EAGAIN);
        if(target_us<window.start_us)return AVERROR(ERANGE);
        if(target_us>=window.end_us)return c->is_live?AVERROR(EAGAIN):AVERROR_EOF;
    }
    for(int i=period<0?0:period;i<count;i++){
        struct representation *p=demuxe_dash_bound_rep(c,i,stream,NULL,NULL);int64_t first,last;
        if(!p||demuxe_dash_sequence_bounds(p,&first,&last)<0)return AVERROR(ENOSYS);
        int64_t requested=sequence>=0&&i==period?(uint32_t)sequence:first;
        if(sequence<0){int r=demuxe_dash_after(s,i,stream,first,last,target_us,&requested);if(r<0)return r;}
        if(requested<first)return AVERROR(ERANGE);
        if(requested>last)continue;
        struct AVDemuxeSegment segment;int r=demuxe_dash_catalog_plan(s,i,stream,requested,&segment);if(r<0)return r;
        if(sequence<0&&target_us<segment.start_us)return AVERROR(ERANGE);
        r=demuxe_dash_available(c,&segment);if(r<0)return r;*out=segment;return 0;
    }
    return c->is_live?AVERROR(EAGAIN):AVERROR_EOF;
}
