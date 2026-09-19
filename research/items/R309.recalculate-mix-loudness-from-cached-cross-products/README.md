<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recalculate mix loudness from cached cross-products

Full identity: `R309.recalculate-mix-loudness-from-cached-cross-products`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current gain is one scalar playback control; diagnostics expose bounded RMS, not stem-mix loudness analysis. The report proves integer mean-square energy, explicitly not full K-weighted gated LUFS. There is no repeated multistem analysis query here to accelerate.

Next action: Reopen with a concrete repeated mix-analysis consumer; compare window energies before gated loudness against independently rendered mixes.

## Definition and contract

Class: Reusable analysis for interactive fixed-gain mix queries. Output contract: The specified filtered block energies and derived gated loudness of a declared linear mix, within explicit numerical tolerances. Not a waveform or peak reconstruction. Related: R217's summaries and R304's shared linear structure, but computes a different result. For aligned source stems, perform the specified K-weighting once using a common timeline and consistent filter-state history. For each measurement window, retain cross-products between filtered stems. The pinned FFmpeg EBU R128 implementation provides concrete filter, channel-weighting, window, and gating behavior to compare [S4]. For mono filtered stems z_i and a window W of N samples:

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R309.recalculate-mix-loudness-from-cached-cross-products.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R309.recalculate-mix-loudness-from-cached-cross-products.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R309.recalculate-mix-loudness-from-cached-cross-products.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R309.recalculate-mix-loudness-from-cached-cross-products.md)
