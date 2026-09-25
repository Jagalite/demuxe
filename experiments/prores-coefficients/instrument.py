#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Insert experiment hooks into an isolated copy of FFmpeg 9.0.2 proresdec.c."""

import argparse
from pathlib import Path


def replace_once(source: str, old: str, new: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"expected one anchor, found {count}: {old[:90]!r}")
    return source.replace(old, new, 1)


def instrument(source: str) -> str:
    source = replace_once(source, '#include "proresdec.h"',
                          '#include "proresdec.h"\n#include "probe.h"')
    source = replace_once(
        source,
        '    if ((ret = decode_ac_coeffs(avctx, &gb, blocks, blocks_per_slice)) < 0)\n'
        '        return ret;\n\n    block = blocks;',
        '    if ((ret = decode_ac_coeffs(avctx, &gb, blocks, blocks_per_slice)) < 0)\n'
        '        return ret;\n\n'
        '    if (probe_is_profile()) probe_coeff_ns += probe_now_ns() - probe_stage_start;\n'
        '    probe_component(ctx, slice, 0, blocks, blocks_per_slice);\n'
        '    if (probe_is_extract()) return 0;\n'
        '    if (probe_is_profile()) probe_stage_start = probe_now_ns();\n'
        '    block = blocks;')
    source = replace_once(
        source,
        '    int i, blocks_per_slice = slice->mb_count<<2;\n    int ret;',
        '    int i, blocks_per_slice = slice->mb_count<<2;\n    int ret;\n'
        '    uint64_t probe_stage_start = probe_is_profile() ? probe_now_ns() : 0;')
    source = replace_once(
        source,
        '        dst += 16;\n    }\n    return 0;\n}',
        '        dst += 16;\n    }\n'
        '    if (probe_is_profile()) probe_recon_ns += probe_now_ns() - probe_stage_start;\n'
        '    return 0;\n}')
    source = replace_once(
        source,
        '    int i, j, blocks_per_slice = slice->mb_count << log2_blocks_per_mb;\n'
        '    int ret;',
        '    int i, j, blocks_per_slice = slice->mb_count << log2_blocks_per_mb;\n'
        '    int ret;\n'
        '    uint64_t probe_stage_start = probe_is_profile() ? probe_now_ns() : 0;')
    source = replace_once(
        source,
        '    }\n\n    block = blocks;\n    for (i = 0; i < slice->mb_count; i++) {\n'
        '        for (j = 0; j < log2_blocks_per_mb; j++) {',
        '    }\n\n'
        '    if (probe_is_profile()) probe_coeff_ns += probe_now_ns() - probe_stage_start;\n'
        '    probe_component(ctx, slice, component, blocks, blocks_per_slice);\n'
        '    if (probe_is_extract()) return 0;\n'
        '    if (probe_is_profile()) probe_stage_start = probe_now_ns();\n'
        '    block = blocks;\n    for (i = 0; i < slice->mb_count; i++) {\n'
        '        for (j = 0; j < log2_blocks_per_mb; j++) {')
    source = replace_once(
        source,
        '            dst += 8;\n        }\n    }\n    return 0;\n}',
        '            dst += 8;\n        }\n    }\n'
        '    if (probe_is_profile()) probe_recon_ns += probe_now_ns() - probe_stage_start;\n'
        '    return 0;\n}')
    source = replace_once(
        source,
        '                               const int16_t *qmat, int log2_blocks_per_mb)',
        '                               const int16_t *qmat, int log2_blocks_per_mb,\n'
        '                               int component)')
    source = replace_once(
        source,
        '    for (i = 0; i < 64; i++) {\n'
        '        qmat_luma_scaled  [i] = ctx->qmat_luma  [i] * qscale;\n'
        '        qmat_chroma_scaled[i] = ctx->qmat_chroma[i] * qscale;\n'
        '    }',
        '    for (i = 0; i < 64; i++) {\n'
        '        qmat_luma_scaled  [i] = ctx->qmat_luma  [i] * qscale;\n'
        '        qmat_chroma_scaled[i] = ctx->qmat_chroma[i] * qscale;\n'
        '    }\n'
        '    probe_slice_header(ctx, slice, jobnr, qscale, hdr_size,\n'
        '                       y_data_size, u_data_size, v_data_size);')
    chroma_call = '                                  qmat_chroma_scaled, log2_chroma_blocks_per_mb);'
    if source.count(chroma_call) != 2:
        raise RuntimeError("expected two chroma calls")
    source = source.replace(chroma_call,
                            '                                  qmat_chroma_scaled, log2_chroma_blocks_per_mb, 1);', 1)
    source = replace_once(
        source,
        '                                  qmat_chroma_scaled, log2_chroma_blocks_per_mb);',
        '                                  qmat_chroma_scaled, log2_chroma_blocks_per_mb, 2);')
    source = replace_once(
        source,
        '    int frame_hdr_size, pic_size, ret;\n    int i;',
        '    int frame_hdr_size, pic_size, ret;\n    int i;\n'
        '    uint64_t probe_frame_start = probe_is_profile() ? probe_now_ns() : 0;')
    source = replace_once(
        source,
        '    if (frame_hdr_size < 0)\n        return frame_hdr_size;',
        '    if (frame_hdr_size < 0)\n        return frame_hdr_size;\n'
        '    probe_frame_header(avctx, ctx, avpkt);')
    source = replace_once(
        source,
        '    *got_frame      = 1;\n\n    return avpkt->size;',
        '    *got_frame      = 1;\n'
        '    if (probe_is_profile()) probe_frame_ns += probe_now_ns() - probe_frame_start;\n'
        '    probe_frame_index++;\n\n    return avpkt->size;')
    source = replace_once(
        source,
        '    av_freep(&ctx->slices);\n    av_refstruct_unref(&ctx->hwaccel_picture_private);\n\n    return 0;',
        '    av_freep(&ctx->slices);\n    av_refstruct_unref(&ctx->hwaccel_picture_private);\n'
        '    probe_finish();\n\n    return 0;')
    # One component count per successful entropy call in profiling runs.
    source = source.replace(
        '    if (probe_is_profile()) probe_coeff_ns += probe_now_ns() - probe_stage_start;',
        '    if (probe_is_profile()) { probe_coeff_ns += probe_now_ns() - probe_stage_start; '
        'probe_components++; }')
    return source


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="FFmpeg 9.0.2 source directory")
    args = parser.parse_args()
    if (args.source / "RELEASE").read_text().strip() != "9.0.2":
        raise SystemExit("source must be FFmpeg 9.0.2")
    target = args.source / "libavcodec/proresdec.c"
    if (target.parent / "probe.h").exists():
        raise SystemExit("source is already instrumented")
    updated = instrument(target.read_text())
    (target.parent / "probe.h").write_bytes((Path(__file__).parent / "probe.h").read_bytes())
    target.write_text(updated)


if __name__ == "__main__":
    main()
