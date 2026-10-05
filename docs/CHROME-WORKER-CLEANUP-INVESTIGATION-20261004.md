# Chrome worker cleanup reproduction, 2026-10-04

> Historical investigation: observations and runtime identities refer to the recorded runs, not the current checkout. Diagnostic harnesses are optional and were not rerun for this archival commit. Some raw captures and external fixtures remain local; only selected supporting evidence is versioned.

The original cleanup failure has not been reproduced in the completed checks below. It remains unresolved; no runtime fix or release qualification is claimed.

## Original incident and artifact

The frozen release-06 bundled consumer at `/deep/runtime-v2/` reported one `software-full-engine-worker.js` worker after public destruction and the existing two-second observation window. Chrome was **154.0.8037.93**, Playwright **1.58.2**. The receipt recorded no page error, but did not capture worker identity, termination calls, a live execution probe, or a separate browser target inventory. It therefore establishes a failed cleanup assertion, without distinguishing an executable survivor from a debugger bookkeeping problem.

- Archive: `/Volumes/seed2/Projects/demuxe-functional-final-native-b26826a4-20261002/build/release-06/demuxe-0.3.0-beta.4.tgz`
- SHA-256: `2fb0f6350e17dce274bc05d8d7a8e1a3dbd36b424b9655659cb90623d09759ac`
- Original receipt: `/Volumes/seed2/Projects/demuxe-functional-final-native-b26826a4-20261002/results/public-api-consumer/chrome-2026-10-04T01-45-57.536Z/result.json`
- Local evidence copy: [original-failure.json](../results/chrome-worker-cleanup-20261004/original-failure.json).

The installed package and copied runtime used for the new stress test were checked against the archive: **1,079 file comparisons, zero mismatches**. [Installed provenance](../results/chrome-worker-cleanup-20261004/installed-provenance.json).

The current checkout's `src/internal/wasm-player.ts`, `src/internal/runtime-worker.ts`, `src/internal/machine/wasm-lifecycle.ts`, and `web/software-full-engine-worker.js` match the previously recorded frozen source hashes. This reproduction is not relying on a newer cleanup implementation in those files. [Source equivalence](../results/chrome-worker-cleanup-20261004/source-equivalence.json).

## Completed reproduction

1. **Original bundled consumer case:** passed in a fresh isolated Chrome 154 process, using the original archive and the existing diagnostic runner. No retry. [Receipt](../results/chrome-worker-cleanup-20261004/original-case-rerun.json).
2. **200 consecutive cycles in one page:** passed in Chrome 154. Each cycle constructs a Player, executes its scenario, destroys it, and repeats destruction to check idempotence. Native, Hybrid, and Software each exercise playback/pause/seek, destruction during opening, destruction during seeking, source replacement during opening, and close/reopen. Opening interruption delays rotate through 0, 5, 20, and 80 ms. Some early interruptions happen before worker acquisition; the receipt records worker creation per cycle.

The 200-cycle run observed **1,925 worker creations and 1,925 close events**. Every cycle passed the unchanged two-second zero-worker condition and a separate `Target.getTargets` check. Page-side instrumentation also recorded zero unreleased root workers, open tracked AudioContexts, tracked blob URLs, iframes, and player host children after every destruction. There were no page errors. The largest sampled public destruction duration was approximately 82 ms; the largest additional worker-inventory wait was 22 ms. These are diagnostic timings, not a performance benchmark.

[Full Chrome report](../results/chrome-worker-cleanup-20261004/chrome-result.json) · [raw protocol events](../results/chrome-worker-cleanup-20261004/chrome-protocol.json).

3. **Original overlapping-player scenario, interrupted:** 43 consecutive cycles completed in one page before a session interruption stopped the browser. Each cycle switched the bundled UI through Native, Hybrid, and Software; played and sought each; opened a separate forced-remux player; and destroyed both together. All 43 receipts have zero workers after the original two-second gate and zero Chrome worker targets. All **423 observed root workers** have recorded successful termination calls. The planned 60-cycle run did not finish and has no final campaign result; it must not be reported as a passing 60-cycle campaign. [Per-cycle summary](../results/chrome-worker-cleanup-20261004/overlap-result.json) · [last complete cycle with cumulative root events](../results/chrome-worker-cleanup-20261004/overlap-last-cycle.json).
4. **Observer negative control:** an intentionally live root worker and its nested child remained visible in both inventories after two seconds, and both answered execution probes. Terminating their parent then drained both inventories to zero. This verifies that the supplementary target check actually sees live dedicated descendants. [Control receipt](../results/chrome-worker-cleanup-20261004/observation-control.json).

## Teardown inspection

`WasmPlayer.destroy()` installs its retirement promise first, retires requests and waiters, disconnects audio work, sends the worker's destroy command, and awaits its acknowledgement under a ten-second deadline. Its `finally` block calls `worker.terminate()`, removes the owning iframe, and closes the AudioContext. Repeated destruction joins the same promise.

The Software worker closes I/O, destroys native playback/presentation state, waits up to two seconds for native threads to return, terminates the pthread pool and decoder worker, then acknowledges destruction and closes itself. The owning iframe provides an additional worker-tree lifetime boundary.

No missing release was established in these inspected paths. The new browser observations confirm that their worker trees exited in the tested runs. A previous conditional Playwright protocol-disposal experiment demonstrated how a nested detach notification could be lost; it did not establish that this occurred in the original incident, which listed the Software root worker. That hypothesis remains unproven.

## Reproduction files and limits

Diagnostic scripts and raw receipts are under `build/worker-cleanup-spa-20261004/`. They reuse the preserved installed release-06 consumer; they are local diagnostic tools rather than portable CI fixtures. `server.mjs` serves that consumer on port 4187, `probe.js` defines the lifecycle scenarios, and `chrome-stress.mjs` launches isolated Chrome and enforces browser worker checks. The shared T3 preview is Electron/Chromium 152; it was used to expose the diagnostic page, not counted as Chrome 154 qualification.

No production source or generated runtime file was changed. Page-side call-through instrumentation and debugger observation can affect scheduling. This is finite synthetic-fixture coverage, not a long-session memory test, general resource-leak proof, or exact release qualification. Heap samples are retained but exclude worker Wasm memory and are not used to claim memory stability. The original failed receipt remains failed.

The first extension of the original consumer scenario contained an out-of-scope `cdp` variable in the diagnostic harness. Its [failed receipt](../results/chrome-worker-cleanup-20261004/harness-scoping-failure.json) is preserved; correcting that harness error does not count as a Demuxe fix.
