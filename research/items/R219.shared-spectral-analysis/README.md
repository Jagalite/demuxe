<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# shared spectral analysis

Full identity: `R219.shared-spectral-analysis`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The current browser audio stage is a PCM consumer; the qualified filter subset is scalar volume, with no repeated source FFT across multiple FIR outputs. Shared FFT algebra is valid but there is no duplicated transform at this owner to remove.

Next action: If a multichannel convolution plan is requested, audit its baseline FFT sharing first and compare complete identical tails, latency and sample error.

## Definition and contract

The host experiment processed 192,000 float64 samples through four 513-tap impulse responses using identical 2,048-point overlap-save blocks. The separate path recomputed the source FFT four times per block; the candidate computed it once and reused X for four IFFT(X  H_k) outputs. The outputs had 0.0 maximum absolute difference. Median times over seven alternating runs were 17.80 ms separate versus 12.33 ms shared, a 1.44× speedup, with the same 512-sample algorithmic history/latency. This is a host numerical component result, not a browser audio-device benchmark.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R219.shared-spectral-analysis.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R219.shared-spectral-analysis.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R219.shared-spectral-analysis.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R219.shared-spectral-analysis.md)
