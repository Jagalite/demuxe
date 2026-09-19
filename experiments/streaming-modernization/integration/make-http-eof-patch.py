#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Preserve genuine chunked EOF and reject incomplete chunks in native FFmpeg HTTP.

Wasm production networking uses browser AVIO, not FFmpeg's HTTP protocol. This
patch keeps native upstream characterization honest under the same strict EOF
requirements; it does not stand in for browser transport qualification.
"""
import argparse
import difflib
import hashlib
import json
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--source', required=True, type=Path)
p.add_argument('--output', required=True, type=Path)
a = p.parse_args()
old = (a.source/'libavformat/http.c').read_text()
s = old


def replace(before, after):
    global s
    assert s.count(before) == 1, before
    s = s.replace(before, after, 1)


replace('''                if ((err = http_get_line(s, line, sizeof(line))) < 0)
                    return err;''', '''                if ((err = http_get_line(s, line, sizeof(line))) < 0)
                    return err == AVERROR_EOF ? AVERROR(EIO) : err;''')
replace('''                av_log(h, AV_LOG_DEBUG, "Last chunk received, closing conn\\n");
                ffurl_closep(&s->hd);''', '''                av_log(h, AV_LOG_DEBUG, "Last chunk received, closing conn\\n");
                s->chunkend = 1;
                ffurl_closep(&s->hd);''')
replace('''    if (!s->hd)
        return s->off < s->filesize ? AVERROR(EIO) : AVERROR_EOF;''', '''    if (!s->hd)
        return s->chunkend || s->off >= s->filesize ? AVERROR_EOF : AVERROR(EIO);''')
replace('''        len = ffurl_read(s->hd, buf, size);
        if ((!len || len == AVERROR_EOF) &&''', '''        len = ffurl_read(s->hd, buf, size);
        if ((!len || len == AVERROR_EOF) && s->chunksize != UINT64_MAX && s->chunksize)
            return AVERROR(EIO);
        if ((!len || len == AVERROR_EOF) &&''')
with a.output.open('x') as f:
    f.writelines(difflib.unified_diff(old.splitlines(True), s.splitlines(True),
                 fromfile='a/libavformat/http.c', tofile='b/libavformat/http.c'))
with a.output.with_suffix('.inputs.json').open('x') as f:
    json.dump({'libavformat/http.c': hashlib.sha256(old.encode()).hexdigest(),
               'generator': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}, f, indent=2)
