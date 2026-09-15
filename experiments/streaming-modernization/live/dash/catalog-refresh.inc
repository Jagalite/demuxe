/* Transactional refresh runs on the owning demux thread after child demuxers
 * have handed off. Failed parsing/binding cannot replace the accepted catalog. */
static void demuxe_dash_release_tables(DASHContext *c){
    demuxe_dash_free_catalog(c);free_video_list(c);free_audio_list(c);free_subtitle_list(c);
    av_freep(&c->base_url);xmlFree(c->adaptionset_lang);c->adaptionset_lang=NULL;
}
static int demuxe_dash_same_identity(const struct representation *a,const struct representation *b){
    return a->id&&b->id&&!strcmp(a->id,b->id)&&!strcmp(a->demuxe_group,b->demuxe_group)&&
        !strcmp(a->lang?a->lang:"",b->lang?b->lang:"");
}
static int demuxe_dash_bind(DASHContext *old,DASHContext *next){
    if(!old->demuxe_period_count||!next->demuxe_period_count)return AVERROR_INVALIDDATA;
    struct demuxe_dash_catalog_period *reference=&old->demuxe_periods[0];
    for(int p=1;p<next->demuxe_period_count;p++){
        struct demuxe_dash_period *before=&next->demuxe_periods[p-1].timing,*after=&next->demuxe_periods[p].timing;
        if(before->duration_us==AV_NOPTS_VALUE||before->start_us+before->duration_us!=after->start_us)return AVERROR(ENOSYS);
    }
    for(int p=0;p<next->demuxe_period_count;p++)for(int type=0;type<3;type++){
        struct demuxe_dash_catalog_period *period=&next->demuxe_periods[p];
        if(period->counts[type]!=reference->counts[type])return AVERROR(ENOSYS);
        for(int i=0;i<period->counts[type];i++){
            struct representation *rep=period->lists[type][i],*matched=NULL;
            for(int j=0;j<i;j++)if(demuxe_dash_same_identity(rep,period->lists[type][j]))return AVERROR_INVALIDDATA;
            for(int j=0;j<reference->counts[type];j++)if(demuxe_dash_same_identity(rep,reference->lists[type][j])){
                if(matched)return AVERROR_INVALIDDATA;matched=reference->lists[type][j];
            }
            if(!matched||matched->nb_assoc_stream!=1||rep->demuxe_protected){av_log(rep->parent,AV_LOG_ERROR,"DASH catalog track binding unavailable: period=%d type=%d index=%d matched=%d associations=%d protected=%d\n",p,type,i,!!matched,matched?matched->nb_assoc_stream:0,rep->demuxe_protected);return AVERROR(ENOSYS);}
            if(rep->codecs&&matched->codecs){
                size_t a=strcspn(rep->codecs,"."),b=strcspn(matched->codecs,".");
                int avc=(!strncmp(rep->codecs,"avc1",4)||!strncmp(rep->codecs,"avc3",4))&&(!strncmp(matched->codecs,"avc1",4)||!strncmp(matched->codecs,"avc3",4));
                if(!avc&&(a!=b||strncmp(rep->codecs,matched->codecs,a)))return AVERROR(ENOSYS);
            }
            if(rep==matched)continue;
            if(rep->assoc_stream)return AVERROR(EINVAL);
            rep->assoc_stream=av_malloc(sizeof(*rep->assoc_stream));if(!rep->assoc_stream)return AVERROR(ENOMEM);
            rep->assoc_stream[0]=matched->assoc_stream[0];rep->nb_assoc_stream=1;
        }
    }
    return 0;
}
int av_demuxe_dash_handoff(AVFormatContext *s){
    if(av_demuxe_dash_period_count(s)<=0)return AVERROR(ENOSYS);
    DASHContext *c=s->priv_data;if(c->demuxe_handoff)return 0;
    int r=demuxe_dash_bind(c,c);if(r<0)return r;
    for(int p=0;p<c->demuxe_period_count;p++)for(int type=0;type<3;type++)for(int i=0;i<c->demuxe_periods[p].counts[type];i++){
        struct representation *rep=c->demuxe_periods[p].lists[type][i];
        ff_format_io_close(s,&rep->input);
        if(rep->ctx){rep->ctx->pb=NULL;avformat_close_input(&rep->ctx);}
        av_freep(&rep->pb.pub.buffer);av_freep(&rep->init_sec_buf);
        rep->init_sec_buf_size=rep->init_sec_data_len=rep->init_sec_buf_read_offset=0;
    }
    c->demuxe_handoff=1;return 0;
}
int av_demuxe_dash_refresh(AVFormatContext *s){
    if(av_demuxe_dash_period_count(s)<=0)return AVERROR(ENOSYS);
    DASHContext *c=s->priv_data;if(!c->demuxe_handoff)return AVERROR(EINVAL);
    if(!c->is_live)return 0;
    int64_t now=av_gettime_relative(),interval=c->demuxe_update_us>0?FFMAX(c->demuxe_update_us,250000):1000000;
    if(now-c->demuxe_last_reload<interval)return c->demuxe_reload_error;
    c->demuxe_last_reload=now;
    DASHContext next=*c;
    // FFmpeg accumulates URL workspace estimates while parsing representations.
    // A replacement catalog starts a fresh estimate, not a lifetime accumulator.
    next.max_url_size=0;
    next.videos=next.audios=next.subtitles=NULL;next.n_videos=next.n_audios=next.n_subtitles=0;
    next.base_url=next.adaptionset_lang=NULL;next.demuxe_periods=NULL;next.demuxe_period_count=0;
    s->priv_data=&next;int r=parse_manifest(s,s->url,NULL);s->priv_data=c;
    if(r<0)av_log(s,AV_LOG_ERROR,"DASH catalog refresh parse failed: %s\n",av_err2str(r));
    if(r>=0)r=demuxe_dash_bind(c,&next);
    if(r<0)av_log(s,AV_LOG_ERROR,"DASH catalog refresh rejected: %s\n",av_err2str(r));
    if(r>=0)for(int p=0;p<next.demuxe_period_count;p++){
        struct demuxe_dash_catalog_period *period=&next.demuxe_periods[p];int found=0;
        for(int old=0;old<c->demuxe_period_count;old++)if(!strcmp(period->timing.id,c->demuxe_periods[old].timing.id)){
            if(period->timing.start_us!=c->demuxe_periods[old].timing.start_us){r=AVERROR_INVALIDDATA;break;}
            period->serial=c->demuxe_periods[old].serial;found=1;break;
        }
        if(r<0)break;
        if(!found){if(next.demuxe_next_period>=INT32_MAX){r=AVERROR(ENOBUFS);break;}period->serial=next.demuxe_next_period++;}
    }
    if(r>=0&&next.demuxe_revision==UINT64_MAX)r=AVERROR(ENOBUFS);
    if(r<0){demuxe_dash_release_tables(&next);c->demuxe_reload_error=r;return r;}
    // All current AVStream objects remain owned by AVFormatContext. Replacement
    // tables contain newly allocated associations to those same logical tracks.
    demuxe_dash_release_tables(c);*c=next;c->demuxe_reload_error=0;c->demuxe_revision++;return 0;
}
