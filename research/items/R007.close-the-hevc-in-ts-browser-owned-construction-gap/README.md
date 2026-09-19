<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Close the HEVC-in-TS browser-owned construction gap

Full identity: `R007.close-the-hevc-in-ts-browser-owned-construction-gap`. Original rank: 1.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Actual isolated Wasm gate extension plays HEVC/AAC TS and seeks; current bridge rejects it. Complete output video and PCM match independent host decode with passthrough frame timing; AVC control still passes. Additional codec-aware adverse timestamp/configuration cases remain before integration.

## Accepted scope

HEVC/AAC TS isolated RemuxPlayer bridge; baseline rejects; ordinary runtime unchanged.

Full host pictures/PCM and actual HEVC/AAC playback/seek pass, with AVC control and worker cleanup. Codec-aware adverse timestamp/configuration cases remain before closing correctness.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | pending | Full host pictures/PCM and actual HEVC/AAC playback/seek pass, with AVC control and worker cleanup. Codec-aware adverse timestamp/configuration cases remain before closing correctness. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
