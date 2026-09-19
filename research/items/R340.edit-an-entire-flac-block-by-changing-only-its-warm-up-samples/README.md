<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Edit an entire FLAC block by changing only its warm-up samples

Full identity: `R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current lossless adaptation preserves samples; constant-offset editing is a new explicit request and bitstream transformer. Historical order1 +300 proof is sound for its profile but uses an explicit unknown MD5 policy and requires interior headroom analysis.

Next action: Specify one opt-in offset derivative, audit real fixed-order frequency and count range-analysis cost before a bounded warm-up patcher.

## Definition and contract

Type: Exact compressed-domain preparation for an explicitly requested signal edit. Related: R299 and R322. Status: PROPOSED. A fixed-predictor FLAC subframe stores its first p samples explicitly and then codes prediction residuals. For its order-p fixed predictor, those residuals are the p-th backward differences of the signal. The format and libFLAC implementation provide the concrete basis. [S4, S5] For a requested integer-valued correction q[n] whose polynomial degree is less than p: Delta^p (x + q) = Delta^p x, because Delta^p q = 0. Therefore the same coded residuals can reconstruct the corrected signal if the warm-up values are replaced by x[j] + q[j] for j = 0 ... p-1. The smallest case is a constant offset and order 1: (x[n] + c) - (x[n-1] + c) = x[n] - x[n-1]. Change one warm-up sample; retain the residual bits. For order 2, a constant or integer linear trend can be represented by changing two warm-ups.

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
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples.md)
