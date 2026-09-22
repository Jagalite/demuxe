<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native video with an independent generated-PCM clock

Full key: `R086.native-video-with-an-independent-generated-pcm-clock`

Current decision: **pursue** (2026-09-19T20:50:39.914275+00:00).

Actual worklet output-timestamp feedback with bounded video-rate adjustment and starvation pause was compared in3 alternating trace pairs. Correctness35ms settled digital-clock bound: True; median95th absolute error baseline0.027766s candidate0.014008s, predeclared performance gate True. Old epoch callback is actually rejected without publishing ring frames; seek/rate/recovery, tone, wrong+200ms mapping and close controls exercised.

Generated-PCM digital clock controller only; acoustic A/V synchronization, decoded-audio pitch preservation and production admission remain separate. Reopen for a real integrated player workload.

Only this declared component/profile is decided. All failed variants retained. Run directory renamed after capture. Replay into a fresh output directory. No production integration or release qualification.

| Stage | Status |
| --- | --- |
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Run](../../shared/runs/20260919T205039Z-clock-feedback/run.json) · [Analysis](../../shared/runs/20260919T205039Z-clock-feedback/analysis.md) · [Manifest](../../shared/runs/20260919T205039Z-clock-feedback/manifest.json) · [History](history.jsonl) · [Evidence](evidence/index.json)

## Ecosystem follow-up EB10

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **no_new_work_current_scope**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

AudioWorklet increments consumed media frames by available samples only; underrun silence contributes no source progress. AO delay includes queued samples and reported latency, and mpv retains synchronization ownership. Executed tests cover underrun/pause/reset; acoustic synchronization and independent decoded-audio routes remain outside this result.

Next gate / reopening condition: Retain consumed-sample feedback. Reopen for a real independent audio owner with a starvation/rate trace demonstrating drift; then qualify digital markers and acoustic latency separately.

This scoped supplement does not broaden earlier correctness or performance qualification.
