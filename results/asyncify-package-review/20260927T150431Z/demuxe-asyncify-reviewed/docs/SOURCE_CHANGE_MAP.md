# Asyncify review — source change map

Baseline: `Demuxe_JSPI_Asyncify_Investigation.zip`. No live production repository changed.

| Package source | Status | Change |
|---|---|---|
| `runtime/scheduler.mjs` | Fixed/tested | Whole C-stack layout and host-SP checks; immutable bounds; terminal attachment failure; admitted root exports. |
| `runtime/continuations.mjs` | Fixed/tested | Cross-check saved regions against C stacks and host-SP; retain validated saved-state regions. Raw driver only. |
| `runtime/asyncify-stacks.c; runtime/threads-coop.c` | Fixed/tested | Compile-time capacity/alignment assertions; no mpv algorithm rewrite. |
| `ffmpeg/runtime/ffmpeg-bridge.mjs; ffmpeg/runtime/single-owner.mjs` | Fixed; host doubles | Poison unexpected ccall failures; preserve actual fatal reason; prevent duplicate ownership; retain old source on invalid replacement. |
| `ffmpeg/scripts/suspension_profile.py` | Fixed; host-tested | Exact export allowlist; no wildcard/duplicate names. |
| `ffmpeg/scripts/prepare-ffmpeg.py; ffmpeg/scripts/build-ffmpeg.py` | Prepared; NOT full-compiled | Profile validation, copied binary auditor, configurable saved-stack budget; libraries still unbuilt. |
| `scripts/audit-wasm.mjs` | New/tested | Private defined-memory/ABI audit; reject shared/memory64 and wrong raw continuation artifacts. |
| `scripts/result_contract.py; scripts/run-dual.py` | Fixed/tested | Strict identity, both absent JSPI APIs, actual continuation kind, cleanup, C cookie and negative-reason checks. |
| `tests/browser-worker.js; stage2/tests/range-worker.js` | Fixed/tested | Report failure-environment evidence; commit unit-test bytes on owner resume; record live C cookies. |
| `build-unit.sh; stage2/scripts/build-bridge.sh; scripts/build-dual.py` | Fixed/rebuilt | Normalize build paths; build/audit all nine fixtures; record source/binary correspondence. |
| `review/build-probes.py; review/tests/continuation-probe.c; review/tests/continuation-worker.js; review/run-continuations.py` | New/executed | Actual continuation oracles, undersized stack variant and omitted-import negative build. |
| `review/tests/host-guards.mjs; review/test-result-contract.py; review/tests/audit-guards.mjs; scripts/test-profiles.py` | New/extended; executed | ABI, poison, ownership, source replacement, success-report and profile guards. |
| `upstream/misc/dispatch.c; upstream/misc/thread_pool.c` | Unchanged | Pinned Git blob identities reverified; genuine algorithms still use freestanding test support. |
| `stage2/runtime/range-source.mjs; stage2/native/stream-coop.c` | Unchanged in this review | Shared data-delivery/cancellation implementation rerun under both backends; not full mpv registration/demux. |
| `verify.py` | Updated; package-tested | Complete case/binary/source correspondence, count/identity and deliberate tamper checks. |

## Actual Demuxe/upstream integration targets — still pending
| Source | Needed local change | Current status |
|---|---|---|
| Upstream `osdep/threads.h`, new `osdep/threads-coop.*`, `meson.build` | Opt-in backend with fresh non-pthread dependencies. | Prior full-service preparation; NOT complete-library-tested here. |
| Upstream `player/client.c`, `player/loadfile.c` | Initially retain existing logical core/opener/load tasks; evaluate actual lifecycle before editing. | Not executed as part of libmpv. |
| `native/subtitles/service.c` | Restricted service options, owned timing notifications and lifecycle. | Full-service patch/build/real pixels still pending. |
| `native/subtitles/bitmap.c` | Keep original rendering/parity target. | No substitute renderer used as proof. |
| `native/stream_bridge.c` / experimental alternative | Bind synchronous callbacks to owned async reads, including admitted nested operations when qualified. | Candidate finite-file bridge tested with registration shim only. |
| `native/remux/remux.c` | Shared `EM_ASYNC_JS` source-read replacement from prepared FFmpeg patcher. | NOT compiled with actual FFmpeg in this review. |
| `native/adaptation/flac.h` | Preserve selected-audio algorithms and thread_count=1. | No changes proposed here; actual output qualification pending. |
| `scripts/build-remux.sh`, `scripts/build-audio-adaptation.py` | Separate JSPI/Asyncify artifact profiles with validated metadata. | Production scripts unchanged; independent candidate builder provided. |
| `web/native-remux-worker.js`, source/host workers | Await operations, preserve source errors/backpressure; dispose a poisoned module instead of retrying it. | Not integrated. |
| `web/mpv-subtitle-worker.js`, `src/internal/native-mpv-subtitles.ts` | Runtime-neutral service interface, bounded/coalesced updates, generation-safe teardown. | Not integrated. |
| Full-service Emscripten loader | Implement one continuation owner; do not mix raw driver with default Asyncify/Fibers state. | Major unqualified integration gate; not supplied as a working loader. |
| `src/internal/playback-plans.ts`, `engine-preparation.ts`, `runtime-capability.ts` | Separate qualification/cache identity for component + runtime + build. Preserve terminal errors. | Unchanged. |
| `native/ao_browser.c`, `native/audio_bridge.h`, selective worklet/worker and audio host | Non-shared PCM transport, consumed-sample timeline and independent audio qualification. | Unimplemented in this package. |

## Applying the delta
Prefer the complete ZIP. `patches/from-investigation.patch` targets the **previous research package's root**, not the Demuxe checkout. It contains only source-file additions/modifications. Applying it does not update historical evidence or turn the full-service loader into a dual-runtime implementation.

Never overwrite current served Wasm assets or remove isolation guards globally from this package. Neither JSPI nor Asyncify media eligibility is established by these unit runs.
