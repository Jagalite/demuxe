#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Make an isolated copy of the generic mpv bridge with live ProRes extraction."""
from pathlib import Path
import sys

direct = len(sys.argv) == 2 and sys.argv[1] == "--direct"
if len(sys.argv) > 2 or (len(sys.argv) == 2 and not direct):
    raise SystemExit("usage: bridge.py [--direct]")

root = Path(__file__).resolve().parents[2]
source = (root / "native/vd_browser.c").read_text()

def replace(old, new):
    global source
    if source.count(old) != 1:
        raise RuntimeError(f"bridge anchor changed: {old[:80]!r}")
    source = source.replace(old, new, 1)

replace('#include "browser_decoder_bridge.h"',
        '#include "browser_decoder_bridge.h"\n'
        'extern const uint8_t *web_prores_capture(size_t *size);\n'
        'extern uint64_t web_prores_entropy_ns(void);\n'
        'extern uint64_t web_prores_serial_ns(void);\n'
        '/* In this Emscripten build CLOCK_THREAD_CPUTIME_ID is monotonic wall time. */\n'
        'static uint64_t live_cpu_ns(void) { struct timespec t; clock_gettime(CLOCK_THREAD_CPUTIME_ID,&t); '
        'return (uint64_t)t.tv_sec*1000000000ULL+t.tv_nsec; }\n'
        '#include <time.h>')
replace('bool retained_only, submitted_keyframe;',
        'bool retained_only, submitted_keyframe, live_prores, live_pending;\n'
        '    size_t live_capture_size; double live_timestamp, live_duration;\n'
        '    int live_cpu_us, live_entropy_us, live_serial_us, live_copy_us; '
        'int live_packet_bytes, live_packet_refcounted; int64_t live_packet_pts;')
replace('    AVPacket *copy=p->retained_only?NULL:av_packet_clone(p->packet);',
        '    if(p->live_prores){\n'
        '        if(p->live_pending){\n'
        '            if(p->packet->pts!=p->live_packet_pts)return AVERROR(EINVAL);\n'
        '            web_decoder.size=p->live_capture_size;web_decoder.key=p->live_copy_us;\n'
        '            web_decoder.timestamp=p->live_timestamp;web_decoder.duration=p->live_duration;\n'
        '            web_decoder.reserved[0]=p->live_cpu_us;\n'
        '            web_decoder.reserved[1]=p->live_entropy_us;\n'
        '            web_decoder.reserved[2]=p->live_serial_us;\n'
        '            web_decoder.format=p->live_packet_bytes;\n'
        '            web_decoder.primaries=p->live_packet_refcounted;\n'
        '            int retry=request(2);\n'
        '            if(retry>=0){p->live_pending=false;p->submitted_keyframe=true;}\n'
        '            else if(retry!=AVERROR(EAGAIN))fallback(f);\n'
        '            return retry;\n'
        '        }\n'
        '        uint64_t begin=live_cpu_ns();\n'
        '        int code=avcodec_send_packet(p->software,p->packet);\n'
        '        if(code<0){fallback(f);return code;}\n'
        '        code=avcodec_receive_frame(p->software,p->frame);\n'
        '        if(code<0){fallback(f);return code;}\n'
        '        av_frame_unref(p->frame);\n'
        '        size_t bytes=0;const uint8_t *capture=web_prores_capture(&bytes);\n'
        '        if(bytes<32||bytes>WEB_DEC_PACKET_MAX){fallback(f);return AVERROR(EIO);}\n'
        '        uint64_t extraction_ns=live_cpu_ns()-begin;\n'
        '        web_decoder.size=bytes;web_decoder.key=0;\n'
        '        web_decoder.timestamp=av_rescale_q(p->packet->pts,p->timebase,(AVRational){1,1000000});\n'
        '        web_decoder.duration=p->packet->duration>0?av_rescale_q(p->packet->duration,p->timebase,(AVRational){1,1000000}):0;\n'
        '        web_decoder.reserved[0]=(int)(extraction_ns/1000);\n'
        '        web_decoder.reserved[1]=(int)(web_prores_entropy_ns()/1000);\n'
        '        web_decoder.reserved[2]=(int)(web_prores_serial_ns()/1000);\n'
        '        web_decoder.format=p->packet->size;\n'
        '        web_decoder.primaries=p->packet->buf!=NULL;\n'
        '        if(capture!=web_decoder.packet){uint64_t copy_begin=live_cpu_ns();\n'
        '            memcpy(web_decoder.packet,capture,bytes);\n'
        '            web_decoder.key=(int)((live_cpu_ns()-copy_begin)/1000);}\n'
        '        p->live_capture_size=bytes;p->live_timestamp=web_decoder.timestamp;\n'
        '        p->live_duration=web_decoder.duration;p->live_cpu_us=web_decoder.reserved[0];\n'
        '        p->live_entropy_us=web_decoder.reserved[1];p->live_serial_us=web_decoder.reserved[2];\n'
        '        p->live_copy_us=web_decoder.key;\n'
        '        p->live_packet_bytes=web_decoder.format;\n'
        '        p->live_packet_refcounted=web_decoder.primaries;\n'
        '        p->live_packet_pts=p->packet->pts;\n'
        '        int result=request(2);\n'
        '        if(result>=0)p->submitted_keyframe=true;\n'
        '        else if(result==AVERROR(EAGAIN))p->live_pending=true;\n'
        '        else if(result!=AVERROR(EAGAIN))fallback(f);\n'
        '        return result;\n'
        '    }\n'
        '    AVPacket *copy=p->retained_only?NULL:av_packet_clone(p->packet);')
replace('    p->retained_only=atomic_load(&enabled)>=2;',
        '    p->retained_only=atomic_load(&enabled)>=2;\n'
        '    p->live_prores=atomic_load(&enabled)==3&&!strcmp(codec->codec,"prores");')
replace('p->drained=false;p->submitted_keyframe=false;p->state=(struct lavc_state){0};',
        'p->drained=false;p->submitted_keyframe=false;p->live_pending=false;p->state=(struct lavc_state){0};')
replace('    p->timebase=mp_get_codec_timebase(codec);p->software->pkt_timebase=p->timebase;p->software->thread_count=2;p->software->max_pixels=1920*1080;',
        '    p->timebase=mp_get_codec_timebase(codec);p->software->pkt_timebase=p->timebase;'
        'p->software->thread_count=p->live_prores?1:2;p->software->max_pixels=1920*1080;\n'
        '    if(p->live_prores){p->software->thread_type=0;'
        'if(avcodec_open2(p->software,decoder,NULL)<0)goto fail;p->software_open=true;}')
target = root / ('build/experiments/prores-real-packet-webgpu/vd_direct.c' if direct else
                 'build/experiments/prores-real-packet-webgpu/vd_live.c')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(source)
print(target)
