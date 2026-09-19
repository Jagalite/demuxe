<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make parallel audio quantization deterministic without shared random state

Full identity: `R246.make-parallel-audio-quantization-deterministic-without-shared-random-state`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The Philox source provides concrete deterministic-worker correctness, distinct from unspecified legacy dither equality. Current playback has no Q8-to-integer parallel render stage; the reported worker results do not justify inserting quantization into this lossless path.

Next action: For a new permitted quantizer, reuse published known-answer vectors and absolute counter mapping, then compare canceled/replayed workers at 2^32 and 2^48 boundaries.

## Definition and contract

A JavaScript Philox4x32-10 implementation was checked against three published Random123 known-answer vectors and an independently implemented vectorized Python integer oracle.[S5] The counter contains absolute sample-index low/high words, stable channel identity and separate draw identity; the key is the render seed. Two draws generate the explicitly specified unshaped triangular dither. Input is exact Q8 in output-LSB units, with a declared rounding and saturation rule. Cases span zero, the 2^32 boundary, and 2^48+9, two stable channel identities, fractional half-LSB inputs and output clipping boundaries. Four Node workers exercised reverse/shuffled jobs, native worker termination followed by replay, and output-slot reordering. 163,952 output comparisons were exact. A negative per-chunk index reset produced 21,206 mismatches.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R246.make-parallel-audio-quantization-deterministic-without-shared-random-state.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R246.make-parallel-audio-quantization-deterministic-without-shared-random-state.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R246.make-parallel-audio-quantization-deterministic-without-shared-random-state.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R246.make-parallel-audio-quantization-deterministic-without-shared-random-state.md)
