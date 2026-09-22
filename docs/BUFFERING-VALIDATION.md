<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Automatic buffering: implementation qualification

2026-09-21 UTC, local `main` candidate; no commit, routing change or release.
**Enable balanced + auto automatically, including mpv cache=yes with 32/8 MiB.**
The bounded comparison supports that mapping. This is practical single-host
qualification, not a claim about every device or a completed release soak.

## Policy and exact settings

| Backend | Low latency | Balanced (omitted configuration) | Resilient |
| --- | --- | --- | --- |
| Native Direct | Browser preload hint only | `preload=auto`; browser owns buffering | Browser preload hint only |
| Shaka 5.2.11 | goal 3 s, behind 3 s | Unchanged defaults: goal 10 s, rebuffer 0 s, behind 30 s | goal 30 s; other defaults retained |
| mpv 0.40 Hybrid/Software | cache=yes, 8/2 MiB packets | cache=yes, 32/8 MiB packets | cache=yes, 48/8 MiB packets |
| Native Remux | forward 2 s, history 1 s | forward 5 s, history 3 s | forward 10 s, history 3 s |

Remux retains its 12 MiB coded-data accounting ceiling, bounded fragment
production and RAP-safe eviction. Forward seconds scale with rates above 1×
while playing, but paused preload does not. `memoryBudget` is an optional
8–64 MiB ceiling: it may reduce owned packet/coded storage, never increases a
profile's target, and is explicitly unenforceable in browser/Shaka capabilities.
It is not a whole-player allocation limit. The 8 MiB balanced and 64 MiB resilient
extremes were exercised; the latter still resolves to 48/8 MiB.

The baseline changes only mpv `cache=no`, retaining 32/8 MiB settings and the same
current transport, Wasm binaries, decoder, presentation queues and audio buffers.
Auto leaves mpv cache-secs 3600000, readahead 1, hysteresis 0, seekable-cache auto,
cache-pause yes and cache-pause-wait 1 untouched. Packet limits bound that very
large time target. Non-auto preparation uses cache-secs 1, restoring the bundled
normal value on play. Shaka non-auto preparation uses goal 1 s, restoring the
profile on play. No raw engine objects or advanced engine overrides are public.
Explicit open still performs metadata/track discovery and, where required,
prepares initial output. Native none temporarily uses metadata for that contract.

## Environment and workload

Apple M1 MacBookAir10,1, 8 GB RAM, macOS 26.5.2; headed Chrome 152.0.7977.83 and
Playwright Firefox 146.0.1. CPU figures are shared-host process CPU, not power or
isolated hardware benchmarks. The controlled Demuxe Range server uses no-store,
aggregate pacing, 16 KiB chunks, 32 KiB burst, and 75 ms request latency unless
specified. Each browser trial runs independently.

Big Buck Bunny movie-derived MP4 fixtures, all AAC audio:

| Fixture | Video | Duration | Mean bitrate | File bytes |
| --- | --- | ---: | ---: | ---: |
| normal | H.264 | 90 s | 2.08 Mb/s | 23,431,260 |
| higher bitrate | HEVC | 90 s | 5.85 Mb/s | 65,830,226 |
| high | H.264 with temporal noise | 90 s | 16.20 Mb/s | 182,213,434 |
| long | H.264 | 634.60 s | 2.05 Mb/s | 162,584,552 |

[Fixture identities, encoding commands and hashes](../research/items/mpv-cache-browser-stream/fixtures/manifest.json)
include independent FFmpeg reference pictures; media retains CC BY 3.0 attribution.
Each network trial has 6 s fast (100 Mb/s), 6 s at 1.05× nominal media bitrate,
18 s complete interruption, then 6 s fast recovery. At 2× the near-media rate is
below consumption by design. Long-source checks exercise bounded loading and
distant seeks, not a full 634-second playback soak.

## Controlled cache comparison

High fixture, 1×, zero added RTT, same 18-second outage. Single fresh trial per
cell; startup is open-to-ready, and the frame column is sampled source-progress /
render evidence, **not exact time-to-first-visible-frame**.

| Configuration | Ready ms | Frame proxy ms | Public rebuffers / seconds | Bytes written before seeks, MiB | Engine linear memory MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native Direct | 498 | 606 | 1 / 3.80 | 102.4 | n/a |
| Hybrid cache=no | 656 | 902 | 1 / 17.50 | 42.6 | 128 |
| Hybrid balanced 32/8 | 715 | 1001 | 1 / 3.10 | 99.8 | 128 |
| Software cache=no | 709 | 907 | 1 / 17.60 | 42.0 | 128 |
| Software balanced 32/8 | 619 | 802 | 1 / 2.40 | 100.0 | 128 |
| Hybrid resilient 48/8 | 785 | 1007 | 0 / 0 | 121.3 | 128 |

Sources: [cache on](../results/buffering/2026-09-21T01-57-40.132Z-chrome-qualification/results.json),
[cache off](../results/buffering/2026-09-21T02-00-13.291Z-chrome-baseline/results.json),
[resilient](../results/buffering/2026-09-21T02-04-08.786Z-chrome-qualification/results.json).
The gain costs earlier transfer and packet memory. It does not establish faster
startup or lower CPU. Hybrid fast-phase CPU was approximately 72% of one core
with cache versus 53% without; Software 90% versus 85%. During interruption,
cached playback continues doing useful decode work, so CPU comparisons are not
equivalent-work efficiency measurements.

Observed packet totals reached about 40 MiB balanced and 56 MiB resilient.
Per-engine committed Wasm memory remained 128 MiB, while transactional replacement
observed two engines totaling 256 MiB. Those figures exclude probe heaps,
browser decoders, source LRU, audio, GPU memory and allocator-internal peaks.
Forward/back settings are packet targets with packet-granularity and history
reclassification effects, not independent exact malloc caps. Resilient filling
beyond 32 MiB was tested with independent reference pictures; no decoder change
was used to obtain the improvement.

## Requests, playable coverage and seeks

Native auto preloads aggressively and can consume the whole short normal file;
Demuxe passes the hint and does not impose fake browser byte/time limits.
Its real media-element buffered ranges, range cancellation/restart and back-seek
behavior are retained in raw samples. No reliable browser old-buffer eviction
threshold was established in these short observation windows; 2× cells test
consumption changes, not a promise that preload doubles. Native/Shaka are the only media-element
owners for which their reported playable ranges should be compared directly.
mpv `buffered` remains null; demuxer-cache-state packet ranges stay in diagnostics.
Raw source-cache bytes are never converted into seconds.

Nearby packet seeks can reuse mpv demux data even while forward refill causes
new HTTP requests. In the fresh high/zero-RTT Hybrid trial, both −2/+2 s used zero
new low-level demux seeks, completing in about 252/255 ms; 14/16 HTTP requests
still occurred during the refill observation window. Cache=no required a new
low-level demux seek for both. At −5 s the requested point fell outside retained
packet coverage and required a new demux seek. There is no fixed five-second
reuse promise. Exact ±2/5/15/30 s and distant seeks completed on supplemental
runs. The first broad matrices used sequential absolute 40±distance targets;
the analyzer records their actual distances rather than trusting the labels.

Server logs preserve Range headers, offsets, response writes, cancellations,
request counts and duplicate bytes. Lifecycle totals include deliberate reopens
and replacements, so their duplicate-byte total is not playback inefficiency.
At 75 ms latency, sequential bounded 64 KiB source reads can limit high-bitrate
Remux throughput to roughly 6 Mb/s despite a 100 Mb/s server setting. Heavy
Remux starvation in those cells is real and does not qualify smooth 16 Mb/s
playback over that bridge. Increasing a buffer target cannot fix that sustained
throughput ceiling; transport concurrency is a separate future experiment.

## Qualification coverage and corrections

- Chrome default matrix: 24/24 completed (normal/high/long, all four file
  backends, 1×/2×, all four network phases, seeks and lifecycle).
- Firefox pairwise default matrix: 11/12 initially completed. The sole failure
  was a fixed 1.2-second startup observation deadline; frames and clock progress
  arrived immediately afterward. A bounded clock-progress wait replaced that
  assumption and the high/Hybrid/1× repeat passed.
- Chrome profile/preload picture matrix: 12/12; budget extremes: 2/2.
  Firefox Hybrid/Software low/resilient picture matrix: 4/4 after correcting the
  screenshot observer for Firefox's 2× device scale. Original failures remain.
- HEVC Chrome Native/Hybrid/Software 1×: 3/3.
- Shaka: 14/14 on each browser, including ABR, live, profiles, source replacement,
  MSE/backend cleanup and Blob URL revocation. Public API: 20/20 each browser.
- Closing an outstanding blocked source read: all four file backends passed on
  both browsers. Chrome close times were 7/82/79/11 ms for Native/Hybrid/Software/
  Remux; Firefox 25/300/91/19 ms. All left zero active responses and workers.
- Open → close → open, source replacement and full teardown assert released
  surfaces/Blob URLs, terminated workers, closed owned AudioContexts and zero
  retained frames where exposed. No continued owned request was observed.

An initial high/Hybrid outage exposed a real transport failure: the existing
15-second source-read deadline fired before recovery, followed by a truncated
packet/decoder error. Playback RangeReader owners now use a bounded 45-second
read deadline; explicit cancellation and generation changes remain immediate.
The generic default stays 15 seconds. Repeat outage/lifecycle cases passed.
No retry loop or packet cache is unbounded.

Firefox high/Remux/2× also exposed a state-reporting defect: the source clock
stopped for the outage while the browser retained HAVE_FUTURE_DATA and emitted
no waiting event. Remux now observes clock nonprogress for at least 750 ms near
the actual playable edge with an outstanding producer, and publishes that
observed starvation. Progress, pause, seek and generation changes clear it.
This is a backend-specific observation fallback, not a buffering scheduler.
The analyzer separately records timeline freezes so old public-status counts
cannot be mistaken for proof of uninterrupted playback. The focused Firefox
run passed the starvation/recovery assertions but later timed out at a 30-second
backward seek to 10 s. A full repeat passed all exact seeks and lifecycle checks.
That intermittent Remux exception is retained as unresolved, not attributed to
mpv or hidden by the passing repeat. See [failure](../results/buffering/2026-09-21T02-25-29.139Z-firefox-qualification/results.json)
and [repeat](../results/buffering/2026-09-21T02-29-27.867Z-firefox-qualification/results.json).

The final runtime and focused observer follow-up are indexed in
[the evidence summary](../results/buffering/summary/index.json). The earlier
matrices preceded only this Remux status correction and minor non-default policy
validation/diagnostic fixes; unchanged mpv binaries are identified by hashes.
Preserved failures are not counted as successful production qualification.

### Closeout follow-up

The [fresh Firefox high/Remux/2× repeat](../results/buffering/2026-09-21T02-40-21.333Z-firefox-qualification/results.json)
passed starvation reporting, recovery, all nine measured seeks, source
replacement, reopen and teardown. The previously failing seek to 10 seconds
completed in 6.29 seconds; final active responses, workers, surfaces and Blob
URLs were all zero. This repeat does not establish the cause or resolution of
the earlier intermittent timeout. Unrelated builds and torrent workloads were
active on the host, so these timings are correctness evidence only.

The evidence index now includes 20 retained buffering runs / 84 trials, including
8 failed trials, with raw-result SHA-256 hashes and recorded source/runtime
hashes. Regenerate it with `node tests/buffering/index.mjs`; older trials and
metrics remain untouched. The analyzer now accepts interrupted network phases
without losing their failure record. Focused buffering/analyzer checks passed
44/44; transport, file-reader, selection, admission and resource regressions
passed 52/52. The final sequential `npm run build` passed TypeScript compilation,
generated SPDX stamping, license/notice verification and the 29-file core
dependency boundary check; scoped whitespace checks also passed. A preceding
build check failed when a concurrent standalone TypeScript check rewrote stamped
outputs; the sequential build regenerated and verified those outputs.

## Reproduction and remaining limits

See [tests/buffering/README.md](../tests/buffering/README.md). Build, freeze a new
runtime, then run suites sequentially with `BUFFERING_RUNTIME` pointing at it.
Never overwrite retained runs. `analyze.py` produces per-trial startup, observed
buffering and independent clock freezes, packet/source/Wasm memory, CPU, seeks,
request counts/duplicate writes and cleanup records.

Remaining release scope: the intermittent Firefox Remux seek timeout, another
low-memory device/platform, a longer memory
pressure/whole-source soak, full frame/audio fidelity at 2×, and real-world
variable network traces. Exact allocator peaks and photon-level first-frame
latency are unavailable in this harness. Firefox HEVC is not claimed qualified.
Advanced engine overrides are intentionally deferred. Public `buffered` and
`seekable` preserve unknown null versus known-empty [] semantics.

There is no demonstrated bridge incompatibility requiring cache=no. Retain
32/8 as the balanced default; 48/8 provides additional interruption tolerance
at extra transfer/storage cost. Next investigate latency-amortized bounded
source reads separately, holding codecs and packet budgets constant.

**mpv cache looks promising for Hybrid/Software**

## Timeline cache shading

The player now renders a medium shade between played progress and the dim track.
Native uses `state.buffered`; Hybrid and Software use the new `state.cached`
packet ranges. The existing playable-buffer meaning of `state.buffered` remains
unchanged. Negative packet preroll is clipped to zero; missing coverage remains
null, known-empty coverage stays empty, and separate cached intervals retain gaps.

The focused public API browser check passes across Native, Hybrid and Software
in [Chrome](../results/public-api/chrome-2026-09-22T03-13-28.839Z/result.json)
and [Firefox](../results/public-api/firefox-2026-09-22T03-14-29.125Z/result.json).
It verifies real packet coverage, immutable state, explicit empty/unknown updates,
and source close. The 25 state/preview unit tests pass.

A same-file Chrome inspection of the 23:43 MKV at 1:07 showed the cached interval
66.084–112.070 seconds on the timeline. No cache duration was inferred from bytes.
The component suite's shading/clipping check passes; its 49/50 check result still
contains the previously documented hidden-controls Play click failure (see
[preview validation](PREVIEWS-VALIDATION.md#existing-component-suite-failure)).
