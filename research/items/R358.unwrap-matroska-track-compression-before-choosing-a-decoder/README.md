<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Unwrap Matroska track compression before choosing a decoder

Full identity: `R358.unwrap-matroska-track-compression-before-choosing-a-decoder`. Original rank: 6.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Actual isolated JSPI build produced browser-playable A/V with host decoded-output oracle. Nonisolated delayed reads and cancellation passed; Matroska zlib profile passed. Ordinary AAC MP4 priming/trim negative retained separately; not general route qualification.

## Accepted scope

Matroska ContentEncodings scope1/order0/type0/zlib, unlaced blocks only.

149 authored zlib-compressed blocks preserve host packet/PTS and independent pixels/PCM through JSPI output; browser A/V reaches EOF. Malformed compression, resource bounds and configuration transitions not qualified.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | pending | 149 authored zlib-compressed blocks preserve host packet/PTS and independent pixels/PCM through JSPI output; browser A/V reaches EOF. Malformed compression, resource bounds and configuration transitions not qualified. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
