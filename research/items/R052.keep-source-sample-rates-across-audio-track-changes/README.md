<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep source sample rates across audio-track changes

Full identity: `R052.keep-source-sample-rates-across-audio-track-changes`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current track change remuxes at source time, copying original rate; preserving only video while swapping 44.1/48k audio needs missing per-track transaction and priming map.

Next action: Define one paused AAC same-profile rate switch and inspect new initialization, PCM marker speed and tail; wrong-rate description or failed backward restoration must reject.

## Definition and contract

New format-transition experiment · P2 · PROPOSED / NOT TESTED Extends: R15, R16, R35. Reference primitives: S1, S5, S8. Question. Can switching between 44.1 and 48 kHz audio preserve video and original audio packets, rather than normalizing all tracks into one encoded format? Mechanism. Reconfigure only the audio initialization/configuration at an explicit switch boundary. Begin with the same AAC profile and stereo layout at different sample rates, preserving each track’s own source clock and priming. Smallest useful experiment. Generate distinct 44.1/48 kHz tracks and hold one video buffer. Test both directions with new initialization data, then compare the supported same-SourceBuffer procedure against a full reopen. Include nonzero offsets, pause, backward restoration and failed replacement.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R052.keep-source-sample-rates-across-audio-track-changes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R052.keep-source-sample-rates-across-audio-track-changes.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R43_R57.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R052.keep-source-sample-rates-across-audio-track-changes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R052.keep-source-sample-rates-across-audio-track-changes.md)
