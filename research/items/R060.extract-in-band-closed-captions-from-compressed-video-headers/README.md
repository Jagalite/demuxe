<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract in-band closed captions from compressed video headers

Full identity: `R060.extract-in-band-closed-captions-from-compressed-video-headers`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual registered A53 SEI extraction from authored H264 yields CEA608 pop-on HI matching independent FFmpeg SRT decoder. Existing compressed NALs and all decoded video pixels remain exact; bad parity rejects. Restricted caption state component, not full608/708 renderer or seek restoration.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New subtitle-component route · P1 · Risk: High · PROPOSED / NOT TESTED First environment: Sandbox packet-parser/caption pilot if a trustworthy caption fixture or pinned reference parser is available; renderer integration remains local. Related cards: R19, R41, R48. Proposed mechanism. Extract A/53 caption payloads from H.264 SEI as compressed video passes through the demux path. Feed a bounded, explicit CEA-608 decoder and suitable cue/overlay renderer, while the unchanged video is played by the browser. Captions alone should not force software video decoding. What is new. Earlier cards covered separate ASS, PGS and simple SRT tracks. These captions are carried inside compressed video metadata and require a stateful caption decoder, not merely reading another subtitle track.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R060.extract-in-band-closed-captions-from-compressed-video-headers.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R060.extract-in-band-closed-captions-from-compressed-video-headers.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R060.extract-in-band-closed-captions-from-compressed-video-headers.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R060.extract-in-band-closed-captions-from-compressed-video-headers.md)
- [results/top100/captions/result.json](../../../results/top100/captions/result.json)
