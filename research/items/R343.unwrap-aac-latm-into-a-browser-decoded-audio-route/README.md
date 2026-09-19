<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Unwrap AAC-LATM into a browser-decoded audio route

Full identity: `R343.unwrap-aac-latm-into-a-browser-decoded-audio-route`. Original rank: 4.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Restricted bit-aligned LOAS/LATM AAC-LC extraction produces142 AAC frames with exact independent PCM; truncation/sync/missing configuration reject. Browser raw AAC lane plays marked audio beside changing video. Multi-program/layer/CRC/otherData variants deliberately reject.

## Accepted scope

142 AAC frames; multi-program/layer, CRC and otherData mappings excluded.

Restricted single-program/layer AAC-LC LATM extraction preserves all independent decoded PCM; truncated/sync/missing-config controls reject. Actual browser raw AAC lane preserves marked output through changing video and EOF/cleanup.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Restricted single-program/layer AAC-LC LATM extraction preserves all independent decoded PCM; truncated/sync/missing-config controls reject. Actual browser raw AAC lane preserves marked output through changing video and EOF/cleanup. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
