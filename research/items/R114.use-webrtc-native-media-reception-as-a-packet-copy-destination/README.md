<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use WebRTC native media reception as a packet-copy destination

Full identity: `R114.use-webrtc-native-media-reception-as-a-packet-copy-destination`.

Current decision: **pursue** (actual_packet_only_native_webrtc_route).

Actual authorized local aiortc AVPacket-only H264/Opus sender reaches normal Chrome native WebRTC reception with mDNS privacy enabled. Two replacement sessions independently receive five exact H264 NAL lists and first eight exact Opus packets, render red pictures and878.90625Hz expected880Hz tone, then close all tracks/peers. Instrumented sender encode calls stay zero; H264/Opus pack calls are nonzero. Unlike prior placeholder route, no encoder runs. Wrong coded packet fails independent identity check; mismatched VP8 negotiation control produced no decoded frames and is preserved.

Next action: Scoped live H264-IDR/Opus packet-copy capability research complete under normal ICE privacy. Production pursuit requires source timing/seek/authorization and target-network qualification; file priming, arbitrary GOPs and CPU benefit remain separate claims.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Isolated pinned aiortc1.15.0/PyAV17.1.0/aiohttp3.14.3 environment; captured primary packet-vs-frame sender source and pip identities; owned coded fixtures. |
| screen | passed | Prior bounded screening reviewed; scientific disposition unchanged. |
| correctness | passed | Actual authorized local aiortc AVPacket-only H264/Opus sender reaches normal Chrome native WebRTC reception with mDNS privacy enabled. Two replacement sessions independently receive five exact H264 NAL lists and first eight exact Opus packets, render red pictures and878.90625Hz expected880Hz tone, then close all tracks/peers. Instrumented sender encode calls stay zero; H264/Opus pack calls are nonzero. Unlike prior placeholder route, no encoder runs. Wrong coded packet fails independent identity check; mismatched VP8 negotiation control produced no decoded frames and is preserved. |
| performance | not_applicable | Declared original question is additional packet-copy native reception capability. Actual zero encode calls establish mechanism; no numerical CPU, latency, bandwidth or energy improvement is asserted. |
| results | passed | Actual authorized local aiortc AVPacket-only H264/Opus sender reaches normal Chrome native WebRTC reception with mDNS privacy enabled. Two replacement sessions independently receive five exact H264 NAL lists and first eight exact Opus packets, render red pictures and878.90625Hz expected880Hz tone, then close all tracks/peers. Instrumented sender encode calls stay zero; H264/Opus pack calls are nonzero. Unlike prior placeholder route, no encoder runs. Wrong coded packet fails independent identity check; mismatched VP8 negotiation control produced no decoded frames and is preserved. |
| decision | passed | Actual authorized local aiortc AVPacket-only H264/Opus sender reaches normal Chrome native WebRTC reception with mDNS privacy enabled. Two replacement sessions independently receive five exact H264 NAL lists and first eight exact Opus packets, render red pictures and878.90625Hz expected880Hz tone, then close all tracks/peers. Instrumented sender encode calls stay zero; H264/Opus pack calls are nonzero. Unlike prior placeholder route, no encoder runs. Wrong coded packet fails independent identity check; mismatched VP8 negotiation control produced no decoded frames and is preserved. |

[New run](../../shared/runs/20260919T211000Z-webrtc-replacement/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
