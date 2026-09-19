<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# One atlas video for many synchronized visible clips

Full identity: `R098.one-atlas-video-for-many-synchronized-visible-clips`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current player presents one selected timeline, with no simultaneously visible synchronized grid. Atlas preparation requires re-encoding and forces shared seeking, so it does not preserve arbitrary independent-player behavior.

Next action: For an all-visible synchronized grid request, author four-view atlas and independent references at equal quality, then compare resources including hidden-region cost.

## Definition and contract

Question. Does one aggregate decode use fewer resources than many simultaneous small decodes at the same total pixel rate? What differs from earlier work. Opposite tradeoff to R84 spatial selection: aggregate when many regions are visible instead of avoiding unneeded regions. Input scope. Prepared synchronized clips or views sharing a presentation timeline; first 4 or 9 equal-sized views. Mechanism to test. Encode a mosaic into one video stream, decode once and sample the corresponding regions for independent visual placements. Smallest experiment. 1. Prepare 4-view and 9-view atlas variants with recorded encoding cost. 2. Compare independent videos versus one atlas at equal aggregate pixels, frame rate and measured visible quality. 3. Test edge guards, all-visible and mostly-hidden cases on the same physical adapter.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R098.one-atlas-video-for-many-synchronized-visible-clips.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R098.one-atlas-video-for-many-synchronized-visible-clips.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R098.one-atlas-video-for-many-synchronized-visible-clips.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R098.one-atlas-video-for-many-synchronized-visible-clips.md)
