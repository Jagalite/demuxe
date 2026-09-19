<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native HLS playlist views over compatible existing media

Full identity: `R088.native-hls-playlist-views-over-compatible-existing-media`. Original rank: 16.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Reconciled completed prior evidence: Native HLS byte-range view reaches marked audio/video, seeks and EOF; deliberately misaligned segment ranges fail. Local unchanged fMP4 payload supports the proposed destination primitive.

## Accepted scope

Local native HLS view primitive only; source authorization/integration separate.

Native HLS unchanged fMP4 byte ranges render marked A/V, seek, EOF and cleanup; deliberately misaligned range fails. Separate ongoing-file observations do not establish early output.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Native HLS unchanged fMP4 byte ranges render marked A/V, seek, EOF and cleanup; deliberately misaligned range fails. Separate ongoing-file observations do not establish early output. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
