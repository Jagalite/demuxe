/* One manifest parse builds all period tables. Only period zero's initial
 * representations are probed; later periods remain metadata/segment plans. */
static void demuxe_dash_free_catalog(DASHContext *c)
{
    for(int p=1;p<c->demuxe_period_count;p++)for(int type=0;type<3;type++){
        struct demuxe_dash_catalog_period *period=&c->demuxe_periods[p];
        for(int i=0;i<period->counts[type];i++)free_representation(period->lists[type][i]);
        av_freep(&period->lists[type]);period->counts[type]=0;
    }
    av_freep(&c->demuxe_periods);c->demuxe_period_count=0;
}
static int demuxe_dash_parse_catalog(AVFormatContext *s,const char *url,xmlNodePtr root,xmlNodePtr mpd_base)
{
    DASHContext *c=s->priv_data;struct demuxe_dash_periods periods;
    int r=demuxe_dash_collect_periods(root,&periods);if(r<0)return r;
    c->demuxe_update_us=1000000;
    xmlChar *update=xmlGetProp(root,(const xmlChar*)"minimumUpdatePeriod");
    if(update){r=demuxe_dash_duration_us((const char*)update,&c->demuxe_update_us);xmlFree(update);if(r<0)return r;}
    c->demuxe_availability_us=AV_NOPTS_VALUE;c->demuxe_dvr_us=0;
    xmlChar *availability=xmlGetProp(root,(const xmlChar*)"availabilityStartTime");
    if(availability){r=av_parse_time(&c->demuxe_availability_us,(const char*)availability,0);xmlFree(availability);if(r<0)return r;}
    xmlChar *depth=xmlGetProp(root,(const xmlChar*)"timeShiftBufferDepth");
    if(depth){r=demuxe_dash_duration_us((const char*)depth,&c->demuxe_dvr_us);xmlFree(depth);if(r<0)return r;}
    if(c->demuxe_periods||c->n_videos||c->n_audios||c->n_subtitles)return AVERROR(EINVAL);
    c->demuxe_periods=av_calloc(periods.count,sizeof(*c->demuxe_periods));
    if(!c->demuxe_periods)return AVERROR(ENOMEM);
    for(int p=0;p<periods.count;p++){
        struct demuxe_dash_catalog_period *period=&c->demuxe_periods[p];
        period->timing=periods.values[p];period->serial=p;c->demuxe_period_count=p+1;
        c->n_videos=c->n_audios=c->n_subtitles=0;c->videos=c->audios=c->subtitles=NULL;
        c->period_start=period->timing.start_us/AV_TIME_BASE;
        c->period_duration=period->timing.duration_us==AV_NOPTS_VALUE?0:
            av_rescale_rnd(period->timing.duration_us,1,AV_TIME_BASE,AV_ROUND_UP);
        xmlNodePtr node=period->timing.node;
        xmlNodePtr base=find_child_node_by_name(node,"BaseURL");
        xmlNodePtr templ=find_child_node_by_name(node,"SegmentTemplate");
        xmlNodePtr list=find_child_node_by_name(node,"SegmentList");
        for(xmlNodePtr child=xmlFirstElementChild(node);child;child=xmlNextElementSibling(child))
            if(!av_strcasecmp(child->name,"AdaptationSet")){
                r=parse_manifest_adaptationset(s,url,child,mpd_base,base,templ,list);
                if(r<0)break;
            }
        period->counts[0]=c->n_videos;period->lists[0]=c->videos;
        period->counts[1]=c->n_audios;period->lists[1]=c->audios;
        period->counts[2]=c->n_subtitles;period->lists[2]=c->subtitles;
        period->timing.node=NULL; // the single XML document is freed by caller
        if(r<0)break;
    }
    struct demuxe_dash_catalog_period *first=&c->demuxe_periods[0];
    c->n_videos=first->counts[0];c->videos=first->lists[0];
    c->n_audios=first->counts[1];c->audios=first->lists[1];
    c->n_subtitles=first->counts[2];c->subtitles=first->lists[2];
    c->period_start=first->timing.start_us/AV_TIME_BASE;
    c->period_duration=first->timing.duration_us==AV_NOPTS_VALUE?0:
        av_rescale_rnd(first->timing.duration_us,1,AV_TIME_BASE,AV_ROUND_UP);
    xmlFree(c->adaptionset_lang);c->adaptionset_lang=NULL;
    if(!c->demuxe_next_period)c->demuxe_next_period=c->demuxe_period_count;
    if(!c->demuxe_revision)c->demuxe_revision=1;
    return r;
}
