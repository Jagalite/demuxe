// Source-bound preparation; called exclusively by the lavf demux owner.
static int adaptive_description(AVFormatContext *f,int stream,struct AVDemuxeRepresentation *d)
{
    if (!strcmp(f->iformat->name,"hls")) return av_demuxe_hls_representation(f,stream,d);
    if (!strcmp(f->iformat->name,"dash")) return av_demuxe_dash_representation(f,stream,d);
    return AVERROR(ENOSYS);
}
static int adaptive_io_open(void *opaque,AVFormatContext *owner,AVIOContext **pb,const char *url,AVDictionary **options)
{
    lavf_priv_t *p=opaque;
#ifdef __EMSCRIPTEN__
    return web_resource_avio_open_for_session(p->browser_session,owner,pb,url,AVIO_FLAG_READ,options);
#else
    return avio_open2(pb,url,AVIO_FLAG_READ,&owner->interrupt_callback,options);
#endif
}
static void adaptive_io_close(void *opaque,AVFormatContext *owner,AVIOContext **pb)
{
#ifdef __EMSCRIPTEN__
    if(*pb) web_resource_avio_close(owner,*pb);
    *pb=NULL;
#else
    avio_closep(pb);
#endif
}
static int adaptive_init(struct demuxer *demux)
{
    lavf_priv_t *p=demux->priv;
#ifdef __EMSCRIPTEN__
    p->adaptive_source=p->browser_session;
#else
    p->adaptive_source=1;
#endif
    p->adaptive_logical=-1;
    bool permitted=demux->access_references;
#ifdef __EMSCRIPTEN__
    // Browser authorization is enforced by the registered root ResourceLoader,
    // matching nested_io_open. Generic filesystem/network references stay off.
    permitted=web_resource_url(p->browser_session)!=NULL;
#endif
    if(!permitted||!demuxe_control_enabled(p->adaptive_source)) return 0;
    int streams[64],widths[64],heights[64],bitrates[64],count=0;
    struct AVDemuxeRepresentation first={0};enum AVCodecID codec=AV_CODEC_ID_NONE;
    for(unsigned i=0;i<p->avfc->nb_streams;i++){
        struct AVDemuxeRepresentation d;
        if(adaptive_description(p->avfc,i,&d)<0)continue;
        AVCodecParameters *cp=p->avfc->streams[i]->codecpar;
        if(cp->codec_id!=AV_CODEC_ID_H264)continue;
        if(!count){first=d;codec=cp->codec_id;}
        if(strcmp(first.group,d.group)||cp->codec_id!=codec)continue;
        if(count==64)return AVERROR(ENOBUFS);
        streams[count]=i;widths[count]=cp->width;heights[count]=cp->height;bitrates[count]=d.bandwidth;count++;
    }
    if(count<2)return 0;
    for(int i=0;i<count;i++)for(int j=i+1;j<count;j++)if(bitrates[j]<bitrates[i]){
#define SWAP(a) do{int n=a[i];a[i]=a[j];a[j]=n;}while(0)
        SWAP(streams);SWAP(widths);SWAP(heights);SWAP(bitrates);
#undef SWAP
    }
    p->adaptive_logical=streams[0];
    p->adaptive=demuxe_adaptive_create(p->avfc,streams[0],streams[0],p->adaptive_source,
        (struct demuxe_task_io){.opaque=p,.open=adaptive_io_open,.close=adaptive_io_close});
    if(!p->adaptive)return AVERROR(ENOMEM);
    for(int i=1;i<count;i++)p->adaptive_hidden[streams[i]]=true;
    if(!demuxe_control_bind(p->adaptive_source,streams,widths,heights,bitrates,count))return AVERROR_EXIT;
    struct demuxe_adaptive_stats state;demuxe_adaptive_stats(p->adaptive,&state);demuxe_control_update(&state);
    return 0;
}
static bool adaptive_side_data_equal(const AVCodecParameters *a,const AVCodecParameters *b)
{
    if(a->nb_coded_side_data!=b->nb_coded_side_data)return false;
    for(int i=0;i<a->nb_coded_side_data;i++){
        const AVPacketSideData *x=&a->coded_side_data[i],*y=&b->coded_side_data[i];
        if(x->type!=y->type||x->size!=y->size||(x->size&&memcmp(x->data,y->data,x->size)))return false;
    }
    return true;
}
static struct mp_codec_params *adaptive_codec(lavf_priv_t *p,const struct demuxe_prepared_packet *packet)
{
    const AVCodecParameters *cp=demuxe_packet_codec(packet);
    if(!cp)return NULL;
    for(int i=0;i<p->adaptive_codecs_count;i++){
        struct mp_codec_params *codec=p->adaptive_codecs[i];AVCodecParameters *old=codec->lav_codecpar;
        if(old->codec_id==cp->codec_id&&old->width==cp->width&&old->height==cp->height&&
           old->format==cp->format&&old->profile==cp->profile&&old->level==cp->level&&
           old->color_range==cp->color_range&&old->color_primaries==cp->color_primaries&&
           old->color_trc==cp->color_trc&&old->color_space==cp->color_space&&
           old->chroma_location==cp->chroma_location&&old->field_order==cp->field_order&&
           old->sample_aspect_ratio.num==cp->sample_aspect_ratio.num&&old->sample_aspect_ratio.den==cp->sample_aspect_ratio.den&&
           adaptive_side_data_equal(old,cp)&&
           old->extradata_size==cp->extradata_size&&(!cp->extradata_size||!memcmp(old->extradata,cp->extradata,cp->extradata_size))&&
           codec->native_tb_num==packet->timebase.num&&codec->native_tb_den==packet->timebase.den)return codec;
    }
    size_t cost=demuxe_codec_bytes(cp);
    if(p->adaptive_codecs_count==64||cost>4*1024*1024-p->adaptive_codec_bytes)return NULL;
    struct mp_codec_params *codec=talloc_zero(p,struct mp_codec_params);
    codec->type=STREAM_VIDEO;codec->codec=mp_codec_from_av_codec_id(cp->codec_id);codec->codec_tag=cp->codec_tag;
    codec->lav_codecpar=avcodec_parameters_alloc();
    if(!codec->lav_codecpar||avcodec_parameters_copy(codec->lav_codecpar,cp)<0){avcodec_parameters_free(&codec->lav_codecpar);talloc_free(codec);return NULL;}
    codec->native_tb_num=packet->timebase.num;codec->native_tb_den=packet->timebase.den;
    codec->disp_w=cp->width;codec->disp_h=cp->height;codec->par_w=cp->sample_aspect_ratio.num;codec->par_h=cp->sample_aspect_ratio.den;
    codec->fps=av_q2d(p->avfc->streams[p->adaptive_logical]->avg_frame_rate);
    codec->format_name=talloc_strdup(codec,av_get_pix_fmt_name(cp->format));
    p->adaptive_codecs[p->adaptive_codecs_count++]=codec;p->adaptive_codec_bytes+=cost;
    return codec;
}
