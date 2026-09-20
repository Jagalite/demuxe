<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Turn a whole-file audio decoder into a bounded streaming component

Full key: `R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component`

Current decision: **stop_current_profile** (2026-09-19T20:50:39.914275+00:00).

All15 independent2s stereo FLAC chunks match continuous30s browser PCM exactly. Retained decoded PCM payload falls15-fold (11,520,000 to768,000 bytes), but prepared wall median62.3ms versus34.8ms (1.79023 ratio) fails1.25 ceiling;625.041ms cold preparation further loses. Naive stale-STREAMINFO segmenter failure preserved.

Stop this sequential prepared-chunk speed profile. Reopen for an actual memory-bound workload or a materially different batched/prefetched implementation; explicit PCM ownership is measured, total browser memory and physical energy are not.

Only this declared component/profile is decided. All failed variants retained. Run directory renamed after capture. Replay into a fresh output directory. No production integration or release qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | failed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205039Z-chunk-performance/run.json) · [Analysis](../../shared/runs/20260919T205039Z-chunk-performance/analysis.md) · [Manifest](../../shared/runs/20260919T205039Z-chunk-performance/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
