<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recompute video effects only where the input actually changed

Full identity: `R244.recompute-video-effects-only-where-the-input-actually-changed.report-a`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current presentation receives complete frames with no trustworthy effect-damage metadata. The reported full compare/retain/halo CPU implementation is 3.28x slower despite fewer evaluated blur pixels, so porting that discovery scheme has negative evidence.

Next action: Revisit only a cheap producer-supplied damage map; compare all final pixels including blur halo, subtitle changes and seek invalidation before measuring a GPU path.

## Definition and contract

A CPU model retained intermediate blur, pointwise-color and subtitle-composite surfaces. Actual changed pixels were discovered by comparing consecutive source arrays. Damage was expanded by the 3×3 blur footprint; color-parameter changes, subtitle changes and an explicit seek reset invalidated the appropriate outputs. The 96-frame 256×144 trace was compared against full recomputation for 3,538,944 final pixels with zero mismatches. Another 150 randomized edge/discontinuity/parameter cases also matched. A repeated identical input required no additional effect evaluation. Omitting the blur halo generated 116,265 mismatches, so the control detected the dependency error. Blur work fell from 3,538,944 to 96,175 pixels, a 97.28% reduction, but the actual CPU prototype was slower: 32.93 ms full recomputation versus 108.14 ms incremental, approximately 3.28×. Eight measured runs per construction followed warmup, with rotated order; the timing includes damage discovery, retained copies and the same reset event. Pixel-area reduction is emphatically not a speedup measurement.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R244.recompute-video-effects-only-where-the-input-actually-changed.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R244.recompute-video-effects-only-where-the-input-actually-changed.report-a.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R244.recompute-video-effects-only-where-the-input-actually-changed.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R244.recompute-video-effects-only-where-the-input-actually-changed.report-a.md)
