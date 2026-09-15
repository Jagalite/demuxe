#!/usr/bin/env python3
"""Expose the same qualified HLS anchor to window discovery and segment planning."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
file=a.source/'libavformat/hls.c';old=file.read_text();needle='    if(p->demuxe_window_start==AV_NOPTS_VALUE)return 0;';assert old.count(needle)==1
new=old.replace(needle,'''    if(p->demuxe_window_start==AV_NOPTS_VALUE){
        // A pending rendition may not have been reloaded while paused. Window
        // admission must use the same packet-established, overlap-checked
        // anchor inheritance as segment planning; it must not reject first.
        int64_t start;
        int ret=demuxe_hls_anchor(s,p,&start);
        if(ret==AVERROR(EAGAIN))return 0;
        if(ret<0)return ret;
    }''')
needle='''    HLSContext *c = s->priv_data;
    struct playlist *p = demuxe_hls_playlist(s, stream);
    int64_t start = c->first_timestamp == AV_NOPTS_VALUE ? 0 : c->first_timestamp;
    if(!p->finished){
        ret=demuxe_hls_anchor(s,p,&start);if(ret<0)return ret;
        if(sequence>=0 && sequence<p->start_seq_no)return AVERROR(ERANGE);
        if(sequence<0 && target_us<start)return AVERROR(ERANGE);
    }'''
assert new.count(needle)==1
new=new.replace(needle,'''    struct playlist *p = demuxe_hls_playlist(s, stream);
    // ENDLIST changes completeness, not the accepted presentation origin.
    // Finite and rolling plans must use the same window anchor as seeking.
    int64_t start;
    ret=demuxe_hls_anchor(s,p,&start);if(ret<0)return ret;
    if(sequence>=0 && sequence<p->start_seq_no)return AVERROR(ERANGE);
    if(sequence<0 && target_us<start)return AVERROR(ERANGE);''')
needle='        int64_t overlap=FFMAX(p->start_seq_no,r->start_seq_no);'
assert new.count(needle)==1
new=new.replace(needle,'''        // Complete associated VOD subtitles may use much longer segments than
        // video. Both retained playlists start at the presentation beginning;
        // that shared origin does not require identical segment boundaries.
        // Never apply this to a rolling or truncated presentation window.
        if(p->main_streams[0]->codecpar->codec_type==AVMEDIA_TYPE_SUBTITLE&&
           p->finished&&r->finished&&p->start_seq_no==0&&r->start_seq_no==0&&
           p->n_segments>0&&r->n_segments>0&&
           p->segments[0]->demuxe_period==r->segments[0]->demuxe_period){
            *start=r->demuxe_window_start;p->demuxe_window_start=*start;return 0;
        }
'''+needle)
patch=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/libavformat/hls.c',tofile='b/libavformat/hls.c'))
with a.output.open('x')as f:f.write(patch)
a.output.with_suffix('.inputs.json').write_text(json.dumps({str(file):hashlib.sha256(old.encode()).hexdigest(),str(Path(__file__)):hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n')
