# Accepted-route thumbnail experiment — 2026-10-07 EDT

**The design works for all five video-path families on the tested host.** The
full evidence contains 26 passing cases and two retained Shaka video-only
playback failures. Both Shaka paths pass with an audio/video DASH source. This
is an experiment; production thumbnail routing and playback policy were not
changed.

## Recorded results

Representative remote-source results from the final run:

| Accepted video path | New preview session | Next two uncached frames | Result |
| --- | ---: | ---: | --- |
| Native direct | 14 ms | 7 / 4 ms | Pass |
| Native remux, pthread | 1,139 ms | 1,066 / 1,063 ms | Pass |
| Shaka authored images, A/V DASH | 45 ms | 22 / 42 ms | Pass |
| Shaka generated frames, A/V DASH | 83 ms | 41 / 13 ms | Pass |
| Hybrid WebCodecs, pthread | 437 ms | 215 / 213 ms | Pass |
| Software FFV1, pthread | 234 ms | 257 / 249 ms | Pass |

These are individual end-to-end observations, not averages or decoder-only
timings. The two warm frames are different requested positions. Browser and
WASM caches were already warm. Several embedded-browser canvas encodes took
about one second; exploratory runs were substantially faster for the same
remux path. Treat those numbers as environment-sensitive, not stable production
latency promises. Cache hits bypassed extraction and took under one millisecond.

Local and remote remux, hybrid, and software cases also passed under **JSPI and
Asyncify**. Native cross-origin/CORS and authenticated remote remux, hybrid, and
software cases passed. The preview decoder identity matched the accepted
playback engine, including actual WebCodecs versus software decoder evidence.

Passing cases produced the requested green/blue/green images, retained the
primary backend, emitted no primary seek events or errors, and kept primary
playback advancing at more than 0.8 media seconds per wall second. The short
windows are affected by quantized player-state publication; they do not support
precise throughput comparisons. Cancellation after decoder allocation returned
AbortError, awaited teardown, and left no iframe owners. This is not a complete
GPU or worker-memory leak audit.

## Comparison with current behavior

While playback was active, the existing built-in preview API returned no frame
for the tested remote direct, remux, hybrid, software, and Shaka-without-images
sources. The experimental matching providers generated frames for each. Existing
Shaka authored thumbnails already worked.

For these fixtures, the absence of remote previews is therefore not an inherent
inability of the selected video engine. A matching, separately owned preview
session can generate them during playback.

## Retained failure: video-only Shaka playback

The original video-only DASH authored/generated cases both produced correct
thumbnail pixels and timestamps. They failed the concurrency requirement because
the primary video paused around 1.75 seconds.

An eight-second control with **preview disabled and no thumbnail requests**
reproduced the pause at 1.742 seconds, with approximately 12 seconds buffered and
readyState 4. Instrumenting JavaScript `HTMLMediaElement.pause()` observed no
call at the unexpected pause; the only intercepted pause call was final cleanup.
The underlying cause remains unresolved in this embedded Chromium environment.

The otherwise equivalent audio/video DASH control advanced to 8.055 seconds.
Both authored and generated thumbnail tests then passed on that A/V source,
including generated-preview cancellation. The original two failures remain in
the results and are not counted as passes or silently skipped.

## Implications for implementation

- Let each accepted video backend expose a preview-session factory. Preserve
  source authorization and use a distinct seek/decoder lifetime.
- Prefer cached frames and authored image tracks before generating video frames.
- Reuse the preview session for nearby requests; retire it on source/route changes.
- Keep backend-specific startup details inside the factory: remux source-clock
  conversion, Shaka initial-frame readiness, hybrid open-then-seek, cross-realm
  Blob normalization, and private-runtime command restrictions.
- Retain resource budgets and playback-pressure cancellation. This 640x360
  success does not justify unconditionally enabling concurrent 4K software decode.

The prototype does not implement production source/route replacement, adaptive
representation matching, multiple-video-track selection, DRM/live support, or
full authorization-refresh behavior. Those remain integration work.

## Evidence and validation

- [Full summary](../../results/preview-route-alignment/2026-10-08T03-31-43-046Z/summary.json): 26 passed / 28 total.
- [No-preview Shaka controls](../../results/preview-route-alignment/2026-10-08T03-31-43-046Z/shaka-controls.json).
- [Served asset hashes](../../results/preview-route-alignment/2026-10-08T03-31-43-046Z/served-assets.json).
- [Compiled source identity](../../results/preview-route-alignment/2026-10-08T03-31-43-046Z/source-identity.json).
- [Host and measurement conditions](../../results/preview-route-alignment/2026-10-08T03-31-43-046Z/host.json).
- Each case has a JSON receipt and three PNGs alongside the summary. The verifier
  independently decoded all 84 PNGs with FFmpeg and checked their color markers.

TypeScript compilation into the experiment-only directory succeeded. JavaScript
syntax checks passed. The verifier confirmed the exact expected 26-pass/2-fail
outcome and that current served-asset hashes match the latest recorded versions.
The diagnostic control module has recorded versions; the core experiment module
remained unchanged throughout the final matrix and A/V comparison.

Host: Apple Silicon, 8 GiB RAM, T3 shared Chromium 152.0.7977.130. Media was served
over local HTTP; no WAN delay or bandwidth restriction was simulated. Source
HEAD was `99b27fa307d78a36935b19e05f1d8144f1e07f6c` plus existing working changes,
bound by the source and served-asset hashes. No release archive, other browser,
high-resolution workload, CPU utilization, or long-session claim is made.
