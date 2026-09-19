<!-- SPDX-License-Identifier: CC-BY-4.0 -->

Actual pinned libaom large-scale-tile decode returns a 256x256 selected tile whose Y, U and V exactly match the full 512x512 decode crop; wrong-quadrant control differs. Tile mode needs AV1D_EXT_TILE_DEBUG. Earlier zero-size and 16-bit-buffer layout mistakes are preserved as harness negatives. Prepared-source mechanism is viable; no browser, sparse transport or CPU claim. Review correction: temporal FFmpeg/Chrome evidence in the shared run does not qualify tile selection. Tile output comparison uses the same libaom implementation for selected/full decode. Keep full correctness pending an independent tile reference and malformed-input/lifecycle controls.

Limits: Scientific feasibility disposition retained; full correctness no longer implies temporal-run evidence applies.
