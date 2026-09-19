<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Gram cache after a fixed FIR effect

Full identity: `R320.gram-cache-after-a-fixed-fir-effect.report-continuity`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

There is no repeated gain-vector energy-analysis stage over fixed filtered stems in current playback. Gram quadratic forms answer aggregate energy only and do not replace actual mixed samples or changing FIR processing.

Next action: For an analysis tool, compare g-transpose-G-g with direct mixed energy over a fixed window, including changed filter/stem identity and clipped nonlinear control.

## Definition and contract

Six synchronized stems were filtered once by the same fixed 65-tap FIR. The candidate cached the 6×6 Gram matrix of those filtered stems. For 180 random gain vectors, g^T G g matched directly mixed-and-measured output to maximum relative error 9.66e-16. The cache is tiny (288 bytes) but construction cost matters: 7.81 ms to build, then 0.087 ms for all cached queries, versus 10.78 ms direct. This is an amortized analysis optimization, not a replacement for producing output samples.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R320.gram-cache-after-a-fixed-fir-effect.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R320.gram-cache-after-a-fixed-fir-effect.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R320.gram-cache-after-a-fixed-fir-effect.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R320.gram-cache-after-a-fixed-fir-effect.report-continuity.md)
