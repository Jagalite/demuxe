# Still unresolved

11 items remain without a completed viability decision: 4 environment gates, 3 trusted-media gaps, 3 setup gaps, 1 fidelity discrepancy. Their reports/identities are available; missing media is not a missing report. Do not mark these experiments complete merely because the blocker is recorded.

## Rank 12 — R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition

**HOLD_ENV** · PREREQUISITE_PROBE

Current headless Chrome can exercise browser APIs but supplies no physical display overlay promotion, compositor scanout or refresh-cadence evidence. Physical fixed-display diagnostic run remains required; this is not an experimental negative.

Evidence: [environment.json](environment.json).

## Rank 14 — R353.let-browser-managed-streaming-windows-control-remux-production

**HOLD_ENV** · PREREQUISITE_PROBE

ManagedMediaSource is undefined in the actual Chrome152 environment. No simulated demand events substituted for real managed window/eviction behavior.

Evidence: [environment.json](environment.json).

## Rank 25 — R101.keep-decoded-video-on-the-native-overlay-display-path

**HOLD_ENV** · PREREQUISITE_PROBE

Current headless Chrome can exercise browser APIs but supplies no physical display overlay promotion, compositor scanout or refresh-cadence evidence. Physical fixed-display diagnostic run remains required; this is not an experimental negative.

Evidence: [environment.json](environment.json).

## Rank 26 — R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding

**HOLD_FIXTURE_SOURCE** · PREREQUISITE_PROBE

No trusted Dolby Vision profile8.1 source and independent HDR10-compatible reference found among48 unique local supplied/campaign media fixtures. Ordinary HEVC fixtures cannot establish Dolby base extraction fidelity. This is a media-source gap, not missing report identity or experimental rejection.

Evidence: [media-inventory.json](prerequisites/media-inventory.json).

## Rank 29 — R184.browser-hevc-base-separate-dolby-vision-reshaping

**HOLD_FIXTURE_SOURCE** · PREREQUISITE_PROBE

No trusted RPU-bearing source and independent Dolby reshaping/color reference found in bounded local fixture inventory. Browser HEVC decode alone cannot qualify this transform. This is a media-source gap, not missing report identity or experimental rejection.

Evidence: [media-inventory.json](prerequisites/media-inventory.json).

## Rank 31 — R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback

**HOLD_FIXTURE_SOURCE** · PREREQUISITE_PROBE

No genuine two-view MVC source plus trusted base-view reference found in bounded fixture inventory. Ordinary AVC or synthetic extra NALs cannot qualify MVC dependency extraction. This is a media-source gap, not missing report identity or experimental rejection.

Evidence: [media-inventory.json](prerequisites/media-inventory.json).

## Rank 37 — R193.tiled-heic-through-browser-video-decoding

**INCONCLUSIVE_FIDELITY** · COMPONENT_TEST

Genuine ImageIO2x2 HEIC yields four browser-decoded HEVC tiles and valid nonoverlapping grid. All raw pixel hashes differ from host oracle; full-range source becomes limited-range NV12 even with explicit full-range config. Decoding capability exists, but color/range/chroma fidelity needs resolved display-space oracle; not an API blocker or successful faithful route.

Evidence: [result.json](heic/result.json), [implicit-full-range-failure.json](heic/implicit-full-range-failure.json), [groups.json](heic/groups.json).

## Rank 38 — R195.prepared-texture-video-to-several-gpu-destinations

**DEFER_SETUP** · PREREQUISITE_PROBE

No Basis/ETC1S fixture or basisu/reference transcoder present in bounded local fixture/tool inventory. Existing Hap BC1 experiment cannot substitute for Basis transcode. Requires a separate pinned transcoder+prepared-source setup; not a failed GPU output test.

Evidence: [media-inventory.json](prerequisites/media-inventory.json).

## Rank 41 — R275.av1-large-scale-tile-viewport-decode

**DEFER_SETUP** · PREREQUISITE_PROBE

No matching aomenc/aomdec tile-selection build or genuine AV1 large-scale-tile fixture available. Full-frame AV1 decoding/cropping would not test sparse tile work. Requires dedicated libaom prepared fixture and selected-tile oracle; not browser codec rejection.

Evidence: [media-inventory.json](prerequisites/media-inventory.json).

## Rank 42 — R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding

**DEFER_FIXTURE_SETUP** · PREREQUISITE_PROBE

Actual local low-delay hierarchical SVT encode was inspected: only one operating point,idc0, no OBU extension temporal IDs. It is not a genuine selectable lower-rate operating-point fixture. Need matching layered encoder/source before meaningful extraction; no negative claim about AV1 mechanism.

Evidence: [av1-result.json](prerequisites/av1-result.json), [av1-encoder.log](prerequisites/av1-encoder.log).

## Rank 88 — R169.make-custom-presentation-aware-of-display-cadence

**HOLD_ENV** · PREREQUISITE_PROBE

Current headless Chrome can exercise browser APIs but supplies no physical display overlay promotion, compositor scanout or refresh-cadence evidence. Physical fixed-display diagnostic run remains required; this is not an experimental negative.

Evidence: [environment.json](environment.json).
