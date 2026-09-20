<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Edit an entire FLAC block by changing only its warm-up samples

Full key: `R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples`

Current decision: **pursue** (2026-09-19T23:25:33.880396+00:00).

Actual signed16 FLAC fixed predictors1..4/Rice1,32sample blocks: requested integer constant/linear/quadratic/cubic corrections have degree below predictor order. Only warmups changed; all Rice residual bits retained, headers/CRCs regenerated. All128samples match independent ordinary requested edits exactly in FFmpeg/Chrome; libFLAC integrity/render/end/closed pass. Headroom overflow, CRC and truncation reject; applying a linear edit via order1 warmup-only method misses31of32samples, demonstrating degree restriction. Five cold parse/headroom-check/write/destination-decode jobs43.615ms versus ordinary FFmpeg aeval requested polynomial/signed16FLAC encode/destination-decode94.533ms ratio0.46138 passes<=0.9; output/source318bytes identical.

Pursue only explicitly requested integer polynomial edits below the admitted fixed-predictor order with validated headroom. Rolling recurrence validation is charged; request semantics are not a transparent playback optimization. General polynomials, saturation, Rice partitions beyond zero and shiftedLPC need new profiles. No automatic audio alteration or production integration.

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

[Run](../../shared/runs/20260919T232533Z-flac-warm/run.json) · [Analysis](../../shared/runs/20260919T232533Z-flac-warm/analysis.md) · [Manifest](../../shared/runs/20260919T232533Z-flac-warm/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
