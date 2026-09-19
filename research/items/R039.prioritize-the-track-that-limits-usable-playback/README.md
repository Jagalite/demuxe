<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prioritize the track that limits usable playback

Full identity: `R039.prioritize-the-track-that-limits-usable-playback`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Controller already gates on joint usable buffered coverage, but one sequential demux/mux call produces both tracks. No independent per-track fetch/producer credits exist to prioritize audio without extra scanning.

Next action: Show source representation permits independent required-track retrieval before defining asymmetric scheduling; one delayed-audio trace must preserve fairness and distinguish true tail from temporary gap.

## Definition and contract

Follow-on scheduling optimization · P2 · extends R15, R26 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. When video is buffered far ahead but audio is nearly empty, give production/delivery priority to audio rather than continuing to fill video. Base decisions on a contiguous jointly usable interval near the playhead, not total bytes or the farthest buffered endpoint. New question versus prior work. R26 supplies generic credits and watermarks. This is a concrete per-track scheduling policy that tests whether those credits should be asymmetric. Source primitive. MSE defines availability using active track buffers. The scheduling policy is our proposal and must handle holes and actual track-end state. [S3]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R039.prioritize-the-track-that-limits-usable-playback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R039.prioritize-the-track-that-limits-usable-playback.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R039.prioritize-the-track-that-limits-usable-playback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R039.prioritize-the-track-that-limits-usable-playback.md)
