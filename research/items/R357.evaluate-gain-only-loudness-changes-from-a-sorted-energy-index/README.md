<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Evaluate gain-only loudness changes from a sorted energy index

Full identity: `R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current gain changes playback, while diagnostics offer RMS rather than a retained integrated loudness query. No hundreds-of-gain-candidates normalization service exists here. Historical libebur128 result is scoped and promising only for such repeated analysis.

Next action: Reopen for repeated normalization analysis and compare sorted queries with fresh reference measurements near both gates.

## Definition and contract

Can many whole-program gain candidates be measured without rerendering audio or scanning every energy window again? The reference loudness algorithm applies an absolute energy gate and then a relative gate based on the energy of retained windows. The pinned libebur128 implementation exposes these calculations and offers list and histogram representations. [S7] Let E_i be the fully weighted energy of each original measurement window BEFORE absolute gating. For one positive amplitude gain g applied to every channel for the entire measured history, energies become g^2 E_i in exact arithmetic. Let A be the absolute threshold expressed as energy. Original windows survive that gate when E_i >= A/g^2, using the pinned reference's boundary convention. Let mu_A(g) be their mean. The final source-domain threshold is:

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index.md)
