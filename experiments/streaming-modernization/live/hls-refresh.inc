/* SPDX-License-Identifier: LGPL-2.1-or-later */
/* Called only by the parent demux owner. Refreshing does not select or consume
 * a rendition. Container tasks receive copied plans, never parser pointers. */
int av_demuxe_hls_refresh(AVFormatContext *s, int stream)
{
    struct playlist *p=demuxe_hls_playlist(s,stream);
    HLSContext *c=s->priv_data;
    if(!p)return AVERROR(ENOSYS);
    if(p->finished)return 0;
    int64_t interval=FFMAX(250000,p->target_duration/2);
    if(av_gettime_relative()-p->last_load_time<interval)return 0;
    return parse_playlist(c,p->url,p,NULL);
}
/* Eligible aligned renditions can inherit a packet-established anchor only
 * through overlapping media sequences with equal durations. No wall clock or
 * filename-derived offset is used. Discontinuities need explicit admission. */
static int demuxe_hls_anchor(AVFormatContext *s,struct playlist *p,int64_t *start)
{
    if(p->demuxe_window_start!=AV_NOPTS_VALUE){*start=p->demuxe_window_start;return 0;}
    HLSContext *c=s->priv_data;
    struct AVDemuxeRepresentation desired;
    if(p->n_main_streams!=1||av_demuxe_hls_representation(s,p->main_streams[0]->index,&desired)<0)return AVERROR(ENOSYS);
    for(int k=0;k<c->n_playlists;k++){
        struct playlist *r=c->playlists[k];
        if(r==p||r->demuxe_window_start==AV_NOPTS_VALUE||r->n_main_streams!=1||
           r->main_streams[0]->codecpar->codec_type!=AVMEDIA_TYPE_VIDEO)continue;
        struct AVDemuxeRepresentation reference;
        if(av_demuxe_hls_representation(s,r->main_streams[0]->index,&reference)<0||strcmp(reference.group,desired.group))continue;
        int64_t overlap=FFMAX(p->start_seq_no,r->start_seq_no);
        int64_t end=FFMIN(p->start_seq_no+p->n_segments,r->start_seq_no+r->n_segments);
        if(overlap>=end)continue;
        int good=1;
        for(int64_t seq=overlap;seq<end;seq++){
            struct segment *a=p->segments[seq-p->start_seq_no],*b=r->segments[seq-r->start_seq_no];
            if(a->duration!=b->duration||a->period_start||b->period_start){good=0;break;}
        }
        if(!good)continue;
        int64_t anchor=r->demuxe_window_start,delta=0;
        for(int64_t i=0;i<overlap-r->start_seq_no;i++){
            int64_t d=r->segments[i]->duration;if(d<=0||anchor>INT64_MAX-d)return AVERROR_INVALIDDATA;anchor+=d;
        }
        for(int64_t i=0;i<overlap-p->start_seq_no;i++){
            int64_t d=p->segments[i]->duration;if(d<=0||delta>INT64_MAX-d)return AVERROR_INVALIDDATA;delta+=d;
        }
        if(anchor<INT64_MIN+delta)return AVERROR_INVALIDDATA;
        *start=anchor-delta;p->demuxe_window_start=*start;return 0;
    }
    return AVERROR(EAGAIN);
}
