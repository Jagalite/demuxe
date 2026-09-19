<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Construct a selected-track MP4 view without remuxing samples

Full identity: `R059.construct-a-selected-track-mp4-view-without-remuxing-samples`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Both front- and tail-moov Blob views play the requested second AAC tone through seek/EOF with5368 metadata bytes edited and unchanged214 selected packet payloads/timestamps/durations. Must enable the selected tkhd track; hiding the old track alone produced silent browser audio despite valid ffprobe output.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New local-file packaging route · P1 · Risk: High · PROPOSED / NOT TESTED First environment: Sandbox Blob/File and direct-video pilot; local, finite, unencrypted MP4 only. Related cards: R46. Proposed mechanism. For a local MP4 whose requested audio cannot be selected through the browser track API, expose a virtual file containing only the desired track declarations while reusing the original media bytes. Begin by replacing unselected trak boxes with equally sized free boxes in a bounded copy of moov, retaining its size and position. Compose prefix + edited moov + suffix from Blob slices. What is new. R46 constructed new fragmented MP4 sample tables for MSE. This route preserves the ordinary MP4 sample layout and uses direct playback; it is a targeted metadata view, not an alternative general demuxer or a remote authenticated proxy.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md)
- [results/full-completion/r59/result.json](../../../results/full-completion/r59/result.json)
