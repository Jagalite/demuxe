#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate private packet/frame quality identity hooks; no second playback clock."""
import argparse,difflib,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();here=Path(__file__).resolve().parent;changes={}
def replace(s,old,new):
 assert s.count(old)==1,old
 return s.replace(old,new,1)
def edit(name,fn):
 old=(a.source/name).read_text();changes[name]=(old,fn(old))
changes['common/demuxe-quality.h']=('',(here/'include/common/demuxe-quality.h').read_text())
edit('demux/packet.h',lambda s:replace(replace(s,'#define MPLAYER_DEMUX_PACKET_H','#define MPLAYER_DEMUX_PACKET_H\n#include "common/demuxe-quality.h"'),'    struct demux_packet *next;','    struct demuxe_quality_tag demuxe_quality;\n    struct demux_packet *next;'))
edit('demux/packet.c',lambda s:replace(s,'    dst->codec = src->codec;','    dst->codec = src->codec;\n    dst->demuxe_quality = src->demuxe_quality;'))
edit('video/mp_image.h',lambda s:replace(replace(s,'#define MPLAYER_MP_IMAGE_H','#define MPLAYER_MP_IMAGE_H\n#include "common/demuxe-quality.h"'),'struct mp_image {','struct mp_image {\n    struct demuxe_quality_tag demuxe_quality;'))
def image(s):
 s=replace(s,'void mp_image_copy_attributes(struct mp_image *dst, struct mp_image *src)','struct demuxe_frame_opaque {struct mp_image_params params;uint32_t magic;struct demuxe_quality_tag quality;};\n\nvoid mp_image_copy_attributes(struct mp_image *dst, struct mp_image *src)')
 s=replace(s,'    dst->pts = src->pts;','    dst->pts = src->pts;\n    dst->demuxe_quality = src->demuxe_quality;')
 s=replace(s,'    if (src->opaque_ref) {\n        struct mp_image_params *p', '    if (src->opaque_ref && src->opaque_ref->size >= sizeof(struct mp_image_params)) {\n        if(src->opaque_ref->size == sizeof(struct demuxe_frame_opaque) && ((struct demuxe_frame_opaque *)src->opaque_ref->data)->magic == 0x444d5851)\n            dst->demuxe_quality=((struct demuxe_frame_opaque *)src->opaque_ref->data)->quality;\n        struct mp_image_params *p')
 s=replace(s,'dst->opaque_ref = av_buffer_alloc(sizeof(struct mp_image_params));','dst->opaque_ref = av_buffer_alloc(sizeof(struct demuxe_frame_opaque));')
 return replace(s,'    *(struct mp_image_params *)dst->opaque_ref->data = params;','    *(struct demuxe_frame_opaque *)dst->opaque_ref->data = (struct demuxe_frame_opaque){params,0x444d5851,src->demuxe_quality};')
edit('video/mp_image.c',image)
def decoder(s):
 s=replace(s,'    AVRational codec_timebase;','    AVRational codec_timebase;\n    struct demuxe_quality_history demuxe_history;')
 for fn in ['reset_avctx','uninit_avctx']:
  marker='static void '+fn+'(struct mp_filter *vd)\n{\n    vd_ffmpeg_ctx *ctx = vd->priv;'
  s=replace(s,marker,marker+'\n    memset(&ctx->demuxe_history,0,sizeof(ctx->demuxe_history));')
 # Associate only accepted packets, after the exact timestamp conversion used
 # by this decoder. mpv may offset timestamps before this boundary; comparing
 # pre-conversion doubles against quantized AVFrame timestamps loses identity.
 marker='    if (ret == AVERROR(EAGAIN) || ret == AVERROR_EOF)\n        return ret;'
 s=replace(s,marker,marker+'\n    if(ret >= 0 && pkt && ctx->avpkt->pts != AV_NOPTS_VALUE)\n        demuxe_quality_remember(&ctx->demuxe_history,mp_pts_from_av(ctx->avpkt->pts,&ctx->codec_timebase),pkt->demuxe_quality);')
 marker='    mpi->pts = mp_pts_from_av(ctx->pic->pts, &ctx->codec_timebase);'
 return replace(s,marker,marker+'\n    mpi->demuxe_quality=demuxe_quality_take(&ctx->demuxe_history,mpi->pts);')
edit('video/decode/vd_lavc.c',decoder)
# These hooks observe the frame selected by the existing mpv renderer. Browser
# acknowledgement carries this exact tag, even across delayed old-frame draws.
edit('video/out/vo_libmpv.c',lambda s:replace(s,'    if (do_render)\n        err = ctx->renderer->fns->render(ctx->renderer, params, frame);','    extern void demuxe_control_selected(struct demuxe_quality_tag);\n    demuxe_control_selected(frame->current?frame->current->demuxe_quality:(struct demuxe_quality_tag){0});\n    if (do_render)\n        err = ctx->renderer->fns->render(ctx->renderer, params, frame);'))
patch=''.join(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='a/'+name if old else '/dev/null',tofile='b/'+name)) for name,(old,new) in changes.items())
with a.output.open('x') as f:f.write(patch)
with a.output.with_suffix('.inputs.json').open('x') as f:json.dump({name:hashlib.sha256(old.encode()).hexdigest() for name,(old,new) in changes.items()},f,indent=2)
