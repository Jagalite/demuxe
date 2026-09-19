// SPDX-License-Identifier: GPL-3.0-or-later
/* Snapshot plans from the authoritative MPD parser, without nested demux reads. */
static struct representation *demuxe_dash_representation(AVFormatContext *s, int stream)
{
    DASHContext *c = s->priv_data;
    if (!s->iformat || strcmp(s->iformat->name,"dash") || stream < 0 ||
        stream >= s->nb_streams || s->streams[stream]->codecpar->codec_type != AVMEDIA_TYPE_VIDEO)
        return NULL;
    for (int i = 0; i < c->n_videos; i++)
        if (c->videos[i]->nb_assoc_stream == 1 && c->videos[i]->assoc_stream[0]->index == stream)
            return c->videos[i];
    return NULL;
}
int av_demuxe_dash_representation(AVFormatContext *s, int stream, struct AVDemuxeRepresentation *out)
{
    struct representation *p = demuxe_dash_representation(s,stream);
    DASHContext *c = s->priv_data;
    if (!p || c->is_live || c->period_start || p->presentation_timeoffset ||
        !p->init_section || p->demuxe_protected || !p->demuxe_group[0] ||
        p->nb_assoc_stream != 1 || p->fragment_timescale <= 0 || p->fragment_timescale > INT_MAX ||
        p->first_seq_no < 0 || p->last_seq_no < p->first_seq_no || p->last_seq_no-p->first_seq_no >= 10000 ||
        c->max_url_size > AV_DEMUXE_URL_SIZE ||
        (c->period_duration && c->media_presentation_duration && c->period_duration != c->media_presentation_duration))
        return AVERROR(ENOSYS);
    for (int i = 0; i < p->n_timelines; i++)
        if (p->timelines[i]->repeat < 0) return AVERROR(ENOSYS);
    *out = (struct AVDemuxeRepresentation){.abi=AV_DEMUXE_PLAN_ABI,.stream_index=stream,
        .bandwidth=p->bandwidth,.segments=p->last_seq_no-p->first_seq_no+1,.first_sequence=p->first_seq_no};
    av_strlcpy(out->group,p->demuxe_group,sizeof(out->group));
    // Metadata is a consumer copy; representation identity remains demux-owned.
    const char *id=p->id;
    if (!id || strlen(id) >= sizeof(out->id)) return AVERROR(ENOSYS);
    av_strlcpy(out->id,id,sizeof(out->id));return 0;
}
int av_demuxe_dash_segment(AVFormatContext *s, int stream, int64_t sequence,
                           int64_t target_us, struct AVDemuxeSegment *out)
{
    struct AVDemuxeRepresentation descriptor;
    int ret = av_demuxe_dash_representation(s,stream,&descriptor);
    if (ret < 0) return ret;
    struct representation *p = demuxe_dash_representation(s,stream);
    DASHContext *c = s->priv_data;
    int64_t seq=p->first_seq_no,start=0,duration=0;
    AVRational tb={1,p->fragment_timescale};
    for (int i=0; seq<=p->last_seq_no; i++) {
        int repeat=0;
        if (p->n_timelines) {
            if (i>=p->n_timelines) break;
            if (p->timelines[i]->starttime > 0) start=p->timelines[i]->starttime;
            duration=p->timelines[i]->duration;repeat=p->timelines[i]->repeat;
        } else duration=p->fragment_duration;
        if (duration<=0 || repeat>10000) return AVERROR_INVALIDDATA;
        for (int j=0; j<=repeat && seq<=p->last_seq_no; j++,seq++) {
            if (start>INT64_MAX-duration) return AVERROR_INVALIDDATA;
            int64_t us=av_rescale_q(start,tb,AV_TIME_BASE_Q),end=av_rescale_q(start+duration,tb,AV_TIME_BASE_Q);
            if (us<0 || end<=us) return AVERROR_INVALIDDATA;
            if ((sequence>=0 && sequence==seq) || (sequence<0 && target_us>=us && target_us<end)) {
                struct representation copy=*p;copy.cur_seq_no=seq;
                struct fragment *f=get_current_fragment(&copy);
                if (!f) return AVERROR_INVALIDDATA;
                *out=(struct AVDemuxeSegment){.abi=AV_DEMUXE_PLAN_ABI,.stream_index=stream,
                    .sequence=seq,.start_us=us,.duration_us=end-us,
                    .offset=f->url_offset,.size=f->size,.init_offset=p->init_section->url_offset,.init_size=p->init_section->size};
                ff_make_absolute_url(out->url,sizeof(out->url),c->base_url,f->url);
                ff_make_absolute_url(out->init_url,sizeof(out->init_url),c->base_url,p->init_section->url);
                free_fragment(&f);return 0;
            }
            start+=duration;
        }
    }
    return AVERROR_EOF;
}
