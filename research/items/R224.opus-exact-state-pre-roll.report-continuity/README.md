<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Opus exact-state pre-roll

Full identity: `R224.opus-exact-state-pre-roll.report-continuity`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The report contains a concrete counterexample to treating an ordinary 80 ms Opus preroll as bit-exact state restoration. Current packet-copy Opus and browser seek behavior expose no decoder-state witness; original compressed packets cannot justify an exactness claim. The report fixture first passes at 600 ms but supplies no universal bound.

Next action: For a specifically requested bit-exact Opus seek mode, establish output/state closure on that exact decoder/stream against uninterrupted PCM; do not generalize either 80 or 600 ms to all streams.

## Definition and contract

The fixture has 501 original 20-ms Opus audio packets. A fresh libopus decoder was started at increasing packet distances before target packet 250; no packet was re-encoded. Zero pre-roll differs substantially (first-target-packet maximum float difference 0.333295). At 80 ms, the first-target-packet maximum difference falls to 0.042560, but it is still not bit-exact. In this fixture the first tested window that reproduces the entire remaining decoder output exactly is 30 packets / 600 ms. This does not establish a universal 600-ms Opus requirement. It establishes that “seek with original packets” and “bit-exact decoder state” are separate properties, and a Demuxe exactness mode must measure/qualify state closure rather than treating a normal perceptual seek pre-roll as proof of bit identity.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R224.opus-exact-state-pre-roll.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R224.opus-exact-state-pre-roll.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R224.opus-exact-state-pre-roll.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R224.opus-exact-state-pre-roll.report-continuity.md)
