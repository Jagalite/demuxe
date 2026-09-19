// SPDX-License-Identifier: GPL-3.0-or-later
/* Private catalog characterization seam. No network reads or stream probing. */
int av_demuxe_dash_period_count(AVFormatContext *s){
    if(!s||!s->iformat||strcmp(s->iformat->name,"dash"))return AVERROR(EINVAL);
    DASHContext *c=s->priv_data;return c->demuxe_period_count;
}
int av_demuxe_dash_period_info(AVFormatContext *s,int index,struct AVDemuxePeriod *out){
    int count=av_demuxe_dash_period_count(s);if(index<0||index>=count||!out)return AVERROR(EINVAL);
    DASHContext *c=s->priv_data;struct demuxe_dash_catalog_period *p=&c->demuxe_periods[index];
    *out=(struct AVDemuxePeriod){.start_us=p->timing.start_us,.duration_us=p->timing.duration_us};
    av_strlcpy(out->id,p->timing.id,sizeof(out->id));memcpy(out->counts,p->counts,sizeof(out->counts));return 0;
}
int av_demuxe_dash_period_plan(AVFormatContext *s,int period,int type,int representation,int64_t sequence,struct AVDemuxeSegment *out){
    int count=av_demuxe_dash_period_count(s);if(period<0||period>=count||type<0||type>=3||!out)return AVERROR(EINVAL);
    DASHContext *c=s->priv_data;struct demuxe_dash_catalog_period *book=&c->demuxe_periods[period];
    if(representation<0||representation>=book->counts[type])return AVERROR(EINVAL);
    struct representation *p=book->lists[type][representation];
    if(!p->init_section||p->demuxe_protected||!p->url_template||p->n_timelines<=0||
        p->n_timelines>10000||p->fragment_timescale<=0||p->fragment_timescale>INT_MAX||
        p->first_seq_no<0||c->max_url_size>AV_DEMUXE_URL_SIZE)return AVERROR(ENOSYS);
    int64_t seq=p->first_seq_no,start=0;
    for(int i=0;i<p->n_timelines;i++){
        struct timeline *t=p->timelines[i];
        if(t->starttime>0||i==0)start=t->starttime;
        if(t->duration<=0||t->repeat<0||t->repeat>10000||seq>INT64_MAX-t->repeat-1)return AVERROR(ENOSYS);
        for(int64_t j=0;j<=t->repeat;j++,seq++){
            if(start>INT64_MAX-t->duration)return AVERROR_INVALIDDATA;
            if(seq==sequence){
                int64_t begin,end;int r=demuxe_dash_map_timestamp(start,p->presentation_timeoffset,p->fragment_timescale,book->timing.start_us,&begin);
                if(r<0)return r;
                r=demuxe_dash_map_timestamp(start+t->duration,p->presentation_timeoffset,p->fragment_timescale,book->timing.start_us,&end);
                if(r<0||end<=begin)return AVERROR_INVALIDDATA;
                char relative[AV_DEMUXE_URL_SIZE];
                ff_dash_fill_tmpl_params(relative,sizeof(relative),p->url_template,0,seq,0,start);
                if(strlen(relative)>=sizeof(relative)-1)return AVERROR(ENOSYS);
                *out=(struct AVDemuxeSegment){.abi=AV_DEMUXE_PLAN_ABI,.stream_index=representation,.sequence=seq,.start_us=begin,.duration_us=end-begin,
                    .offset=0,.size=-1,.init_offset=p->init_section->url_offset,.init_size=p->init_section->size};
                ff_make_absolute_url(out->url,sizeof(out->url),c->base_url,relative);
                ff_make_absolute_url(out->init_url,sizeof(out->init_url),c->base_url,p->init_section->url);
                return 0;
            }
            start+=t->duration;
        }
    }
    return c->is_live?AVERROR(EAGAIN):AVERROR_EOF;
}
