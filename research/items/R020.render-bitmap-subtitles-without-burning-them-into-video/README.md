<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Render bitmap subtitles without burning them into video

Full identity: `R020.render-bitmap-subtitles-without-burning-them-into-video`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual PGS complete-object literal bitmap display/clear decoder matches independent FFmpeg overlay at8 samples; truncated segment rejects. Exact event-boundary timing remains unqualified after oracle frame-sync discrepancy; general RLE/fragmented objects/native overlay ownership remain outside component.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Subtitles · New complete-plan hypothesis · P2 · Risk: High First environment: Subtitle decoder build + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Add a bounded PGS bitmap decoder/output adapter that overlays palette rectangles on Native video. Treat DVD/VobSub as a separate future profile rather than one universal bitmap-subtitle implementation. Source basis. FFmpeg n7.1.1 PGS decoding outputs SUBTITLE_BITMAP rectangles, palettes and forced flags. Its code states that display/clear events define the end of a cue rather than an explicit duration. [F3] First agent experiment. Use PGS overlap, forced flags, palette changes, clear events and a seek into an active display. Compare final composition and lifetime with native mpv while recording decoded video activity.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R020.render-bitmap-subtitles-without-burning-them-into-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R020.render-bitmap-subtitles-without-burning-them-into-video.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R020.render-bitmap-subtitles-without-burning-them-into-video.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R020.render-bitmap-subtitles-without-burning-them-into-video.md)
- [results/top100/pgs/result.json](../../../results/top100/pgs/result.json)
