<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact incremental image statistics

Full identity: `R264.exact-incremental-image-statistics`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The report assumes sparse edits of a persistent scalar image with per-tile histograms. Current presenter draws changing full video frames and has no persistent histogram/statistics consumer; two bounded pixel checks are not such a workload.

Next action: Reopen with an actual scalar-image statistics consumer and sparse edit rectangles; compare subtract-old/add-new global histogram with full recomputation.

## Definition and contract

A 2048×2048 8-bit image was partitioned into 64×64 tiles. Each tile owns an exact 256-bin histogram. Global state is updated by subtracting the old tile histogram and adding the new one. Result. Incremental global histograms matched a full-image recomputation after every edit. Final pixel count, sum, mean, percentiles, min, and max all derive from the exact global histogram. Timing was 0.0115s incremental versus 0.725s for full recomputation over the same 80 edits, a 63.2× corpus-level improvement. The no-subtraction negative control drifted immediately. Boundary. 8-bit scalar histogram only. HDR/float statistics need explicit binning/exact-sum/NaN policy, and GPU readback cost is outside this probe.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R264.exact-incremental-image-statistics.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R264.exact-incremental-image-statistics.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R264.exact-incremental-image-statistics.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R264.exact-incremental-image-statistics.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
