<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reuse one MSE presentation across a queue or repeat loop

Full identity: `R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current source start replaces MediaSource and resets source frames/ranges. Queue-wide logical source identities, offsets, subtitle events and bounded next-item ownership are missing.

Next action: Define a two-clip queue mapping before one continuous-MSE join; use matching H264/AAC configuration and test cross-boundary seek, with changed queued source invalidating late bytes.

## Definition and contract

New session-plan candidate · P2 · extends R09, R18 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. Append the next compatible clip into a continuous browser timeline instead of opening a new player for every queue item. Reuse compressed media for an explicit loop while keeping only bounded current/next output. New question versus prior work. R18 caches already-prepared intervals within a source. This targets the transition between explicitly queued items and repeat boundaries, with a logical source-to-presentation mapping. Source primitive. MSE provides timestamp offsets and append windows. Chrome has an audio gapless-playback example; it is not proof of gapless A/V queue transitions. [S3, S7] Why testable here. Compatible encoded clips, offset mapping and window MSE are sufficient for the first browser pilot.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop.md)
