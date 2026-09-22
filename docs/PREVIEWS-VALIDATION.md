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

Lazy HLS thumbnail indexing, exact decoded frame PTS, Safari, hardware contention,
long-duration extraction and endurance remain unqualified. Software fallback checks
are recorded below; they do not establish universal codec/profile coverage. Optional refinement delivery exists, but no progressive,
reduced-resolution or compressed-domain algorithm is enabled. See [architecture
and API](PREVIEWS.md) for the boundaries and extension contracts.


## Software thumbnail fallback follow-up

The software fallback uses the production FFmpeg/mpv worker in a disposable,
paused session, with audio/subtitles disabled and a single video decode thread.
`tests/preview-software.mjs` generates and removes its synthetic fixtures (requires
host FFmpeg). Default FFV1/PCM Matroska tests production fallback routing; optional
`PREVIEW_CODEC=hevc` tests 1280x720 HEVC/AAC, explicitly selecting the software
provider because some browsers also decode this fixture natively.

Executed checks:

- Chrome 152 and Firefox 146: local software extraction, unchanged playback time
  and pause intent, ongoing playback progress, cancellation/latest-wins, image
  cache hits, source invalidation and disposal of worker-owner frames.
- Chrome: default software-only FFV1 scrubber hover and a separate clear HLS
  VOD software-provider smoke test. Chrome and Firefox also passed 720p HEVC/AAC
  software-provider, remote-file and visible scrubber checks.
- Existing browser preview, scrubber and real DASH/JPEG Shaka checks pass.
- 66 focused preview/range/resource/Shaka unit tests passed, including the new
  independent low-priority resource-fetch case.

Per-request initialization/decode/total timings are printed by the integration
check. These are functional smoke measurements, not a comparative benchmark or
proof of contention-free playback. This change does not alter the earlier
component-suite qualification boundary.


## Cleanup and buffering review fixes

- 68 focused preview/range/resource/Shaka unit tests pass, including registered
  resource-teardown joins and cache-preserving suspension.
- Chrome 152 and Firefox 146 HEVC/AAC browser regressions assert zero preview
  worker-owner iframes immediately after `await player.destroy()`, including an
  idle primary player destroyed during software preview initialization. The old
  post-destroy delay has been removed.
- The browser test injects the same mpv `paused-for-cache` property notification
  used for software buffering. It verifies active extraction is cancelled, new
  generation returns no frame while buffering, existing cache hits remain usable,
  and extraction resumes after the notification clears. This is a deterministic
  notification-path regression, not a throttled-network contention measurement.
- Existing native-browser extraction and scrubber checks pass. TypeScript build,
  generated outputs and license-boundary checks pass.


## Initialization controls and pre-generation

- 75 focused unit tests cover the existing preview contracts plus explicit
  timestamp lists, seconds/minutes intervals, optional counts, all-candidate
  generation with bounded image retention, unknown-duration suppression, source
  resets, independent API enablement and foreground cache protection.
- Chrome 152 and Firefox 146 exercise custom-element initialization options,
  list/count cache warming, interval cache warming, the settings checkbox and
  API disable/re-enable across source changes.
- Background work is opt-in. These checks establish scheduling and cache behavior,
  not a throughput or network-contention benchmark for pre-generating full movies.

### Fractional timestamp regression

- Explicit lists retain original timestamps while deduplicating buckets, avoiding
  a second quantization that could move a preview into the preceding bucket.
- A regression reproduced the incorrect 4.2-second result for a 4.35-second request
  with 0.1-second buckets before the fix. It now verifies a 4.3-second result and
  foreground cache hits without another decode.
- All 76 focused unit tests, the build and license-boundary checks pass.

## Continuous scrubber motion

The old UI cancelled generation on every pointer movement. A regression with a
delayed provider failed before the change: no image appeared until movement
stopped. The scrubber now completes one sample, retains only the latest waiting
position, and decodes the replacement image before replacing the visible one.

[Same-file Chrome comparison](../results/preview/2026-09-22T03-03-49.286Z-scrub-motion/benchmark.json)
used the user's 1.45 GB, 1920×1080 H.264/AAC MKV with Hybrid playback paused.
Across 100 synthetic pointer events spaced 16 ms apart, the old UI displayed
zero thumbnails during movement and cancelled 99 requests. The updated UI first
displayed an image at 271 ms, was visible for 85 of 100 samples, never blanked
after that first image, and cancelled zero requests. Both runs retained playback
time at zero and emitted no seeks. This measures scrubber responsiveness, not
physical playback contention or universal cold-decoder latency.

Chrome and Firefox scrubber regressions cover continuous motion, cached image
reuse, the latest waiting timestamp, discarded work after pointer leave, and
close/destroy cleanup. The controller's 15 tests and Chrome preview-option checks
pass. The software-preview check passed on an isolated rerun; one preceding run
missed its existing 0.2-second timestamp tolerance for a superseded request.

Review found that awaiting authored image loading in the generation lane could
block a later cached preview indefinitely. The added browser regression stalls
an image URI, moves to a resident thumbnail and requires that thumbnail to display
within two seconds with the stalled fetch cancelled and playback time unchanged.
It failed before the fix and passes in Chrome and Firefox. Another regression
requires repeated cache hits within one bucket to reuse a slow image download
and display it during continuous movement. Generation and image
presentation now have separate cancellation owners; replacement, leave and
destruction cancel obsolete image work without restarting continuous decoding.
The 37 preview, pregeneration, range-isolation and public-state unit tests pass,
as do the TypeScript build and license checks. The same-file comparison above
predates this image-loading fix and measures the generation coalescing change.
