# Thumbnail routing and Safari mitigation review — 2026-10-08

The review found test-harness defects and no additional demonstrated defect in the thumbnail routing or duration workaround. The fixed 8 MiB preview budget remains a limitation for large, long-GOP Remux sources; this review does not implement dynamic capacity.

## Fixes from this review

- Updated the copy-back worker VM tests to load the real shared WebCodecs wrapper. The old harness rejected the new module import before executing any worker checks.
- Added an end-to-end mailbox regression: old Safari receives a chunk without native duration, while the copy-back output retains the correct duration and closes the frame once.
- Registered the Safari duration and copy-back worker suites in the normal API unit gate.
- Completed the seek-fallback fixture's backend interface and asserted that the intended seek failure is reached. Concurrent transport work changed paused-seek behavior while this review ran; no competing transport changes were reverted.
- Added Chromium to the cross-browser runner, corrected the verifier's browser scope wording, and added optional frozen generated/runtime/experiment roots to the server.
- A WebKit case exposed a missing trusted Play gesture in the production experiment. The correction uses the existing gesture helper for primary Play; thumbnail requests receive no gesture.

## Unit and build evidence

- **344/344 focused tests passed**, covering the registered preview group, route isolation, shared decoder ownership, duration mitigation, copy-back and retained adapters, Remux scheduling/buffering, Shaka, and read deadlines. Log: `build/review-focused-final.log`.
- TypeScript compilation and consumer type checks passed. Public API inventory, SSR imports, and behavior-map contracts passed.
- **Full repository API unit gate passed: 3,546/3,546 tests**, plus its consumer type checks. Receipt: `results/api-stability/gate-unit-all-node-1791474970429/result.json`; log: `build/review-final-gate.log`. This final run occurred after the concurrent build/stamping processes finished.
- Earlier broad attempts encountered transient imports during generated-file rewrites, a test added after an isolated build, and a worker-suite timeout. The affected suites also passed their focused rerun (54/54). Those unsuccessful attempts are retained; they are superseded by the successful final gate, not reclassified as passes.
- Browser evidence below uses an isolated TypeScript compilation and, in the final modern-browser runs, 46 frozen runtime modules. This is working-source qualification, not a release archive or modular-provider deployment qualification.

## Browser evidence

The first complete frozen matrices retain their original failures:

| Browser | Thumbnail/policy matrix | Lifecycle | Maintained assertions | Follow-up |
| --- | --- | --- | --- | --- |
| Firefox 157 | 38/39; one 15-second anamorphic Hybrid/JSPI preview deadline | 11/11 | 2/2 | That case passed 3 serial and 3 concurrent repeats |
| WebKit 27.2 | 37/39; the same deadline plus one primary autoplay denial | 11/11 | 2/2 | Play-gesture fix passed 5 repeats; JSPI case passed 3 serial and 3 concurrent repeats |

The matrices cover all five engines, pthread/JSPI/Asyncify where applicable, local/remote sources, authentication, CORS, anamorphic geometry, cache reuse, cancellation, and teardown. Saved PNG colors/dimensions, timestamps, primary playback pace/isolation, and served hashes were independently checked. Known failed cases remain failed in the matrix summaries.

- Frozen matrix receipts: Firefox `2026-10-08T15-39-05-906Z`; WebKit `2026-10-08T15-39-05-913Z`.
- Trusted-click correction: WebKit `2026-10-08T15-46-36-027Z`, 5/5 passed and independently verified.
- Serial JSPI repeats and maintained assertions: Firefox `2026-10-08T15-54-46-322Z`; WebKit `2026-10-08T15-57-12-063Z`. Three repeats and both maintained assertions passed per browser. The frozen build initially omitted the generated maintained-test adapter; `prepare-maintained.mjs` now honors `PREVIEW_GENERATED_ROOT`, and those assertions were rerun after preparing it.
- Concurrent diagnostic repeats: Firefox `2026-10-08T15-59-09-909Z`; WebKit `2026-10-08T15-59-09-903Z`. All six passed. Serial cold thumbnails were 1.20–1.23 seconds in Firefox and 0.70–0.73 seconds in WebKit; first concurrent requests took 6.77 and 6.27 seconds. Session traces separate child opening from frame generation. This supports contention as a contributor but does not prove the exact cause of the earlier 15-second deadlines. No timeout was increased and no production retry was added to conceal them.

Additional verified evidence:

- Chromium 145: **10/10** local/remote Direct, Remux, Hybrid, Software, and Shaka authored/generated cases; independent PNG, timing, and served-hash checks passed. Receipt: `2026-10-08T15-39-54-365Z`.
- WebKit 26: **8/8** Hybrid local/remote pthread and Asyncify cases, twice each; independent verification passed. Receipt: `2026-10-08T15-33-20-415Z`.
- WebKit 26 duration probe: **8,000/8,000 frames**, zero duration fields submitted to the native decoder, correct restoration for all 4,000 duration-bearing frames, and no retained metadata after flush. Receipt: `2026-10-08T15-30-39-694Z/mitigation-verified.json`.
- WebKit 27.2 budget diagnosis: the paused 8 MiB preview failed with the explicit coded-data-budget cause in **948.56 ms**, without the outer 15-second timeout. The primary used an experimental 64 MiB budget solely to keep it progressing during this diagnosis. This is an expected thumbnail failure, not successful 4K preview qualification. Receipt: `2026-10-08T15-35-02-123Z/diagnosis-verified.json`.

The earlier Firefox/WebKit runs (`15-21-53-700Z` and `15-25-19-162Z`) completed their functional matrices, but `web/range-reader.js` changed during them. They are preserved as diagnostic runs and are not single-build qualification. The first Chromium run (`15-30-09-341Z`) also predates that runtime edit. The final runs use frozen runtime files instead.

## Reproduction and limits

The experiment server accepts `PREVIEW_GENERATED_ROOT`, `PREVIEW_RUNTIME_SNAPSHOT`, `PREVIEW_EXPERIMENT_ROOT`, and `PREVIEW_SOURCE_IDENTITY`. These paths must remain within the workspace. Frozen runtime roots contain the requested JavaScript/JSON files under `web/`; missing snapshot modules fail rather than silently loading changing working files. Large runtime binaries and media fixtures retain their existing served-byte hashes.

The final review used `build/review-unit-generated`, `build/review-runtime`, and `build/review-source-identity.json`. The broad unit loader in `build/review-register-loader.mjs` redirected generated module contents while preserving their original import URLs. Tests and source files outside those snapshots could still change concurrently. Source hashes were sampled after compilation and are observational; served generated/runtime hashes identify the actual tested bytes. The final regular unit gate used the current generated tree after the concurrent writers stopped. The pre-gesture experiment source is preserved in `build/review-experiment-original/production.js`; original matrix hash checks were completed before updating that harness file.

Installed Safari, physical iOS devices, long-duration memory/CPU behavior, DRM/live previews, all codecs, and arbitrary high-bitrate media remain outside this qualification. Playwright WebKit is not installed Safari. The upstream WebKit fix remains the definitive resolution of the native duration-map race; passing finite stress tests cannot prove that an intermittent browser crash is impossible.
