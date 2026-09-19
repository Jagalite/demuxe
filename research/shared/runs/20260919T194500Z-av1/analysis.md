<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual pinned libaom large-scale-tile decode returns a 256x256 selected tile whose Y, U and V exactly match the full 512x512 decode crop; wrong-quadrant control differs. Tile mode needs AV1D_EXT_TILE_DEBUG. Earlier zero-size and 16-bit-buffer layout mistakes are preserved as harness negatives. Prepared-source mechanism is viable; no browser, sparse transport or CPU claim.

A genuine two-temporal-layer source advertises masks 259 and 257. Exact OBU extraction keeps 12 of 24 timestamps, drops 12 higher-layer OBUs and reduces IVF bytes 22420 to 11657. Independent FFmpeg and libaom operating-point pixels match; Chrome decodes all selected pixels/timestamps exactly. Missing keyframe fails. Restricted stable one-spatial-layer source; not arbitrary AV1 or measured CPU savings.

The report mechanism now has a real two-layer source and exact layer extraction: selected mask 257 retains 12 of 24 frames with identical coded OBU bytes; independent host decoding, libaom selected operating point and browser pixels/timestamps agree. Missing required keyframe fails. This report-specific evidence does not cover arbitrary masks or decoder-model timing.

Limits: No production integration or performance qualification.; Tile oracle shares libaom decoder implementation with baseline; temporal oracle uses independent FFmpeg decoder.; Initial documented source/harness failures preserved.; Build and early fixture setup predate research migration commit; source/library content hashes captured, not claimed as migration-created runs.
