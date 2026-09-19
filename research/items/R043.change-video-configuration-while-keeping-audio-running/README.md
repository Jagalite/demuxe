<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Change video configuration while keeping audio running

Full identity: `R043.change-video-configuration-while-keeping-audio-running`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Split output exists but native step rejects changed video configuration; no independent future-video commit while audio stays alive exists. Configuration guards are necessary until that transaction is explicit.

Next action: Define one H264 360-to-720 closed-GOP transaction with actual new init; retain audio marker identity and reject failed/misaligned replacement without corrupting prior presentation.

## Definition and contract

New transition experiment · P1 · PROPOSED / NOT TESTED Extends: R15, R28, R35. Reference primitives: S1, S2, L3. Question. Can a user-requested resolution change replace only future video, instead of restarting audio and the complete player? Mechanism. Retain one media element, MediaSource and audio SourceBuffer. Supply the real new video initialization/configuration and start its media at an established random-access boundary. Begin with H.264-to-H.264 size changes; codec changes are a later, separately probed extension. Smallest useful experiment. Create synchronized 360p and 720p encodings of the same numbered frames, with aligned closed GOPs and one unchanged AAC track. Switch 360→720→360 at future boundaries; repeat while paused, during a seek and after deliberately failed preparation. Use a new init segment and changeType only where required by the actual configuration.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R043.change-video-configuration-while-keeping-audio-running.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R043.change-video-configuration-while-keeping-audio-running.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R043.change-video-configuration-while-keeping-audio-running.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R043.change-video-configuration-while-keeping-audio-running.md)
