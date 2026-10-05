# Demuxe preset implementation and comparison

Demuxe is implemented as `{type: "demuxe"}` and selectable in the player. Adaptive remains the default. The existing stateless custom sampler API is unchanged.

## Behavior

- Retains up to 24 whole-video storyboard buckets, bounded to one third of estimated cache capacity. Local entries use LRU turnover; hard byte/entry limits, clear, unload and source changes remain authoritative.
- Uses up to 25 local normal-density samples: one-second grid for slow inspection, five-second grid and bounded 0.5-second prediction for fast motion.
- Checks background work every 100 ms with a 100 ms foreground cooldown, while preserving serial decoder admission and playback-pressure restrictions.
- Displays resident coverage during pointer movement and requests the target bucket after a 180 ms pause. Pointer leave and destruction cancel the deferred request.

## Validation

- TypeScript build, public API inventory, consumer-type, license and core-boundary checks passed.
- 112 focused preview/controller, scheduler, cache, facade, scrubber and state-machine tests passed. Includes broad retention under eviction, bounded steady-state generation, suspension/source retirement, latest-target settle timing, and pointer-leave cancellation.
- 864 deterministic cases passed: eight policies × nine behaviors × three decode costs × two cache budgets × two warmup conditions. Entry and byte caps held.
- Served generated strategy/controller-helper/UI bytes were compared with local files.
- T3 browser: Demuxe selectable; switching to/from Gaussian and Adaptive preserved playback source/mode; disabling and re-enabling previews worked. Native File fixture hover rendered a 240-pixel thumbnail at the represented 0:08 timestamp; playback advanced from 2.118 to 4.942 seconds and remained playing; pointer leave hid the preview.

## Equal-weight matrix averages

| Policy | Within 1 second | Within 10 seconds | Blank time | Decode work/case |
|---|---:|---:|---:|---:|
| demuxe | 60.4% | 82.7% | 1.1% | 28.6 s |
| on-demand | 56.2% | 81.5% | 3.7% | 12.3 s |
| uniform-48 | 18.4% | 64.2% | 1.3% | 17.6 s |
| adaptive-24 | 42.6% | 84.3% | 2.2% | 18.9 s |
| gaussian-25 | 59.7% | 81.6% | 3.6% | 22.6 s |
| gaussian-49 | 59.7% | 81.6% | 3.6% | 22.6 s |
| directional-25 | 59.7% | 81.6% | 3.6% | 22.6 s |
| demuxe-prototype | 60.3% | 82.2% | 3.5% | 21.5 s |

Demuxe reduced blank time relative to Gaussian (1.1% versus 3.6%), with a small one-second precision gain (60.4% versus 59.7%), at approximately 26% greater modeled decode work. It is not uniformly better: slower scans, reversals and revisits still expose tradeoffs. This result supports offering the preset for testing, not changing the default.

## Scope and limitations

The matrix uses the real PreviewController and scrubber decision machine with synthetic fixed-delay decoding. A 24-minute video is modeled, with 30-second interaction traces and 0/30-second warmup. Decode costs are 100/400/1000 ms; cache budgets are 24 entries/4 MiB and 96 entries/16 MiB. Warmup work is included in decode totals; display metrics cover interaction only. Timer resolution is 50 ms, so the 180 ms UI deadline quantizes to 200 ms in the model.

The model bypasses DOM image decoding and has no network, keyframe, codec, scene-recognition or frame-drop model. Equal weighting across cases is not a distribution of real users. One- and ten-second tolerances describe temporal error, not scene recognition.

Initial T3 browser image presentation stalled (including a standalone Image.decode test); a subsequent warm-cache hover rendered successfully. This is limited browser smoke evidence, not a cold-presentation latency guarantee. Both the initial and successful observations are preserved in browser.json. No cross-browser or release qualification is claimed.

## Reproduce

```sh
npm run build
node --test tests/preview-strategies.mjs tests/scrubber-preview.mjs tests/preview.mjs tests/preview-pregeneration.mjs tests/preview-range.mjs tests/preview-facade.mjs tests/api-stability/scrubber-state.mjs tests/api-stability/preview-core.mjs
node --test tests/preview-scenarios.mjs
```

Open `http://127.0.0.1:4179/examples/player-element.html?preview=demuxe` to try both independent players. The demo server was left running.

After measurement, generated SPDX headers were restored after the standalone TypeScript compile. `stamped-hashes.json` verifies that every changed matrix input differs only by that header.
