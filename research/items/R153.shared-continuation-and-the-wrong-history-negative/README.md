<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Shared continuation and the wrong-history negative

Full identity: `R153.shared-continuation-and-the-wrong-history-negative`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current source replacement retires generation and buffered reuse requires same source/RAP coverage; there is no branch-composition owner. The wrong-history counterexample proves shared timestamps/configuration are insufficient without a clean continuation boundary.

Next action: Represent one A/B branch plus shared RAP continuation and compare exact frames against full-source MSE; append a non-RAP continuation as a required negative.

## Definition and contract

Two alternative one-second H.264 branches, red or green, append the identical compressed blue continuation at a clean random-access boundary on one MSE SourceBuffer. Both branches show the continuation, survive backward/forward seeks and reach EOF. The shared continuation SHA-256 is recorded. A separate negative uses a non-random-access continuation taken from a long-GOP pattern stream after an unrelated green history. MSE accepts the bytes, but output is dramatically different from the same full-source MSE oracle (mean RGBA error 84.25/255, maximum 255). The useful result is bounded continuation reuse plus an explicit decoder-history requirement. Matching timestamps and configuration are insufficient. No merge of arbitrary predictive states, seamless audio branch switching, or network prefetch saving is claimed.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R153.shared-continuation-and-the-wrong-history-negative.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R153.shared-continuation-and-the-wrong-history-negative.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R153.shared-continuation-and-the-wrong-history-negative.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R153.shared-continuation-and-the-wrong-history-negative.md)
