<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use different output containers for different tracks

Full identity: `R032.use-different-output-containers-for-different-tracks`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Independent MP4 AVC video and WebM Opus audio SourceBuffers play both video geometry intervals with880Hz audio to EOF. Technically viable mixed-container lane destination; not an automatic routing change.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New route candidate · P1 · extends R15 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. Try one MediaSource with H.264 video in fMP4 and Opus or Vorbis audio in WebM. Select packaging per track rather than insisting on one common mux format for the entire presentation. New question versus prior work. The prior audio-switch experiment used AAC/FLAC/Opus in MP4. This tests a mixed-container pair and whether that avoids unnecessary audio repackaging or an otherwise unavailable joint mux combination. Source primitive. MSE has distinct MP4 and WebM byte-stream specifications. Their individual validity does not establish that this browser accepts both together. [S3–S5] Why testable here. Only native FFmpeg muxing and window-owned MSE are required. Mixed-format support itself remains the first experiment.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R032.use-different-output-containers-for-different-tracks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R032.use-different-output-containers-for-different-tracks.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R032.use-different-output-containers-for-different-tracks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R032.use-different-output-containers-for-different-tracks.md)
- [results/top100/lanes/result.json](../../../results/top100/lanes/result.json)
