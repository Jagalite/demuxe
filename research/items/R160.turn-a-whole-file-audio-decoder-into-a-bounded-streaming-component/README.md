<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Turn a whole-file audio decoder into a bounded streaming component

Full identity: `R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component`. Original rank: 24.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Two prepared independently decodable FLAC regions decoded through browser whole-file API concatenate sample-exactly to full-file decode. One-sample seam error detected. Generic arbitrary-file segmentation and streaming scheduler remain later work.

## Accepted scope

Prepared independent chunks only; arbitrary compressed-file segmentation and streaming scheduler excluded.

Two prepared independently decodable48000-frame FLAC regions concatenate to96000 samples with maximum error0 versus full browser decode; one-sample shift produces nonzero seam error and context closes.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Two prepared independently decodable48000-frame FLAC regions concatenate to96000 samples with maximum error0 versus full browser decode; one-sample shift produces nonzero seam error and context closes. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
