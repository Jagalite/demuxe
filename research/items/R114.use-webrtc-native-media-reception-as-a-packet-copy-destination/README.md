<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use WebRTC native media reception as a packet-copy destination

Full identity: `R114.use-webrtc-native-media-reception-as-a-packet-copy-destination`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Actual loopback WebRTC native receiver renders pre-encoded H264 red frame substituted into outgoing encoded frames; all three received NAL lists match source exactly. Isolated Chrome disabled mDNS IP hiding after local mDNS ICE stall. Placeholder encoder still runs; proves destination capability, not encoder-free sender/service or net CPU savings.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Type: Alternative browser media route. Priority: P2. Question. Can compatible compressed file/live packets be presented by Chrome through its WebRTC media path without another media encode? What differs from earlier work. R87 concerned data channels/dependency-aware delivery. This targets real received audio/video tracks and the browser media receiver, not an application decoder fed by a data channel. Mechanism. Demux compatible H.264/Opus, packetize into negotiated RTP/RTCP with truthful timing, and deliver through an authorized sender to RTCPeerConnection and a media element. Initial source profile. Controlled H.264/Opus profiles compatible with negotiated WebRTC parameters; regular usable keyframes; real permitted signaling and connectivity.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination.md)
- [results/top100/webrtc/result.json](../../../results/top100/webrtc/result.json)
