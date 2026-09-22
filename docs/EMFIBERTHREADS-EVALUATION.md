# emfiberthreads evaluation

> **Historical research — production approach dropped / intentionally removed.** The decision in [runtime requirements](NON-ISOLATED-REMUX.md) supersedes recommendations and next steps below. JSPI/Asyncify experiment harnesses and private runtime builds were removed; retained evidence describes prior execution only. No new experiments accompany this decision.


Evaluated against the local Demuxe checkout at `3bfeac8`, upstream emfiberthreads `0f026c5600b472448fadb3c646d3c8f1c2048a18`, cached mpv `a1e72a10ccbc1ee4e392e1f485e0258a7fef5f26`, and Emscripten 4.0.14. Source hashes and commands are in [build.json](../results/emfiberthreads-eval/build.json).

**Decision: do not integrate the unmodified library into production.** Cooperative pthread emulation remains a possible mpv port strategy, but this implementation needs scheduler corrections, a wider API, and browser bridge changes. It does not establish a clean dual JSPI/Asyncify mpv backend. Stop before a full dependency rebuild: the actual mpv wrapper already fails compilation and the prerequisite runtime semantics fail independently.

This evaluation adds experiment sources and evidence only. It does not alter production routing, served Wasm, mpv sources, or the upstream library. Existing unrelated staged and unstaged work was preserved. Normal Emscripten system-library cache generation occurred during linking.

## Executed evidence

The library built successfully with 2 MiB fiber stacks and 64 KiB Asyncify stacks, larger than upstream defaults. Both Asyncify and JSPI probes linked. mpv's actual `osdep/threads.h`, using its cached build configuration, failed compilation with nine errors: missing mutex types, mutex attributes, condition attributes/clock selection, and thread CPU-clock declaration. See [compiler output](../results/emfiberthreads-eval/mpv-wrapper.log). This is a wrapper compilation screen, not a full mpv build attempt.

Each browser case creates a fresh module in a dedicated worker on a local HTTP origin without isolation headers. Results assert no shared Wasm heap. Asyncify cases explicitly disable both JSPI APIs. JSPI uses Chrome's available APIs and `JSPI_EXPORTS=["probe"]`. Each case must report completion from C; a JavaScript export return is not the success oracle.

| Probe | Chrome 152 Asyncify | Firefox 146 Asyncify | Chrome 152 JSPI |
| --- | --- | --- | --- |
| Producer signals condition; consumer joins and verifies value | Pass | Pass | Fiber runtime error |
| Ten create/join cycles, verifying return values | Pass | Pass | Fiber runtime error |
| Once initializer yields; other caller must wait for completion | Fail: one premature caller | Fail: one premature caller | Fiber runtime error |
| First mutex lock followed by trylock must report busy | Fail: lock not held | Fail: lock not held | Same failure |
| Repeated timed wait, no signaler, until deadline | Wasm trap | Wasm trap | Fiber runtime error |

[Browser results with binary hashes](../results/emfiberthreads-eval/browser.json), [console output](../results/emfiberthreads-eval/browser.log), [probe source](../experiments/emfiberthreads-eval/probe.c), [browser harness](../experiments/emfiberthreads-eval/check.mjs).

The timed-wait probe uses a realtime deadline 50 ms ahead and allows up to 1,000 spurious returns before declaring bounded failure. A single spurious wake would be legal and is not classified as a defect. The final loop instead traps; Chrome identifies an out-of-bounds memory access and Firefox reports a Wasm error at the corresponding function. The exact corruption mechanism has not been isolated. No claim is made that mpv has already reproduced this crash.

## Causes and relevance

1. **Initialization and ownership.** Upstream `pthread_mutex_lock.c` stores `emfiberthreads_self` without first initializing the scheduler. On the first lock, that pointer is null. The probe reproduces successful trylock of an already-locked mutex. Initializing the scheduler before mpv startup may avoid this particular trigger, but ownership must be correct at the library boundary, including after its automatic scheduler cleanup.

2. **Once completion.** `pthread_once.c` sets its flag before calling the initializer and has no waiters/completion state. If the initializer yields, another fiber returns before it finishes. This is a concrete API defect under cooperative suspension, not evidence that a particular enabled mpv initializer currently yields. It becomes relevant when asynchronous I/O and dependencies are ported to fibers.

3. **Idle scheduling and timers.** Timed waits use JavaScript `setTimeout`, absolute realtime timestamps, and a callback into C. The runnable-list machinery needs a safe state when all fibers are waiting, an event-loop handoff, and safe timer cancellation. mpv uses timed waits for dispatch, thread-pool retirement, and audio output. The actual configuration enables monotonic condition clocks, which this interposition API does not support. Stubbing clock attributes as successful would silently use the wrong clock domain.

4. **JSPI is not interchangeable with Asyncify for these fibers.** With the export correctly marked promising, Chrome reaches `_emscripten_fiber_swap` and fails reading `Asyncify.State.Normal`. The toolchain's `src/lib/libasync.js` fiber implementation depends on Asyncify state and unwind/rewind operations. This is a runtime failure with Emscripten 4.0.14, not a universal statement about future toolchains or an independently designed JSPI scheduler. A preliminary unmarked-export attempt produced SuspendError; that configuration was corrected before the retained final run.

5. **mpv needs more than the implemented subset.** The wrapper needs mutex attributes and condition clocks; `misc/thread_pool.c` also detaches threads. Upstream has no detach API and ignores supplied mutex attributes. Debug/error-check semantics, recursive ownership where required, thread lifetime, and dependency ABI must be implemented or deliberately adapted. Existing pthread archives cannot simply be reused with differently sized fiber mutex/condition types.

6. **Demuxe's shared browser bridges remain separate work.** `native/stream_bridge.c` and `native/vd_browser.c` use Emscripten futex mailboxes; the library only interposes its pthread/semaphore API. It does not translate those mailboxes into messages or asynchronous reads. The Software worker's PCM transport, consumption acknowledgments, seek epochs, and PThread teardown also remain shared-memory-specific. Replacing these requires preserving mpv's clock ownership and cancellation behavior, not just substituting synchronization names.

## What this changes in the feasibility decision

There is demonstrated value: basic cooperative synchronization runs without JSPI or shared memory in both tested browsers. However, using this project as-is is rejected by the prerequisite tests. Adopting it would mean maintaining a compatibility-layer fork or writing a dedicated mpv cooperative thread backend.

A further bounded port should first implement and qualify scheduler initialization, once completion, timed wait/idle behavior, clock domains, and detach lifetime. Then compile mpv and all affected dependencies into an independent prefix. The next meaningful mpv milestone is create/initialize/command/terminate with null audio/video outputs, asynchronous source reads, and repeated cancellation. Only after that should real PCM output and Hybrid decoder transport be attempted.

For such a port, Asyncify is the demonstrated starting point. A JSPI remux engine can still coexist with an Asyncify cooperative mpv engine; suspension selection need not be universal across engines. A common JSPI/Asyncify cooperative mpv implementation remains unproven.

No media playback, audio clock accuracy, seek correctness, codec throughput, memory endurance, mobile behavior, or production regression qualification was performed here. The earlier remux tests do not cover these fiber requirements. The evaluation is complete at the dependency acceptance boundary; a repaired full mpv port is additional implementation work.

## Reproduction

From the repository root, clone [upstream](https://github.com/Yahweasel/emfiberthreads) into `build/emfiberthreads-eval/upstream` and check out the commit above. Run `python3 experiments/emfiberthreads-eval/build.py`, then, after it finishes, `node experiments/emfiberthreads-eval/check.mjs`. The build script records compiler failures rather than treating them as an unexpected process failure. The browser harness records expected semantic outcomes and observed failures in JSON; its exit status alone is not a passing qualification. Toolchain/cache paths are explicit in the build script and should be adjusted for another machine. Run outputs use fixed paths and will be replaced by a rerun; preserve them first when comparing changes.
