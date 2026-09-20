<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Build audio seek checkpoints from codec state plus filter state together

Full key: `R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together`

Current decision: **pursue** (2026-09-19T23:32:47.242194+00:00).

Actual stereo IMA-WAV logical predictor/index/nibble position state combined with explicit integer stereo average, pair-average2to1 resampler pending phase, and integer IIR state. Whole8136input frames→4068output frames exactly match independent FFmpeg8.1.2 decode followed by ordinary pipeline. Thirty-five128sample seek continuations exact, including13restores with pending odd-input resampler phase, codec block resets and nearEOF. Thirty-two JSON checkpoints18240bytes contain only logical fields/positions plus source/runtime/recipe/epoch identity and checksum, no raw pointers. Omitting filter or pending phase changes output; changed source/runtime/filter/epoch, corrupted snapshot and cancellation reject. Five complete cold read/hash/parse/checkpoint-building/JSONwrite-read plus35seek-output jobs37.634ms versus full-prefix replay171.893ms ratio0.21894 passes<=0.9.

Pursue this exact versioned IMA-WAV/mixer/resampler/IIR recipe and repeated-seek workload. Encoder padding is included explicitly; no gapless trim claim. Current per-shift IMA arithmetic is verified against installedFFmpeg8.1.2; older report/product-rounding rule differs and is preserved as rejected cross-runtime evidence. Other codecs, resamplers, filters, recipe changes and production integration require new logical continuation contracts.

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

[Run](../../shared/runs/20260919T233247Z-codec-filter-checkpoint/run.json) · [Analysis](../../shared/runs/20260919T233247Z-codec-filter-checkpoint/analysis.md) · [Manifest](../../shared/runs/20260919T233247Z-codec-filter-checkpoint/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
