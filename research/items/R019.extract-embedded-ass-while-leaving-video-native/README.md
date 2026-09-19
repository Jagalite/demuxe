<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract embedded ASS while leaving video Native

Full identity: `R019.extract-embedded-ass-while-leaving-video-native`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Restricted Matroska range reader extracts3 ASS cues and exact attached font with764367bytes read from7.87MB source under2MiB cap, skipping media payloads. Actual libass tiles match independent demux on correct muxed timeline, including long active cue15s, rewind and stale publication guard.8372 tiny reads need coalescing before remote use; no default Native admission.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Subtitles · New complete-plan hypothesis · P1 · Risk: High First environment: Demux/libass builds + browser. Dependencies: R01. Status: Untested hypothesis. Proposed mechanism. Use bounded demuxing to extract the selected embedded ASS/SSA stream, codec-private data and fonts, and feed the existing Native overlay. Prefer sharing reads with preparation rather than opening a second whole-file scanner. Source basis. Demuxe’s registry distinguishes Native external ASS from mpv subtitle semantics. Its Native renderer already accepts subtitle assets and fonts; embedded extraction and timestamp mapping are additional responsibilities. [D1, D2] First agent experiment. Start with one MKV track with embedded fonts and an active cue at a distant seek. Compare with matched mpv/libass output, including attachment selection, source replacement and long subtitle tails.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R019.extract-embedded-ass-while-leaving-video-native.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R019.extract-embedded-ass-while-leaving-video-native.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R019.extract-embedded-ass-while-leaving-video-native.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R019.extract-embedded-ass-while-leaving-video-native.md)
- [results/top100/embedded-ass/browser-result.json](../../../results/top100/embedded-ass/browser-result.json)
- [results/top100/embedded-ass/result.json](../../../results/top100/embedded-ass/result.json)
