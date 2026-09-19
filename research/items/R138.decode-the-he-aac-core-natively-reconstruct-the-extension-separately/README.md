<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode the HE-AAC core natively, reconstruct the extension separately

Full identity: `R138.decode-the-he-aac-core-natively-reconstruct-the-extension-separately`. Original rank: 27.

Current decision: **stop_current_profile**. Scientific verdict preserved from **STOP_PROFILE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Original HE-AAC v1 already decodes through native browser API: full 100288-frame stereo output matches independent reference within 1.68e-5 maximum sample error, malformed header rejected. Core plus separate SBR reconstruction adds no missing capability in this local profile; highband tone alone was not relied upon.

## Accepted scope

Local HE-AACv1 native decode capability; highband tone alone was not the oracle.

Core/SBR candidate stopped because ordinary native HE-AAC already returns100288 stereo frames matching independent reference within1.67005e-5 sample error; malformed input rejects. Baseline fidelity is established, not separate-SBR correctness.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | not_applicable | Core/SBR candidate stopped because ordinary native HE-AAC already returns100288 stereo frames matching independent reference within1.67005e-5 sample error; malformed input rejects. Baseline fidelity is established, not separate-SBR correctness. |
| performance | not_applicable | Stopped tested profile/variant; further performance work has no authorized candidate benefit. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
