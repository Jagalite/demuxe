<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Current research status

Derived from all 425 canonical item homes at 2026-09-19T20:28:30.042352+00:00. Run `python3 research/shared/tooling/refresh-research-status.py` to refresh. Item folders remain authoritative.

425 items have post-migration updates; 0 retain imported decisions. Updates include new experiments and source/evidence reconciliation; this is not an experiment count.

| Stage | Passed | Failed | Blocked | Pending | Not applicable |
|---|---:|---:|---:|---:|---:|
| define | 392 | 0 | 33 | 0 | 0 |
| prepare | 139 | 0 | 196 | 0 | 90 |
| screen | 425 | 0 | 0 | 0 | 0 |
| correctness | 90 | 2 | 196 | 44 | 93 |
| performance | 0 | 3 | 196 | 101 | 125 |
| results | 425 | 0 | 0 | 0 | 0 |
| decision | 425 | 0 | 0 | 0 | 0 |

A passed screen or decision records a scoped finding, not production readiness. Passed correctness applies only to the stated run profile. Blocked prerequisites and failed outputs are distinct.

[Every ranked item](ITEMS.md) · [Process and stage meanings](PROCESS.md)

## Next high-priority incomplete gates

- Rank 1: [R007.close-the-hevc-in-ts-browser-owned-construction-gap](items/R007.close-the-hevc-in-ts-browser-owned-construction-gap/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 2: [R262.configuration-interval-seek](items/R262.configuration-interval-seek/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 4: [R343.unwrap-aac-latm-into-a-browser-decoded-audio-route](items/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 6: [R358.unwrap-matroska-track-compression-before-choosing-a-decoder](items/R358.unwrap-matroska-track-compression-before-choosing-a-decoder/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 7: [R363.expose-prepared-fragments-as-a-native-hls-presentation](items/R363.expose-prepared-fragments-as-a-native-hls-presentation/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 9: [R138.one-sourcebuffer-different-codec-and-container.report-continuity](items/R138.one-sourcebuffer-different-codec-and-container.report-continuity/README.md) — Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.
- Rank 10: [R005.move-mse-ownership-off-the-window-thread](items/R005.move-mse-ownership-off-the-window-thread/README.md) — Specify one concrete wrong-output or provenance failure the proposed tool must detect beyond the existing harness.
- Rank 13: [R335.recover-the-gpu-presenter-without-reopening-healthy-decoders](items/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders/README.md) — Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.
- Rank 14: [R353.let-browser-managed-streaming-windows-control-remux-production](items/R353.let-browser-managed-streaming-windows-control-remux-production/README.md) — Connect the demand gate to actual incremental remux, then independently verify rendered A/V and demanded-interval repair after genuine browser eviction.
- Rank 15: [R057.probe-a-real-six-channel-native-flac-destination](items/R057.probe-a-real-six-channel-native-flac-destination/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 16: [R088.native-hls-playlist-views-over-compatible-existing-media](items/R088.native-hls-playlist-views-over-compatible-existing-media/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 17: [R183.native-color-with-separately-decoded-transparency](items/R183.native-color-with-separately-decoded-transparency/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 18: [R114.use-webrtc-native-media-reception-as-a-packet-copy-destination](items/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 19: [R176.jspi-backed-synchronous-wasm-i-o](items/R176.jspi-backed-synchronous-wasm-i-o/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 20: [R006.offer-a-non-pthread-remux-path-without-isolation](items/R006.offer-a-non-pthread-remux-path-without-isolation/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 21: [R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output](items/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 22: [R086.native-video-with-an-independent-generated-pcm-clock](items/R086.native-video-with-an-independent-generated-pcm-clock/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 23: [R097.mux-color-and-alpha-into-native-transparent-webm](items/R097.mux-color-and-alpha-into-native-transparent-webm/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 24: [R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component](items/R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
- Rank 28: [R159.remux-encrypted-media-without-decrypting-its-samples](items/R159.remux-encrypted-media-without-decrypting-its-samples/README.md) — Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.
