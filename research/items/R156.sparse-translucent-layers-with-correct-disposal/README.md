<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sparse translucent layers with correct disposal

Full identity: `R156.sparse-translucent-layers-with-correct-disposal`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (full-completion).

For the maintained subtitle overlay, old/current bounds are unioned, the bounded staging canvas is reset, all current tiles are redrawn and only that region is uploaded. This already applies sparse presentation with disposal at that specific layer owner. It does not implement a compressed layered-video format or claim reduced physical GPU traffic.

Next action: Reopen for measured layer/overlay redraw work outside the existing bounded dirty region; use overlap/disappearance pixel controls and preserve redraws of every still-visible translucent tile.

## Definition and contract

A browser canvas reconstructs 60 frames from one background and one reusable translucent sprite, including a moving instance, a stationary overlapping instance, and a disappearance interval. The sparse path clears/restores a bounded dirty rectangle and clips redraws; a separate full-canvas redraw is the oracle. All 60 RGBA frames are identical. Accumulated dirty-rectangle area is 134,624 pixels, versus 3,686,400 pixels for full redraw. This is a geometry/work-envelope count—not measured GPU bandwidth, physical updates or CPU time. The no-clear negative leaves ghosts and fails the pixel oracle. Assets were already decoded; the pilot establishes correct sparse presentation/disposal, not a complete compressed layered-video format or a comparison with an efficient standard video codec.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

## Current stage reconciliation

**already_implemented** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: already_implemented |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R156.sparse-translucent-layers-with-correct-disposal.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R156.sparse-translucent-layers-with-correct-disposal.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R156.sparse-translucent-layers-with-correct-disposal.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R156.sparse-translucent-layers-with-correct-disposal.md)
