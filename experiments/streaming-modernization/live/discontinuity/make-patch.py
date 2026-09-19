#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Attach HLS discontinuity identities to copied native segment plans."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();changes={}
def once(s,old,new):assert s.count(old)==1,old;return s.replace(old,new,1)
name='libavformat/hls.c';old=(a.source/name).read_text();s=once(old,'    int period_start;','    int period_start;\n    uint64_t demuxe_period;')
s=once(s,'    int period_start = 0, discontinuity = 0;', '    int period_start = 0, discontinuity = 0;\n    uint64_t demuxe_period = 0;int demuxe_period_tag_seen=0,demuxe_discontinuity_seen=0;')
s=once(s,'        } else if (!strcmp(line, "#EXT-X-DISCONTINUITY")) {\n            discontinuity = 1;', '''        } else if (av_strstart(line,"#EXT-X-DISCONTINUITY-SEQUENCE:",&ptr)) {
            if(!*ptr||demuxe_period_tag_seen||demuxe_discontinuity_seen){ret=AVERROR_INVALIDDATA;goto fail;}
            demuxe_period_tag_seen=1;
            uint64_t value=0;
            for(const char *digit=ptr;*digit;digit++){
                if(*digit<'0'||*digit>'9'||value>(INT64_MAX-(*digit-'0'))/10){ret=AVERROR_INVALIDDATA;goto fail;}
                value=value*10+(*digit-'0');
            }
            if(pls&&pls->n_segments){ret=AVERROR_INVALIDDATA;goto fail;}
            demuxe_period=value;
        } else if (!strcmp(line, "#EXT-X-DISCONTINUITY")) {
            if(demuxe_period==INT64_MAX){ret=AVERROR_INVALIDDATA;goto fail;}
            demuxe_period++;demuxe_discontinuity_seen=1;discontinuity = 1;''')
s=once(s,'                seg->period_start = period_start;', '                seg->period_start = period_start;\n                seg->demuxe_period = demuxe_period;')
s=once(s,'if(before->duration!=after->duration||strcmp(before->url,after->url))', 'if(before->duration!=after->duration||before->demuxe_period!=after->demuxe_period||strcmp(before->url,after->url))')
s=once(s,' || (!p->finished && p->segments[i]->period_start)', '')
s=once(s,'a->duration!=b->duration||a->period_start||b->period_start','a->duration!=b->duration||a->demuxe_period!=b->demuxe_period')
s=once(s,'            av_strlcpy(out->url,seg->url,sizeof(out->url));', '''            out->timeline_mapping=1;out->timeline_id=seg->demuxe_period;
            out->timeline_start_us=start;
            out->presentation_start_us=out->presentation_end_us=AV_NOPTS_VALUE;
            // Bounds are known only when a retained marker identifies them.
            // No guessed boundary is introduced when a live marker has expired.
            int64_t boundary=start;
            for(int j=i;j>0;j--){
                if(p->segments[j-1]->demuxe_period!=seg->demuxe_period){out->presentation_start_us=boundary;break;}
                if(p->segments[j-1]->duration<=0||boundary<INT64_MIN+p->segments[j-1]->duration)return AVERROR_INVALIDDATA;
                boundary-=p->segments[j-1]->duration;
            }
            boundary=start;
            for(int j=i;j<p->n_segments;j++){
                if(p->segments[j]->demuxe_period!=seg->demuxe_period){out->presentation_end_us=boundary;break;}
                if(p->segments[j]->duration<=0||boundary>INT64_MAX-p->segments[j]->duration)return AVERROR_INVALIDDATA;
                boundary+=p->segments[j]->duration;
            }
            av_strlcpy(out->url,seg->url,sizeof(out->url));''')
s=once(s,'    void *demuxe_retire_opaque;', '    void *demuxe_retire_opaque;\n    int demuxe_handoff;')
s=once(s,'static int demuxe_resource_compare', """static void demuxe_prune_init_sections(struct playlist *p){
    int kept=0;
    for(int i=0;i<p->n_init_sections;i++){
        struct segment *init=p->init_sections[i];int used=0;
        for(int j=0;j<p->n_segments;j++)if(p->segments[j]->init_section==init){used=1;break;}
        if(used)p->init_sections[kept++]=init;
        else{av_free(init->key);av_free(init->url);av_free(init);}
    }
    p->n_init_sections=kept;p->cur_init_section=NULL;
}
static int demuxe_resource_compare""")
s=once(s,'    if (pls)\n        pls->last_load_time', '    if(pls&&c->demuxe_handoff)demuxe_prune_init_sections(pls);\n    if (pls)\n        pls->last_load_time')
s=once(s,'    avformat_flush(s);return 0;','    avformat_flush(s);c->demuxe_handoff=1;\n    for(int i=0;i<c->n_playlists;i++)demuxe_prune_init_sections(c->playlists[i]);\n    return 0;')
changes[name]=(old,s)
name='libavformat/demuxe.h' ;old=(a.source/name).read_text();s=once(old,'#define AV_DEMUXE_PLAN_ABI 2','#define AV_DEMUXE_PLAN_ABI 3');s=once(s,'    int64_t timestamp_offset_us,presentation_start_us,presentation_end_us;', '    int64_t timestamp_offset_us,presentation_start_us,presentation_end_us;\n    uint64_t timeline_id;\n    int timeline_mapping;\n    int64_t timeline_start_us;');changes[name]=(old,s)
name='libavformat/dashdec.c';old=(a.source/name).read_text();s=once(old,'#include "demuxe.h"','#include "demuxe.h"\n#include "libavutil/tree.h"')
s=once(s,'    uint64_t demuxe_revision;', '    uint64_t demuxe_revision;\n    void (*demuxe_retire)(void *,const char *);\n    void *demuxe_retire_opaque;')
s=once(s,'static void demuxe_dash_release_tables(DASHContext *c)',(Path(__file__).parent/'dash-retirement.inc').read_text()+'\nstatic void demuxe_dash_release_tables(DASHContext *c)')
s=once(s,'    if(r>=0&&next.demuxe_revision==UINT64_MAX)r=AVERROR(ENOBUFS);','    if(r>=0&&next.demuxe_revision==UINT64_MAX)r=AVERROR(ENOBUFS);\n    if(r>=0)r=demuxe_dash_retire_catalog(c,&next);')
s=once(s,'avio_read_to_bprint(in, &buf, SIZE_MAX)','avio_read_to_bprint(in, &buf, c->demuxe_sparse ? 4*1024*1024 : SIZE_MAX)')
changes[name]=(old,s)
name='libavformat/demuxe.h' ;old,s=changes[name];s=once(s,'#endif','int av_demuxe_dash_retirement(AVFormatContext *,void (*)(void*,const char*),void*);\n#endif');changes[name]=(old,s)
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name,tofile='b/'+name))for name,(old,new)in changes.items())
with a.output.open('x')as f:f.write(patch)
inputs={str(a.source/n):hashlib.sha256(old.encode()).hexdigest()for n,(old,_)in changes.items()}
for f in [Path(__file__),Path(__file__).parent/'dash-retirement.inc']:inputs[str(f)]=hashlib.sha256(f.read_bytes()).hexdigest()
a.output.with_suffix('.inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
