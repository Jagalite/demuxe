# Source change map — JSPI / Asyncify abstraction

Compared with the supplied `demuxe-non-isolated-reviewed.zip`. No live Demuxe repository files changed.

| Package file | Change | Qualification |
|---|---|---|
| `runtime/continuations.mjs` | New JSPI and raw Binaryen Asyncify drivers; owns backend-specific import wrapping, start/park/resume, and final-return detection. | Both drivers exercised against real Wasm. NOT Emscripten glue. |
| `runtime/asyncify-stacks.c` | New bounded, separately guarded saved-continuation storage for 24 logical contexts. | Actual transformed Wasm; 64 KiB per context is a PoC budget. |
| `runtime/scheduler.mjs` | Delegate continuation mechanics; retain ready/wait queues and ownership. Defer host-stack restoration until Asyncify unwind finishes. Schedule only after cancellation hooks are armed. | 15 real mpv unit cases and 30 C bridge cases per backend. |
| `runtime/threads-coop.c`, `runtime/threads-coop.h` | Only terminology in comments generalized; algorithms unchanged. | Existing primitives executed by both drivers. |
| `stage2/runtime/range-source.mjs` | Wrap raw imports through `scheduler.wrapImport`; return ordinary read function for SingleOwner. Removes the hidden eager JSPI API dependency. | Both Wasm backends and 8 no-JSPI host tests. |
| `ffmpeg/runtime/single-owner.mjs` | Unchanged. | Existing semantics retained; host tests rerun without JSPI. |
| `ffmpeg/runtime/ffmpeg-bridge.mjs` | Runtime logic unchanged; documentation recognizes both Emscripten build modes. | Host tests only; real FFmpeg remains unqualified. |
| `ffmpeg/scripts/suspension_profile.py` | New final-link profile helper. | 12 host profile/contract guards. |
| `ffmpeg/scripts/prepare-ffmpeg.py` | Record `--suspension`; copy helper into new disposable build output. Shared C read-import patch unchanged. | Syntax/host preparation review, not actual library build. |
| `ffmpeg/scripts/build-ffmpeg.py` | Select final-link JSPI or Asyncify flags and record runtime identity. | Syntax/host profile tests; no full FFmpeg compilation. |
| `build-unit.sh`, `stage2/scripts/build-bridge.sh` | Link saved-stack ABI for experimental transformed builds. | Executed. |
| `scripts/build-dual.py`, `scripts/run-dual.py` | Build and test both modes with the same cases, actual Binaryen transform, JSPI masking, strict negative-control reasons, and non-isolation assertions. | Executed; results/dual-final.json. |
| `tests/browser-worker.js`, `stage2/tests/range-worker.js` | Select backend; route the test read import through the abstraction. | Executed. |
| `run-units.py`, `stage2/scripts/run-bridge.py` | Thin launchers for shared dual runner; retain suite names. | Names used by executed dual runner. |
| `ffmpeg/tests/no-jspi-host.mjs` | New explicit host-only regression for hidden JSPI coupling and lifecycle/source safety. | 8/8. |

## Actual upstream code preserved

`upstream/misc/dispatch.c` and `upstream/misc/thread_pool.c` are unchanged copies of the pinned mpv files. Blob identities are recorded in SUMMARY.json. No new patch to `player/client.c`, `player/loadfile.c`, subtitle decoders, or audio output has been made here.

## Work still required in the prior full-service package

**`stage2/runtime/emscripten-loader.mjs`:** the previous loader is JSPI-specific. Add an explicit runtime-kind/ABI contract and a raw Asyncify or Emscripten-fiber integration. Do not just pass `backend:'asyncify'` into the scheduler while leaving other Emscripten suspension callbacks under unrelated ownership. Both paths need constructor, errno/TLS, stack metadata, exception and lifetime tests. This file is intentionally not distributed as a pretend dual-ready loader in this standalone experiment.

**`stage2/scripts/build-full.py` and `prepare-source.py`:** add a distinct Asyncify target, integrate continuation-stack exports, audit every suspending import including indirect paths, and retain non-pthread dependency rebuilding. Existing JSPI qualification does not transfer automatically.

**Demuxe `native/remux/remux.c`:** the already-prepared `EM_ASYNC_JS` source-read replacement can be shared; no second media implementation is proposed. `native/adaptation/flac.h` remains unchanged. Original threaded libraries cannot be reused merely by switching final-link flags.

**Demuxe `web/native-remux-worker.js`, `web/mpv-subtitle-worker.js`, `src/internal/native-mpv-subtitles.ts`:** consume the service interface rather than JSPI APIs; await calls, preserve generation guards, and bound/coalesce pending work. No automatic integration is supplied here.

**Demuxe `src/internal/playback-plans.ts`, `engine-preparation.ts`, `runtime-capability.ts`:** qualify/cache by service + runtime + build identity. Preserve terminal source/security/asset errors. Maintain the isolated pthread route; permit an independently qualified Asyncify variant when JSPI is absent. Do not retry arbitrary runtime traps with another backend or switch a live suspended instance.

**Audio:** `native/ao_browser.c`, `native/audio_bridge.h`, the selective worker/worklet transport and consumption-clock integration remain separate, unimplemented work. A shared continuation backend does not deliver non-shared PCM or fix audio timing.
