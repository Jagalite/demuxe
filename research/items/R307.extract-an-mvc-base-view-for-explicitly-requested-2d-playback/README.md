<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract an MVC base view for explicitly requested 2D playback

Full identity: `R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_FIXTURE_SOURCE** (top100).

No genuine two-view MVC source plus trusted base-view reference found in bounded fixture inventory. Ordinary AVC or synthetic extra NALs cannot qualify MVC dependency extraction. This is a media-source gap, not missing report identity or experimental rejection.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Class: Existing-file route and packet-copy construction. Output contract: The declared MVC base view, with its original decoded pictures and timing; not a stereoscopic presentation and not an arbitrary selected dependent view. Related: R29's compatible-core principle, but applied to MVC video. H.264 Multiview Video Coding provides an AVC-compatible base view. Fraunhofer HHI describes its base-view syntax and its compatibility with ordinary H.264 decoders [S1]. Investigate extracting that view into ordinary AVC access units, constructing truthful decoder initialization and container timing, and using a qualified browser decoding destination. Proposed path: MVC parsing -> qualified base-view access units -> AVC configuration and optional fragmented MP4 -> browser playback.

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
| decision | passed | Historical decision imported verbatim: HOLD_FIXTURE_SOURCE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R307_R312_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback.md)
- [results/top100/prerequisites/media-inventory.json](../../../results/top100/prerequisites/media-inventory.json)
