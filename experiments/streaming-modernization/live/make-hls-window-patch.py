#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Add a native HLS window observation seam; does not enable adaptive live playback."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--components',action='store_true',help='Experimental audio/subtitle plans');p.add_argument('--plans',action='store_true',help='Add experimental live plan/refresh seam');p.add_argument('--source',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args();a.plans=a.plans or a.components
here=Path(__file__).resolve().parent;changes={};inputs={}
def replace(s,old,new):
    assert s.count(old)==1,old
    return s.replace(old,new)
for name in ['libavformat/hls.c','libavformat/demuxe.h']:
    old=(a.source/name).read_text();s=old;inputs[name]=hashlib.sha256(old.encode()).hexdigest()
    if name.endswith('demuxe.h'):
        s=replace(s,'#endif', '''#define AV_DEMUXE_WINDOW_ABI 1
struct AVDemuxeWindow {
    int abi, live, complete, known;
    int64_t first_sequence, last_sequence, start_us, end_us;
    uint64_t revision;
};
int av_demuxe_hls_window(AVFormatContext *, int, struct AVDemuxeWindow *);
#endif''')
        if a.plans:s=s.replace('#endif','int av_demuxe_hls_refresh(AVFormatContext *, int);\n#endif')
        if a.components:s=s.replace('#endif','int av_demuxe_hls_component(AVFormatContext *, int, struct AVDemuxeRepresentation *);\nint av_demuxe_hls_handoff(AVFormatContext *);\n#endif')
    else:
        s=replace(s,'    int64_t timestamp_offset;','    int64_t timestamp_offset;\n    int64_t demuxe_first_dts;')
        s=replace(s,'                seg->timestamp_offset = AV_NOPTS_VALUE;','                seg->timestamp_offset = AV_NOPTS_VALUE;\n                seg->demuxe_first_dts = AV_NOPTS_VALUE;')
        s=replace(s,'if (!pls->finished || !current_segment(pls)->init_section ||','if (!current_segment(pls)->init_section ||')
        s=replace(s,'    int64_t ts_offset;','    int64_t ts_offset;\n    int64_t demuxe_window_start;\n    uint64_t demuxe_window_revision;')
        s=replace(s,'    pls->ts_offset = AV_NOPTS_VALUE;','    pls->ts_offset = AV_NOPTS_VALUE;\n    pls->demuxe_window_start = AV_NOPTS_VALUE;')
        s=replace(s,'    if (prev_segments) {', '''    if (pls && c->demuxe_sparse) {
        if (pls->demuxe_window_revision == UINT64_MAX) {free_segment_dynarray(prev_segments,prev_n_segments);av_freep(&prev_segments);ret=AVERROR_INVALIDDATA;goto fail;}
        pls->demuxe_window_revision++;
    }
    if (prev_segments) {
        if (c->demuxe_sparse) {
            int64_t diff=pls->start_seq_no-prev_start_seq_no;
            if (diff<0 || diff>prev_n_segments) {
                // A gap without retained overlap needs a new packet anchor.
                pls->demuxe_window_start=AV_NOPTS_VALUE;
            } else if (pls->demuxe_window_start!=AV_NOPTS_VALUE) {
                for(int64_t i=0;i<diff;i++) {
                    int64_t duration=prev_segments[i]->duration;
                    if(duration<=0||pls->demuxe_window_start>INT64_MAX-duration) {
                        pls->demuxe_window_start=AV_NOPTS_VALUE;break;
                    }
                    pls->demuxe_window_start+=duration;
                }
            }
            // Buffered packets still refer to the original concatenated AVIO
            // positions. Preserve those positions for retained window entries.
            for(int i=0;i<pls->n_segments;i++) {
                int64_t prior=diff+i;
                if(prior<0||prior>=prev_n_segments)continue;
                struct segment *before=prev_segments[prior],*after=pls->segments[i];
                if(before->duration!=after->duration||strcmp(before->url,after->url)) {
                    pls->demuxe_window_start=AV_NOPTS_VALUE;continue;
                }
                after->byte_start=before->byte_start;after->byte_end=before->byte_end;after->demuxe_first_dts=before->demuxe_first_dts;
            }
        }''')
        marker='''                /* Packet positions, not the current read-ahead segment, own'''
        s=replace(s,marker,'''                if(c->demuxe_sparse && pls->n_segments<=10000 &&
                   pls->pkt->pos>=0 && pls->pkt->dts!=AV_NOPTS_VALUE) {
                    int64_t elapsed=0;
                    for(int i=0;i<pls->n_segments;i++) {
                        struct segment *part=pls->segments[i];
                        if(part->byte_start>=0 && pls->pkt->pos>=part->byte_start && pls->pkt->pos<part->byte_end) {
                            if(part->demuxe_first_dts==AV_NOPTS_VALUE)
                                part->demuxe_first_dts=av_rescale_q(pls->pkt->dts,get_timebase(pls),AV_TIME_BASE_Q);
                            int64_t stamp=part->demuxe_first_dts;
                            if(pls->demuxe_window_start==AV_NOPTS_VALUE && stamp>=INT64_MIN+elapsed)
                                pls->demuxe_window_start=stamp-elapsed;
                            break;
                        }
                        if(part->duration<=0||elapsed>INT64_MAX-part->duration)break;
                        elapsed+=part->duration;
                    }
                }

'''+marker)
        if a.plans:
            before=(here.parent/'integration/plan/hls.inc').read_text()
            snippet=here/('hls-component-plan.inc' if a.components else 'hls-plan.inc');s=replace(s,before,snippet.read_text());inputs[snippet.name]=hashlib.sha256(snippet.read_bytes()).hexdigest()
            snippet=here/('hls-component-refresh.inc' if a.components else 'hls-refresh.inc');s+='\n'+snippet.read_text();inputs[snippet.name]=hashlib.sha256(snippet.read_bytes()).hexdigest()
        snippet=here/'hls-window.inc';s+='\n'+snippet.read_text();inputs['hls-window.inc']=hashlib.sha256(snippet.read_bytes()).hexdigest()
    changes[name]=(old,s)
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name,tofile='b/'+name)) for name,(old,new) in changes.items())
with a.output.open('x')as f:f.write(patch)
with a.output.with_suffix('.inputs.json').open('x')as f:json.dump(inputs,f,indent=2);f.write('\n')
