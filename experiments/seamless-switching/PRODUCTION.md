<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Production adaptive selection — 2026-10-06

## Review correction

The deferred-clearing review supersedes the responsive-clearing implementation
and timings below. Shaka applies a relative margin at execution time, so a request
at 16.6 s retaining to 19 s can instead remove from 19.25 s when clearing waits
until 16.85 s. Production now preserves buffered media for both urgencies.
The historical browser measurements below apply to the earlier implementation;
they do not qualify the corrected fallback's latency. Regression tests advance
the playhead before executing a pending switch for both manual and automatic paths.

Implemented locally on base revision `07c40076e6e7ca78d40a1c9d3cd02eed8410e3c6`.
Uncommitted source hashes in the final receipt identify the tested implementation;
this is not release/archive qualification.

The public API is documented in [STREAMING.md](../../docs/STREAMING.md).
`adaptation: {select(context)}` supplies a synchronous selection hook; `{}`
requires controlled manifest playback with the default policy. Shaka retains its
throughput estimator and decision scheduling. Decisions cannot bypass eligible
renditions, source ceilings, audio selection or buffer safety checks. Manual
quality pins bypass the callback. Automatic upgrades retain buffered media;
bitrate downgrades and default manual selection request responsive switching.

Responsive switching retains a computed safety margin through an observed video
segment end, and preserves the whole buffer when compatibility, boundary facts
or remaining headroom are insufficient. It selects HLS/DASH manifest renditions;
arbitrary unrelated MP4 URLs are not a seamless rendition set.

## Final browser evidence

[Raw results and analysis](../../results/seamless-switching/production-20261006-boundary/REPORT.md)
use the frozen runtime in `build/seamless-switching-production-20261006-boundary`.
The result directory contains the source/fixture/runtime manifest, harness hashes,
per-frame observations, pre-speaker PCM, callback contexts, request logs and
`source-verification.json`. Media responses were paced individually at 500,000
bytes/s; this is not a shared network-link bandwidth simulation.

One Chromium/Electron preview run per case, H.264/AAC, shared audio, aligned
one-second GOPs: 360p30 → 720p30 → 720p60 → 360p30.

| Case | Requested transitions observed | Maximum frame interval | PCM silence ≥5 ms | Phase events | Request-to-visible delays |
|---|---:|---:|---:|---:|---|
| Manual responsive | 3/3 | 50 ms | 0 | 0 | 2055, 2021, 1047 ms |
| Custom selector | 3/3 | 50 ms | 0 | 0 | 6042, 7022, 6027 ms |

The custom callback ran four times; every candidate ID matched public streaming
state. Its longer delay includes Shaka's roughly eight-second decision cadence.
Changing application state read by the callback does not itself schedule a
decision; `setQuality` provides an immediate application-driven request.

## Regression discovered and fixed

The prior [repeat](../../results/seamless-switching/production-20261006-final-repeat/REPORT.md)
exposed a 433 ms video gap at the 30→60 fps handoff, despite continuous captured
audio. A decision at media time 16.618 s retained about 2.005 s, cutting old video
mid-segment around 18.624 s before the next target segment. The corrected policy
rounds retention through the current rendition's observed segment boundary.
A unit regression covers this case. The final callback again decided mid-segment
(at 16.553 s), and the run above no longer showed that gap.

Earlier directories retain diagnostics: `production-20261006-run1` caught an
admission route bypass; `production-20261006-run2` and `-delayed` produced no custom
ABR callbacks with fast local transfers; `-shaped` established callback execution;
`-final` exposed a harness assumption that scheduled qualities remain eligible.
The harness now respects changing eligibility. These runs are not silently counted
as successful callback qualification.

## Validation and limits

83 focused policy, backend, state-machine, roadmap and API contract tests pass
(57 in `contracts.txt`, 26 in `state-contracts.txt`). TypeScript compilation,
callback type-contract checks and the static functional-core boundary check pass.
The final directory also retains license/boundary and diff-check logs.

Frame callbacks measure browser presentation estimates, not physical display
output. Worklet PCM measures before speakers. The periodic 997 Hz tone cannot
identify integer-cycle skips. Recording adds host load. No cross-browser, DASH
runtime, live, HEVC/HDR, DRM, PiP, severe-congestion or decoder-budget qualification
is claimed. The API supports both Shaka manifest formats; this browser evidence
covers the HLS fixture only. Seamlessness remains conditional on packaging,
compatible codecs/audio and available download/decode headroom.
