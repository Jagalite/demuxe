<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Repack independent stereo FLAC as mid-side using parity-state residuals

Full identity: `R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current encoder can choose stereo representation; no residual-domain adapter exists. Historical parity conversion saves correlated-fixture bytes but is slightly slower than PCM M/S arithmetic, and source was forced to independent order1. Natural occurrence and total destination value are unproven.

Next action: Count independently coded order1 stereo frames in one real input; compare leave-unchanged, restricted encoder and parity transform including entropy and scratch costs.

## Definition and contract

Can stereo decorrelation be performed on prediction residuals without reconstructing both full-amplitude channels? FLAC defines independent stereo and reversible mid-side stereo. Its mid channel uses a right-shifted sum, and its side channel needs an additional precision bit. Fixed predictors and residuals provide a precise restricted input profile. [S6] Define e[n] = (L[n] + R[n]) mod 2, with e in {0,1}, including for negative sums. Then: The parity state can be advanced without reconstructing L or R: rM[n] = (rL[n] + rR[n] - e[n] + e[n-1]) / 2 rS[n] = rL[n] - rR[n] The numerator for rM is even. The parity correction preserves the floor behavior that a naive average of residuals would lose. Convert the first warm-up samples into M[0], S[0], and e[0]; then Rice-encode the transformed residuals and construct truthful mid-side framing.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals.md)
