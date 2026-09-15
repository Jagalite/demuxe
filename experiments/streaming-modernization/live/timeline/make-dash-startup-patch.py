#!/usr/bin/env python3
"""Keep integrated DASH discovery away from the expiring oldest live segment."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
f=a.source/'libavformat/dashdec.c';old=f.read_text()
before='            start_time_offset = get_segment_start_time_based_on_timeline(pls, 0xFFFFFFFF) - 60 * pls->fragment_timescale; // 60 seconds before end'
after='''            // Sparse browser discovery precedes the integrated demux handoff.
            // Its selected video/audio probe must use the same six-second live
            // headroom as that owner, not an expiring oldest DVR segment.
            // Keep upstream compatibility discovery unchanged.
            int64_t headroom = c->demuxe_sparse ? 6 : 60;
            start_time_offset = get_segment_start_time_based_on_timeline(pls, 0xFFFFFFFF) - headroom * pls->fragment_timescale;'''
assert old.count(before)==1;new=old.replace(before,after)
# The upstream helper returns the first start strictly after the target. Sparse
# discovery needs the containing random-access segment, matching the coordinator.
before='            num = calc_next_seg_no_from_timelines(pls, start_time_offset);'
after=before+'\n            if (c->demuxe_sparse && num > pls->first_seq_no)\n                num--;'
assert new.count(before)==1;new=new.replace(before,after)

patch=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/libavformat/dashdec.c',tofile='b/libavformat/dashdec.c'))
with a.output.open('x') as out:out.write(patch)
a.output.with_suffix('.inputs.json').write_text(json.dumps({str(f):hashlib.sha256(f.read_bytes()).hexdigest(),str(Path(__file__)):hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n')
