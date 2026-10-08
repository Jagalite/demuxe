# Preview generation following the accepted playback route

## Production implementation

`production.js` exercises the public `Player.preview` API with its built-in engine routing. `guards.js` verifies defer/auto policies, cached frames during playback, and expired authorization without invoking playback refresh. `control-paths.js` records playback with previews disabled. The original prototype below remains available for comparison.

Prepare the original fixtures plus A/V DASH and high-resolution long-GOP files:

```sh
node experiments/preview-route-alignment/prepare.mjs
node experiments/preview-route-alignment/prepare-followup.mjs
node experiments/preview-route-alignment/prepare-stress.mjs
node experiments/preview-route-alignment/record-source.mjs
node experiments/preview-route-alignment/server.mjs
```

In the collaborative browser at the printed URL:

```js
const production = await import('/experiment/production.js');
const {matrix} = await import('/experiment/matrix.js');
await production.runMatrix(matrix.map(c => ({...c, id: 'production-' + c.id})));
```

The server hashes fixtures before listening so provenance collection cannot consume a source-inspection deadline. Thus media bytes may be warm in the OS cache; cold preview latency means a new decoder, not cold disk I/O. A `throttle: true` case adds 100 ms response delay and delivers 64 KiB every 32 ms per response. This is a transport simulation, not a WAN qualification or a shared-link bandwidth cap.

Stress cases use `file: '1080p.mp4'` or `'4k.mp4'` and `duringPlayback: 'allow'`. Both are 24 fps H.264 with eight-second keyframe spacing. Guards can verify default deferral and paused generation separately. Verification counts policy guards separately from playback controls; controls retain their own pace measurements and are not counted as thumbnail cases.

See [IMPLEMENTATION-RESULTS.md](IMPLEMENTATION-RESULTS.md) for production evidence and limits.

## Cross-browser qualification

See [CROSS-BROWSER-RESULTS.md](CROSS-BROWSER-RESULTS.md) for Firefox/WebKit versions, complete receipts, lifecycle stress checks, browser limitations, and pinned tooling commands. `run-crossbrowser.mjs` supports targeted repetitions and high-resolution/network stress; `verify-crossbrowser.mjs` validates images, ownership checks, maintained assertions, and served hashes.

## Final review and reproducibility

[REVIEW-RETEST-RESULTS.md](REVIEW-RETEST-RESULTS.md) records the final unit gate, browser reruns, retained failures, and qualification limits. The cross-browser runner accepts Chromium, Firefox, or WebKit. Primary playback uses a trusted click; preview generation receives no gesture.

For concurrent development, the server supports `PREVIEW_GENERATED_ROOT`, `PREVIEW_RUNTIME_SNAPSHOT`, `PREVIEW_EXPERIMENT_ROOT`, and `PREVIEW_SOURCE_IDENTITY` so tested inputs can be frozen separately from ongoing builds. Run `prepare-maintained.mjs` with the same `PREVIEW_GENERATED_ROOT`. `EXTRA=maintained` runs only the maintained assertions after selected cases; `TRACE_SESSIONS=1` records private preview session opening/frame/teardown timing for diagnosis.

## Original prototype

This isolated experiment creates a thumbnail session from the primary player's
accepted backend. It does not change production routing or preview policy.

The prototype uses NativePlayer for direct and remux video, ShakaBackend for
authored image tracks or independent MSE decoding, WasmPlayer for pthread
WebCodecs/software, and PrivateSoftwarePlayer for JSPI/Asyncify. Every generated
preview owns its seek position and lifetime. Native previews are muted; this does
not prove that the browser avoids audio decoding. Software preview audio and
subtitles are disabled.

## Run

From the repository root, with the existing runtime assets installed:

```sh
node experiments/preview-route-alignment/prepare.mjs
node experiments/preview-route-alignment/server.mjs
```

Open the printed URL in the collaborative browser, then click **Run matrix** or
evaluate `window.matrixWork = runMatrix()` in that browser. Cases run serially.
Results, thumbnail PNGs, source hashes, and hashes of served assets are written to
the printed timestamped directory under `results/preview-route-alignment/`.

```sh
node experiments/preview-route-alignment/verify.mjs results/preview-route-alignment/RUN
```

The verifier decodes the saved PNGs with FFmpeg and independently checks their
color markers. It exits unsuccessfully when any case fails; failures remain in
the report rather than being treated as skips.

For the recorded follow-up, run `prepare-followup.mjs`, then import
`/web/generated/experiment-av.js` in the same browser and call its `runCase` for
`shaka-authored` and `shaka-generated` with distinct `-av` receipt IDs. POST each
returned result to `/receipt`, as `matrix.js` does. This derives a module with only
the DASH fixture directory changed; the original video-only bytes remain intact.
`control.js` runs eight seconds of Shaka playback with no previews and records
pause events, buffered data, and JavaScript pause calls.

The recorded 28-case run has two retained video-only failures. Reproduce and
verify that exact outcome with:

```sh
node experiments/preview-route-alignment/verify.mjs \
  results/preview-route-alignment/2026-10-08T03-31-43-046Z 28 \
  shaka-authored,shaka-generated
```

The explicit failure list checks the observed outcome without converting those
cases into passes. See [RESULTS.md](RESULTS.md) for the evidence and limits.

## Matrix and checks

The 26 cases cover local and remote direct/native-remux/hybrid/software video,
authored and generated Shaka thumbnails, pthread/JSPI/Asyncify where relevant,
cross-origin native media with CORS, and authenticated remote remux/hybrid/software.
Each uses a finite 24-second 640x360 source. Direct/hybrid/remux use H.264;
software uses FFV1. The initial DASH fixture is video-only H.264.

Frames requested at 10, 18, and 12 seconds have green, blue, and green corner
markers. The primary starts near the beginning, where the marker is red. This
distinguishes a requested thumbnail from an accidental capture of the primary.
Reported times must be within 250 ms of the requested source time. These are
media-clock estimates, not independently verified exact frame PTS.

Checks include accepted/preview engine identity, advancing primary playback,
at least 0.8 media seconds per wall second over the preview window, zero primary
seek events, cache hits, pre-aborted requests, cancellation after decoder
allocation, awaited decoder destruction, and no leftover iframe owners. The
iframe count is not a full browser/GPU memory-leak measurement.

## Measurement boundaries

- Baseline playback is observed for 1.2 seconds before preview work. The preview
  interval lasts at least 1.2 seconds. This is a short functional concurrency
  check, not long-session performance qualification.
- Cold means a new decoder session. HTTP responses disable caching, but disk and
  browser/WASM compilation caches are not flushed. Warm requests reuse the
  preview session; the cache-hit request bypasses decoding entirely.
- Timings include controller scheduling, I/O, initialization, seeks, decoding,
  and image encoding. Component timings are recorded where the API exposes them.
  No CPU attribution is claimed. Embedded-browser scheduling can add latency.
- Remote media is served over loopback HTTP with real byte-range responses.
  WAN latency, constrained bandwidth, 4K/HEVC, DRM/live content, multiple video
  tracks, route replacement, and other browsers/devices are not qualified.
- The experiment uses current working source compiled into its own build
  directory. It is not a release-package test. Served runtime hashes bind the
  observed behavior to the actual loaded assets.

## Findings from prototype development

1. Remux snapshots must report the backend source clock, not the media element's
   offset timeline.
2. Shaka generated previews must wait for initial decoded data before seeking.
3. The pthread hybrid fixture exceeded its retained-frame bound when opened
   paused directly at a later `start` time. Opening at the beginning and then
   using the backend seek API worked.
4. A Blob returned through the pthread iframe needs normalization into the
   caller's realm, matching the existing software provider's behavior.
5. Private JSPI/Asyncify backends reject the legacy `start` and decoder-thread
   commands. Their supported open/seek APIs worked for this experiment.

The production design should express these differences inside each backend's
preview-session factory. A generic clone of arbitrary backend settings is
insufficient. Cached/authored thumbnails should remain preferred over decoding.

The bounded adaptive Remux implementation and its 4K, fixed-cap, and browser regression evidence are recorded in [ADAPTIVE-REMUX-RESULTS.md](ADAPTIVE-REMUX-RESULTS.md).
