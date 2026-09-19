<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native video with an independent generated-PCM clock

Full identity: `R086.native-video-with-an-independent-generated-pcm-clock`. Original rank: 22.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE_CLOCK_CONTROL**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Actual maintained PCM AudioWorklet with native video survives seek/rate epochs and injected producer starvation. Active phase clock errors up to80ms, starvation grows to253ms and rebase recovers below18ms; correct generated tone observed. Needs tighter output-time feedback before sync qualification; not acoustic or arbitrary decoded-audio proof.

## Accepted scope

Browser clocks only; no acoustic sync or arbitrary decoded-audio pitch fidelity.

Maintained PCM worklet handles seek/rate epochs and stale producer rejection with generated tones. Errors approach80ms active and253ms during starvation; tighter output-time feedback and sync acceptance remain unresolved.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | pending | Maintained PCM worklet handles seek/rate epochs and stale producer rejection with generated tones. Errors approach80ms active and253ms during starvation; tighter output-time feedback and sync acceptance remain unresolved. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
