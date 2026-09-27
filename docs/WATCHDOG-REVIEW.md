# Watchdog review and performance check — 2026-09-27

The review fixed unnecessary Player health-timer wake-ups during paused/hidden/ended playback and a background guard that inadvertently skipped selective-audio synchronization. Native sampling now avoids quality/buffer reads when already ineligible and reads one buffered-range snapshot per sample. The timer restarts with fresh suspicion budgets, remains idempotent across ordinary operations, and stops on failure/close/destroy. Watchdog policy and actual-error handling remain independent.

Correctness: `npm run build` passed (TypeScript, runtime assets, licensing and core dependency boundary); 66 focused unit tests, 18 watchdog Chrome cases, and 21 runtime-capability Chrome cases passed. New cases cover Native/Hybrid pause/visibility/close timer lifecycle, background selective-audio sync without heuristic failures, and avoiding browser reads on ineligible Native samples. Six additional frozen-runtime/fixture variants passed play, pause, seek, resume, EOF and cleanup before CPU measurement.

## Measurement scope

- Chrome 153.0.8010.53, headless, 960×540 viewport, local H.264/AAC MP4, 640×360 at 30 fps. The 60.137-second fixture is a fivefold packet-copy repetition of `fixtures/example.mp4`.
- Served runtime files, bundled font and fixture were frozen and SHA-256 recorded. The `before` copy is the watchdog implementation immediately before this review, **not** a pre-feature or historical release baseline.
- Repository `benchmark-browser.mjs` startup completion gate, 20-second settling, 5-second playback warm-up, 20-second CPU windows at 2-second monotonic deadlines, full browser process-role accounting, process-turnover rejection, route/progress/frame/error checks. The initial campaign also verified process exit; the follow-up used ordinary Playwright browser closure.
- Initial campaign: one gated browser with fresh contexts, three order-rotated pairs per condition; 24/24 windows accepted. Follow-up: a separate gated browser, four independently controlled Hybrid policies, forward/reverse order in one playback session; 8/8 windows accepted. Repeats within a browser are correlated. Idle CPU is retained, never subtracted.
- This checks foreground Native Direct and Hybrid on the named fixture. It does not qualify other codecs, selective-audio performance, Software, Safari/Firefox, physical output, power usage, long sessions, or small effects across fresh browser launches.

## Results

CPU values are percentage points of one core (100% = one fully utilized core).

| Comparison | Round 1 | Round 2 | Round 3 |
| --- | ---: | ---: | ---: |
| Native playing: enabled minus disabled | -1.02 | +1.78 | +0.26 |
| Hybrid playing: enabled minus disabled | +3.85 | +1.49 | +16.38 |
| Native paused: after review minus before | -0.10 | -0.09 | +0.08 |
| Hybrid paused: after review minus before | -0.32 | +0.23 | -1.63 |

The initial Hybrid signal warranted follow-up; it is preserved rather than discarded. In the same-session follow-up, all-on minus all-off was **+1.17 then -4.18 points**. Independent policies were:

| Hybrid policy | Forward order CPU | Reverse order CPU |
| --- | ---: | ---: |
| all on | 38.31 | 23.14 |
| all off | 37.14 | 27.33 |
| health timer off | 35.70 | 37.43 |
| decoder output off | 34.66 | 33.80 |

The large fresh-context Hybrid gap did not reproduce as a consistent switch-dependent cost. These runs do **not** establish zero overhead or a precise small CPU cost. No watchdog setting changed the selected route, and accepted playing windows retained frame/clock progress.

The structural idle improvement is unambiguous: in every 20-second paused window, Native health callbacks fell **40 → 0** and Hybrid **80 → 0**. Enabled foreground playback retained 40/80 callbacks respectively; master-disabled windows had zero.

Direct main-thread callback profiling (separate from the initial CPU campaign):

| Monitor | Callbacks | Total callback wall time | Average | Maximum |
| --- | ---: | ---: | ---: | ---: |
| native | 40 | 2.245 ms | 0.0561 ms | 0.150 ms |
| hybrid | 79 | 0.690 ms | 0.0087 ms | 0.020 ms |

Those timings measure callback execution only, including instrumentation. They exclude decoder-worker work, browser/GPU side effects and wake-up cost; they are not whole-browser CPU percentages.

## Evidence and reproduction

- [Initial CPU samples, identities, hashes and correctness](../results/watchdogs/performance-1790517201536/result.json.gz)
- [Initial paired summaries](../results/watchdogs/performance-1790517201536/summary.json)
- [Independent-toggle follow-up and callback samples](../results/watchdogs/callback-cost-1790518214915/result.json.gz)
- [Watchdog browser regressions](../results/watchdogs/browser-1790517003963/result.json.gz)
- [Runtime failure regressions](../results/runtime-capability/browser-1790517100064/result.json.gz)
- [Rejected preflight: missing bundled font, no CPU windows](../results/watchdogs/performance-1790517136301/result.json.gz)

Runtime copies are retained locally under `build/watchdog-performance-20260927/{before,after}` with `web/` and `fixtures/DejaVuSans.ttf`; the repeated fixture is in the parent directory. The pre-review overlay is retained under `build/watchdog-review-before-20260927`. These generated runtime copies are not release artifacts. To reproduce using them:

```sh
node tests/watchdogs-performance.mjs
WATCHDOG_PERF_REPORT=results/watchdogs/performance-1790517201536/result.json node tests/watchdogs-followup-performance.mjs
```

`WATCHDOG_PERF_ROOT` can select another frozen root with the same layout. The follow-up verifies the fixture and current runtime against the referenced initial report. Keep builds, tests and other benchmarks out of measured windows. The watchdog browser/unit regressions can run independently with `node tests/watchdogs-browser.mjs` and `node --test tests/watchdogs.mjs` after `npm run build`.

## Follow-up: production frame-timing evidence

The subsequent review found that production inspectors did not supply `framerate`; the earlier frozen-counter browser test injected it and therefore missed an integration gap. Native frame monitoring now consumes `frameTiming` from bounded MP4 `stts`/`ctts` timing runs and a supported single edit. It uses the maximum decode interval plus the composition-offset span, not average FPS, and conservatively bounds the active video timeline independently of movie duration. Tables are capped at 4096 runs each, with no per-sample expansion or additional source reads. Missing, inconsistent, oversized or unsupported timing retains clock-only monitoring, including other containers and FFmpeg-only inspection paths.

The updated browser test freezes only the browser frame counter; cadence and bounds come from normal production inspection. Real short-video/long-audio and 12-second held-frame VFR fixtures also pass without metadata mutation. Validation: build passed; 56 focused unit tests and 18 browser cases passed. [Browser evidence](../results/watchdogs/browser-1790521679215/result.json.gz). Earlier CPU measurements above describe their frozen runtime copies; the full CPU campaign was not repeated for this follow-up.

Raw evidence is archived losslessly as `.json.gz`; [the evidence index](../results/watchdogs/evidence-index.json) records raw and compressed SHA-256 hashes. Decompress with `gzip -dc <path.json.gz>` to read or reuse a report. The reproduction commands above expect a decompressed `result.json`.
