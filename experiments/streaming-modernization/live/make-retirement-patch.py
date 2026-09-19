#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native manifest-owned resource retirement; no browser timeline inference."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();here=Path(__file__).resolve().parent
changes={}
def once(s,old,new):assert s.count(old)==1,old;return s.replace(old,new,1)
name='libavformat/hls.c';old=(a.source/name).read_text();s=once(old,'#include "libavutil/time.h"','#include "libavutil/time.h"\n#include "libavutil/tree.h"')
s=once(s,'    int http_seekable;','    int http_seekable;\n    void (*demuxe_retire)(void *,const char *);\n    void *demuxe_retire_opaque;')
pos=s.index('static int parse_playlist(');s=s[:pos]+(here/'hls-retirement.inc').read_text()+'\n'+s[pos:]
s=once(s,'        free_segment_dynarray(prev_segments, prev_n_segments);','        demuxe_retire_segments(c,prev_segments,prev_n_segments);\n        free_segment_dynarray(prev_segments, prev_n_segments);')
s+='''\nint av_demuxe_hls_retirement(AVFormatContext *s,void (*callback)(void *,const char *),void *opaque)
{
    if(!s||!s->iformat||strcmp(s->iformat->name,"hls"))return AVERROR(EINVAL);
    HLSContext *c=s->priv_data;c->demuxe_retire=callback;c->demuxe_retire_opaque=opaque;return 0;
}
''';changes[name]=(old,s)
name='libavformat/demuxe.h';old=(a.source/name).read_text();s=once(old,'#endif','int av_demuxe_hls_retirement(AVFormatContext *,void (*)(void *,const char *),void *);\n#endif');changes[name]=(old,s)
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name,tofile='b/'+name))for name,(old,new)in changes.items())
with a.output.open('x')as f:f.write(patch)
inputs={str(a.source/name):hashlib.sha256(old.encode()).hexdigest()for name,(old,_)in changes.items()};inputs[str(here/'hls-retirement.inc')]=hashlib.sha256((here/'hls-retirement.inc').read_bytes()).hexdigest();inputs[str(Path(__file__))]=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
a.output.with_suffix('.inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
