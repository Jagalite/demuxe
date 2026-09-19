<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# native color with separately decoded transparency

Full identity: `R183.native-color-with-separately-decoded-transparency`. Original rank: 17.

Current decision: **pursue**. Scientific verdict preserved from **PURSUE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Independent VP8 color/mask decoders pair frames by timestamp and dimensions, preserve exact alpha and reference visible color after explicit SD matrix metadata. Wrong pair rejects; implicit matrix variant failed and retained. No production two-clock owner or cost benefit claimed.

## Accepted scope

Explicit matrix metadata is required; implicit-matrix negative retained. Two-clock production owner not qualified.

Three independent VP8 color/mask frame pairs have zero alpha and visible premultiplied-color error after explicit SD matrix; wrong timestamp/dimension pairing rejects and cleanup recorded.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Three independent VP8 color/mask frame pairs have zero alpha and visible premultiplied-color error after explicit SD matrix; wrong timestamp/dimension pairing rejects and cleanup recorded. |
| performance | pending | No predeclared equivalent-work benchmark and complete cost/sampling analysis in cited evidence; counters and incidental timing do not pass this gate. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
