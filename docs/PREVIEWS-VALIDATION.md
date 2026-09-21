<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Preview validation — 2026-09-21

The production baseline uses ordinary browser decoding, authored images and Shaka
JPEG tiles. This record does not qualify a custom decoder or exact browser PTS.

- TypeScript compilation and license/core-boundary validation passed.
- 59 Node tests passed across `preview.mjs`, `preview-range.mjs`,
  `shaka-backend.mjs`, `shaka-network.mjs`, and `range-reader-deadline.mjs`.
- `preview-browser.mjs` and `preview-ui.mjs` passed in Chrome 152.0.7977.83 and
  Firefox 146.0.1. Verified unchanged paused position/play intent, continued playback,
  source invalidation, generated-image fallback, approximate labels, stale hover
  suppression, URL release and close/destroy cleanup. The Firefox hover layout was
  also visually inspected.
- `preview-shaka-browser.mjs` passed in Chrome using an actual ffmpeg-created DASH
  presentation plus a JPEG image track. The represented tile starts at 2 seconds;
  the 2.4-second request produces a 120x68 image without changing playback position.
  This covers static clear JPEG metadata-only indexing, not lazy HLS image playlists.

## Smoke measurement

[Recorded benchmark](../results/preview/2026-09-21T12-58-27.716Z/benchmark.json)
includes browser version, fixture and implementation SHA-256 hashes, individual
requests and phase metrics. The maintained rerun command is
`node tests/preview-benchmark.mjs` after building.

| Category | Samples | Median total latency |
| --- | ---: | ---: |
| Local browser / approximate / cache miss | 4 | 23.295 ms |
| Local browser / approximate / cache hit | 4 | 0.0025 ms |

This small local 240x135 fixture workload disables debounce to measure extraction.
Cache-hit times approach timer resolution. These are smoke measurements, not broad
performance claims, hardware-acceleration evidence or a comparison with the host
keyframe experiment. Actual PTS, decoded-frame counts and browser-internal phase
costs remain null where unobservable. The benchmark never pools exact and
approximate categories.

## Existing component-suite failure

The broader `tests/player-component.mjs` run passed **49/50** checks. The existing
`hidden controls retain shortcuts and button focus allows playback keys` check
could not click Play because the stage video intercepted the pointer after controls
were hidden. A separate runtime made from unchanged HEAD generated modules and
matching public facades also passed **49/50**, failing the same check. No unrelated
interaction behavior was changed to make this preview task pass.

Local evidence: `results/player-component/chrome-2026-09-21T12-54-20.526Z/result.json`
(changed runtime) and `results/player-component/chrome-2026-09-21T12-57-39.634Z/result.json`
(HEAD runtime). An earlier baseline setup omitted public facades and is not used
as the comparison. Full-suite green status is not claimed.

## Remaining qualification

Remote source-video generation, an automatic Wasm/software extractor, lazy HLS
thumbnail indexing, exact local-browser frame PTS, Safari, hardware contention and
endurance are not qualified. Optional refinement delivery exists, but no progressive,
reduced-resolution or compressed-domain algorithm is enabled. See [architecture
and API](PREVIEWS.md) for the boundaries and extension contracts.
