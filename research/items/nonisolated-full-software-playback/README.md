<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Full Software playback without cross-origin isolation

Assessment: 2026-09-29. **Pursue a bounded real-media prototype.** Source review and an actual renderer prerequisite passed; full private Software playback remains unimplemented and unqualified. This investigation authorizes no production admission change. There is no defensible calendar estimate yet.

## Finding

The existing cooperative mpv infrastructure substantially reduces the remaining port. The current RGB Software entry points can already link against the verified private mpv libraries and initialize, render an idle black RGB buffer, destroy, and recreate under both JSPI and Asyncify. A replacement mpv scheduler or a separate cross-worker video-frame protocol is not currently justified for the first RGB prototype.

The missing work is a video-enabled private codec build and a playback host that combines asynchronous mpv calls, rendering, source reads, and consumed-audio feedback. Public integration and media qualification follow that prototype. This is more specific, and potentially smaller, than the earlier conversational estimate of a general full-engine rewrite.

The canonical evidence is [renderer prerequisite run](evidence/20260929T175300Z-render-prerequisite-01/run.json), [browser results](evidence/20260929T175300Z-render-prerequisite-01/result.json), and [input/artifact manifest](evidence/20260929T175300Z-render-prerequisite-01/manifest.json).

## Scope and contract

- Hypothesis: extend the existing cooperative mpv runtime to play finite files with FFmpeg video decoding, RGB canvas presentation, and message-delivered stereo audio, while mpv retains A/V timing and subtitle ownership.
- First target: MPEG-2 video-only, then MPEG-2 + AC-3, followed by the six ordinary Software-dependent README fixtures (rows 33–37 and 41 at review time). Local files first; authorized finite HTTP range sources next.
- Baseline: the same fixtures through the existing isolated Software engine, with independent decoded-picture/audio references. A passing isolated route is not itself a pixel or audio fidelity oracle.
- Success: actual changing decoded pictures, expected audible/captured audio, bounded queues, synchronized time, correct paused/playing seeks and EOF, cancellation after a real pending read, and complete teardown on both private runtimes.
- Adverse controls: reject invalid dimensions/resources; disable JSPI APIs in the Asyncify worker; assert private Wasm memory and absent SharedArrayBuffer; prohibit native-video/WebCodecs substitution during Software qualification; exercise stale PCM epochs, failed source reads and cancellation.
- Stop/reassess: renderer/codec initialization failure, scheduler ownership violation, unbounded queues, unsafe suspension/reentry, or inability to maintain a declared playback workload without weakening fidelity. Record the first causal failure before altering scheduling.
- Authorized effort in this investigation: source audit plus one bounded renderer build/lifecycle probe and a written implementation assessment. Media implementation, codec rebuilds and performance campaigns remain future work.

## What was actually run

The [probe builder](tests/build-render-probe.py) verified the existing private audio dependency closure and its pinned SDK, then linked unmodified copies of `native/player.c` and `native/events.c` with the cooperative source bridge, continuation/context support and private libraries. Only the source bridge import names were adapted in copied inputs, as in the existing private service linker. No installed engine or dependency archive was replaced. The second binary was produced by the existing Binaryen Asyncify import profile.

| Check | JSPI | Asyncify |
| --- | --- | --- |
| Chrome 153.0.8010.53, headless localhost, no COOP/COEP | Passed | Passed |
| `crossOriginIsolated === false`; SharedArrayBuffer unavailable; private ArrayBuffer heap | Passed | Passed |
| JSPI APIs disabled | Not applicable | Both disabled |
| Three create → forced idle RGB render → report swap → destroy cycles | Passed | Passed |
| Invalid zero-width rendering rejected | Passed | Passed |
| Live/retained scheduler tasks and wait keys after each destroy | Zero | Zero |
| Reusable coroutine slots after each destroy | 24/24 | 24/24 |

Both modules used a 64 MiB heap in this probe. Asyncify observed 2,376 bytes maximum saved stack and 24 unwind/rewind pairs; these are observations for idle renderer lifecycle, not media capacity limits. The probe checked the 64×64 RGB buffer; it did not exercise a canvas, decode media, open an audio device, compare the isolated renderer, or measure CPU/cadence. No Software playback claim follows from this result.

Large build artifacts remain at `/Volumes/seed2/Projects/demuxe-nonisolated-full-playback-20260929/render-probe-01/`; their hashes and exact commands are retained with the run. Dependency and source hashes are recorded separately from current-working-tree source-review snapshots.

## Reuse and exact gaps

| Area | Existing reusable implementation | Remaining change |
| --- | --- | --- |
| mpv scheduling and suspension | [engine](../../../web/private-mpv/engine.js), [scheduler](../../../web/private-mpv/scheduler.js), [continuations](../../../web/private-mpv/continuations.js) | Reuse first. Actual decode workloads may expose fairness, stack or task-capacity issues that idle rendering cannot detect. These logical tasks are not parallel decoder threads. |
| Finite source reads | [private source loader](../../../web/private-mpv.js), [cooperative C stream](../../../experiments/jspi-asyncify/stage2/native/stream-coop.c), existing LocalFileReader/RangeReader | Wire the full engine to these readers. Preserve source identity, authorization refresh, read deadlines, cancellation and source replacement. The [finite-resource shim](../../../experiments/jspi-asyncify/mpv/native/finite-source.c) deliberately rejects nested resources. |
| Codec libraries | [private dependency builder](../../../experiments/jspi-asyncify/mpv/scripts/build-dependencies.py) and verified private mpv archive | Add a playback build profile. Current private audio FFmpeg enables subtitle decoders plus AAC/AC-3/PCM, with no video decoders. First add MPEG-2; then MPEG-4 Part 2, ProRes and the selected audio decoders/parsers required by the six fixtures. Do not widen the existing audio service's qualification. |
| RGB rendering | [native/player.c](../../../native/player.c), libmpv software renderer, [Software worker's RGB draw path](../../../web/software-full-engine-worker.js) | Retain rendering in the engine worker and transfer an OffscreenCanvas once. Copy private RGB bytes into ImageData before another render can replace them. Use the existing [RGB VO rotation correction](../../../scripts/compile-software-vo.py) when qualifying rotated media. Idle renderer is proven; decoded-frame rendering is not. |
| mpv invocation and worker loop | Existing Software event/command handling plus `host.call()` | Replace raw synchronous `_web_*`/`ccall` use with scheduler-owned asynchronous calls. Serialize host render/event/control operations, keep heap strings alive across suspension, refresh heap views after growth, and prevent overlapping timer pumps. Retain MPV command-reply and seek-generation semantics. |
| Audio | [browser AO](../../../native/ao_browser.c), [private audio worker](../../../web/private-mpv/audio-worker.js), [private worklet](../../../web/private-mpv/audio-worklet.js) | Reuse the epoch/reset acknowledgments, transferred PCM and real-consumption feedback in the same full mpv engine. First qualify stereo 48 kHz output. Compressed decoding, resampling and concurrent video load need new evidence. The existing media-element clock trimming in NativePrivateMpvAudio is not the clock owner for full mpv video. |
| Player construction and verification | [Backend contract](../../../src/internal/backend.ts), [WasmPlayer](../../../src/internal/wasm-player.ts), [UnifiedPlayer](../../../src/unified-player.ts) | Add an internal private Software backend/transport selected by runtime, preserving the public Software mode and current session owner. Implement the additional startup/output/seek verification hooks consumed by UnifiedPlayer; the Backend interface alone does not enumerate them all. WasmPlayer currently allocates shared audio memory and assumes pthread teardown. |
| Runtime admission and preparation | [runtime selector](../../../src/internal/remux-runtime.ts), [plan admission](../../../src/internal/playback-plans.ts), [preparation](../../../src/internal/engine-preparation.ts) | Introduce a build/profile-qualified private Software capability and select the corresponding assets/font/precompiled module. Update feature reporting, route rejection and preparation together. Merely deleting isolation checks would load an incompatible engine. Keep Hybrid excluded until separately implemented. |
| Asset integrity and release | [private loader](../../../web/private-mpv.js), [installer](../../../scripts/install-private-mpv.py), [asset collector](../../../scripts/private_remux_assets.py), [package assembly](../../../scripts/package-beta.py) | Add the distinct playback profile, ABI checks, verified two-runtime artifacts, provenance/source bindings and copy/package coverage. Existing private services are hardcoded to subtitle/audio profiles. Scope any promotion to matching exact-archive browser evidence. |

The full pthread Software builds additionally use dav1d/zimg, broader filters, YUV presentation and larger memory budgets. Copying the current restricted 128 MiB private service cap or enabling a few decoders does not establish parity with those builds. A broad playback build needs an explicit dependency inventory, single-thread-safe configurations, declared resolution/memory limits, and separate SIMD/color/filter checks.

## Recommended implementation sequence

### 0. Renderer prerequisite — completed here

Link the current RGB entry points to private mpv and run lifecycle checks on both runtimes. This removes an immediate link/init concern but does not establish actual video decoding.

### 1. One real video-only file — next implementation slice

Extend the private build/link tooling with a separately identified experimental playback profile containing MPEG-2 decoding and required parsing. Reuse the cooperative source reader and the existing RGB native entry points. Add a minimal private worker with one guarded asynchronous event/render pump and an OffscreenCanvas. Set explicit decoder-thread/resource policies for the private build rather than inheriting pthread assumptions.

Run the MPEG-2 video-only fixture under JSPI and forced Asyncify. Verify changing pictures against an independent decoded reference, source timestamps, pause, forward/backward seeks, EOF/replay and cleanup. Disable browser video decode APIs as a negative control. Keep production admission unchanged until this slice passes.

### 2. Add real audio and lifecycle correctness

Combine the existing private PCM transport with that same mpv instance; retain mpv ownership of audio/video scheduling and consumed-audio feedback. Use MPEG-2 + AC-3, then MP2/MP3/PCM fixtures. Verify captured audio, A/V offset, rate changes, AudioContext suspension, paused seeks, underruns, source replacement, cancellation during a pending read, EOF audio tail and repeated destruction. Do not insert a second independent playback clock.

This is the highest remaining integration uncertainty. A decode call runs synchronously until it yields or returns, so heavy video work can delay the worker's PCM/command processing. Measure maximum decode/pump gaps and queue behavior before deciding whether scheduler or transport changes are needed. The idle probe does not measure this risk.

### 3. Player integration and bounded format support

Implement the private backend's full control and output-verification contract, asset loading, preparation, feature availability and route admission as one coherent change. Preserve current plan ordering, native routes, permission/source failures and explicit mode pins. Add runtime-specific build/fixture evidence for the six ordinary rows and reference the existing restrictions on interlacing and output fidelity. Prove finite URL and local-file lifecycle behavior. No blanket private-runtime allowlist removal.

### 4. Qualification, packaging and expansion

After output correctness passes, measure sustained playback cadence, audio underruns, control/seek latency, memory and CPU on a declared desktop workload. Validate each actual backend/build in Chrome and Asyncify-capable Firefox; simulated absence of JSPI in Chrome is not Firefox qualification. Test missing/corrupt assets, packaging, exact-archive consumers and regression of existing pthread/Native paths. Keep Safari/mobile and broader device coverage explicit.

Widen codecs, formats, resolution and output profiles only with corresponding gates. The separate component-registry refactor is not a prerequisite for this work. No calendar duration is inferred from the number of files or the renderer probe.

## Separate follow-ups

- **Hybrid:** [native/vd_browser.c](../../../native/vd_browser.c) waits on a shared futex mailbox. Full private Hybrid requires an asynchronous request/result bridge, packet/configuration ownership, decoder flush/seek handling and retained-frame lifecycle validation. It is unnecessary for the first private Software fallback.
- **YUV and performance parity:** adapt the [YUV renderer](../../../native/yuv-backend.c) and its build helpers after RGB correctness. Its immediate same-worker draw callbacks look reusable, but were not exercised here. RGB admission must state its presenter limits and retain rotation/color correctness.
- **Dolby Vision rows 64–65 and 79–80:** recorded Auto runs reach Software and private remux fails. The initial failure is HEVC parameter-set construction, with additional recorded Hybrid seek/retained-frame issues. These are not proof that every Dolby Vision source fundamentally requires software video decoding. A Native/Hybrid repair is a separate possible route. Private Software playback also would not establish RPU/color, physical HDR or Atmos fidelity.
- **Full parity:** multichannel layouts, broader resampling/filter/tone-mapping behavior, nested HLS/DASH resources, hardware/device coverage and endurance extend beyond the six-row finite-file target. Existing restricted audio or subtitle evidence cannot qualify these responsibilities.

## Reproduction

Use fresh external build and evidence directories; never overwrite this run.

```sh
python3 research/items/nonisolated-full-software-playback/tests/build-render-probe.py \
  --deps /Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927/mpv-review-deps-01 \
  --sdk /Volumes/seed2/Projects/demuxe-release-closeout-20260916/build/emsdk-4.0.14 \
  --out /absolute/fresh/external-render-probe
node research/items/nonisolated-full-software-playback/tests/run-render-probe.mjs \
  /absolute/fresh/external-render-probe /absolute/fresh/evidence-directory
```

The builder refuses source/header/archive/toolchain drift. The browser runner freezes its runtime/worker inputs and rejects shared memory or accidentally enabled JSPI in the Asyncify case. The prerequisite has no media fixtures; media correctness and performance stages remain pending. See [current structured state](item.json) and [decision history](history.jsonl).

## Record validation

The new item's JSON, local links, probe source syntax, definition hash, evidence manifest and artifact hashes passed focused checks. `git diff --check` passed for the research index; its only change is this item's registration. The repository-wide `python3 scripts/research.py verify` finished with 16 failures (12 distinct paths) in older evidence references, including removed JSPI helpers/build artifacts and changed production renderer/remux sources. It reported no failures for this new item. The unrelated records were not repaired by this investigation. See [verification output](evidence/record-validation-20260929.json).
