# Functional-core ownership audit

Status: migration and audit in progress on local `main`. The twentieth integrated checkpoint passes 2,654 contracts plus consumer types, build/license boundaries, static pure guard and package compilation pass. Subsequent isolated slices have focused evidence until their next integrated gate. This inventory does not establish final architecture completion or v1 readiness.

## Authority boundaries

| Lifetime | Logical owner | Imperative responsibilities |
| --- | --- | --- |
| Player | Accepted-source publication and mandatory predecessor cleanup; `transitionPlayer` and composed `PlayerControlState` domains: operations, playback, settings, source, routing, readiness, actions, attachments, publication, monitoring, resources and executor | Backend/DOM creation, event capture, listener registration, promise settlement, timers, physical resource cleanup and effect execution |
| Preview lane | Preview job/cache/scheduling owners; restricted from source and playback-route effects | Byte acquisition, provider calls, rasterization, images/blobs and cancellation handles |
| Consumer/component | Binding, element lifecycle/queue/control/configuration and advanced-setting owners | DOM/framework objects, rendering, gestures, host listeners and borrowed Player references |
| Document presentation | Shared presentation/Media Session lease owner | Browser fullscreen/PiP/Media Session calls and host restoration |
| Native backend | Composed lifecycle/load/controls/captions/wait ownership | Media element, event listeners, remux/audio/subtitle services and physical commands |
| Wasm backend | Lifecycle, RPC requests, seek and settings owners | Worker transport, message buffers, canvas and engine handles |
| Shaka backend | Lifecycle, command queue, quality/selection, network ownership and scalar observation projections | Third-party Shaka runtime, media element, request plugins, provider catalogs and image acquisition |
| Native subtitle service | Composed lifetime, presentation, timeline and request ownership | Worker/RPC transport, overlay rendering, tracks and font/subtitle resources |
| Native audio service | Lifecycle, play/context intent, timestamp/drift policy, publication and rate-boundary ownership | AudioContext/worklet operations, shared PCM headers/buffers, video callbacks and timers |
| Remux pipeline | Lifecycle, producer, buffer, scheduling, negotiation/output, MP4 parser and source-worker/read ownership | MSE/SourceBuffer operations, workers, ports, sample/fragment buffers and actual byte copies |
| Private cooperative engine | Scheduler task/wait/continuation/stack-slot metadata, decoder wake and range-source request ownership | Native stacks and exports, continuation handles, Wasm memory, timers and source I/O |
| Private FFmpeg engine | Composed bridge and SingleOwner execution/source/wait/shutdown owner | Emscripten module, native calls, readers, continuation callbacks and physical shutdown |

Modules within a Player are domains of one atomic transition boundary. Separate backend, worker, preview, UI and document lifetimes retain their own owners where they have independent physical authority. Moving code into another file does not by itself transfer ownership.

Private loaders use scalar admission and source-open lifetime policy; host/import/reader acquisition and cleanup remain effects. Remux startup failure uses lifecycle facts, independently of diagnostic history.

## Physical state retained in adapters

These are implementation responsibilities, not alternate playback-policy authorities:

- Weak maps and maps associating pure IDs with backends, workers, surfaces, callbacks, promises, listeners, controllers, byte sources, images and native pointers.
- Physical task completion and cleanup promises. Logical retirement does not falsely mark an ignored physical operation as released.
- Raw decoded frames, PCM arrays, packet/chunk buffers, MSE objects and native memory. Core state retains bounded metadata, identities and decisions rather than copying media payloads.
- Observation caches used only to project already-sampled physical facts. A diagnostic array or counter must not decide admission, failure, routing or current ownership.
- Queue barriers and resolver tables implementing a decision already committed by the core. They must be installed before callbacks can reenter.

### Audio worklet DSP exception

The private PCM worklet's message-time connection, epoch/sequence admission, reset/channel/capacity policy, stop/error and capture budget belong to its pure owner. Physical ring positions, consumed samples, copying and DSP progress remain mutable inside the worklet. Allocation-free scalar helpers decide quantum consumption and notification cadence; processing does not create a new immutable control snapshot for every audio quantum.

The integrated candidate preserved 72 differential histories (14,400 steps) and made no new core-state or typed-array allocations in a 720,000-quantum Node/V8 probe. Measured median microseconds per quantum were 0.965→1.101 for stereo, 1.648→1.756 for six channels and 1.948→2.078 for eight channels. This is an explicit boundary and synthetic overhead measurement, not browser real-time or whole-player CPU qualification. The evidence receipt is `/tmp/demuxe-private-worklet-comparison.json`; final durable qualification remains required.

## Open ownership and containment work

| Area | Remaining work |
| --- | --- |
| Resource acquisition | Backend/surface capacity is reserved before construction; late acquisition and cleanup retain the original deadline/accounting. Audit remaining resource kinds and acquisition paths. |
| Player fault/deployment metadata | Session fault identities now belong to accepted/candidate source state; original Error objects remain in a WeakMap. Audit duplicate mutable remux deployment-choice fields. |
| Player effect acquisition | Complete promotion timer/controller and source-construction/listener acquisition review. Domain-specific interpreters still execute some typed effects outside the generic executor. |
| Lower subtitle worker | Lifecycle, request/refresh identity, absolute deadlines, timeline/selection/completeness and attachment budgets share one pure owner. Files/pointers/timers remain physical; uncertain native add/remove faults the lifetime and retains close cleanup. Final native/browser qualification remains open. |
| Lower playback host | Lifetime/creation, duration/preroll, source failure, render invalidation and event/statistic budgets now have a pure owner. Native pointers, canvases and engine objects stay physical. Final native/browser qualification remains open. |
| Selective sync worklet | Lifetime/epoch/generation admission and cadence helpers are pure. Physical scanning/sample progress remains mutable DSP state; output fences recheck header admission. Browser audio/performance qualification remains open. |

Read-only residual audit after checkpoint 20 integration (not yet reproduced):

- `Player.selectDeployedRuntime` publishes mutable deployment selection after provider callbacks; `remuxRuntime` duplicates selection runtime. Capture availability facts and check lifetime before committing or allocating preparation.
- Promotion timer/controller acquisition needs post-acquisition lease checks and rollback, including throwing constructors and reentrant successor scheduling.
- `observeBackend` needs cleanup when listener registration physically adds then throws. Native backend constructor listener acquisition likewise needs partial-construction rollback.
- `confirmTrackSelection` needs exception-safe timer/listener acquisition and a fence after synchronous completion during registration before attaching subsequent listeners.

This is a live list, not a completed exhaustive proof. Each remaining mutable field must be classified against its actual read/write sites before this gate can close.

## Qualification still required

- Full composed replay, causal schedule exploration, shrinking and mutation controls. The bounded production trace intentionally omits private payloads and does not claim exact external replay.
- Final resource/effect inventory, retained-state bounds and cleanup containment across all acquisition and retirement paths.
- Installed-package dependency closure and execution for the exact final candidate.
- Current supported-browser command histories, actual video/audio output, preview route stability, activation/permission behavior and cleanup. Earlier frozen native/browser receipts do not qualify later source changes.
- Command latency, render/audio cadence, queue pressure and allocation comparisons against the recorded baseline; synthetic microbenchmarks alone are insufficient.
- Required and extended CI on the final candidate when publishing is authorized. This task remains local main with no PR or push.
