# Supported runtime worker boundary

The functional-core architecture gate covers the supported public runtime: the `package.json` export map and its generated module import closure, plus the explicit runtime assets assembled by `scripts/package-beta.py`. It does not claim that every historical experiment, benchmark or directly served demo has been migrated. A file being TypeScript-compiled, hashed in an old manifest, or reachable by an arbitrary development-server URL does not make it an exported package entry point.

Read-only audit of the current generated closure (`node scripts/generated-runtime-files.mjs`) found 306 module/declaration files, including `web/generated/internal/wasm-player.js`, and none of the five legacy binding modules below. The count is an audit receipt, not a maintained fixed invariant. The maintained `tests/api-stability/worker-reachability.mjs` guard checks the actual closure and explicit package worker asset list; adding a legacy path to production requires revisiting this boundary.

| Worker | Current caller/evidence | Classification |
| --- | --- | --- |
| `web/software-full-engine-worker.js` | `src/internal/wasm-player.ts` Software worker selection; package-beta explicit runtime asset | Supported production; shared playback worker and adaptive-decode pure owners. |
| `web/filter-retained-engine-worker.js` | `src/internal/wasm-player.ts` Hybrid/audio-only worker selection; package-beta explicit runtime asset | Supported production, despite historical experiment origins; shared playback, adaptive-decode and retained-presentation pure owners. |
| `web/retained-decoder-worker.js` | Hybrid worker decoder asset | Supported production; pure initialization/generation, pending operation, frame budget, key/drain and watchdog owner. |
| `web/io-worker.js` | Native mailbox source transport | Supported production; pure initialization, epoch, physical-read reservation, refresh receipt and pump lifetime owner. |
| `web/audio-worklet.js` | WasmPlayer shared-memory PCM output | Supported production; pure terminal/epoch owner and scalar frame-count policy; fixed shared buffers and sample-copy cursors are the DSP exception. |
| `web/mpv-subtitle-worker.js` | `src/internal/native-mpv-subtitles.ts`; package-beta explicit runtime asset | Supported production subtitle service; its composed worker lifecycle/timeline/attachment owner remains in scope. |
| `web/engine-worker.js` | `src/player.ts` exports legacy `BrowserPlayer`, emitted as `web/generated/player.js`; loaded explicitly by `web/index.html`, `web/legacy-example.html` and `web/benchmark.html` | Legacy directly served demo/benchmark API. Neither binding nor worker is included by the supported package closure/asset list. Not migrated by this architecture gate. |
| `web/filter-copyback-engine-worker.js` | `experiments/filter-routing/prepare.py` derives worker from engine-worker and creates `web/generated/filter-copyback-player.js`; `web/filter-player.js` imports that binding | Experimental filter/copyback comparison. Not exported or packaged. |
| `web/retained-engine-worker.js` | `experiments/retained-presenter/prepare.py` generates worker and `web/generated/retained-player.js`; `web/retained.html` imports binding | Historical retained presenter comparison. Not exported or packaged. |
| `web/subtitled-engine-worker.js` | `experiments/retained-subtitles/prepare.py` derives worker/binding from retained variants; `web/subtitled.html` imports `web/generated/subtitled-player.js` | Historical subtitle comparison. Not exported or packaged. |
| `web/subtitle-perf-engine-worker.js` | `experiments/retained-subtitles/prepare-perf.py` derives worker and `web/generated/subtitle-perf-player.js` | Historical subtitle overhead benchmark. Not exported or packaged. |

The package export `demuxe/player` targets `web/generated/player/index.js` (`src/player/index.ts`, the supported custom element). It does **not** target the similarly named legacy `web/generated/player.js` (`src/player.ts`, `BrowserPlayer`). The main package exports the unified Player from `src/index.ts`.

Historical generator scripts can overwrite their destination files, including the now-production FilterRetained worker. Regenerating that production worker from an older template can overwrite migrated policy; update the template and retain the supported pure owner and its tests before using regenerated output. Historical benchmarks and their immutable evidence should not be rewritten merely to claim repository-wide functional purity.

The graph check establishes packaging/reachability, not browser behavior or package qualification. Production worker migrations, worker cleanup/resource tests and the supported browser/package matrix remain separate evidence requirements.

## Dormant WebGPU codec assets

`web/webgpu/runtime.js`, `mailbox-service.js` and `presenter.js` are shipped assets whose codec path is currently unreachable through supported Player selection. `src/internal/webgpu-codecs.ts` has an empty frozen qualified-codec registry. WasmPlayer checks this registry before selecting WebGPU; FilterRetained checks again before constructing the mailbox service, requesting a device, constructing a presenter or enabling the decoder. A forced internal WebGPU initialization can import inert modules but is rejected before acquisition.

`tests/external-decoder-architecture.mjs` executes the actual worker branch with observable dependency constructors for ordinary and prototype-like codec names. It verifies zero acquisitions, and removing the guard makes the acquisition control fail. Enabling any codec must reopen the runtime/mailbox/presenter policy migration and qualification: generation, packet/surface budgets, device lifetime and terminal state have not been migrated. Experimental ProRes workers and synthetic presenter tests deliberately construct these components directly and are outside the supported runtime gate.

The normal Hybrid `WebCodecsPresenter` and Software `WebGLYUVPresenter` are separate, active production adapters. The empty WebGPU codec registry does not exclude those adapters from the ownership audit. This narrow dormant-code classification is not a claim that all shipped JavaScript is functionally migrated.
