// SPDX-License-Identifier: GPL-3.0-or-later
/* Bounded URL identity sets are computed from native catalog plans, without
 * fetching or probing unselected representations. A refresh failure retains
 * the old catalog and its validators. Callback ownership stays source-scoped. */
static int demuxe_dash_url_compare(const void *a,const void *b){return strcmp(a,b);}
static int demuxe_dash_url_free(void *opaque,void *element){av_free(element);return 0;}
static void demuxe_dash_urls_free(struct AVTreeNode *root){av_tree_enumerate(root,NULL,NULL,demuxe_dash_url_free);av_tree_destroy(root);}
static int demuxe_dash_url_add(struct AVTreeNode **root,size_t *bytes,const char *url){
    if(!url||!*url)return 0;
    if(av_tree_find(*root,url,demuxe_dash_url_compare,NULL))return 0;
    size_t size=strlen(url)+1+av_tree_node_size;
    if(size>1024*1024-*bytes)return AVERROR(ENOBUFS);
    char *copy=av_strdup(url);struct AVTreeNode *node=av_tree_node_alloc();
    if(!copy||!node){av_free(copy);av_free(node);return AVERROR(ENOMEM);}
    av_tree_insert(root,copy,demuxe_dash_url_compare,&node);
    if(node){av_free(node);av_free(copy);return AVERROR_BUG;}
    *bytes+=size;return 0;
}
static int demuxe_dash_catalog_urls(DASHContext *c,struct AVTreeNode **root){
    size_t bytes=0;unsigned segments=0;
    for(int period=0;period<c->demuxe_period_count;period++)for(int type=0;type<3;type++)for(int i=0;i<c->demuxe_periods[period].counts[type];i++){
        struct representation *p=c->demuxe_periods[period].lists[type][i];
        if(!p->url_template||p->n_timelines<=0)return AVERROR(ENOSYS);
        char absolute[AV_DEMUXE_URL_SIZE],relative[AV_DEMUXE_URL_SIZE];
        if(p->init_section){
            if(strlen(c->base_url)+strlen(p->init_section->url)>=sizeof(absolute))return AVERROR(ENOBUFS);
            ff_make_absolute_url(absolute,sizeof(absolute),c->base_url,p->init_section->url);
            int r=demuxe_dash_url_add(root,&bytes,absolute);if(r<0)return r;
        }
        int64_t number=p->first_seq_no,ticks=0;
        for(int j=0;j<p->n_timelines;j++){
            struct timeline *t=p->timelines[j];if(j==0||t->starttime>0)ticks=t->starttime;
            if(t->duration<=0||t->repeat<0||t->repeat>=8192)return AVERROR(ENOSYS);
            for(int64_t k=0;k<=t->repeat;k++){
                if(++segments>8192||ticks>INT64_MAX-t->duration||number==INT64_MAX)return AVERROR(ENOBUFS);
                ff_dash_fill_tmpl_params(relative,sizeof(relative),p->url_template,0,number++,0,ticks);
                if(strlen(c->base_url)+strlen(relative)>=sizeof(absolute))return AVERROR(ENOBUFS);
                ff_make_absolute_url(absolute,sizeof(absolute),c->base_url,relative);
                int r=demuxe_dash_url_add(root,&bytes,absolute);if(r<0)return r;
                ticks+=t->duration;
            }
        }
    }
    return 0;
}
struct demuxe_dash_retirement {DASHContext *old;struct AVTreeNode *current;};
static int demuxe_dash_retire_one(void *opaque,void *url){
    struct demuxe_dash_retirement *r=opaque;
    if(!av_tree_find(r->current,url,demuxe_dash_url_compare,NULL))r->old->demuxe_retire(r->old->demuxe_retire_opaque,url);
    return 0;
}
static int demuxe_dash_retire_catalog(DASHContext *old,DASHContext *next){
    if(!old->demuxe_retire)return 0;
    struct AVTreeNode *before=NULL,*after=NULL;
    int r=demuxe_dash_catalog_urls(old,&before);
    if(r>=0)r=demuxe_dash_catalog_urls(next,&after);
    if(r>=0){struct demuxe_dash_retirement ctx={old,after};av_tree_enumerate(before,&ctx,NULL,demuxe_dash_retire_one);}
    demuxe_dash_urls_free(before);demuxe_dash_urls_free(after);return r;
}
int av_demuxe_dash_retirement(AVFormatContext *s,void (*callback)(void*,const char*),void *opaque){
    if(av_demuxe_dash_period_count(s)<=0)return AVERROR(ENOSYS);
    DASHContext *c=s->priv_data;c->demuxe_retire=callback;c->demuxe_retire_opaque=opaque;return 0;
}
