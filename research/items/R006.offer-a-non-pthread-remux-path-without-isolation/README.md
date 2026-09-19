<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Offer a non-pthread remux path without isolation

Full identity: `R006.offer-a-non-pthread-remux-path-without-isolation`. Original rank: 20.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Actual isolated JSPI build produced browser-playable A/V with host decoded-output oracle. Nonisolated delayed reads and cancellation passed; Matroska zlib profile passed. Ordinary AAC MP4 priming/trim negative retained separately; not general route qualification.

## Accepted scope

Restricted non-isolated deployment profile; ordinary AAC MP4 priming/trim failure is not waived.

Actual non-pthread JSPI read suspension runs without cross-origin isolation or SAB, complete generated output matches host pixels/PCM, delayed reads permit event-loop ticks, cancellation rejects, browser output reaches EOF.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Actual non-pthread JSPI read suspension runs without cross-origin isolation or SAB, complete generated output matches host pixels/PCM, delayed reads permit event-loop ticks, cancellation rejects, browser output reaches EOF. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
