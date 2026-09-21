<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Production adaptive streaming

Demuxe selects the least-expensive correct execution plan. Shaka Player owns
controlled HLS/DASH playback: manifest parsing, segment scheduling, ABR,
representation switches, playlist refresh, periods/discontinuities, buffering,
live/DVR timelines, streaming retry behavior and MSE append/removal. Demuxe does
not wrap Shaka around a separate manifest parser or segment scheduler.

The public modes remain `native`, `hybrid` and `software`. Internal plans make
ownership explicit:

```text
Demuxe planner
├── Native Direct / Native Remux — ordinary files and eligible direct sources
├── shaka-mse / shaka-mse-gain — controlled HLS/DASH with browser decoding
├── Hybrid — FFmpeg/mpv demux/audio and WebCodecs video
└── Software — FFmpeg/mpv decoding and presentation
```

Shaka is in the Native family because the browser owns decoding and the
media-element clock. `shaka-mse-gain` additionally uses the existing Web Audio
gain graph. Diagnostics expose the execution plan, backend `plan: 'shaka-mse'`,
engine version, observed timeline/window, variants and source-policy counters.
No Shaka runtime object is part of the public API.

## Selection and recovery

For HLS VOD with default track selection, no explicit quality constraint and
compatible source policy, a browser HLS support hint can admit a Direct trial.
Actual startup/output must still pass. A hint or filename never establishes
correctness. Live/DVR, DASH and controlled adaptive selection normally use Shaka.
An explicit demuxer hint or processing/output requirement can exclude Shaka.
Ordinary-file Direct, Remux, Hybrid and Software admission remains independent.

Demuxe owns transactional source replacement, runtime verification, public state,
user intent and fallback. A rejected/failed Shaka candidate can reach Hybrid or
Software only if that route preserves the source and selected requirements.
Recovery restores position where representable, pause/play, rate, volume/mute,
subtitles and tracks. Backend-local track IDs are not guessed across engines:
missing identity or unsupported intent rejects the transition. Authorization,
policy violations, source mutation, cancellation and autoplay denial do not become
permission to try a less restrictive route.
An expired DVR seek target rejects with `INVALID_ARGUMENT` and leaves the current
backend eligible and playing or paused as before. It is not a backend failure.

The remaining `ResourceLoader` is an HTTP/AVIO bridge for FFmpeg fallback. FFmpeg
receives original manifest bytes and owns parsing/timelines. Demuxe's narrow
fallback guard rejects:

- `maxBandwidth` or `representation`, which fallback cannot enforce;
- HLS subtitle renditions and DASH text/image tracks whose semantics it cannot preserve;
- multiple DASH periods, encrypted/low-latency HLS and unsupported DASH extensions;
- live manifests without explicit `streaming.live` intent.

This is conservative fallback eligibility, not another adaptive implementation.
`web/streaming-manifest.js`, `web/vod-manifest.js` and
`web/segmented-subtitles.js` were retired. Virtual DASH-to-HLS playlists,
rendition-pruning and merged WebVTT windows are no longer production mechanisms.

## Source and network contract

Shaka's NetworkingEngine owns retries, request ordering and bandwidth estimation.
Demuxe registers a per-session request filter and scheme plugin to enforce product
source policy before fetching:

- HTTP(S), no embedded URL credentials, and allowed origins; default scope is the
  source origin. Include legitimate media/text CDN origins explicitly.
- Custom headers and `credentials` on manifest, segment and text requests;
  default Shaka transport credentials are `same-origin`. Caller headers cannot
  override the `Range` chosen by Shaka.
- `refreshAuthorization({url})` renews a rejected resource once. Updated URLs must
  remain authorized; updated headers retain Shaka's range semantics.
- Fetch uses **`redirect: 'error'`**. A response filter runs too late to prevent
  sending a redirected authenticated request. Supply final authorized URLs.
- CORS remains a server requirement, including preflight and credential rules.
- Retired requests are aborted; authorization completion cannot reactivate a
  destroyed session. Player filters/listeners and owned text blobs are released
  during teardown. The shared scheme wrapper stays registered process-wide and
  retains no retired session; its per-session delegate is removed.

Response budgets are 4 MiB per manifest and 16 MiB per other resource. These are
bounds on individual responses, not a whole-player memory or live-duration claim.
`immutable` applies to stable segment bytes; available strong ETags can detect a
violated promise. It does not freeze a live manifest or prove identity without a
validator. Growing append-only byte-range live resources are not qualified: the
range identity checks require stable segment resource sizes. No Demuxe DRM
configuration/license contract is introduced.

## Public adaptive options

```js
await player.openRemote({
  url: 'https://media.example/show/manifest.mpd',
  format: 'dash', // or 'hls'
  streaming: { maxBandwidth: 4_000_000 },
  allowedOrigins: ['https://media.example'],
  credentials: 'omit',
});
```

`maxBandwidth` is a bitrate ceiling for Shaka's eligible variants, not the old
one-time manifest-pruning preference. `representation` disables ABR and pins an
unambiguously available source representation identity (DASH representation ID or HLS variant URI).
Diagnostics expose source identity when available and an opaque variant token
already formatted as `variant:<id>`; pass that token unchanged to pin it. An old HLS
ordinal such as `'1'` must not be assumed to name the second playlist. IDs from a
backend/session are not portable without a matching source identity. Missing or
ambiguous selection rejects rather than silently choosing another rendition.
`live: true` permits a dynamic source and also accepts finite VOD. Dynamic streams
include ongoing HLS EVENT and finite in-progress DASH, as well as sliding live
windows; they publish live state and no fixed duration until their timeline ends.
Actual dynamic playback
without that permission rejects as a terminal source-policy failure. Native Direct
cannot enforce these quality options, so they require the controlled route.

## Packaging and qualification

The pinned Shaka library is copied to `web/vendor/shaka-player.js` and loaded only
when a Shaka execution plan is attempted. Ordinary files do not pay its download
or initialization cost. Shaka/MSE does not require Demuxe Wasm or cross-origin
isolation; fallback engines retain their existing deployment requirements. See
[runtime assets](RUNTIME-ASSETS.md) and [licensing](LICENSING.md).
Initial downloads are shared and abort when their last waiting player is destroyed;
each destroyed player stops waiting immediately. The temporary execution script
and its Blob URL are released after loading or cancellation. CSP deployments must
allow same-origin runtime fetches and Blob scripts as described in runtime assets.

Architecture delegation is not evidence that every upstream feature works in
Demuxe. Use fresh production-route tests for HLS TS/fMP4, platform-dependent HEVC,
DASH fMP4/WebM, live, track selection, controls, cancellation and cleanup. Existing
custom-route CPU numbers cannot be re-labelled Shaka measurements. CPU comparisons
must use the existing matched whole-player methodology after correctness passes.
See [fresh qualification and limits](STREAMING-QUALIFICATION.md),
[capabilities](CAPABILITIES.md) and [head-to-head catalogue](HEAD-TO-HEAD-CATALOGUE.md)
for scoped evidence, including explicit failures and untested profiles.

The former [streaming architecture](STREAMING-ARCHITECTURE.md),
[modernization status](STREAMING-MODERNIZATION-STATUS.md),
[upstream study](STREAMING-UPSTREAM-FINDINGS.md) and
`experiments/streaming-modernization/` remain historical research only.

## Portable buffering policy

Demuxe buffering is enabled automatically. `balanced` and `preload: 'auto'` are
the zero-configuration defaults. Browser, Shaka, Remux and mpv retain their own
buffering mechanisms; Demuxe translates application intent rather than scheduling
all media through a universal buffer manager.

Balanced Shaka preserves its production buffering configuration (bundled 5.2.11:
10 s goal, 0 s rebuffer goal, 30 s history). Low-latency reduces forward/history
goals to 3/3 s; resilient raises the forward goal to 30 s. ABR, retries, live/DVR,
segment availability, and MSE eviction stay Shaka-owned. Shaka can exceed a goal
by segment granularity. Profiles do not activate low-latency manifest protocols.

Hybrid/Software use mpv caching by default: 32 MiB forward packet budget and
8 MiB backward packet budget. mpv owns refill, seek reuse and cache pausing;
cache diagnostics are not presentation-ready buffered ranges. Browser stream
bridging retains its separate source-byte cache and bounded read mailbox.
Playback Range reads have an absolute 45-second retry window, permitting recovery
from an 18-second outage; close and source epochs abort immediately. Standalone
RangeReader consumers retain the 15-second default. There is no unbounded
retry or promise of surviving arbitrarily long network loss.

See [PUBLIC-API.md](PUBLIC-API.md#automatic-buffering) for preload limits and
[BUFFERING.md](BUFFERING.md) for resolved diagnostics and qualification.
