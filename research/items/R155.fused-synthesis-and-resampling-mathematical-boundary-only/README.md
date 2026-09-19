<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fused synthesis and resampling: mathematical boundary only

Full identity: `R155.fused-synthesis-and-resampling-mathematical-boundary-only`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The maintained adaptation contract forbids resampling, and the historical dense 24MiB matrix only verifies linear composition. It lacks real AAC transforms, streaming edge handling and comparison against a fast implementation; no optimization is supported.

Next action: Only after a requested fixed-rate conversion exists, inspect an actual synthesis/resample boundary and derive a structured fused kernel with identical delay/tails.

## Definition and contract

Composed the same long-window synthesis/overlap operator with a 31-tap, fixed 2:1 downsampling operator. Zero, random, impulse, previous-tail and tiny-input cases produce the same 1,024 output samples as the separate operations, with maximum absolute floating-point difference 1.39e-16. The comparison uses identical centered-filter delay and zero-padding conventions. The fused dense matrix occupies 25,165,824 bytes (24 MiB) and took 186.72 ms to prepare in this run. It is not proposed as a competitive decoder implementation. There is no comparison against a fast transform, no real AAC decoder modification and no proof of streaming boundary/future-sample handling. This verifies linear composition for a restricted model. Actual AAC fusion remains not tested, and there is no performance win to report.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R155.fused-synthesis-and-resampling-mathematical-boundary-only.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R155.fused-synthesis-and-resampling-mathematical-boundary-only.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R155.fused-synthesis-and-resampling-mathematical-boundary-only.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R155.fused-synthesis-and-resampling-mathematical-boundary-only.md)
