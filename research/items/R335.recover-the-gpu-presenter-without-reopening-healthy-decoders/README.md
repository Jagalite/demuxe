<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover the GPU presenter without reopening healthy decoders

Full identity: `R335.recover-the-gpu-presenter-without-reopening-healthy-decoders`. Original rank: 13.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Actual WebGPU device destruction/recreation preserves held decoded-frame redraw exactly; same VideoDecoder remains configured and emits the next timestamp. Worth independent presenter recovery. This is a small GPU owner prototype, not the current player integration.

## Accepted scope

Small independent GPU presenter owner; actual platform-loss paths beyond device.destroy and player integration excluded.

Actual WebGPU device destruction/recreation yields exact held-frame redraw, keeps the same configured VideoDecoder and emits next timestamp1000000; errors empty and cleanup recorded.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Actual WebGPU device destruction/recreation yields exact held-frame redraw, keeps the same configured VideoDecoder and emits next timestamp1000000; errors empty and cleanup recorded. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
