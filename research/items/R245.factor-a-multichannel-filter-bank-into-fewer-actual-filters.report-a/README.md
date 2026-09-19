<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Factor a multichannel filter bank into fewer actual filters

Full identity: `R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The current admitted audio graph has no exactly factorizable FIR bank; the host rank-two win depends on supplied factors and excludes clipping. No 16-to-2 filter transformation applies to scalar volume or arbitrary filters.

Next action: If a matrix convolution bank is introduced, verify exact coefficient factorization and compare to the existing shared-FFT baseline, with perturbation and intermediate-clipping controls.

## Definition and contract

A synthetic four-input/four-output FIR bank was authored with an exact rank-two constant factorization across the complete impulse responses. A separate integer direct-convolution oracle and the factored construction agreed for all 2,196 samples. Clipping the intermediate mix deliberately invalidated equivalence, producing 2,195 differing samples. Perturbing one filter coefficient was rejected by the supplied-factor equality check. For the floating implementation, the baseline is a uniform-partitioned matrix convolver that already shares each input FFT across outputs. It is not 16 isolated FFT pipelines. The candidate mixes four inputs to two, runs two independent filter paths, then mixes to four outputs. Partition size, input length, output length, zero initial state and full tails are identical. No impulse-response normalization is silently applied.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a.md)
