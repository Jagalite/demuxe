<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Mux color and alpha into native transparent WebM

Full identity: `R097.mux-color-and-alpha-into-native-transparent-webm`. Original rank: 23.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Mux-only reconstruction of suitable aligned VP8 color/alpha packet pairs preserves complete host RGBA and native transparency through seek, rewind and EOF. Mispaired timestamp rejects. Color/mask source preparation cost remains separate; no hardware alpha claim.

## Accepted scope

Three suitable encoded pairs; source preparation cost separate, no hardware-alpha claim.

Mux-only VP8 color/alpha host RGBA is exact; native browser alpha error0 and premultiplied RGB rounding error at most0.506 byte through seek/rewind/EOF; mispaired timestamp rejects.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Mux-only VP8 color/alpha host RGBA is exact; native browser alpha error0 and premultiplied RGB rounding error at most0.506 byte through seek/rewind/EOF; mispaired timestamp rejects. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
