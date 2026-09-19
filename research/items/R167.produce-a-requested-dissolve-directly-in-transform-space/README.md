<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Produce a requested dissolve directly in transform space

Full identity: `R167.produce-a-requested-dissolve-directly-in-transform-space`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The current presenter already has decoded surfaces, so a requested display dissolve can blend there. Transform-space JPEG output differs at intermediate alpha and needs entropy serialization; it is an export representation, not a pixel-identical live-display shortcut.

Next action: For an explicit JPEG dissolve export, define coefficient/blend rounding domain and compare endpoints exactly plus intermediate tolerated error, including mismatched tables.

## Definition and contract

Combine compatible JPEG dequantized coefficients for an explicitly requested dissolve, then serialize valid output. Specify blend domain, rounding and fidelity; compare ordinary GPU display separately.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R167.produce-a-requested-dissolve-directly-in-transform-space.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R167.produce-a-requested-dissolve-directly-in-transform-space.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R167.produce-a-requested-dissolve-directly-in-transform-space.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R167.produce-a-requested-dissolve-directly-in-transform-space.md)
