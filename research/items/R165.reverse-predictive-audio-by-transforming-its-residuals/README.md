<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reverse predictive audio by transforming its residuals

Full key: `R165.reverse-predictive-audio-by-transforming-its-residuals`

Current decision: **pursue** (2026-09-19T22:55:29.933830+00:00).

Real signed16 FLAC fixed-order1 blocks257 with17bit escape residuals: last sample derived from warmup+sum(residuals), new warmup emitted, residuals reversed/negated, block order reversed, frame numbering/CRCs regenerated. All6168 samples exactly match independent full PCM reversal in FFmpeg and Chrome including -32768/32767 boundaries; applying transform twice reproduces original compressed stream bytes. Wrong predictor with validCRC, residual sign overflow, corruptCRC and truncation reject. Independent libFLAC integrity, native render/end/closed pass. Five alternating cold source read/parse/transform/write/destination-decode jobs38.417ms versus source decode/PCM-reverse/ordinaryFLAC-encode/destination-decode94.047ms, ratio0.40849 passes<=0.9; output/source bytes1.0 passes<=1.25.

Pursue only standalone lossless reversed-FLAC output for this explicitly admitted fixed-order1 escape-residual profile. Matched endpoint includes compressed output, so this is not a comparison against simple PCM-only playback reversal. General Rice partitions, other predictors, mixed block modes, and long streams need separate parser and workload qualification. STREAMINFO MD5 explicitly unknown; no production routing change.

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

[Run](../../shared/runs/20260919T225529Z-flac-reverse/run.json) · [Analysis](../../shared/runs/20260919T225529Z-flac-reverse/analysis.md) · [Manifest](../../shared/runs/20260919T225529Z-flac-reverse/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
