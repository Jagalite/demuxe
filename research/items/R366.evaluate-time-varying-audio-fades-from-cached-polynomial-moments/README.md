<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Evaluate time-varying audio fades from cached polynomial moments

Full identity: `R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current player uses scalar playback gain and diagnostic RMS, not repeated fixed-alignment polynomial fade energy queries. Historical result needs about 48 queries plus retained source arrays for cancellation fallback; it does not render chosen audio or compute loudness.

Next action: Reopen for an actual many-query fade-analysis consumer and compare build plus guarded queries with fused persistent mix-energy loop.

## Definition and contract

Hypothesis. Repeated energy/RMS queries for fixed-alignment audio sources with piecewise-polynomial gain automation can reuse a small family of source cross-moments instead of rerendering every candidate waveform. Source basis. Web Audio defines a precise linear-ramp interpolation rule, giving one familiar automation shape. The proposed moment representation and equations are algebraic constructions; they do not establish bit identity with a browser's floating-point audio engine or extend to every automation mode. [S6] Initial gain model. On one query interval I, let source i have g_i[n] = a_i + b_in and y[n] = sum_i g_i[n]x_i[n], with a declared absolute sample grid and fixed source alignment. Cache M_ij,r(I) = sum_(n in I) n^rx_i[n]x_j[n] for r in {0,1,2}.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments.md)
