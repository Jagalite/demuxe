# Selected-engine thumbnail implementation

Follow-up: [Firefox and WebKit qualification](CROSS-BROWSER-RESULTS.md) adds current-engine matrices, lifecycle stress and identified older-browser limits. The browser scope below describes the initial Chromium work.

The built-in generated preview now follows the accepted playback engine: Native direct, Native remux, Shaka, Hybrid, or Software. Each backend creates an independent preview session. Authored Shaka images and cached frames remain preferred. The same pthread, JSPI, or Asyncify runtime is retained where applicable. See [routing and policy](../../docs/PREVIEW-ROUTING.md).

## Implementation and review

- A preview child owns its transport, decoder, seek position and surface. It borrows provider assets without destroying the playback runtime. It never seeks, switches or recovers the primary player.
- The provider reuses one child, retires it after five idle seconds, and waits for teardown before replacement. Source, engine, selected video, or quality changes invalidate its binding. Cancellation, buffering, suspension, disable and destroy release resources.
- `preview.duringPlayback` accepts `auto`, `allow`, or `defer`. Auto admits native and Hybrid generation; Software requires known dimensions no larger than 1280×720. Buffering still cancels generation. Cached/authored images remain usable.
- Preview remote readers copy authorization/origin/representation constraints, request low priority, and use a separate 256 KiB cache. They cannot invoke the primary authorization refresh callback.
- Review fixed source-clock reporting after remux seeks, Shaka initial-presentation ordering, cross-realm Blob handling, transferred-font reuse, Hybrid placeholder metadata, early coded-size metadata in both canvas engines, anamorphic aspect/rotation geometry, mutable options, reentrant release, and late retired-session rejection affecting a successor.
- Canvas preview sessions now prefer stable demux dimensions, pixel aspect and rotation; native video elements retain their browser-reported display geometry. A separate test reproduces the early coded-size ordering.
- The last lifecycle regression was reproduced against the preceding compiled implementation: a late old-session failure destroyed the new child (`2 !== 1` destroys). The fixed provider checks owner identity before releasing. The regression now passes.

## Evidence

All receipts are under `results/preview-route-alignment/`. Each browser run records fixture/served-asset hashes and source identity from the isolated compilation. These are local working-source tests, not release archive or installed modular-provider qualification. The checkout includes unrelated concurrent changes; no commit or release is implied.

| Run | Purpose | Outcome |
| --- | --- | --- |
| `2026-10-08T05-12-00-346Z` | Final implementation: 26 standard cases, eight anamorphic cases, five policy/authentication guards | **39/39 passed**, independently verified dimensions/pixels/timing/identity. Maintained native/software browser assertions also passed. No served-path version drift or changed hashes at verification. |
| `2026-10-08T04-43-54-992Z` | 48-case production, stress and policy matrix, before final review fixes | Independent verifier: 44/48. All 26 standard cases passed. Failures retained: native anamorphic primary startup timeout, Hybrid anamorphic width, playing 4K remux, paused 4K remux. |
| `2026-10-08T04-54-12-462Z` | Native anamorphic follow-up with a matching preview-disabled control | Control pace 0.971; preview rerun passed at 120×90. Original intermittent startup failure remains recorded; cause was not established. |
| `2026-10-08T05-07-20-987Z` | Repeated 39-case matrix after the cancellation fix | 38/39. A Software anamorphic case exposed the same intermittent coded-size-before-display metadata ordering. All 26 standard cases, policy guards and maintained native/software browser tests passed. |
| `2026-10-08T05-04-22-974Z` | Geometry fix, eight anamorphic cases plus all 26 standard cases | 34/34 passed. Saved PNG dimensions and marker pixels independently verified; served hashes unchanged at verification. |

Final focused checks passed:

- 39 browser cases and the maintained native/software preview browser assertions on the final compilation. Verification log: `build/preview-final2-verified.log`; detailed receipts: `results/preview-route-alignment/2026-10-08T05-12-00-346Z/`.

- 243 unit/regression tests: the complete registered preview group, preview route isolation, Shaka backend, and range-reader deadline tests. The new session suite contributes 21 tests, including the reproduced late-rejection race.
- Four API/export/SSR/behavior-map contract checks.
- TypeScript compilation, the functional-core static check, and the 90-file core dependency boundary check.
- The full license check passed before the final narrow fixes; all touched source/scripts and 26 generated outputs retain their required headers afterward. All 26 touched generated JavaScript/declaration outputs match the isolated tested compilation, ignoring SPDX comments.
- `git diff --check` passed. Existing unrelated generated-output changes were preserved.

Logs are in `build/preview-reviewed-unit.log`, `build/preview-contracts-reviewed.log`, `build/preview-functional-core-reviewed.log`, `build/preview-core-boundary-reviewed.log`, `build/preview-license-final.log`, and `build/preview-output-review.json`.

The standard matrix covers local and remote direct/remux/Hybrid/Software, authored and generated Shaka, pthread/JSPI/Asyncify, cross-origin native with CORS, and authenticated remux/Hybrid/Software. Eight additional cases cover anamorphic Native direct/remux and Hybrid/Software under all three runtimes. The source is coded 720×576 with 16:15 sample aspect: requested 160×90 bounds must produce 120×90 output.

The player remains near the beginning while previews request 10, 18 and 12 seconds. Independent image decoding checks green, blue and green markers. Checks also cover engine identity, approximate timestamps within 250 ms, no primary seeks/errors, primary playback pace above 0.8, cache hits, cancellation, and no leftover iframe owners. Iframe accounting is not a browser/GPU memory-leak proof.

## Stress limits and preserved failures

The 48-case run passed all four 1080p paths and all four throttled-network paths. Throttling adds 100 ms per response and delivers 64 KiB every 32 ms, approximately 2 MiB/s per response; it does not impose a shared-link bandwidth ceiling. The 1080p and 4K H.264 sources use eight-second GOPs at 24 fps.

The approximately 54 Mb/s 4K Native-remux fixture is not qualified. Both playing and paused preview cases failed. A separate `preview:false` control also stalled near 1.94 seconds and advanced at only 0.2405 media seconds per wall second over its eight-second measurement. This demonstrates an independent primary playback limitation; it does not prove that every preview failure has the same cause. These failures were not converted into passes or removed from the receipts.

4K direct, Hybrid, and explicitly allowed Software generation passed in that run. Software generation could take approximately 1.5–4.5 seconds. Auto-policy guards verified large Software deferral, generation while paused, and cache access after playback resumes. Expired preview authorization did not call the primary refresh callback or seek/error the primary.

One earlier direct follow-up (`2026-10-08T04-50-38-379Z`) used `immutable:false`, unlike the original direct source. It is retained as exploratory evidence, not a matched baseline. The corrected follow-up omits that property.

## Measurements and boundaries

Representative remote pthread results from the 48-case run:

| Path | First preview, ms | Subsequent previews, ms |
| --- | ---: | ---: |
| Native direct | 15.9 | 8.8 / 4.1 |
| Native remux | 363.4 | 211.3 / 67.6 |
| Hybrid | 1671.5 | 216.3 / 225.6 |
| Software | 671.6 | 258.5 / 269.8 |
| Shaka authored | 25.4 | 36.7 / 25.6 |
| Shaka generated | 54.7 | 164.2 / 10.8 |

Cache hits took approximately 0.015–0.06 ms in those cases. These are individual functional-run measurements, not distributions or performance guarantees. Cold means a new preview decoder; OS, compilation and disk caches were not flushed. Fixture hashing occurs before server startup.

The initial collaborative browser was Chromium 152 in Electron 44. It became unavailable; both status/open reported no automation host, so final work used installed headless Chrome 154.0.8037.93 on macOS/Apple Silicon with 8 GiB RAM and eight logical CPUs. All runs were cross-origin isolated and served from loopback. Safari, Firefox, phones, real WANs, DRM/live generated previews, multiple video-track transitions and long-session memory behavior remain outside this qualification.

Times are wall-clock API latency. Component metrics separate initialization, seek/decode, conversion and cache where exposed. CDP TaskDuration/ScriptDuration in the stress run cover the entire case on the renderer main thread and exclude decoder workers/GPU. Traffic totals combine primary and preview requests. No isolated decoder CPU cost or preview-only bandwidth claim is made.

## Reproduction

Prepare fixtures as described in [README.md](README.md), compile into `build/preview-route-alignment/generated`, and record source identity. The collaborative browser can call `production.runMatrix`; the headless fallback runners are provided for environments where that browser is explicitly unavailable.

```sh
node node_modules/typescript/bin/tsc --outDir build/preview-route-alignment/generated
node experiments/preview-route-alignment/record-source.mjs
node experiments/preview-route-alignment/prepare-maintained.mjs
PREVIEW_REVIEW=1 node experiments/preview-route-alignment/run-geometry.mjs
node experiments/preview-route-alignment/verify.mjs results/preview-route-alignment/RUN_DIRECTORY 39
```

`run-headless.mjs` reproduces the larger stress matrix. Its failures should be investigated and explicitly named when verifying a run, not silently accepted. Verifier hashes are checked against the current served files; changing the compilation after a run naturally makes an old run fail that current-file identity check. The saved receipts and summaries retain the identities observed when the run was verified.
