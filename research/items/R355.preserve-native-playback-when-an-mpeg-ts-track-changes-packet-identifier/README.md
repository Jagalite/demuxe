<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Preserve native playback when an MPEG-TS track changes packet identifier

Full identity: `R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_SIMPLE_OPTION** (top100).

PMT/PID mutation preserves every video/audio packet and PTS/DTS as a multiset, but FFmpeg merge_pmt_versions changes video packet order. Actual candidate rejects Selected timeline discontinuity; baseline loses continuity as well. Do not enable the option alone. A bounded reordering/track-authority adapter is a distinct next variant.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Can a transport-level reassignment remain invisible to a healthy downstream playback track? FFmpeg already provides merge_pmt_versions to reuse streams when an updated Program Map Table moves elementary streams to different packet identifiers. This is a qualification and integration investigation, not a new MPEG-TS demuxing algorithm. [S4] Maintain a distinction between transport PID, logical source track, and output track ID. Permit identity preservation only for an admitted, unambiguous program/component transition with compatible codec configuration and continuing timeline. Real content or configuration changes still require their normal transition handling. The pinned FFmpeg implementation can fall back to PMT-position matching and use position to disambiguate repeated component identifiers. Those heuristics must not be mistaken for proof of identity. [S5]

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
| decision | passed | Historical decision imported verbatim: STOP_SIMPLE_OPTION. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier.md)
- [results/top100/transport/pid-browser-result.json](../../../results/top100/transport/pid-browser-result.json)
- [results/top100/transport/pid-result.json](../../../results/top100/transport/pid-result.json)
