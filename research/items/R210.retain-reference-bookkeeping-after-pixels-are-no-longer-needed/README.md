<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Retain reference bookkeeping after pixels are no longer needed

Full identity: `R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current app holds returned frames and replay packets; opaque decoder references remain FFmpeg/browser-owned. Closing displayed VideoFrames is not evidence that decoder bookkeeping can survive freed reference pixels. The source is only a dependency-DAG model.

Next action: Inspect one pinned software decoder reference structure and prove separate metadata/pixel lifetime on one independent boundary before modifying allocation.

## Definition and contract

A dependency-DAG codec model kept frame metadata after freeing reconstructed pixels. Pixel reads were instrumented, every reconstructed/presented frame matched the retain-all oracle, and freeing a needed reference early triggered the negative control. With decode and presentation interleaved, safe peak pixel storage was 25,920 bytes versus 171,072 bytes for retaining every frame (15.2%). All pixels were released after final consumers while all 33 bookkeeping entries remained. This is a state-lifetime model, not evidence that a browser decoder exposes or can exploit these lifetimes.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R203-R213-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed.md)
