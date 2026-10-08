# Remux budget and older WebKit decoder investigation

Subsequent work [traced the thumbnail cancellation and fixed the silent preparation stall](THUMBNAIL-CANCELLATION-DIAGNOSIS.md). Statements below describe the earlier investigation snapshot. A subsequent [Safari duration mitigation](SAFARI-DURATION-MITIGATION.md) keeps Hybrid enabled while avoiding the native duration-map trigger.

Investigated on 2026-10-08 using the same isolated build and local fixtures as [cross-browser qualification](CROSS-BROWSER-RESULTS.md). Product code and its resource policy remain unchanged. New scripts are reproducible diagnostic probes, not release qualification.

## Remux: confirmed resource-policy limit

The 24-second 4K H.264 fixture has keyframes at 0, 8 and 16 seconds. FFprobe packet accounting gives **54,140,442 bytes (51.63 MiB) of video in the first GOP**, before audio/container overhead. The 12 MiB coded-data ceiling stops fetching before the next eviction-safe keyframe. Removing the current GOP would discard required decoder references.

| Primary-only experiment | WebKit 27.2 | Firefox 157.0 |
| --- | --- | --- |
| Public 12 MiB request | Budget error at 2.005 s | Budget error at 2.005 s |
| Public 64 MiB request, existing policy | Same failure; effective limit remains 12 MiB | Same failure; effective limit remains 12 MiB |
| Experimental effective 64 MiB limit | Reached 23.022 s | Reached 23.185 s |

Both failures emitted the public `DECODE_FAILED` error with the coded-data/GOP explanation. This is not an error hidden only in diagnostics. The public 64 MiB request is deliberately clamped according to the existing documented policy, not lost in transport.

The experiment intercepted only the browser response for `generated/internal/machine/buffering-policy.js` and replaced the 12 MiB clamp with the explicitly requested budget. It did not edit product source/generated output. The exact intercepted module is saved beside each receipt and independently hashed. Both successful runs crossed both later keyframe boundaries without primary errors, and reported peak coded-data accounting of **67,954,341 bytes (64.81 MiB)**: the 64 MiB limit plus bounded fragment overshoot. This is not a total process/GPU memory measurement and does not establish smoothness under all workloads.

Receipts:

- `results/preview-route-alignment/2026-10-08T13-24-13-919Z`: WebKit three-way comparison.
- `results/preview-route-alignment/2026-10-08T13-25-09-821Z`: Firefox three-way comparison.
- Each contains `investigation-verified.json` with expected failures preserved and the experimental module hash.

A larger primary budget alone does **not** establish thumbnail success. The first additional WebKit experiment (`2026-10-08T13-26-08-965Z`) reached 23.075 s but its concurrent thumbnail request was cancelled. Its original `status: pass` field describes primary playback only; the `preview` field explicitly contains `AbortError`. The probe now separates `playbackStatus` and combined status and also attempts extraction after pausing. Preview children retain their independent 8 MiB policy. Follow-ups `2026-10-08T13-27-19-597Z` and `2026-10-08T13-28-49-496Z` preserved successful primary playback but failed the combined preview check: both concurrent and paused requests returned `AbortError`, including a 500 ms pause-settling interval in the final run. The current evidence does not distinguish the child budget from another cancellation/deadline cause; it must not be reported as a proven child-budget failure. The independent verifier preserves these combined failures.

Implementation direction: an explicit bounded Remux budget override, with default 12 MiB retained, is supported by the primary-only experiment. It requires an intentional API/policy change, child-preview budget design and regression coverage before shipment. Simply removing all limits or evicting the protected GOP is not supported. Direct, Hybrid and Software alternatives passed the prior high-resolution tests.

## WebKit 26: probable upstream race, mitigation unproven

The original page-process crash remains evidence: worker-thread `SIGBUS` in `RemoteVideoDecoderCallbacks::addDuration` from `VideoDecoder.decode`. The official [WebKit fix](https://github.com/WebKit/WebKit/commit/9ba6cb68fcfbb1948bc4b6a1d3f88c4d9073e032) synchronizes a timestamp-to-duration map previously modified from two threads, and makes closed flags atomic. The stack matches that bug, but exact binary/source identity was not established.

New testing on the original Playwright 1.58.2 / WebKit 26.0 binary:

- Five repeats of actual Hybrid local Asyncify playback plus thumbnails passed. Independent FFmpeg thumbnail verification and served-asset checks passed all five; recorded playback pace was about 1.00–1.01.
- Six standalone worker probes decoded 4,000 H.264 chunks each: three with explicit durations and three without. All **24,000 output frames** were delivered without decoder errors or a page crash. No Demuxe or Wasm code is loaded by this probe.

Receipts: `2026-10-08T13-24-52-545Z` (actual path repeats), `2026-10-08T13-24-03-252Z` (duration A/B).

These results establish that the crash is intermittent, not a deterministic failure of that route. Because the duration-bearing control did not crash either, they **do not prove** that omitting duration is an effective workaround. No duration stripping or browser-version gate was shipped. Duration omission would also require preserving frame timing outside the browser, bounding that metadata across reorder/flush/reset, and testing every decoder adapter. A newer WebKit build with the upstream synchronization is the supported direction; local WebKit 27.2 already passed the earlier route/lifecycle matrix and ten targeted repeats. Installed Safari and physical devices are not qualified by Playwright results.

## Checks and reproduction

32 focused buffering-policy, remux-bounds and scheduling tests passed. Five actual older-WebKit thumbnail cases passed independent image/hash verification. Diagnostic scripts passed Node syntax checks.

```sh
# Original older WebKit duration A/B (six cases).
node experiments/preview-route-alignment/investigate.mjs
# Modern engine primary/preview budget experiments; BROWSER may be firefox.
PROBE=remux BROWSER=webkit PLAYWRIGHT_MODULE=../../build/preview-browser-tools/node_modules/playwright/index.mjs node experiments/preview-route-alignment/investigate.mjs
node experiments/preview-route-alignment/verify-investigation.mjs results/preview-route-alignment/RUN_DIRECTORY
# Previously crashing production path, original browser package.
BROWSER=webkit CASES=production-hybrid-local-asyncify REPEAT=5 node experiments/preview-route-alignment/run-crossbrowser.mjs
```

`CASES` filters diagnostic configurations; `REPEATS` controls the standalone duration A/B count. The investigation runner records outcomes, including expected failures; use the independent verifier to assert the intended observations. No commit, deployment or package release was performed.
