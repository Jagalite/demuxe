<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Retarget in-flight decoding instead of restarting a forward scrub

Full identity: `R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The UI already commits only the final scrub change; public seeks retire a generation and restore codec entry requirements. No sample-ordinal retargeting owner proves a new target is still ahead or retained. Reusing a decoder based only on timestamps/same GOP would weaken existing source/configuration authority.

Next action: For an explicitly paused I/P exact-scrub profile, trace one continuing GOP and latest-target ordinal eligibility against the existing coalesced baseline; backward/previously released/duplicate-timestamp targets must take an explicit restart path.

## Definition and contract

Separate a source/configuration/decode epoch from the identity of a user's requested output. If a newer forward seek is reachable by continuing the same intact decode sequence, change the requested presentation target without throwing away that sequence's work. Illustrative case: one valid decode job starts at 100.0 seconds; successive requests move from 100.4 to 100.7 to 101.0 seconds. Continue supplying the required coded pictures and publish only the latest committed target. This example is a schedule, not a performance measurement. The index must prove that the requested frame remains ahead of delivered-and-released output, is already retained, or will be produced by continuing the intact sequence. A source timestamp, queue count, or same nominal GOP label alone is not sufficient. Track frame identity through explicit sample ordinals and presentation mapping.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub.md)
