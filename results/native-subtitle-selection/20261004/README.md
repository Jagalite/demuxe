# Native playback with external ASS selection

## Completed Chrome measurements

After the preview explicitly reported its automation host unavailable, testing continued with the repository's Playwright Chrome harness. Five normal-worker trials and three separately instrumented trials passed with continuous animation-frame qualification. Maximum observed frame gaps were below 28 ms. The prior preview timeouts were not reproduced under normal frame delivery.

| Phase | First normal-worker trial | Subsequent normal-worker trials |
| --- | --- | --- |
| Native media startup to >0.2 seconds | 972 ms | 545–561 ms |
| Add/select to first visible ASS | 1548 ms | 324–493 ms |
| Retained-engine reselection | 41 ms | 38–43 ms |

The instrumented pass measured the 18,411,218-byte subtitle Wasm fetch at 419 ms initially and 46–62 ms later. Streaming compile/instantiate took 444 ms initially and 72–87 ms later, overlapping the download. The init request/response span, including worker service/source/font initialization and engine loading, was 572 ms initially and 127–142 ms later. It excludes main-thread font fetch/asset checks and subsequent subtitle attachment/selection/backend readiness. Instrumented first-visible time was 1677 ms initially and 375–382 ms later. These are local no-store transfers; browser process compilation caches and OS file caches may warm. They are not internet/CDN estimates or fully cold-host timings.

All eight trials verified native audio decoder evidence, native route, media progression, zero subtitle-engine A/V chains, visible ASS pixels, deselection/reselection, the expected drawing after seeking, no player errors, and removed canvas on destroy. All first-use transitions replaced the backend and media element; this test does not qualify gapless or sample-accurate audio continuity. Existing subtitle presentation tests passed 21/21. No production source change was needed for the observed preview stall.

Normal results: ../chrome-2026-10-04T22-21-07.681Z/result.json. Instrumented results: ../chrome-2026-10-04T22-21-54.343Z/result.json. Each records runtime/fixture/runner hashes. Run `node tests/native-subtitle-selection-timing.mjs` against the local server at port 4187; set `INSTRUMENT_WORKER=1 TRIALS=3` for the phase breakdown. The original build license-boundary failure remains unresolved and these results do not establish release qualification.

## Investigation correction

The original first-visible timings and timeouts are environment-unqualified. The T3 preview reported visible=false while document.visibilityState was visible. A heartbeat received zero requestAnimationFrame callbacks for more than 10 seconds while twenty 100ms timer callbacks completed. A subtitle phase trace showed verification producing a visible bitmap, followed by presentation waiting on frame identity 1 with no canvas render dispatched. Thus the earlier 20-second deadlines do not establish a production subtitle failure or engine initialization delay.

Three normal-worker trials passed pixel/audio/seek/reselection checks, with first-visible times 535, 1327, and 3555 ms and reselection 9–43 ms. They lacked continuous frame qualification and must not be used as reliable latency benchmarks. See normal-worker.json and animation-frame-diagnosis.json. The latter uses main-thread request tracing, without replacing the worker.

The runner now defaults to normal workers, requires five animation frames within two seconds, and excludes a trial when frame delivery stalls for over 250 ms. Optional worker instrumentation uses the third argument `{instrumentWorker:true}`. A fresh preview preflight correctly returned environment-unqualified with zero frames; see qualified-preflight.json. Production code was not changed. The frame-qualified Chrome rerun above completes the local timing investigation.

The historical manifest records the original runner digest; runner changes during investigation are recorded separately in investigation-manifest.json. The historical failing campaign below is retained, with the above correction taking precedence.

Current dirty checkout at fbd15d498c3f1d23fe7c5897af378450966c71fd, October 4, 2026. Source/runtime digests are in manifest.json. Run through the T3 collaborative Electron/Chromium browser. Three trials: one passed all assertions, two missed the 20-second first-visible deadline. This is a failing campaign, not qualification.

| Measurement | Result |
| --- | --- |
| Native media startup to >0.2 seconds | 572–656 ms |
| addSubtitle completion | 322–1180 ms |
| First visible selected ASS | 8720 ms in successful trial; two >20-second deadlines |
| Retained-engine track reselection | 43 ms in successful trial |
| Subtitle Wasm fetch (successful trial) | 25.91 ms, 18,411,218 body bytes |
| Streaming compile/instantiate call | 34.05 ms, overlaps the fetch |

Successful trial verified native media-element audio decoder bytes, media progression, native subtitle route, zero subtitle-engine audio/video chains, >500 visible pixels, off/on selection, expected green ASS drawing at 2.25 seconds, no player errors, and canvas removal on destroy. Adding ASS replaced the native backend and media element. Full audio fidelity, sample-accurate sync, audible interruption, and worker shutdown were not independently measured. Compile/instantiate is not full service initialization; addSubtitle completion includes service/source/font work and transition overhead.

Local HTTP sends no-store; new worker per trial, same browser process (compiled-code caches can remain warm). This does not measure cold browser-process cache, HTTP warm cache, CDN latency, bandwidth throttling, or other browsers. The worker wrapper instruments WebAssembly calls and resource timings and queues messages during its dynamic import. Polling visible pixels has about 10 ms granularity plus scheduling delay. The first-visible failures need uninstrumented reproduction before attributing them to production code. Probe files retain superseded harness assumptions and incomplete runs, and are excluded from the three-trial result.

TypeScript compiled. npm run build subsequently failed its license-boundary check on src/types.ts importing internal/execution-capabilities.js. No release qualification is claimed.

Runner: tests/native-subtitle-selection-timing.browser.js. Evaluate that file in examples/custom-controls.html on scripts/serve.mjs, then import Player from /web/generated/index.js and await runSubtitleTiming(Player, 3). Result is also retained in window.subtitleTimingReport. Preload fixture fetches occur before measurement. No production implementation changes, commits, or pushes were made.
