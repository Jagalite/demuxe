<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Find oversampled peaks by ruling out regions before reconstructing them

Full identity: `R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current output diagnostics do not perform a full finite-filter oversampled peak scan. The report shows a workload-dependent exact digital reference optimization, not an opportunity to replace ordinary playback or its RMS observation.

Next action: Reopen when an actual peak-analysis operation is requested; compare sparse transient and dense high-level inputs against a contiguous full scan.

## Definition and contract

Class: Exact-result branch-and-bound analysis relative to a specified digital reference. Output contract: Same maximum value as a pinned oversampled finite-filter reference, or the same ceiling pass/fail decision. Not a proof of the maximum of every possible analog reconstruction. Related: R199 uses a bound to permit image approximation; this uses bounds to retain the full reference analysis result. FFmpeg's true-peak measurement uses oversampling, and its pinned implementation explicitly runs the resampler and scans resulting samples [S4, S9]. Investigate computing conservative bounds on those samples before evaluating all of them. If M_B bounds absolute source values throughout every input sample needed by an output region B, then:

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them.md)
