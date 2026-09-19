<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# configuration-interval seek

Full identity: `R262.configuration-interval-seek`. Original rank: 2.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Explicit source-bound SPS/RAP intervals decode all96 authored pictures exactly through browser configuration change; indexed second interval matches48 pictures/timestamps, dependent cold start rejects. Container indexing and source replacement integration remain later.

## Accepted scope

Explicit source-bound SPS/RAP configuration intervals; not generic container indexing.

96 full-transition and 48 interval-seek pictures match independent visible-plane hashes. Recorded timestamps also independently checked against input packets; dependent cold-start rejects and decoders close.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | 96 full-transition and 48 interval-seek pictures match independent visible-plane hashes. Recorded timestamps also independently checked against input packets; dependent cold-start rejects and decoders close. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
