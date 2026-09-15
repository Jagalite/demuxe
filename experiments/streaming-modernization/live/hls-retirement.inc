/* Retire validator records only after the authoritative manifest owner drops
 * every reference to a resource. Open AVIO handles retain their own validators.
 * An allocation failure keeps old identities; it never weakens consistency. */
static int demuxe_resource_compare(const void *a,const void *b){return strcmp(a,b);}
static void demuxe_retire_segments(HLSContext *c,struct segment **old,int count)
{
    if(!c->demuxe_retire)return;
    struct AVTreeNode *root=NULL,*node=NULL;
    for(int p=0;p<c->n_playlists;p++)for(int i=0;i<c->playlists[p]->n_segments;i++){
        struct segment *seg=c->playlists[p]->segments[i];
        const char *urls[]={seg->url,seg->init_section?seg->init_section->url:NULL};
        for(int k=0;k<2;k++)if(urls[k]){
            if(!node && !(node=av_tree_node_alloc()))goto done;
            av_tree_insert(&root,(void*)urls[k],demuxe_resource_compare,&node);
        }
    }
    for(int i=0;i<count;i++){
        const char *urls[]={old[i]->url,old[i]->init_section?old[i]->init_section->url:NULL};
        for(int k=0;k<2;k++)if(urls[k]&&!av_tree_find(root,urls[k],demuxe_resource_compare,NULL))
            c->demuxe_retire(c->demuxe_retire_opaque,urls[k]);
    }
done:
    av_free(node);av_tree_destroy(root);
}
