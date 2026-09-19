<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize a nonlinear peak-release envelope using composable summaries

Full identity: `R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current admitted scalar gain and ring output do not compute max-decay envelopes. The report exact/toleranced prefix result is for a specific recurrence and cannot replace a differently defined compressor or limiter.

Next action: Reopen when a consumer requests this exact envelope; compare both local passes and summary prefix with optimized sequential output.

## Definition and contract

Mechanism and declared output. For finite nonnegative magnitudes p_n and a fixed 0 <= a <= 1, define e_n = max(p_n, ae_(n-1)). Each block maps incoming state to outgoing state as F(e) = max(Ae, B). Consecutive blocks compose as (A2A1, max(A2B1, B2)). The operation is associative over real arithmetic and can support a parallel prefix over block summaries. First experiment. Independent workers compute local summaries; prefix composition supplies true incoming states; workers produce their assigned envelope intervals. Compare every result with a straightforward sequential implementation of this exact recurrence. Test impulses across boundaries, long decay tails, initial nonzero state, a=0, a=1, ties, tiny numbers, and irregular job sizes. NaN/infinity policy must be explicit.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries.md)
