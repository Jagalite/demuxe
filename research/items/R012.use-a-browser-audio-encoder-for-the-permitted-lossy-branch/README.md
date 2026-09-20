<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use a browser audio encoder for the permitted lossy branch

Full key: `R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch`

Current decision: **stop_current_profile** (2026-09-19T21:16:53.043044+00:00).

Actual browser Opus+copied-H264 prototype and archived192kbps Wasm baseline preserve all24 video packet hashes. Corrected Ogg/Matroska pre-skip312 and terminal discard648 yield48000 decoded samples; encoder reset discards an old queued block. But MP4 remux destination yields48648 candidate samples and48840 baseline samples in both host/browser decoding, violating48000-sample gate. Ogg cross-decoder floats differ at max9.5144e-5; no bit-identical or universal lossy quality claim.

Stop this untrimmed MP4 destination profile; do not benchmark invalid output. Reopen with destination-consumed end trimming or an explicit sample-count adapter, then repeat full copied-video/audio lifecycle and quality gates. Audio-only Ogg encoder remains feasible.

No production integration or release qualification. Original provisional directory renamed after capture; replay into a new output directory. Exact original protocol and all measured samples retained.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | failed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T211653Z-browser-encoder/run.json) · [Analysis](../../shared/runs/20260919T211653Z-browser-encoder/analysis.md) · [Manifest](../../shared/runs/20260919T211653Z-browser-encoder/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
