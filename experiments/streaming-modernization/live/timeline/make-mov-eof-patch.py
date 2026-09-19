#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Honor strict error recognition when a declared MOV sample has no payload."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args()
f=a.source/'libavformat/mov.c';old=f.read_text();new=old
before='''            } else if (ret64 < 0) {
                return (int)ret64;
            }
            return AVERROR_INVALIDDATA;'''
after='''            } else if (ret64 < 0) {
                if (ret64 == AVERROR_EOF &&
                    (s->error_recognition & AV_EF_EXPLODE))
                    return AVERROR_INVALIDDATA;
                return (int)ret64;
            }
            return AVERROR_INVALIDDATA;'''
assert new.count(before)==1;new=new.replace(before,after)
before='''            ret = av_get_packet(sc->pb, pkt, sample->size);
        if (ret < 0) {
            if (should_retry(sc->pb, ret)) {
                mov_current_sample_dec(sc);
            }
            return ret;
        }'''
after='''            ret = av_get_packet(sc->pb, pkt, sample->size);
        if (ret < 0) {
            if (should_retry(sc->pb, ret)) {
                mov_current_sample_dec(sc);
            }
            // A sample exists in the index: EOF while reading its payload is
            // truncation, not the no-more-samples EOF above.
            if (ret == AVERROR_EOF && (s->error_recognition & AV_EF_EXPLODE))
                return AVERROR_INVALIDDATA;
            return ret;
        }'''
assert new.count(before)==1;new=new.replace(before,after)
patch=''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/libavformat/mov.c',tofile='b/libavformat/mov.c'))
with a.output.open('x') as out:out.write(patch)
a.output.with_suffix('.inputs.json').write_text(json.dumps({str(f):hashlib.sha256(f.read_bytes()).hexdigest(),str(Path(__file__)):hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},indent=2)+'\n')
