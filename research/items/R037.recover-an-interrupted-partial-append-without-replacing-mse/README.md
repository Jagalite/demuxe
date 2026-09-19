<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover an interrupted partial append without replacing MSE

Full identity: `R037.recover-an-interrupted-partial-append-without-replacing-mse`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Actual SourceBuffer abort after incomplete moof or sample allows complete target-RAP append and marked A/V through EOF without replacing MSE. Generation flag in harness is only a model, not validation of maintained stale-message ownership.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Follow-on recovery optimization · P1 · extends R04, R15 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. On a same-source seek during partial media delivery, retire obsolete input, reset only the affected parser state, and start a valid segment near the new target while preserving unrelated accepted buffers. New question versus prior work. This combines partial transport with seek recovery. It tests whether an incomplete mdat forces full presentation replacement, not whether a corrupted source should be ignored. Source primitive. MSE defines abort/parser-reset behavior and a subsequent random-access requirement. Reset may process complete buffered frames before discarding remaining input bytes. [S3]

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
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R037.recover-an-interrupted-partial-append-without-replacing-mse.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R037.recover-an-interrupted-partial-append-without-replacing-mse.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R037.recover-an-interrupted-partial-append-without-replacing-mse.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R037.recover-an-interrupted-partial-append-without-replacing-mse.md)
- [results/full-completion/fragments/result.json](../../../results/full-completion/fragments/result.json)
