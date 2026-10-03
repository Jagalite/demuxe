# Functional-core ownership audit

Status: migration and audit in progress on local `main`. The twenty-second integrated checkpoint passes 2,866 contracts plus consumer types, build/license boundaries, static pure guard and package compilation pass. Subsequent isolated slices have focused evidence until their next integrated gate. This inventory does not establish final architecture completion or v1 readiness.

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
| Player fault/deployment metadata | Session fault identities now belong to accepted/candidate source state; original Error objects remain in a WeakMap. Deployment selection now belongs to composed routing state; runtime is derived. |
| Player effect acquisition | Promotion timer/controller, Native constructor listeners, backend observation bindings and track-confirmation acquisition now have targeted rollback and reentry coverage. Complete remaining effect inventory; domain-specific interpreters still execute typed effects outside the generic executor. |
| Lower subtitle worker | Lifecycle, request/refresh identity, absolute deadlines, timeline/selection/completeness and attachment budgets share one pure owner. Files/pointers/timers remain physical; uncertain native add/remove faults the lifetime and retains close cleanup. Final native/browser qualification remains open. |
| Lower playback host | Lifetime/creation, duration/preroll, source failure, render invalidation and event/statistic budgets now have a pure owner. Native pointers, canvases and engine objects stay physical. Final native/browser qualification remains open. |
| Selective sync worklet | Lifetime/epoch/generation admission and cadence helpers are pure. Physical scanning/sample progress remains mutable DSP state; output fences recheck header admission. Browser audio/performance qualification remains open. |

Checkpoint 21 addresses the audited duplicate deployment state and acquisition gaps. Provider probes capture scalar availability under a routing revision/operation lease; preparation checks that lease before acquisition and publication. Promotion timer failure retires only its own lease, and duplicate delivery cannot create another controller. Backend binding identity is a physical listener-map receipt; pure session/resource owners retain playback authority. Constructor failures stop the Native owner before independently removing acquired listeners. Track confirmation is a promise adapter with one settlement and independent cleanup, including partial registration and late timer acquisition.

This is a live list, not a completed exhaustive proof. Each remaining mutable field must be classified against its actual read/write sites before this gate can close.

## Retained-state inventory for checkpoints 19–21

This is a scoped source inventory, not the completed whole-application bound or long-session proof. Limits describe default production owners; physical native allocations and externally retained references need separate qualification.

| Owner | Logical retained bound | Physical retention / release obligation |
| --- | --- | --- |
| Player resource ledger | 1,024 resource records, 256 scope records, 32 failure summaries; default cleanup deadline 5 seconds. Monotonic completion compacts records. | Reserved or detached acquisition retains capacity until physical completion. Deadline settlement is not evidence of release. Acquisitions, handles and cleanup continuations remain shell maps. |
| Player source faults | One accepted and one candidate fault identity, plus a safe-integer serial; exhaustion rejects the next fault. | WeakMap retains the original Error for each externally reachable Session. It does not impose a bound on references retained by external callers. |
| Remux deployment | One immutable selection and revision; runtime is derived, and revision exhaustion rejects publication. | Provider runtime handles remain physical; callback observations cannot publish under a retired operation or replaced selection. |
| Lower subtitle worker | At most 128 queued/active RPCs and 128 authorization refreshes; one active open wait, visual deadline and pending attachment. Open deadline 20 seconds, refresh deadline 5 seconds. | Timer/refresh resolver handles, engine pointers and file paths stay in the worker. Closing retires requests before native cleanup; uncertain native attachment mutation faults the lifetime. |
| Subtitle attachments | At most 16 entries, 8 MiB per attachment and 16 MiB aggregate admitted bytes. | Failed file removal retains a path for close retry and faults the lifetime, preventing repeated unaccounted acquisitions. Native uncertainty is retained until service close; no successful cleanup is inferred from logical retirement. |
| Lower playback host | Constant-size control state; event history capped at 256 and at most 64 events drained per pump; draw counter saturates. | Native command strings must be freed after retirement; serialized native creation success retains destruction obligation. Canvas/ImageData/PCM/native execution remain physical. The host queue and caller containment still require whole-stack retained-state audit. |
| Selective worklet | Constant three-field lifetime/header owner; unchanged quanta retain state identity. Ring scans and consumption are bounded by configured capacity. | Fixed shared PCM/metadata buffers and DSP cursors stay mutable. Node/V8 allocation probes do not establish browser real-time behavior or whole-player memory bounds. |


## Checkpoint 22 integration scope

The integrated source now reserves finite queue capacity before physical caller/controller allocation:

| Owner | Retained bound and retirement rule |
| --- | --- |
| Playback host | 128 active/queued calls plus one mandatory cleanup slot. Retirement drops queued closures and rejects their callers; active native work retains its obligation until settlement. |
| Private playback worker | 128 ingress envelopes plus reserved close; 64 MiB aggregate copied payloads, 4,096 traversal nodes and depth 16. Native commands, authorization refreshes and presentation fences each cap at 128. Blob, canvas and port backing stores are physical handles. |
| Backend RPC profiles | Software, audio and subtitle profiles each cap at 128 calls plus mandatory cleanup. |
| MediaCapabilities | 128 actual outstanding browser queries, including those whose advisory deadline expired. Capacity returns only on native settlement. Terminal Player destruction detaches the callback and retires admission; reusable close leaves the service usable. |
| Wasm attachments | 32 native lifetime entries, 8 MiB per attachment, 16 MiB aggregate. Source replacement clears public associations without pretending native files were freed. Uncertain submissions remain charged; worker teardown releases native storage. |
| Native event/caption/timeline | 128 event waits, 16 pending/accepted captions and 128 active/queued subtitle timeline jobs. Request identities reject safe-integer exhaustion. Add/select calls reserve a timeline slot before awaiting initialization. |
| Shaka | 32 playback or four preview network requests including cancellation/reader cleanup. Filter associations use weak keys. Caption admission has 16 pending/committed/uncertain slots; native uncertainty remains charged until backend close. |

Consumer acquisition checks now cover preview controllers/caller timers, pregeneration timers, MediaView/borrowed media elements, scrubber image/timer/URL ownership and document presentation. Shared cleanup completions are published before reentry; independent release operations continue after one fails. The Native EOF observation now preserves accepted play intent for the boundary owner, instead of converting a physical EOF pause into a new user pause. This fixes a bug reproduced in the older baseline as well as checkpoint 21.

These source changes pass the final integrated receipt `results/api-stability/gate-unit-all-node-1790990620835/result.json`. The field-level audit expanded to public worker entrypoints and found production SoftwareFull and FilterRetained scheduling policies requiring migration. They remain an architecture blocker. See the supported runtime boundary in `FUNCTIONAL-CORE-WORKER-SCOPE.md` and the finite replay gate in `FUNCTIONAL-CORE-REPLAY-INVENTORY.md`; legacy demonstration entrypoints are explicitly outside the supported package migration boundary.

Externally owned subscriber, provider and application queue cardinalities are reviewed adapter exceptions, not global finite-count claims. Physical browser decode or third-party work that ignores cancellation remains an outstanding host obligation; logical retirement is not evidence that the browser released it. The final field inventory must identify these exceptions individually.

## Qualification still required

- Full composed replay, causal schedule exploration, shrinking and mutation controls. The bounded production trace intentionally omits private payloads and does not claim exact external replay.
- Final resource/effect inventory, retained-state bounds and cleanup containment across all acquisition and retirement paths.
- Installed-package dependency closure and execution for the exact final candidate.
- Current supported-browser command histories, actual video/audio output, preview route stability, activation/permission behavior and cleanup. Earlier frozen native/browser receipts do not qualify later source changes.
- Command latency, render/audio cadence, queue pressure and allocation comparisons against the recorded baseline; synthetic microbenchmarks alone are insufficient.
- Required and extended CI on the final candidate when publishing is authorized. This task remains local main with no PR or push.
