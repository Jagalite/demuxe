<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Raw AAC/MP3 audio beside fragmented video

Full identity: `R031.raw-aac-mp3-audio-beside-fragmented-video`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Raw AAC audio SourceBuffer beside fragmented AVC video plays marked audio through both geometry intervals and EOF. Priming/offset and production append lifecycle still need integration checks.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New route candidate · P1 · extends R15 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. For a controlled MSE presentation, avoid wrapping an already usable compressed audio elementary stream in MP4. Keep H.264 video in its own fMP4 buffer and try raw ADTS AAC or MPEG audio in the audio buffer, with one video element owning A/V playback. New question versus prior work. R15 changed audio codecs inside MP4 packaging. This asks whether the audio mux stage can be omitted entirely. It is not a replacement for original Native playback when that already works. Source primitive. The MPEG-audio MSE note defines audio/aac and audio/mpeg. The registry marks these as generated-timestamp streams. [S1, S2] Why testable here. Uses native FFmpeg packaging and ordinary window MSE. Tiny destination checks can run using injected bytes, without a secure-origin encoder or new Wasm.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R031.raw-aac-mp3-audio-beside-fragmented-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R031.raw-aac-mp3-audio-beside-fragmented-video.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R031.raw-aac-mp3-audio-beside-fragmented-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R031.raw-aac-mp3-audio-beside-fragmented-video.md)
- [results/top100/lanes/result.json](../../../results/top100/lanes/result.json)
