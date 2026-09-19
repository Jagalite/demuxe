<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recompute lookahead gain only where an edit can affect it

Full identity: `R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

There is no finite-window sample-peak edit processor in current playback adaptation. Historical incremental results qualify only the stated gain rule, not FFmpeg alimiter with recursive release. Ordinary playback gain changes do not create sparse source edits.

Next action: Reopen for a bounded audio-edit consumer; compare sparse edit invalidation with a monotonic-deque complete scan including removed unique maxima.

## Definition and contract

Type: Exact incremental evaluation of a declared nonlinear finite-window operator. Related: R265, R294, and R317. Status: PROPOSED. Start with a specified mono sample-peak gain operator, not an unspecified production limiter: g[n] = 1 if p[n] = 0; otherwise g[n] = min(1, T/p[n]) W >= 1 and T > 0 are fixed. With explicitly defined end padding and W-1 samples of live lookahead delay, this is a reproducible reference operation. If input samples change only in the half-open interval [a,b), only windows starting in [a-W+1,b) can contain changed data. Outside that interval, both input and gain output remain unchanged. Maintain a range-maximum structure and recompute only the affected region. Within it, some gains may also be certified unchanged: an unchanged sample still attains the old maximum, and every edited value in that window is no larger. This condition must be verified, not inferred from the edit's average level.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it.md)
