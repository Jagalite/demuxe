# Firefox and WebKit preview qualification

This extends [the Chromium implementation results](IMPLEMENTATION-RESULTS.md) with actual Firefox and WebKit execution. It tests local working-source output and the loaded runtime assets, not a published package or the user's installed Safari. All runs used macOS/Apple Silicon, eight logical CPUs, 8 GiB physical RAM, and cross-origin-isolated loopback HTTP.

Further root-cause experiments are recorded in [the remux and WebKit investigation](INVESTIGATION-RESULTS.md).

## Final modern-engine coverage

| Engine | Unique route/geometry/policy cases | Lifecycle cases | Maintained preview tests | High-resolution/throttled cases |
| --- | ---: | ---: | ---: | ---: |
| Firefox 157.0 | 39/39 | 11/11 | 2/2 | 11/12 |
| WebKit 27.2 | 39/39 across the matrix and corrected guard run | 11/11 | 2/2 | 11/12 |

WebKit additionally passed ten repeated Hybrid cases targeting the older build's crash/pace findings. The single stress failure in each modern engine is forced Native remux of the high-bitrate long-GOP 4K fixture. It is preserved as a failure; the matching preview-disabled controls also fail. No product-source change was required for the modern-engine thumbnail matrix; this follow-up added reusable browser qualification and corrected the test interaction/source setup.

## Browser identities and findings

| Browser | Run | Result |
| --- | --- | --- |
| Firefox 146.0.1 / Playwright 1.58.2 | `2026-10-08T09-27-42-600Z` | 26 thumbnail cases passed. Eight explicitly requested JSPI cases rejected at runtime admission; this browser has no `WebAssembly.Suspending`. Independent image verification passed for the supported cases. |
| WebKit 26.0 / Playwright 1.58.2 | `2026-10-08T09-32-22-080Z` | Partial run: 33 receipts, 23 passes, eight unavailable-JSPI rejections, one Hybrid Asyncify page-process crash, one Hybrid pthread pace failure. The run ended before its last case/final summary; it is not a complete pass. |
| WebKit 27.2 / isolated Playwright 1.64.0 | `2026-10-08T12-28-28-276Z` | All 34 route/geometry cases passed, including JSPI. Seven of eight lifecycle setups passed; the direct setup had conflicting transport policy. Three later batched policy guards hit autoplay restrictions. Both maintained preview tests passed. These failures remain in the receipts. |
| WebKit 27.2 / robustness rerun | `2026-10-08T12-43-31-464Z` | Ten repeats of the previously troublesome Hybrid paths passed; 11/12 high-resolution/throttled cases, all five policy guards, all 11 lifecycle cases and both maintained tests passed. The remaining 4K-remux case hit the existing coded-data ceiling; its preview-disabled control also failed. Independent artifact/hash verification preserved that named failure. |
| Firefox 157.0 / stress follow-up | `2026-10-08T12-49-32-012Z` | 11/12 high-resolution/throttled cases passed; the same forced 4K-remux budget failure and preview-disabled control failure were retained. |
| Firefox 157.0 / isolated Playwright 1.64.0 | `2026-10-08T12-37-48-445Z` | **39/39 route, geometry and policy cases; 11/11 lifecycle cases; both maintained preview tests passed.** PNGs and served-asset identities independently verified. |

Current Playwright tooling was installed under `build/preview-browser-tools`; the repository dependency/lockfile was not upgraded. The newer engines expose JSPI, so the modern-browser matrix actually executes pthread, JSPI and Asyncify instead of silently skipping a requested runtime.

The final capability-only run `2026-10-08T12-52-54-381Z` independently confirmed typed `UNSUPPORTED_FEATURE` rejection for explicit JSPI in Native, Hybrid and Software on Firefox 146.0.1 and WebKit 26.0, with no iframe owners left behind. These are rejection checks, not successful JSPI playback.

Logs and independent summaries are retained under `build/preview-firefox157-verified.log`, `build/preview-webkit27-robust-verified.log`, `build/preview-firefox157-stress-verified.log` and each run's `summary.json`/`crossbrowser-summary.json`. Source hashes still match the isolated compilation. Syntax and scoped whitespace checks passed; the previous product test suite was not rerun because this follow-up did not change product source.

## What the tests check

The 34-case route matrix covers the five playback engines, local/remote media, authored/generated Shaka images, all three applicable Wasm runtimes, authorization headers, cross-origin canvas readback, and anamorphic display geometry. Colored regions distinguish requested preview times from the primary picture. The verifier independently decodes PNGs, checks dimensions, rejects wrong timestamps/pace, checks recorded browser errors, and validates every served file hash. It also rejects multiple served versions of one path during a run.

Eleven lifecycle cases cover direct and Shaka plus Native remux, Hybrid and Software under pthread/JSPI/Asyncify. They exercise twelve rapidly superseding requests, disable/re-enable, source replacement during work, destruction during work, terminal API behavior, cache invalidation and preservation, and five-second idle release. Instrumented backend factories must never have more than one live preview child; every created child must be retired. Primary seeks/errors and leftover iframe owners are rejected. This is deterministic resource accounting, not a complete OS/GPU heap-leak proof.

Five policy guards cover explicit defer, construction-time policy snapshotting, 1080p/4K Software default deferral, paused extraction and cache access after resume, and expired preview authorization without invoking the primary renewal callback. The maintained native/software browser assertions cover their existing cache, cancellation, ownership and buffering behavior.

## Issues found during testing

### Older WebKit native decoder crash

The WebKit 26.0 crash report shows a worker-thread `SIGBUS` in `RemoteVideoDecoderCallbacks::addDuration`, reached through `VideoDecoder.decode`. A reduced diagnostic excerpt is retained as `crash-summary.json` in that run. WebKit's [upstream change](https://github.com/WebKit/WebKit/commit/9ba6cb68fcfbb1948bc4b6a1d3f88c4d9073e032) adds synchronization around the same duration map. The stack is consistent with that upstream race; this is an inference, not a proof that every older-browser crash has that cause. A newer engine passing does not retroactively qualify WebKit 26.

### Test setup corrections

The direct lifecycle setup initially supplied `immutable:true` while forcing `nativeRemux:'never'`. Explicit immutable transport constraints require controlled transport, so that setup contradicted the chosen path. It now supplies the same valid source policy as the direct matrix cases.

WebKit also rejected later primary `play()` calls after a long batch lost user activation. The diagnostic run `2026-10-08T12-35-41-818Z` captured `AUTOPLAY_BLOCKED`, including the explicit user-gesture message. Policy guards now start/resume **primary playback** through an actual browser click. Preview generation receives no click helper and must work independently. This corrects the test's interaction model; it does not disable browser autoplay restrictions.

Receipts now include structured error codes/messages and stage traces, because Firefox/WebKit stack strings alone can omit the error message. The runner and independent verifier include lifecycle/policy/maintained outcomes instead of reporting only the standard matrix's successes.

## High-bitrate remux boundary

The stress file is approximately 54 Mb/s H.264 at 4K, 24 fps, with eight-second GOPs. Its forced Native-remux playback exhausts the default 12 MiB coded-data ceiling before reaching the next safe random-access point. The control receipt explicitly records `Remux cannot refill within the coded-data budget while preserving the current GOP`. Preview generation is cancelled when the primary buffers. WebKit's preview-disabled control pace was 0.2449, reproducing the earlier Chromium limit independently of thumbnail work.

The remux profile clamps this budget; a larger generic `memoryBudget` is not presently a verified workaround. Direct, Hybrid and explicitly allowed Software stress paths passed in the WebKit run. This remains an unqualified forced-remux source, not a browser-specific thumbnail regression. The test does not silently increase resource ceilings or convert the failure into a pass.

## Reproduction

Prepare and compile the fixtures/runtime as described in [README.md](README.md), including `prepare-maintained.mjs` and source identity. Install the pinned qualification tools separately:

```sh
npm install --prefix build/preview-browser-tools --no-audit --no-fund playwright@1.64.0
node build/preview-browser-tools/node_modules/playwright/cli.js install firefox webkit
PLAYWRIGHT_MODULE=../../build/preview-browser-tools/node_modules/playwright/index.mjs BROWSER=firefox EXTRA=1 node experiments/preview-route-alignment/run-crossbrowser.mjs
node experiments/preview-route-alignment/verify-crossbrowser.mjs results/preview-route-alignment/RUN_DIRECTORY 39 11
```

Use `BROWSER=webkit` for WebKit. For an explicitly retained failure, pass its exact case ID as the fifth verifier argument; it remains a failure in the summary. `CASES` is a case-ID regular expression; `REPEAT` and `REPEAT_MATCH` repeat selected cases; `STRESS=1` adds 1080p, 4K, throttled network and a preview-disabled 4K-remux control. A failed run is retained and diagnosed before any rerun. Independent verification is required even if the runner exits successfully.

Physical iOS/Android devices, installed shipping Safari, live/DRM generation, long-session soak behavior, broad codec/track combinations and release-package integration remain outside these receipts. Browser capability and successful route execution are separate evidence.
