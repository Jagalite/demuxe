<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Switch same-codec audio at a future boundary without pausing

Full identity: `R035.switch-same-codec-audio-at-a-future-boundary-without-pausing`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current selection pauses/restarts full remux; no future audio splice commit or rollback state exists. Keeping video and old-audio prefix across an unpaused boundary requires the missing audio transaction.

Next action: First define same-configuration FLAC future-boundary transaction; compare exact digital marker boundary and video frame identity, cancel before commit, reject any gap/repeat rather than widening tolerance.

## Definition and contract

Follow-on transition experiment · P1 · extends R15 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. Preserve the buffered old-audio prefix up to a future switch time T, replace only later audio with an equivalent-configuration selected track, and let the current video and playhead continue. New question versus prior work. The saved R15 harness pauses, clears the audio buffer, changes type and resumes. This tests a non-pausing same-codec splice; the earlier result does not establish seamlessness. Source primitive. MSE exposes append windows, timestamp offsets and range removal; audio gap/overlap behavior requires output-level validation. [S3, S7] Why testable here. The same MSE and Web Audio observation tools used by R15 are available. Only generated same-codec media is needed initially.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing.md)
