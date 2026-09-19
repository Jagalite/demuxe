<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Pass already-valid fragmented media through unchanged

Full identity: `R009.pass-already-valid-fragmented-media-through-unchanged`. Original rank: 8.

Current decision: **stop_current_profile**. Scientific verdict preserved from **STOP_PROFILE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Reconciled completed prior evidence: Existing local fMP4 opens and seeks as native-direct in the preserved opportunities-02 result. This is a cheaper correct route for the tested file profile than a new MSE parser. It does not implement or reject controlled-fetch/track-selective pass-through.

## Accepted scope

Local unchanged fMP4 profile only; controlled-fetch or selected-track pass-through remains a separate opportunity.

New MSE pass-through candidate stopped because existing native-direct handles the tested unchanged local fMP4, seeks to6s, and leaves zero workers. No MSE candidate correctness claimed.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | No new MSE candidate preparation needed after profile opportunity stop; existing baseline fixture/source audit reviewed. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | not_applicable | New MSE pass-through candidate stopped because existing native-direct handles the tested unchanged local fMP4, seeks to6s, and leaves zero workers. No MSE candidate correctness claimed. |
| performance | not_applicable | Stopped tested profile/variant; further performance work has no authorized candidate benefit. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
