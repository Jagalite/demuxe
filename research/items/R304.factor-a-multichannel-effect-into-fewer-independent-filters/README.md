<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Factor a multichannel effect into fewer independent filters

Full identity: `R304.factor-a-multichannel-effect-into-fewer-independent-filters`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The scoped Native/Hybrid admitted effect is scalar gain, and FLAC adaptation preserves channels without an 8x8 FIR bank. The exact factorization report is useful algebra, but no current MIMO convolution workload exists in these owners.

Next action: Reopen for a real requested fixed MIMO bank; compare against a shared-transform optimized convolver and full-rank control.

## Definition and contract

Type: Linear DSP structure optimization; mathematical derivation, not a new convolution identity. Let H[k] be the matrix of filter coefficients at delay k. For a filter bank admitting with the same constant matrices A and B at every delay, calculate 1. u[n] = B x[n], 2. vj[n] = sum_k gj[k] uj[n-k], 3. y[n] = A v[n]. Expanding the equations gives y[n] = sum_k H[k] x[n-k]. The result is the same linear operation in exact arithmetic. For an authored eight-input/eight-output bank with r = 2, this means two shared filtered signals surrounded by input/output mixes, rather than treating all 64 input-output responses as unrelated filters. This is a count of logical filtering paths, not a predicted speedup. The correct baseline is an optimized multi-input/multi-output convolver already sharing transforms.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R304.factor-a-multichannel-effect-into-fewer-independent-filters.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R304.factor-a-multichannel-effect-into-fewer-independent-filters.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R304.factor-a-multichannel-effect-into-fewer-independent-filters.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R304.factor-a-multichannel-effect-into-fewer-independent-filters.md)
