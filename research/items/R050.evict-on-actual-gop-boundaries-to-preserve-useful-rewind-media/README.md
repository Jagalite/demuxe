<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Evict on actual GOP boundaries to preserve useful rewind media

Full identity: `R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media`.

Current scoped decision: **already_implemented**.

Maintained RemuxPlayer.pump with a real SourceBuffer removes to 3.99999 and retains [4,6]. A 4.0001 cutoff removes the entire final GOP. This is executed regression evidence for the existing guard.

Next action: Retain the strict-before-RAP cutoff and a real MSE regression when evolving eviction.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D53 — executed_existing_owner_or_control**: Actual maintained pump plus real MSE preserves the intended last GOP; the 0.1-ms late-cut negative removes it. Regression-only, already implemented.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **already_implemented**. Maintained RemuxPlayer.pump with a real SourceBuffer removes to 3.99999 and retains [4,6]. A 4.0001 cutoff removes the entire final GOP. This is executed regression evidence for the existing guard.

Next action: Retain the strict-before-RAP cutoff and a real MSE regression when evolving eviction.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full identity: `R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (full-completion).

Current eviction chooses known RAPs behind playback and buffered seek checks live ranges plus retained RAP coverage. The proposed application-level boundary mechanism is already present; browser allocation opacity remains.

Earlier next action: No duplicate eviction policy; add one long-GOP rewind regression only when changing retention budgets or RAP mapping.

## Definition and contract

New retention-policy experiment · P2 · PROPOSED / NOT TESTED Extends: R38, R45. Reference primitives: S1, S9, L3. Question. Can keyframe-aware eviction retain more useful rewind coverage under the same buffer budget than arbitrary time cutoffs? Mechanism. Use the actual random-access map to choose eviction boundaries outside current decoding dependencies. Preserve a small useful rewind region and inspect the browser’s resulting ranges, since removal may discard more than the requested interval. Smallest useful experiment. Create short and long closed-GOP variants with the same content. Under a modest explicit budget, alternate forward playback and short backward seeks. Compare a safe time-based cutoff with a GOP-aware cutoff; include a boundary just before the playhead and an evicted-reference negative control.

Output contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Primary metric: Decision power, reproducibility or diagnostic cost without changing the measured player outcome.

Adverse control: A different failure, stale source/hash or malformed record must not count as the intended finding.

## Current stage reconciliation

**already_implemented** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: already_implemented |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media.md)

## Imported D01–D73 screening supplement

Existing decisions and stage gates above remain unchanged. These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D53 — A sub-millisecond eviction error can discard a full extra GOP**: regression_only. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch11_D52-D55/demuxe_batch11/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.

## Ecosystem follow-up EB02

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **regression_only**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

The current pump evicts strictly before a known RAP; R050 already retains real-MSE evidence for the 4.0001 adverse cutoff. Current contract tests cover the same guard. Broader B-frame/preroll refill behavior is not requalified by these Node checks.

Next gate / reopening condition: Keep the strict-before-RAP regression. Reopen only for a reproduced long-GOP/configuration/preroll refill failure in a maintained browser route.

This scoped supplement does not broaden earlier correctness or performance qualification.
