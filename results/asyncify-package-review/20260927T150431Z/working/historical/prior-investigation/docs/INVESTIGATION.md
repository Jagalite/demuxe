# JSPI and Asyncify behind one Demuxe service contract

**Date:** September 27, 2026  
**Decision:** Proceed with a shared service/ownership layer and separate suspension implementations. The infrastructure abstraction is demonstrated; production media support is not.

## 1. What changed in this investigation

The reviewed package originally hard-coded native JSPI construction both in its cooperative scheduler and in RangeSource. That latter dependency was unnecessary for the standalone FFmpeg owner: constructing the shared source adapter could fail before any FFmpeg work on a browser lacking JSPI.

This experiment separates continuation mechanics from ownership policy. It supplies a native JSPI driver and an actual Binaryen Asyncify unwind/rewind driver. The same mpv dispatch/thread-pool code and the same C source-bridge tests now run through either driver. Asyncify tests explicitly remove WebAssembly.Suspending and WebAssembly.promising from the Worker before initialization.

The result is more than an API sketch. However, it is less than an Emscripten or media integration: Clang and Binaryen produce freestanding test modules, and the Asyncify driver controls those modules directly. No complete libmpv initialization, subtitle pixels, FFmpeg codecs, or AudioWorklet output occurs in these runs.

## 2. Execution results

| Test scope | JSPI | Asyncify |
|---|---:|---:|
| Real pinned mpv dispatch/thread-pool + cooperative primitives | 15 passed | 15 passed |
| C custom-stream adapter with test-only mpv registration | 30 passed | 30 passed |
| Required negative controls, rejected for the intended reason | 2 rejected | 2 rejected |

All 90 positive cases reported crossOriginIsolated=false, no exposed SharedArrayBuffer, and a private ArrayBuffer heap. Browser: Chromium 144.0.7559.96. Pages/Workers used about:blank/Blob URLs: this is not an HTTP/CORS deployment test and not a Safari/Firefox qualification.

The unit suite covers condition synchronization, timed waits, once initialization that yields, 400 create/join cycles with nested C-stack checks, actual mpv synchronous dispatch and exclusive core locking, pool jobs, detach/retirement, and repeated lifecycle. The bridge suite covers byte identity, short reads, large safe offsets, cancellation, stale source completion, source generations, invalid reader results, memory growth, and cleanup.

Eight separate JavaScript host tests passed while accessing either JSPI property would throw. Those tests check the standalone FFmpeg ownership/read contract with a ccall test double; they run no FFmpeg library. Twelve build-profile/source guards also passed.

The first shared refactor introduced an ordering defect: JSPI requested another scheduler turn before a source waiter's cancellation hooks were installed. One pre-reader-cancellation test caught it. The scheduler now arms the waiter before requesting work; the final rerun passed every expected outcome. Earlier failure evidence is preserved.

## 3. The abstraction boundary

Use one application-facing service contract with asynchronous operations, cancellation, source replacement, and destruction. The caller should not handle native JSPI objects or Asyncify state.

Two layers must remain distinct:

**Ownership policy:** which instance/task may access Wasm; when to commit source bytes; how to bound queues; how cancellation invalidates work; when destruction has genuinely finished.

**Continuation mechanism:** how a C/Wasm call pauses and resumes. This layer necessarily differs between native JSPI and Asyncify instrumentation.

Do not change a live instance's suspension mode. Select a qualified artifact at startup. Cache/evidence keys must include the component, runtime kind and build identity. A manifest saying that one variant passed must not admit the other variant.

## 4. Standalone FFmpeg can have a small shared implementation

The prepared source replacement already uses EM_ASYNC_JS for source_read and calls Module.nonIsolatedRead. The public host wrapper calls Module.ccall with async:true under one SingleOwner. The pinned Emscripten header and implementation support that shared source pattern [R1, R2].

This experiment removes the needless JSPI construction from RangeSource and prepares separate final-link profiles:

- JSPI: explicit JSPI-enabled exports.
- Asyncify: compiled instrumentation and an explicit saved-stack budget; indirect-call handling remains enabled.

The media algorithms remain shared. The resulting Wasm/glue files remain distinct. The emitted files can be loaded lazily so a client does not download every variant. Common non-threaded libraries may be reusable between final-link profiles if the exact compile inputs match; that is not permission to reuse the existing pthread libraries.

The original FFmpeg probe/remux/adaptation code is not rebuilt here. Actual output equivalence and performance still need local qualification. Do not mistake the eight no-JSPI host checks for real Asyncify FFmpeg success.

## 5. mpv needs a continuation driver, not merely a different compiler flag

Emscripten's ordinary Asyncify async-call handling warns against starting another async operation while the first is active [R3]. That default cannot simply stand in for several suspended mpv logical tasks. Emscripten also provides an explicit fiber mechanism with independent C and saved-Wasm stacks [R4]; its pinned source shows separate context-switch behavior [R2].

Our prototype uses a small direct Binaryen driver instead of adopting a general pthread emulator. Each logical task has its own saved continuation region in addition to its existing C data stack. The scheduler retains the same queues, logical IDs, wait semantics, and cancellation ownership.

Important details in the implementation:

1. A zero returned while unwinding is not a completed C result. Only the normal-state final return resolves the task.
2. Rewind must resume the recorded import without executing its I/O-start side effects again.
3. The old task retains physical execution ownership until unwind has returned to JavaScript. Restoring another task's C stack early is not a safe abstraction.
4. Source data is committed only when the correct logical owner resumes, after the existing cancellation/generation checks.
5. Completed tasks can release their stack slots; abandoned continuations cannot be reused. Fatal failure requires discarding the instance/Worker.

The implementation demonstrates these mechanics against real transformed code. It does not qualify arbitrary TLS, C++ exception handling, all mpv callbacks, or every dependency.

## 6. Emscripten integration remains a real gate

Do not wire this raw Asyncify driver into the earlier Emscripten loader by only changing backend:'jspi' to backend:'asyncify'. That loader still has native JSPI checks and assumptions. Ordinary Emscripten Asyncify callbacks maintain their own runtime state; a multicontext mpv port must have a single explicit owner of continuation state.

There are two defensible integration experiments: connect the shared policy to Emscripten's fiber API, or integrate the raw driver with a tightly audited Emscripten build whose yielding imports all go through that driver. The current tests do not decide that integration question.

Serialized standalone FFmpeg is different: it can use normal Emscripten async ccall handling because it deliberately permits only one in-flight operation. It does not need the mpv driver or a fiber scheduler.

## 7. Performance and compatibility constraints

Asyncify instruments reachable code and stores suspended locals in linear memory; it does not add preemptive execution or reduce the cost of decoding/rendering [R5, R6]. No Demuxe CPU overhead percentage is justified by this experiment. The test runtimes include deliberate waits and are not performance benchmarks.

AVIO and mpv callbacks use indirect calls. Keep those paths covered when transforming the module. Do not enable ASYNCIFY_IGNORE_INDIRECT or maintain an aggressive remove list merely to improve a benchmark before correctness is established. The prepared FFmpeg profile explicitly retains indirect handling.

The test build reserves 64 KiB of saved-continuation space per logical task, separately from C stacks. The observed small-test high-water values are diagnostic only, not production stack-sizing evidence. Full media, exception paths, fonts, malformed input and deep demuxing need their own budgets and stress tests.

A fallback using ordinary Wasm broadens compatibility but is not an "all browsers" guarantee: the complete build still has its own SIMD, BigInt, memory, Worker, asset and browser-policy requirements. Test the actual selected artifact in its intended Worker.

## 8. Proposed routing and next decisive work

For advanced services, retain qualified pthread variants on isolated deployments. On a non-isolated deployment, prefer a qualified JSPI variant after capability checking; otherwise select a separately qualified Asyncify variant. If neither variant is qualified for the requested component/source, retain eligible browser-native alternatives or report that the component is unsupported.

This is not automatic crash recovery. Source permission, identity, asset and cancellation errors remain errors. Do not retry them as "JSPI unavailable" and do not transfer a suspended heap between runtimes.

The next work should be real service builds, not another broad set of tiny scheduler tests:

**FFmpeg:** build both variants from the current pin; compare actual metadata, remuxed timing/payload, selected-audio output, delayed range reads, source replacement and cancellation.

**mpv subtitles:** integrate one explicit continuation owner with Emscripten; run actual create/load/select/render/seek/replace/close against the same fixtures under both modes and the existing pthread reference.

**mpv audio:** qualify independently after implementing non-shared PCM and actual-consumption feedback. Successful suspension does not establish audio clock correctness.

## References

[R1] Emscripten 4.0.14, system/include/emscripten/em_js.h: https://github.com/emscripten-core/emscripten/blob/4.0.14/system/include/emscripten/em_js.h

[R2] Emscripten 4.0.14, src/lib/libasync.js, native JSPI and Fibers implementations: https://github.com/emscripten-core/emscripten/blob/4.0.14/src/lib/libasync.js

[R3] Emscripten asynchronous code and reentrancy documentation: https://emscripten.org/docs/porting/asyncify.html

[R4] Emscripten fiber.h API: https://emscripten.org/docs/api_reference/fiber.h.html

[R5] Emscripten compiler settings, Asyncify stack/import/indirect-call settings: https://emscripten.org/docs/tools_reference/settings_reference.html

[R6] Binaryen Asyncify implementation: https://github.com/WebAssembly/binaryen/blob/main/src/passes/Asyncify.cpp

The current documentation can describe a newer SDK than Demuxe's pin. The pinned implementation was checked for the specific common EM_ASYNC_JS and continuation claims; the full build remains unexecuted.
