<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# compressed-fragment rewind cache

Full identity: `R143.compressed-fragment-rewind-cache.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Buffered seeks already reuse live MSE; evicted fragments are not retained as compressed payload cache and source readers are retired on restart. Rewind-after-eviction needs bounded source/codec-keyed compressed ownership separate from MSE receipts.

Next action: Specify one two-fragment byte-capped rewind cache with init/RAP dependencies; evict then reappend exact bytes and verify target frame, changed source or codec epoch must invalidate cache.

## Definition and contract

Three 1-second fragments were buffered and playback advanced beyond 2.1 s. The test paused, removed the first second, observed the range begin at 1.066666 s, then re-appended the original first compressed fragment byte-for-byte. The range returned to 0.066666–3.066666 s. After seeking backward to 0.35 s, frame callbacks resumed at ~0.333 s and continued normally. No MediaSource replacement, re-mux, or decoder session rebuild was required by the application. Implication. A bounded compressed-fragment cache can support rewind after MSE eviction cheaply in application memory, which is much smaller than caching decoded video frames for the same time span.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R143.compressed-fragment-rewind-cache.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R143.compressed-fragment-rewind-cache.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R143.compressed-fragment-rewind-cache.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R143.compressed-fragment-rewind-cache.report-continuity.md)
