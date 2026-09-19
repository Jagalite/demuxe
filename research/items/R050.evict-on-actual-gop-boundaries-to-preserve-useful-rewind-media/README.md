<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Evict on actual GOP boundaries to preserve useful rewind media

Full identity: `R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (full-completion).

Current eviction chooses known RAPs behind playback and buffered seek checks live ranges plus retained RAP coverage. The proposed application-level boundary mechanism is already present; browser allocation opacity remains.

Next action: No duplicate eviction policy; add one long-GOP rewind regression only when changing retention budgets or RAP mapping.

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
