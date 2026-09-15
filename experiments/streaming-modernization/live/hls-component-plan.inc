/* Private representation/segment-plan seam. HLS remains the timeline owner. */
static struct playlist *demuxe_hls_playlist(AVFormatContext *s, int stream)
{
    HLSContext *c = s->priv_data;
    if (!s->iformat || strcmp(s->iformat->name, "hls") || stream < 0 ||
        stream >= s->nb_streams || (s->streams[stream]->codecpar->codec_type != AVMEDIA_TYPE_VIDEO &&
         s->streams[stream]->codecpar->codec_type != AVMEDIA_TYPE_AUDIO &&
         s->streams[stream]->codecpar->codec_type != AVMEDIA_TYPE_SUBTITLE))
        return NULL;
    for (int i = 0; i < c->n_playlists; i++) {
        struct playlist *p = c->playlists[i];
        // First integration qualifies separated video fMP4. Muxed tracks need
        // coordinated audio admission and are not silently treated as video-only.
        if (p->n_main_streams == 1 && p->main_streams[0]->index == stream)
            return p;
    }
    return NULL;
}
int av_demuxe_hls_component(AVFormatContext *s, int stream, struct AVDemuxeRepresentation *out)
{
    struct playlist *p = demuxe_hls_playlist(s, stream);
    HLSContext *c = s->priv_data;
    if (!p || p->n_segments <= 0 || p->n_segments > 10000 ||
        p->start_seq_no < 0 || p->start_seq_no > INT64_MAX-p->n_segments)
        return AVERROR(ENOSYS);
    enum AVMediaType type=s->streams[stream]->codecpar->codec_type;
    if(type==AVMEDIA_TYPE_SUBTITLE && s->streams[stream]->codecpar->codec_id!=AV_CODEC_ID_WEBVTT)return AVERROR(ENOSYS);
    for (int i = 0; i < p->n_segments; i++)
        if (p->segments[i]->key_type != KEY_NONE || (type!=AVMEDIA_TYPE_SUBTITLE && !p->segments[i]->init_section) || (!p->finished && p->segments[i]->period_start))
            return AVERROR(ENOSYS);
    if(type!=AVMEDIA_TYPE_VIDEO){
        *out=(struct AVDemuxeRepresentation){.abi=AV_DEMUXE_PLAN_ABI,.stream_index=stream,
            .live=!p->finished,.segments=p->n_segments,.first_sequence=p->start_seq_no};
        snprintf(out->group,sizeof(out->group),"component:%d",type);
        snprintf(out->id,sizeof(out->id),"playlist:%d",p->index);return 0;
    }
    for (int i = 0; i < c->n_variants; i++) {
        struct variant *v = c->variants[i];
        if (!v->n_playlists || v->playlists[0] != p) continue;
        *out = (struct AVDemuxeRepresentation){.abi=AV_DEMUXE_PLAN_ABI,
            .stream_index=stream,.live=!p->finished,.bandwidth=v->bandwidth,.segments=p->n_segments,.first_sequence=p->start_seq_no};
        int n = snprintf(out->group,sizeof(out->group),"hls:%zu:%s%zu:%s%zu:%s",
                         strlen(v->video_group),v->video_group,strlen(v->audio_group),v->audio_group,strlen(v->subtitles_group),v->subtitles_group);
        if (n < 0 || n >= sizeof(out->group)) return AVERROR(ENOSYS);
        snprintf(out->id,sizeof(out->id),"variant:%d",i);
        return 0;
    }
    return AVERROR(ENOSYS);
}
int av_demuxe_hls_representation(AVFormatContext *s,int stream,struct AVDemuxeRepresentation *out)
{
    if(stream<0||stream>=s->nb_streams||s->streams[stream]->codecpar->codec_type!=AVMEDIA_TYPE_VIDEO)return AVERROR(ENOSYS);
    return av_demuxe_hls_component(s,stream,out);
}
static int demuxe_hls_anchor(AVFormatContext *,struct playlist *,int64_t *);
int av_demuxe_hls_segment(AVFormatContext *s, int stream, int64_t sequence,
                          int64_t target_us, struct AVDemuxeSegment *out)
{
    struct AVDemuxeRepresentation descriptor;
    int ret = av_demuxe_hls_component(s, stream, &descriptor);
    if (ret < 0) return ret;
    HLSContext *c = s->priv_data;
    struct playlist *p = demuxe_hls_playlist(s, stream);
    int64_t start = c->first_timestamp == AV_NOPTS_VALUE ? 0 : c->first_timestamp;
    if(!p->finished){
        ret=demuxe_hls_anchor(s,p,&start);if(ret<0)return ret;
        if(sequence>=0 && sequence<p->start_seq_no)return AVERROR(ERANGE);
        if(sequence<0 && target_us<start)return AVERROR(ERANGE);
    }
    for (int i = 0; i < p->n_segments; i++) {
        struct segment *seg = p->segments[i];
        if (seg->duration <= 0 || start > INT64_MAX - seg->duration) return AVERROR_INVALIDDATA;
        int64_t seq = p->start_seq_no + i;
        if ((sequence >= 0 && sequence == seq) ||
            (sequence < 0 && target_us >= start && target_us < start + seg->duration)) {
            struct segment *init = seg->init_section;
            if (strlen(seg->url) >= sizeof(out->url) || (init && strlen(init->url) >= sizeof(out->init_url)))
                return AVERROR(ENOSYS);
            *out = (struct AVDemuxeSegment){.abi=AV_DEMUXE_PLAN_ABI,.stream_index=stream,
                .sequence=seq,.start_us=start,.duration_us=seg->duration,
                .offset=seg->url_offset,.size=seg->size,.init_offset=init?init->url_offset:0,.init_size=init?init->size:-1};
            av_strlcpy(out->url,seg->url,sizeof(out->url));
            if(init)av_strlcpy(out->init_url,init->url,sizeof(out->init_url));
            return 0;
        }
        start += seg->duration;
    }
    return p->finished?AVERROR_EOF:AVERROR(EAGAIN);
}
