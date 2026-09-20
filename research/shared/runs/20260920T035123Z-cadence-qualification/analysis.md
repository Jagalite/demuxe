<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# R169: actual displayed-source qualification

Completed scoped R169 research with an actual WebCodecs-decoded custom presenter and physical WindowServer output measurements. Three paired timer-versus-rAF trials displayed all 72 original 24fps source frames in order, identified against an independent host FFmpeg pixel oracle; maximum mean grid error was 0.5 luma levels and minimum separation from a wrong frame was 12.8125. ScreenCaptureKit supplied completed-frame displayTime, so the verdict does not rely on rAF/rVFC counts or Chrome's predicted display feedback. Wrong-frame-order and 20% speed-change controls were rejected; cancellation displayed exactly 12 frames and released all issued/source frames, ended the track and cleared the output. Median paired p95 cadence-phase improvement was 0.1026%, below the predeclared 15% gate (individual improvements 0.1026%, 0.02145%, 49.853%). The rAF variant reduced p95 issue-to-display latency to 24.81–24.93ms from 33.74–34.30ms, a recorded secondary finding that does not override the cadence gate. Stop this implementation/profile; this is a negative performance result, not a missing physical-measurement prerequisite. The scope is this isolated video-only 24fps custom presenter on the selected approximately 60Hz display with equal capture overhead. It is not retained/mpv integration, audio/AV-sync, hardware-overlay promotion, photon timing, energy, or general scheduling qualification.

## Evidence limits

ScreenCaptureKit observes completed WindowServer composition for the owned browser window on the selected display. It does not measure photons or hardware overlay promotion. Its observer cost is shared by both variants. The fixed-rate video-only candidate is a faithful isolated custom scheduler, not the production retained/mpv owner. The first six frames are predeclared cadence warmup. The short cancellation control is an ownership/clearance test, not a playback-rate benchmark; its six-frame post-warmup endpoint slope is quantized by display refresh and is not used for performance.

Full raw Chrome/Instruments captures remain historical observations; only generated fixture media is marked regenerable. Compact source timing events allow metric recomputation without parsing full traces. Foreground inventories were minimized before registration to omit unrelated windows. Exact source snapshots and reconstruction limitations are in snapshot-provenance.json.

## External API/source audit

Apple documents SCStreamFrameInfo.displayTime as when WindowServer displays the frame: https://developer.apple.com/documentation/screencapturekit/scstreamframeinfo/displaytime . Exact installed Chrome revision 79460ebecaa5625e57a5fb679a735659e73dc687 computes GetDisplaytime from a display-link/latch heuristic and sets feedback flags at commit; those predicted timestamps were explicitly rejected as the physical oracle. Original BSD source and LICENSE are retained under chromium-source-audit/.

Reopen for a materially different phase policy, source/display cadence, or presentation owner with a fresh predeclared primary gate. Production retained/mpv and audio integration require their own independent correctness and cost tests.
