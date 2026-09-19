<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Let channel reduction cross the resampler boundary

Full identity: `R238.let-channel-reduction-cross-the-resampler-boundary`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The audited native adaptation contract preserves channel layout and sample rate; there is neither requested channel reduction nor resampling to reorder. Adding downmixing would change output semantics rather than optimize this profile. Software filter routes require their own libswresample audit.

Next action: Reopen for an explicitly requested fixed downmix plus resampling route; inspect actual library matrix ordering and compare delay/sample count/numerical output before changing it.

## Definition and contract

For already-requested fixed mixing and compatible linear resampling, compare mixing first with resampling every input channel. Audit libswresample's existing operation ordering; preserve delay, samples and numerical contract.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R238.let-channel-reduction-cross-the-resampler-boundary.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R238.let-channel-reduction-cross-the-resampler-boundary.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R238.let-channel-reduction-cross-the-resampler-boundary.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R238.let-channel-reduction-cross-the-resampler-boundary.md)
