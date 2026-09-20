<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Burn in an overlay by re-encoding only the spatial blocks it changes

Full key: `R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes`

Current decision: **pursue** (2026-09-20T00:42:10.647849+00:00).

Actual existing libjpeg-turbo cjpeg+lossless jpegtran -drop implements fixedQ83 opaque grayscale32x16 block-aligned overlay at(40,48). Across four128x128 JPEGs, all248 untouched coefficient blocks per frame and every outside pixel remain exact;8changed blocks and inside pixels match independently encoded overlay. Actual native Chrome JPEG decoding confirms both inside and outside equality, bitmaps close. Unaligned region and mismatched quantizer reject. Five alternating complete encode/drop/full-JPEG-entropy-serialization/consumer jobs308.286ms vs conventional full decode/paint/reencode plus crop/drop repair needed for identical untouched-coefficient contract462.498ms ratio0.66657 passes0.9. Redundant baseline patch-encoding diagnostic retained and excluded.

Pursue integration feasibility using existing jpegtran selective-drop primitive; do not implement a redundant entropy writer. The successful scope is opaque aligned grayscale with identical quantization, not alpha blending/chroma/unaligned overlays or production route qualification. Full plain reencode would violate untouched-pixel contract, so matched baseline explicitly repairs outside coefficients.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260920T004210Z-jpeg-overlay/run.json) · [Analysis](../../shared/runs/20260920T004210Z-jpeg-overlay/analysis.md) · [Manifest](../../shared/runs/20260920T004210Z-jpeg-overlay/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
