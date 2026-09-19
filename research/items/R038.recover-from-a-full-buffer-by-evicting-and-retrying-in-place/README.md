<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover from a full buffer by evicting and retrying in place

Full identity: `R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

After an injected one-shot quota refusal, real buffered removal plus one retry reaches marked A/V/EOF; second quota fails afterone retry and InvalidStateError is not retried. No genuine memory-pressure or production controller qualification claimed.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Follow-on resource optimization · P1 · extends R17, R26 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. Treat an append capacity shortage as a buffer-management event: remove a safe expendable interval, reduce forward production if appropriate, then retry the still-owned media once instead of rebuilding the player. New question versus prior work. The prior lab encountered a SourceBuffer-count limit. This proposal targets append capacity and controller behavior, not adding/removing more SourceBuffers or promising a fixed browser quota. Source primitive. Chrome documents QuotaExceededError recovery through removal and retry, with cautions about the current GOP. Its published quota sizes are historical and are not used here. [S8]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md)
- [results/full-completion/fragments/result.json](../../../results/full-completion/fragments/result.json)
