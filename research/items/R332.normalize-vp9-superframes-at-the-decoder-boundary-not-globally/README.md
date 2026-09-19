<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Normalize VP9 superframes at the decoder boundary, not globally

Full identity: `R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally`. Original rank: 3.

Current decision: **stop_current_profile**. Scientific verdict preserved from **CLOSED_CURRENT_PROFILE**; stages reconciled 2026-09-19T20:18:43.070415+00:00. No new media execution.

Reconciled completed prior evidence: Actual maintained worker already decodes the aggregate construction exactly, including hidden altrefs; splitting adds six submissions with no repaired output. Preserve aggregate path on this qualified synthetic decoder profile. No full-player or universal performance claim.

## Accepted scope

Synthetic VP9 profile0/8-bit 160x96; aggregate requires72 submissions versus78 split. No reason to normalize this working profile.

Maintained VP9 worker aggregate and split paths each reproduce 72 pictures/timestamps; keyframe seek gives 48 exact pictures, missing hidden frames fails, dependent start rejects, all frames close.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixtures, runtime/source manifest and result hashes reviewed and verified; no new execution or fixture generation. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Maintained VP9 worker aggregate and split paths each reproduce 72 pictures/timestamps; keyframe seek gives 48 exact pictures, missing hidden frames fails, dependent start rejects, all frames close. |
| performance | not_applicable | Stopped tested profile/variant; further performance work has no authorized candidate benefit. |
| results | passed | Referenced result bytes and source/runtime manifests verified; reconciliation records acceptance scope without rerunning experiments. |
| decision | passed | Scientific verdict preserved with normalized disposition and explicit scoped gates. |

[Reconciliation](../../shared/runs/20260919T201843Z-top30-stage-reconciliation/run.json) · [Evidence index](evidence/index.json) · [Current state](item.json) · [History](history.jsonl)

Original definitions and historical evidence remain intact. Integration and release qualification are separate.
