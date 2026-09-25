#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Isolated FFmpeg 9.0.2 ProRes entropy destination ablation.

The entropy codebooks, bit reader, and coefficient values stay unchanged. Only
the destination pointer for each coefficient changes to the final upload layout.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
path = root / "build/experiments/prores-coefficients/source/libavcodec/proresdec.c"
source = path.read_text()

def replace(old, new, count=1, limit=None):
    global source
    if source.count(old) != count:
        raise RuntimeError(f"FFmpeg 9.0.2 direct-pack anchor changed: {old[:80]!r}: {source.count(old)}")
    source = source.replace(old, new, count if limit is None else limit)

replace('#include "probe.h"', '#include "probe-direct.h"')
replace('int16_t *out,\n                                              int blocks_per_slice)',
        'int16_t *const *out,\n                                              int blocks_per_slice)')
replace('int16_t *out, int blocks_per_slice)',
        'int16_t *const *out, int blocks_per_slice)')
replace('    out[0] = prev_dc;\n\n    out += 64; // dc coeff for the next block',
        '    out[0][0] = prev_dc;')
replace('for (i = 1; i < blocks_per_slice; i++, out += 64)',
        'for (i = 1; i < blocks_per_slice; i++)')
replace('        out[0] = prev_dc;', '        out[i][0] = prev_dc;')
replace('out[((pos & block_mask) << 6) + ctx->scan[i]]',
        'out[pos & block_mask][ctx->scan[i]]')
replace('    int ret;\n    uint64_t probe_stage_start',
        '    int ret;\n    int16_t *block_ptrs[32];\n    uint64_t probe_stage_start', 2)
replace('    for (i = 0; i < blocks_per_slice; i++)\n'
        '        ctx->bdsp.clear_block(blocks+(i<<6));',
        '    for (i = 0; i < blocks_per_slice; i++) {\n'
        '        block_ptrs[i] = probe_direct_block(ctx, slice, 0, i);\n'
        '        if (!block_ptrs[i]) return AVERROR_INVALIDDATA;\n'
        '        ctx->bdsp.clear_block(block_ptrs[i]);\n'
        '    }', 2, 1)
replace('    for (i = 0; i < blocks_per_slice; i++)\n'
        '        ctx->bdsp.clear_block(blocks+(i<<6));',
        '    for (i = 0; i < blocks_per_slice; i++) {\n'
        '        block_ptrs[i] = probe_direct_block(ctx, slice, component, i);\n'
        '        if (!block_ptrs[i]) return AVERROR_INVALIDDATA;\n'
        '        ctx->bdsp.clear_block(block_ptrs[i]);\n'
        '    }', 1)
replace('decode_dc_coeffs(&gb, blocks, blocks_per_slice)',
        'decode_dc_coeffs(&gb, block_ptrs, blocks_per_slice)', 2)
replace('decode_ac_coeffs(avctx, &gb, blocks, blocks_per_slice)',
        'decode_ac_coeffs(avctx, &gb, block_ptrs, blocks_per_slice)', 2)

target = root / "build/experiments/prores-real-packet-webgpu/proresdec-direct.c"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(source)
print(target)
