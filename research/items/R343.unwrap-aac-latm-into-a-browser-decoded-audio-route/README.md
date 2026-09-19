<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Unwrap AAC-LATM into a browser-decoded audio route

Full identity: `R343.unwrap-aac-latm-into-a-browser-decoded-audio-route`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Restricted bit-aligned LOAS/LATM AAC-LC extraction produces142 AAC frames with exact independent PCM; truncation/sync/missing configuration reject. Browser raw AAC lane plays marked audio beside changing video. Multi-program/layer/CRC/otherData variants deliberately reject.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

FFmpeg's pinned LATM implementation separates stream configuration and payload-length parsing from AAC reconstruction. The AAC WebCodecs registration expects ADTS or raw AAC; supplying AudioSpecificConfig selects the raw-AAC representation. [S1, S2] The first candidate is a small transport adapter, not a different AAC decoder. Repack unaligned payload bits correctly; this is not necessarily a fixed header removal or a zero-copy slice. Account for source-specific padding and preserve meaningful AAC syntax. Keep the native video path unchanged in a subsequent A/V integration pilot. First establish a real destination difference: the actual existing bridge fails or performs avoidable software reconstruction, while the adapted route produces the complete requested output. Audit existing normalization before adding a new component.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route.md)
- [results/top100/lanes/result.json](../../../results/top100/lanes/result.json)
- [results/top100/transport/latm-result.json](../../../results/top100/transport/latm-result.json)
