<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Production preview infrastructure

Demuxe exposes previews independently of playback and wires the ready-made player's
scrubber to that same API. Hovering creates no playback seek, decoder flush, pause,
MSE reset, or playback-byte-cache admission.

```ts
const player = new Player(container, {
  preview: {bucketSeconds: 1, debounceMs: 50, width: 160,
            maxEntries: 48, maxCacheBytes: 4 * 1024 * 1024},
});
const frame = await player.preview.getFrame({time: 123.4, width: 240, height: 135, signal});
if (frame) {
  // frame.image is an encoded Blob or an explicitly authored sprite reference.
  // Consumers creating object URLs must revoke them when no longer displayed.
  console.log(frame.requestedTime, frame.actualTime, frame.time,
              frame.temporalAccuracy, frame.fidelity, frame.path, frame.cache);
}
```

`null` means no eligible provider succeeded. Superseded, cancelled, expired and
destroyed requests reject with `AbortError`; failures do not enter Player's
playback error/recovery pipeline. `player.diagnostics.preview` reports bounded
counters, current work/cache occupancy and the last failing provider/error class.
It deliberately does not retain error messages, signed URLs or a growing event log.

## Disable controls and pre-generation

The ready-made player's settings include **Timeline thumbnails**. Turning it off
hides/cancels scrubber previews without disabling the API or background generation:

```html
<demuxe-player controls no-preview></demuxe-player>
```

```ts
element.previewThumbnails = false; // UI only; true restores it
const player = new Player(container, {preview: false}); // Entire preview API off
player.preview.enabled = true;  // Restore the original provider routes
player.preview.enabled = false; // Cancel work and clear images; getFrame returns null
```

Pre-generation is opt-in at initialization and starts after a finite-duration
source opens. Choose a timestamp list (seconds) or an interval:

```ts
new Player(container, {
  preview: {pregenerate: {timestamps: [10, 30, 60, 90], count: 3}},
});
new Player(container, {
  preview: {pregenerate: {every: 30, unit: 'seconds', count: 20}},
});
new Player(container, {
  preview: {pregenerate: {every: 2, unit: 'minutes'}}, // All candidates
});
```

`count` is an optional positive integer limiting the number of candidate thumbnails.
Omit it or set it to `null` (the equivalent of a blank field) to process **all**
candidates. A list may also be written as `pregenerate: [10, 30, 60]`. Lists are
sorted, bucket-deduplicated and restricted to the source duration; at most 10,000
explicit input timestamps are accepted. Intervals start at zero and stop before
the duration. Intervals finer than the configured time bucket share one decode.
Unknown-duration and live sources are not automatically generated.

The default pre-generated image size is 240×135, matching the scrubber. Override
`width`/`height` inside `pregenerate` when warming another consumer's cache; requests
must use matching dimensions to hit the same entries. A single background candidate
runs at a time, with a 500 ms scheduling gap. Hover requests and playback operations
or buffering take priority. Source changes reset the plan; destruction stops it.
Failures remain non-fatal, so the count is a maximum, not a guaranteed image yield.

**All does not mean unlimited retention:** the existing image cache limits still
apply. New background images may evict older background images, but never entries
already used by foreground requests. No persistent on-disk storyboard is created.

For the custom element, set initialization options before connecting it:

```ts
const element = document.createElement('demuxe-player');
element.previewOptions = {
  pregenerate: {every: 1, unit: 'minutes', count: null},
};
document.body.append(element);
```

For an explicit one-off warmup, `await player.preview.prefetch({time: 60, width: 240,
height: 135})` remains available. It declines while the controller is busy; it does
not queue a batch. The configured pre-generation scheduler waits for idle slots.

## Time and spatial fidelity

`requestedTime` is the caller's original position; `bucketTime` is the routed
position. `actualTime` is a provider-reported represented timestamp, **or null when
it is not observable**. `time` is a best display-time estimate in that case.
`temporalAccuracy` is `exact` only when an exact provider reports the original
requested timestamp; all other results are `approximate`. `fidelity` independently
reports `full` or `reduced`: ordinary full decoding followed by thumbnail sizing
and JPEG encoding is `full`, not a claim of lossless pixels.

The browser baseline reports `actualTime: null`, `timestampKind: 'media-time'` and
an approximate media-time estimate. HTMLVideoElement.currentTime alone does not
prove the displayed frame's PTS. The scrubber prefixes approximate timestamps with
`≈`. Authored/Shaka tiles report their represented interval start, not the hover
time. No nearest-I-frame assumption is part of the public contract.

`exact: true` bypasses bucketing and accepts only a provider declaring the exact
requested represented timestamp. Current local-browser and Shaka interval providers
cannot satisfy that contract; exact-capable registered providers can. Setting
`bucketSeconds: 0` disables bucketing without requiring exact-frame fidelity.

## Controller, routing and extension points

`src/preview/controller.ts` owns routing, one active job, one replaceable pending
job, one current caller, cancellation, cache, sizing and optional updates. Rapid
same-bucket requests reuse work and reject the old caller. Different buckets abort
old work. Cancelled requests do not attach accumulating promise handlers to an
uncooperative provider. Such a provider can still block its lane until it settles;
providers must honor signals. The default caller deadline is ten seconds.

Where available, `scheduler.postTask` admits generation at background priority;
the debounce timer is the event-loop fallback. The browser decoder/GPU does not
provide hard resource reservations. Local generation declines during playback
operations and observed buffering.

The routing order is:

1. Cached result matching source, provider revision, time bucket, exact intent and size.
2. Application-registered `AuthoredPreviewProvider` (priority 10).
3. Active backend's Shaka image-track provider (20).
4. `LocalVideoPreviewProvider`, independent browser decoding of local files (40).
5. `SoftwarePreviewProvider`, isolated FFmpeg/mpv extraction (50).
6. Registered fallback providers, or `null`.

A provider implements `id`, `priority`, `canHandle(context)` and `getFrame(context)`.
Context includes source identity, target dimensions, time, exact intent, signal and
`publish(frame)`. Resource-owning providers register a teardown-completion promise
with optional `trackCleanup(completion)` before their first asynchronous operation,
and settle it once their resources have been released. This is separate from the
provider result promise, so an uncooperative optional provider cannot block player
destruction merely by never returning a result. `addProvider()` returns an idempotent removal function;
`setProviders()` replaces the route list. Both invalidate cached results.

```ts
const sourceId = player.preview.diagnostics.sourceId;
const remove = player.preview.addProvider(new AuthoredPreviewProvider(
  async context => storyboard.lookup(context.time), sourceId,
));
```

The optional source binding prevents an old storyboard serving a replacement
source. Omit it only for a lookup that explicitly handles `context.sourceId`.
Authored results may contain a Blob or URI alternatives plus pixel crop and optional
byte range. The UI fetches those explicit references with omitted credentials,
low fetch priority, cancellation, no redirects and a 4 MiB encoded-image limit.
Hosts needing custom authorization should return Blobs from their lookup.

`preview.request({...request, onUpdate(frame) {...}})` accepts optional coarse and
refined publications, returning the final result as a Promise. `getFrame()` remains
the single-final-result interface. Stale publications are discarded, only final
results enter the cache, and consumer callback exceptions cannot affect providers.
No built-in provider currently emits progressive results.

`prefetch(request)` is explicit and declines while the lane is busy. A foreground
request supersedes it. Automatic neighbor prefetch is disabled. A controller is one
latest-wins interaction lane; thumbnail grids should request sequentially or own a
separate controller/provider instance, with their own bounded budget.

## Reliable generated baseline and source indexing

Local generation creates a separate muted video element, seeks it, draws one
bounded thumbnail canvas and returns JPEG. It never receives the main surface or
playback control methods. Files reuse immutable Blob storage. ArrayBuffer sources
use one preview Blob per accepted session, within the existing 32 MiB input cap.
The browser owns demuxing, keyframe lookup and decode dependencies. Its private
sample/decode counts and exact decoded PTS are not fabricated in metrics.

Existing `simple-mp4-inspector.js` is metadata admission; `source-probe.js` is packet-only
preflight. Neither exports a qualified random-access sample index. `split-mp4.js`
preserves sample data for remux packaging, not a general source index. Consequently
this baseline does not duplicate those systems with a new parser or custom codec.

[R072](../research/items/R072.decode-only-keyframes-for-coarse-previews/README.md)
qualifies a host-only, source-scoped H.264 IDR storyboard job, explicitly excluding
browser integration and unproven open GOPs. Its minimum-sample strategy is appropriate
for a future indexed provider, but is not silently applied to browser seeks.
`SoftwarePreviewProvider` falls back to the existing FFmpeg/mpv software engine for
local containers/codecs that the browser cannot decode, including HEVC and FFV1 in
Matroska. A disposable worker tree and canvas belong exclusively to each extraction;
it never receives the active playback backend. Audio and subtitles are disabled,
video decoding uses one thread, and mpv opens at the requested region. The engine
remains paused. Capture waits for playback-restart before reading its own rendered
surface. The returned media clock is approximate; `actualTime` stays null because
this interface does not expose the decoded frame PTS.

The same provider accepts remote files and clear VOD manifests accepted by Demuxe's
existing FFmpeg fallback policy. It uses a separate bounded byte/resource cache,
low-priority fetches and no playback authorization-refresh callback. It cannot evict
playback cache entries. Remote bytes are currently not shared with the playback
worker. Live streams, encrypted/DRM media and explicit adaptive constraints unsupported
by the fallback retain authored/Shaka thumbnails or return no generated preview.
Audio-only inputs have no video frame to extract.

The controller serializes extraction and awaits worker disposal before starting the
next decode. Cancellation, source changes and destruction terminate the preview
worker tree through the existing WasmPlayer containment boundary. `Player.close()`
and `Player.destroy()` await registered preview teardown; the browser provider
also registers its video/object-URL cleanup. `PreviewController.destroy()` returns
a completion promise, while `drain()` joins already registered resource teardown.
Playback buffering (including mpv `paused-for-cache`) suspends generation and
cancels active work. Resident cache hits remain available, and generation resumes
when playback no longer needs buffering. Images still use
the bounded shared preview-image LRU. The browser provider has a 1.5-second wait
limit per media event so unsupported inputs can fall through promptly.

This baseline trades broader format coverage for software initialization cost and
an additional Wasm heap. The 8 MiB packet budget is not a whole-engine memory cap;
existing allocation/pixel limits still apply. It uses the existing audio-capable
runtime with audio decoding disabled, not a new lightweight extraction binary.
CPU/network priorities remain best-effort browser hints, not hard reservations.
Progressive or compressed-domain decoding remains optional research.

## Shaka integration and network isolation

The bridge uses public `getManifest()`, `getImageTracks()` and `getThumbnails()`.
Already-indexed image streams and static clear DASH JPEG tracks are eligible.
For the pinned Shaka version, JPEG SegmentList/SegmentTemplate index creation is
metadata-only; SegmentBase/index-template fetching rejects JPEG at manifest admission.
This bounded case initializes through Shaka itself and is covered by a real DASH
fixture test. It does **not** initialize a lazy
image playlist/index through playback networking: this could affect playback's
shared authorization/error state and cannot be cancelled per thumbnail.

An eligible tile is fetched through a separate `ShakaNetworkPolicy` owner, reusing
Demuxe's origin, current credential snapshot, byte-range and response checks.
Preview owners cannot invoke playback authorization renewal; expired credentials
fail that preview without occupying the playback refresh path.
The preview owner uses low fetch priority, a 4 MiB response budget and aborts with
the request. Its errors never set playback's terminal transport state or ABR samples.
The tile is cropped/resized to a JPEG Blob, and intermediate ImageBitmaps close.
Other unindexed HLS/DASH image tracks safely decline; full lazy-index support remains a
qualification/integration gap, not a second manifest parser.

## Cache and source-byte reuse

The separate image LRU defaults to 48 entries and 4 MiB. Accounting includes encoded
Blob bytes, a conservative RGBA footprint and key/reference overhead. Both limits
apply; zero disables retention. Oversized frames may be returned without caching.
Source identity/provider revision/time/geometry/exact intent form the key; the
represented timestamp remains attached to the result. Immutable cached metadata
cannot be changed by a consumer. Diagnostics count retained cache bytes, not total
browser memory or caller-retained Blobs. One active generation may temporarily own
additional decoder/canvas resources; the decode-pixel guard defaults to 4K.

[R055](../research/items/R055.cache-bounded-decoded-previews-for-scrub-revisits/README.md)
supports caching revisits, not a speed claim for one-way traversal. Cache retention
is therefore lazy, and no automatic neighboring jobs are generated.

`RangeReader.peek(offset, capacity)` copies resident bytes without changing playback
LRU order, epochs, buffers or counters. `readPreview(offset, capacity, {signal,
allowFetch})` uses that path first. Fetching defaults off. An admitted fetch uses one
separate bounded block, established source identity, the existing range validator
and low fetch priority. Playback read/epoch/close preempts it; fetched preview bytes
never enter or evict playback cache data. Busy admission returns null; there is no
background queue. Capacity stays capped at 256 KiB. Preview fetches use current
credentials but cannot occupy playback's authorization-refresh mailbox: an expired
credential fails the preview and playback owns renewal.

This primitive lives in the reader's owner worker. Remote extraction has no new RPC
or generated provider yet; future indexed providers can consume it without sharing
playback `read()`/`beginEpoch()` state.

## Lifecycle and UI

Source acceptance, engine replacement, close and destroy cancel jobs and clear
images. Source IDs prevent reuse across sources. Provider replacement does likewise.
Local video owners unload, object URLs revoke and image bitmaps close in cleanup
paths. Caller-held Blob results remain valid after eviction.

`src/player/preview.ts` only maps pointer coordinates to time, calls the public API,
loads the result and manages visible UI/object-URL ownership. The thumbnail appears
above the scrubber with its represented/estimated time. During continuous pointer
motion, one request finishes while only the latest waiting position is retained;
the displayed image stays visible until its replacement has decoded. Image loading
runs separately from generation, so a stalled authored image cannot block the next
preview; a newer result cancels the older image load. This avoids starving
generation by cancelling on every pointer event. Pointer leave/cancel,
source/engine operations, controls hiding, disconnect and destruction hide it and
cancel obsolete requests. Touch movement is left to the existing seek interaction.

## Measurements and validation

`npm run test:preview` builds and exercises controller/range/Shaka policy tests,
real local playback, DASH JPEG thumbnails and scrubber integration. Browser tests cover unchanged
position/play intent, continued playback, latest-wins, cache/source invalidation,
provider fallback, represented-time labels, late results and resource cleanup.
Use `BROWSER=firefox node tests/preview-browser.mjs` and
`BROWSER=firefox node tests/preview-ui.mjs` for Firefox.

`npm run benchmark:preview` writes a unique `results/preview/<timestamp>/benchmark.json`
with source hash, browser, requested/actual/estimated time, provider, temporal and
spatial category, cache state, dimensions and phase metrics. Cache hits and misses
are summarized separately; approximate and exact providers must never be pooled.
Provider selection, cache lookup, media-ready wait, seek and conversion are measured.
Browser-hidden sample lookup, byte acquisition, decoder initialization/decode and
frame counts remain **null**, not zero. Local network bytes are zero. The small
fixture run is a baseline smoke measurement, not a broad performance qualification.

The [validation record](PREVIEWS-VALIDATION.md) includes measured baseline latency
and the independently reproduced existing component-suite failure.

## Optional research

`ReducedResolutionPreviewProvider`, `CompressedDomainPreviewProvider`, and
`PartialReconstructionPreviewProvider` are extension names, not implemented decoders.
They can gate codec/profile eligibility, publish coarse/refined output, or be removed
without changing getFrame, the cache, authored sources or scrubber.

Investigate intra-frame-only extraction, reduced-resolution reconstruction,
transform-domain/DC/low-frequency approximations and stationary-cursor refinement
only with bounded source/codec contracts. Compare the same source/time/size while
charging indexing, bytes, initialization, decoding and conversion separately.
[R185](../research/items/R185.progressively-refine-one-preview/README.md) stopped its
current progressive-image profile after visual/correctness failure; no production
refinement benefit is assumed. DRM, Safari, broad codec coverage, hardware contention,
long-session endurance and a real remote generated-preview path remain unqualified.
