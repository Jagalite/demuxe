# H.264 + PCM24 / MKV: Demuxe Auto rerun — 2026-09-25

The current player source (`c406155e9a7e2069fde980666c6a05f9982ddaac`) was frozen in a new [asset snapshot](../../../build/head-to-head/assets-pcm24-auto-rerun-20260925-01/manifest.json) while reusing the earlier 36-second `pcm-mkv` fixture (SHA-256 `eb2eef792c1c70ebb683c707dec50253b1b61b09bc5ed6c7b8d4bfa0320d6b98`). Headed Chrome 153.0.8010.53 ran [correctness](../pcm24-auto-correctness-20260925-01/REPORT.md) before [CPU](../pcm24-auto-cpu-20260925-01/REPORT.md). Both run manifests passed `tests/head-to-head/verify.mjs`.

Auto selected `native-direct` at initial playback and throughout all three CPU windows. Correctness passed marked video and audio, pause/resume, rate, three seeks, EOF, and cleanup. Each CPU round used a fresh context in one Chrome launch, a 20-second idle check, five-second warmup, and 20-second playback window. Startup tracing stopped before measurement.

| Round | Whole Chrome | Renderer | GPU | Audio service | Browser | Dropped frames |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 14.00% | 6.58% | 6.14% | 0.87% | 0.35% | 0 |
| 2 | 13.20% | 6.19% | 5.69% | 0.88% | 0.37% | 0 |
| 3 | 13.97% | 6.63% | 6.07% | 0.90% | 0.32% | 0 |

The whole-Chrome median is **13.97% of one core**, rounded to **14.0%** in README. Idle whole-Chrome CPU was 1.36%, 1.24%, and 0.94%; no idle value was subtracted. All three measurement windows had stable process IDs and 600 presented frames against about 600 expected.

The earlier Auto result was 27.5% on Hybrid with an older player build. It is useful route history, but this Auto-only rerun and the earlier plain-video/other-player columns are separate campaigns, so their CPU values are not a matched before/after comparison. The marked-audio screen confirms output and lifecycle behavior, not bit-exact physical audio fidelity or general codec support. Three windows in one launch do not establish launch-to-launch reproducibility.
