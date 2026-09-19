<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Change video codec while retaining the audio presentation

Full identity: `R058.change-video-codec-while-retaining-the-audio-presentation`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Video configuration/resolution changes from160x96 to320x180 while the original audio SourceBuffer remains alive and audio signal continues. Same-codec geometry case only; cross-codec and gaplessness not asserted.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Follow-on transition hypothesis · P2 · Risk: High · PROPOSED / NOT TESTED First environment: Sandbox MSE pilot; exact codecs and container pair must pass availability checks. Related cards: R43, R32. Proposed mechanism. Extend the successful resolution-only switch to a genuine codec change, initially H.264 in fMP4 to VP9 in WebM and back. Keep one media element, the same MediaSource and the same audio SourceBuffer. This tests whether a codec boundary really requires replacing the whole playback owner. What is new. R43 changed dimensions inside H.264. R32 mixed video and audio containers concurrently. Neither establishes that a single video SourceBuffer can cross codec/container boundaries correctly while audio remains active.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R058.change-video-codec-while-retaining-the-audio-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R058.change-video-codec-while-retaining-the-audio-presentation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R058.change-video-codec-while-retaining-the-audio-presentation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R058.change-video-codec-while-retaining-the-audio-presentation.md)
- [results/top100/lanes/result.json](../../../results/top100/lanes/result.json)
