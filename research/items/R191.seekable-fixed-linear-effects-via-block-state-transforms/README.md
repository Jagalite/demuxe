<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# seekable fixed linear effects via block state transforms

Full identity: `R191.seekable-fixed-linear-effects-via-block-state-transforms`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Effects are delegated to mpv; the app does not own fixed biquad block-state transforms or an edit timeline. Report double-precision model cannot serialize arbitrary Web Audio/mpv internal state, and no new effect subsystem is warranted in first pass.

Next action: Identify one controlled fixed biquad owner and compare one prefix transform-derived seek state against continuous replay before integration.

## Definition and contract

For each 128-sample block the experiment cached an affine state transform s_out = M s_in + b. These transforms compose as (M2,b2) o (M1,b1) = (M2 M1, M2 b1 + b2). - complete audio output matched continuous filtering exactly in the implemented double-precision recurrence; - maximum seek-state error: 2.78e-16; - 35 edit-plan final states differed by at most 2.78e-16; - transform vs checkpoint seek state differed by at most 6.11e-16. State-only benchmark medians in this Python implementation: - derive 35 plan end states by sample replay: 452.3 ms; - compose cached transforms: 9.77 ms (46.3×); - 300 checkpoint/replay seek-state queries: 248.5 ms; - cached prefix-transform queries: 0.507 ms (489.6×).

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R191.seekable-fixed-linear-effects-via-block-state-transforms.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R191.seekable-fixed-linear-effects-via-block-state-transforms.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R191.seekable-fixed-linear-effects-via-block-state-transforms.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R191.seekable-fixed-linear-effects-via-block-state-transforms.md)
