#!/usr/bin/env python3
"""Bound fMP4 rendition discovery to initialization, not unselected media.

An opt-in FFmpeg seam, generated separately from the switching baseline. Native
and browser qualification are required before this enters the integration profile.
"""
import argparse
import difflib
import hashlib
import json
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--source', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
a = p.parse_args()


def replace(s, old, new):
    assert s.count(old) == 1, old
    return s.replace(old, new, 1)


changes = {}
for name in ['hls.c', 'dashdec.c']:
    old = (a.source / 'libavformat' / name).read_text()
    s = replace(old, '    int strict_io;', '    int strict_io;\n    int demuxe_sparse;')
    s = replace(s, '    uint8_t *init_sec_buf;', '    int demuxe_init_only;\n    uint8_t *init_sec_buf;')
    marker = '    {"strict_io",'
    s = replace(s, marker,
                '    {"demuxe_sparse", "Private bounded fMP4 initialization discovery",\n'
                '        OFFSET(demuxe_sparse), AV_OPT_TYPE_BOOL, {.i64 = 0}, 0, 1, FLAGS},\n' + marker)
    # The old paths copied the beginning again if init data was consumed with
    # several short reads. Keep their own offset authoritative.
    s = s.replace('memcpy(buf, v->init_sec_buf, copy_size);',
                  'memcpy(buf, v->init_sec_buf + v->init_sec_buf_read_offset, copy_size);')
    # Inspect only complete initialization data. A limit is not successful EOF.
    # av_fast_malloc may reserve more than requested; that capacity is not a
    # license to download additional bytes beyond the explicit input budget.
    begin = s.index('static int update_init_section(')
    end = s.index('\nstatic ', begin + 1)
    part = s[begin:end]
    part = replace(part, '    int64_t sec_size;', '    int64_t sec_size;\n    int unknown_size = 0;')
    part = replace(part, '    else\n        sec_size = max_init_section_size;',
                   '    else {\n        sec_size = max_init_section_size;\n        unknown_size = 1;\n    }')
    part = replace(part, '    sec_size = FFMIN(sec_size, max_init_section_size);',
                   '    if (sec_size > max_init_section_size) return AVERROR(ENOBUFS);\n'
                   '    int wanted = sec_size + unknown_size;')
    part = replace(part, 'av_fast_malloc(&pls->init_sec_buf, &pls->init_sec_buf_size, sec_size);',
                   'av_fast_malloc(&pls->init_sec_buf, &pls->init_sec_buf_size, wanted);\n'
                   '    if (!pls->init_sec_buf) return AVERROR(ENOMEM);')
    part = replace(part, '                        pls->init_sec_buf_size);',
                   '                        wanted);\n'
                   '    av_log(pls->parent, AV_LOG_TRACE, "Demuxe init read: wanted=%d got=%d unknown=%d error=%d\\n", wanted, ret, unknown_size, pls->input->error);\n'
                   '    if (ret > max_init_section_size) ret = AVERROR(ENOBUFS);\n'
                   '    if (!unknown_size && ret >= 0 && ret < sec_size) ret = AVERROR_INVALIDDATA;')
    s = s[:begin] + part + s[end:]
    if name == 'hls.c':
        marker = '    /* Open the demuxer for each playlist */'
        s = replace(s, marker, '''    // Header discovery is finite and bounded. All selected audio/subtitle
    // handling remains upstream; unselected video initialization is inspected
    // without opening its media segments. Codec headers remain real, not hints.
    struct playlist *demuxe_initial = NULL;
    if (c->demuxe_sparse) {
        if (c->n_variants > 16 || c->n_playlists > 32)
            return AVERROR(ENOBUFS);
        int lowest = 0;
        for (int n = 1; n < c->n_variants; n++)
            if (c->variants[n]->bandwidth < c->variants[lowest]->bandwidth)
                lowest = n;
        demuxe_initial = c->variants[lowest]->playlists[0];
    }
''' + marker)
        begin = s.index('static int hls_read_header(')
        end = s.index('static int recheck_discard_flags(', begin)
        part = s[begin:end]
        marker = '        pls->parent = s;'
        part = replace(part, marker, marker + '''
        if (c->demuxe_sparse && pls != demuxe_initial) {
            for (int n = 0; n < c->n_variants; n++) {
                if (c->variants[n]->playlists[0] != pls) continue;
                if (!pls->finished || !current_segment(pls)->init_section ||
                    current_segment(pls)->key_type != KEY_NONE)
                    return AVERROR(ENOSYS);
                pls->demuxe_init_only = 1;
            }
        }
''')
        marker = '        add_metadata_from_renditions(s, pls, AVMEDIA_TYPE_AUDIO);'
        part = replace(part, marker, '''        if (pls->demuxe_init_only) {
            if (pls->n_main_streams != 1 ||
                pls->main_streams[0]->codecpar->codec_type != AVMEDIA_TYPE_VIDEO)
                return AVERROR(ENOSYS);
            pls->main_streams[0]->discard = AVDISCARD_ALL;
            pls->needed = 0;
            pls->demuxe_init_only = 0;
            avformat_flush(pls->ctx);
            pls->pb.pub.eof_reached = 0;
            pls->pb.pub.error = 0;
        }
''' + marker)
        s = s[:begin] + part + s[end:]
        marker = '    int segment_retries = 0;\n    struct segment *seg;'
        s = replace(s, marker, marker + '''

    if (v->demuxe_init_only) {
        ret = update_init_section(v, current_segment(v));
        if (ret < 0) return ret;
        int amount = FFMIN(v->init_sec_data_len - v->init_sec_buf_read_offset, buf_size);
        if (!amount) return AVERROR_EOF;
        memcpy(buf, v->init_sec_buf + v->init_sec_buf_read_offset, amount);
        v->init_sec_buf_read_offset += amount;
        return amount;
    }
''')
    else:
        marker = '    /* Open the demuxer for video and audio components if available */'
        s = replace(s, marker, '''    int demuxe_initial = 0;
    if (c->demuxe_sparse) {
        if (c->n_videos > 16 || c->n_videos + c->n_audios + c->n_subtitles > 32)
            return AVERROR(ENOBUFS);
        for (int n = 1; n < c->n_videos; n++)
            if (c->videos[n]->bandwidth < c->videos[demuxe_initial]->bandwidth)
                demuxe_initial = n;
    }
''' + marker)
        marker = '    for (i = 0; i < c->n_videos; i++) {\n        rep = c->videos[i];\n        if (i > 0'
        s = replace(s, marker, '''    for (i = 0; i < c->n_videos; i++) {
        rep = c->videos[i];
        if (c->demuxe_sparse && i != demuxe_initial) {
            if (c->is_live || !rep->init_section || rep->demuxe_protected)
                return AVERROR(ENOSYS);
            rep->demuxe_init_only = 1;
        }
        if (i > 0''')
        marker = 'static int read_data(void *opaque, uint8_t *buf, int buf_size)'
        begin = s.index(marker)
        end = s.index('static int nested_io_open(', begin)
        part = s[begin:end]
        marker = '    DASHContext *c = v->parent->priv_data;'
        part = replace(part, marker, marker + '''
    if (v->demuxe_init_only) {
        ret = update_init_section(v);
        if (ret < 0) return ret;
        int amount = FFMIN(v->init_sec_data_len - v->init_sec_buf_read_offset, buf_size);
        if (!amount) return AVERROR_EOF;
        memcpy(buf, v->init_sec_buf + v->init_sec_buf_read_offset, amount);
        v->init_sec_buf_read_offset += amount;
        return amount;
    }
''')
        s = s[:begin] + part + s[end:]
        s = replace(s, '    if (pls->n_fragments) {\n#if FF_API_R_FRAME_RATE',
                    '    if (pls->n_fragments && !pls->demuxe_init_only) {\n#if FF_API_R_FRAME_RATE')
        marker = '        st->id = i + pls->stream_index;'
        s = replace(s, marker, marker + '\n        if (pls->demuxe_init_only) st->discard = AVDISCARD_ALL;')
        # Clear the header-only flag once all parent streams are attached.
        # The normal discard/reopen path can later select a deferred stream.
        marker = '    /* Create stream groups if needed */'
        s = replace(s, marker, '''    for (int n = 0; n < c->n_videos; n++) {
        if (c->videos[n]->demuxe_init_only &&
            (c->videos[n]->nb_assoc_stream != 1 ||
             c->videos[n]->assoc_stream[0]->codecpar->codec_type != AVMEDIA_TYPE_VIDEO))
            return AVERROR(ENOSYS);
        c->videos[n]->demuxe_init_only = 0;
    }
''' + marker)
    changes['libavformat/' + name] = old, s

patch = ''.join(''.join(difflib.unified_diff(old.splitlines(True), new.splitlines(True),
                fromfile='a/' + name, tofile='b/' + name)) for name, (old, new) in changes.items())
with a.output.open('x') as f:
    f.write(patch)
with a.output.with_suffix('.inputs.json').open('x') as f:
    json.dump({name: hashlib.sha256(old.encode()).hexdigest() for name, (old, _) in changes.items()}, f, indent=2)
