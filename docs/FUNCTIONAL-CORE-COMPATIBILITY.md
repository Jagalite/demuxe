# Functional core migration: compatibility ledger

Date: 2026-10-02. Source baseline: local `main`, `67ef9d3b`.

Status: **source-characterized, runtime-unvalidated**. This ledger records current implementation and documented promises; it is not a report that these behaviors passed tests. No local builds or tests were run to create it. Generated outputs, latest regression scenarios and the provider-backed browser matrix still need validation in the authorized build environment before an ownership cutover.

The [migration plan](FUNCTIONAL-CORE-MIGRATION-PLAN.md) defines the target architecture. Preserve the public contract while moving authority. A source/documentation disagreement or suspected implementation bug requires an explicit decision and a regression case; do not automatically canonize either the old implementation or a new test oracle.

## Argument validation and completion channels

The same invalid value must continue using the same public error channel unless a separately reviewed API correction changes it. `async` functions convert their internal throws into rejected promises even before their first `await`. Methods returning a promise can still throw synchronously before creating it.

| Surface | Source-characterized behavior | Source anchor |
| --- | --- | --- |
| `new Player`, `resize`, `setWatchdogs` | Constructor/options and immediate control validation throw synchronously. `resize` and `setWatchdogs` are not queued; both reject a destroyed owner synchronously. | [constructor](../src/unified-player.ts#L269), [resize](../src/unified-player.ts#L1780), [watchdogs](../src/unified-player.ts#L225) |
| `setMode`, `setAutomaticSelection`, video/audio filters, gain, volume/mute/rate, output-device ID, quality policy, timing/style, tone mapping, frame direction | Shape/range validation before `enqueue` throws synchronously. Backend availability, compatibility and source-scoped identity checks inside the queued body reject its promise. | [mode/filter controls](../src/unified-player.ts#L1359), [gain](../src/unified-player.ts#L1423), [volume](../src/unified-player.ts#L1624), [quality/output](../src/unified-player.ts#L524), [timing/style](../src/unified-player.ts#L1703), [frame step](../src/unified-player.ts#L1591) |
| `open` / `openRemote` | Invalid supported input shapes, URL/options and `startTime` validation return rejected promises. Custom source materialization occurs inside the operation. Pre-aborted requests reject before executing the opening body. | [open](../src/unified-player.ts#L1367) |
| `setBuffering` | Policy normalization failures explicitly return rejected promises; runtime update failures also reject. | [buffering](../src/unified-player.ts#L493) |
| `seek` | Invalid finite/nonnegative time or unknown seek policy throws synchronously. Missing source, stale chapter source, range/window rejection, backend and settlement failure reject asynchronously. | [seek](../src/unified-player.ts#L1505) |
| `seekChapter`, public audio/subtitle track selection | Missing chapter returns a rejected promise. Public track inventory/policy/identity validation occurs in the queue. Legacy `selectTrack` retains additional synchronous validation before delegating. | [chapter](../src/unified-player.ts#L1550), [public tracks](../src/unified-player.ts#L1633), [legacy tracks](../src/unified-player.ts#L1673) |
| Loop/range controls, live navigation, snapshots | Source/capability/range checks happen inside the queued operation. Snapshot readback is a queued command, not a passive getter. | [loop/range](../src/unified-player.ts#L1553), [live](../src/unified-player.ts#L535), [snapshot](../src/unified-player.ts#L1604) |
| Subtitle/font attachment | Invalid file type/size returns a rejected promise; budgets, source state and backend work are checked in the queue. Attachment serials are allocated before all validation completes. | [attachments](../src/unified-player.ts#L1717) |
| `prepare` | Component normalization can throw synchronously. A destroyed owner or active operation returns the existing preparation task rather than rejecting a new command. Preparation is outside the ordinary playback queue. | [preparation](../src/unified-player.ts#L605) |
| Fullscreen/PiP requests | These are `async` methods: invalid state/capability and retired requests reject their promises. Browser entry calls can still start synchronously before the first `await`. Media Session enablement is synchronous and can throw. | [presentation](../src/presentation.ts#L31), [Media Session](../src/presentation.ts#L74) |

This table characterizes typed API calls and explicit validation paths, not arbitrary JavaScript objects with throwing getters or proxies. Preserve structured error code, operation ID/kind and scope, not merely whether an exception occurred.

## Queue admission, cancellation and command outcomes

Source: [Player.enqueue](../src/unified-player.ts#L566), [interruptible work](../src/unified-player.ts#L589), [play/pause](../src/unified-player.ts#L1455), [seek](../src/unified-player.ts#L1505), [close/destroy](../src/unified-player.ts#L1784).

- Ordinary operations are FIFO and bounded at 32 admitted active/queued entries. Admission increments the operation serial before checking destroyed/full state. Closing bypasses the ordinary limit; repeated close calls reuse the pending close promise.
- The public `pendingOperation` represents the active operation with a named kind (`opening`, `seeking`, `switching`, `closing`), not all queued work. A settings or play operation may be active while this field is `null`. Do not use it as the queue-emptiness oracle.
- An epoch captured at admission invalidates older queued work when close/destroy advances it. Caller abort listeners are attached at admission; an already-aborted signal prevents the body from starting. Pre-start rejection happens before the body's error-publication `catch` and can reject without an `error` event.
- Aborting the active operation also aborts inspection and starts candidate destruction. `interruptible` races work against cancellation; this does not prove that the underlying task stopped or cannot return resources later.
- Pause synchronously retires outstanding play-verification intents, then queues the backend pause. A superseded play can fulfill without starting fallback; it must not poison codec evidence. The queued pause applies accepted pause settings afterward.
- A `latest` seek aborts the previous seek registered with that policy. Ordinary queued seeks retain FIFO behavior. Invalid/latest request timing and pre-aborted replacement semantics need explicit schedule cases rather than an assumption that every older seek rejects.
- Success/failure exits clear active operation state and publish before successful `seeked`. Internal queue-count cleanup is a subsequent promise-chain step; do not infer every internal bookkeeping field is empty at the earliest caller continuation.
- `close()` synchronously starts retirement and invalidates older work before awaiting cleanup. `destroy()` marks the owner terminal synchronously and returns one retained destruction promise; later commands reject and repeated destroy reuses cleanup.

Runtime checks required: exactly one settlement per admitted command; unchanged error-event behavior for pre-start rejection; queue-limit/closing interleavings; latest seeks with success racing cancellation; play/pause bursts; close/destroy during inspection, output verification and candidate acceptance. Liveness assertions require bounded work or an explicit eventual-completion/retirement assumption.

## Source acceptance, rollback and identities

Source: [replacement transaction](../src/unified-player.ts#L796), [startup/seek settlement](../src/unified-player.ts#L671), [Native readiness](../src/internal/native-player.ts#L212), [play verification/fallback](../src/unified-player.ts#L1446).

1. Retain the accepted session while preparing a hidden candidate. Ordinary replacement may pause the accepted backend during preparation. Continuing both simultaneously is an existing optional background-promotion path with resource checks, not a new general requirement.
2. Apply required settings/attachments, load, establish route-specific startup readiness, restore the requested/preserved position, and confirm that the actual components match an admitted plan. Resume a preserving replacement when required by retained playback intent.
3. Commit the new source/session/settings as one acceptance decision. A newly accepted source increments `sourceSerial`; a same-source route replacement keeps it. A failed opening must not change the public source identity. Startup readiness while paused is distinct from actual output verification on playback.
4. Detach the caller's abort listener at acceptance **before synchronous observers run**. Caller abort after that boundary cannot undo acceptance. Close/destroy may still retire the accepted owner through their own lifetime cancellation.
5. Publish acceptance, expose the new surface, then retire the old backend. Cleanup failure after acceptance reports an operation error; it must not claim rollback or dispose the new backend as a failed candidate.
6. Before acceptance, discard the failed candidate and preserve the accepted source; where the old backend remains healthy, replacement failure attempts to resume its prior playing intent. This is an attempted physical restoration, not a guarantee that broken resources can always recover.

The new core needs distinct owner, source-attempt, accepted-source, backend-session, operation and effect identities. Do not use public source ID as the identity of a candidate or as the sole guard for same-source backend replacement. Public track IDs encode source scope and, where available, stable stream/attachment identity; raw backend numeric IDs are not interchangeable across routes.

Buffering exposes another transaction boundary: if applying a new policy fails, it tries the previous policy. If that rollback also fails, the source reports `DECODE_FAILED` with possible partial backend application ([buffering update](../src/unified-player.ts#L498)). The requested policy can remain unchanged while the physical backend is uncertain. The migration must represent that distinction instead of declaring restoration solely because a public value stayed the same.

Runtime checks required: fail/abort every candidate phase; caller abort from an acceptance subscriber; close/destroy from that subscriber; old cleanup failure after commit; prepared-but-unverified paused open; failed settings rollback; same-source track/attachment identity across supported handoffs.

## Publication, event ordering and reentrancy

Source: [state/subscription](../src/unified-player.ts#L343), [publication](../src/unified-player.ts#L416), [operation events](../src/unified-player.ts#L578), [backend listeners](../src/unified-player.ts#L640).

`state` is a deeply frozen snapshot. When the derived public values compare equal, `publish()` keeps its previous object identity. `subscribe` adds the observer, invokes it synchronously with the current snapshot, then returns an idempotent remover. The projection cutover corrects initial-callback exception handling: initial and update callbacks both isolate exceptions and report them when `reportError` is available. A throwing reporter is isolated too. This is an intentional correction to align the implementation with the public observer-failure contract; it is covered by an independent integrated regression.

For a normal non-reentrant changed-state publication, current ordering is:

1. Derive state and configure preview priority/suspension/duration/position.
2. Update statistics, install the frozen snapshot, and call a copied subscriber list in insertion order. Update-callback exceptions are reported using `reportError` when available and do not veto the committed snapshot.
3. Emit `statechange`, then changed-field events in this order: `sourcechange`, `durationchange`, `trackschange`, `capabilitieschange`, `volumechange`, `ratechange`, `timeupdate`.
4. Emit `play` for newly accepted play intent; emit the corresponding status transition (`playing`, `pause`, `waiting`, `ended`). Looping suppresses the public ended notification in this path.
5. Enforce a reached range/loop boundary, which can enqueue more work.

Backend property/activity bursts normally schedule publication in a microtask. Candidate/busy/retired-session observations have separate suppression rules; they must not become accepted observations merely because they arrive later.

An operation begins by publishing its named pending state; `seeking` follows that publication. Body failures publish and emit their structured operation error, then the finalizer clears pending state and publishes again. `seeked` follows only a successful operation and final publication. `modechange` loading/ready/failed and `selectionchange` have their existing lifecycle payloads; they are not interchangeable with state snapshots.

The projection cutover defines reentrant delivery explicitly. Each batch retains its committed snapshot; events carry that snapshot, never a newer snapshot substituted after a callback. A nested publication or close/destroy retirement stops the remaining obsolete batch. The nested publication runs synchronously against committed state. Subscribers are copied at batch start; subscription itself still invokes its initial callback synchronously. Independent tests cover subscriber reentry, statechange reentry, close before cleanup, observer/reporting failures, and reentrant host reads.

The pure projection returns ordered event names for the captured previous/next pair. The shell captures one accepted tuple and rejects samples superseded during host reads or preview callbacks. Snapshot equality suppresses statistics and boundary enforcement, while preview priority/suspension/duration/position updates still occur. Streaming readback now copies backend-owned nested records before freezing; the backend retains ownership of its input graph.

## Observed state and settings lifetimes

Source: [projection](../src/unified-player.ts#L416), [new-source acceptance](../src/unified-player.ts#L931), [close/destroy](../src/unified-player.ts#L1784), [attachments](../src/unified-player.ts#L1717).

| Value | Current source-characterized behavior |
| --- | --- |
| `status` vs `playbackIntent` | Status prioritizes absent/error session, EOF, explicit/backend pause, waiting/cache starvation, then observed playing. Play intent does not guarantee `playing`; valid buffering and ended states exist. |
| Idle source/mode | Public `sourceId` and `activeMode` are `null` without an accepted session; legacy `mode` retains configured/last mode. An idle state does not erase configuration. |
| Durations/ranges | Unknown values are `null`; known empty ranges are `[]`. Live duration is `null`. A finite duration alone is not proof every reported timestamp has audiovisual output. |
| Successful new-source open | Accepts paused playback, resets loop/range/quality policy and explicit public track selections, and replaces source-scoped subtitle/text attachments. Existing source track choices are not blindly reused on a different source. |
| Same-source route change | Retains accepted source identity, intent, position and preservable settings/tracks/attachments. An unmappable selected track, output sink or manual quality pin can reject handoff instead of being silently discarded. |
| Close | Returns a reusable idle owner; clears source/session, loop/range, source attachments/selections, statistics and source capability/attempt records; resets pause and raw audio/subtitle selection defaults. Retains volume, mute, rate, filters, gain, tone mapping, timing/style, output device, buffering/mode policy and fonts. |
| Source-scoped subtitle handles | Remain usable across a preserving same-source handoff; expire after a new accepted source or close. Handle authenticity and source ID are both checked. Caller-owned text URLs remain caller-owned. |
| Player-scoped fonts | Survive close/open and same-source handoff, bounded by existing budgets; explicit removal and terminal destruction release ownership. |
| Destroy | Terminal immediately and idempotent as a cleanup request; awaits resources/queue, clears accepted media, publishes idle, clears subscribers and removes owned DOM. Some inert settings fields are not reset; do not invent new public reset guarantees for a terminal instance. |

The settings cutover clears the private `qualityPolicy` on close together with other source preferences. The original implementation retained it invisibly until the next accepted new source; no streaming state was exposed while there was no backend. This is an internal source-scope correction, without a new public reset guarantee.

`getStats()` samples elapsed rebuffer time at getter invocation; extracting it must supply an explicit clock observation while preserving the getter's units/meaning. Diagnostics and capability getters include current backend facts. A frozen public snapshot does not make those physical facts constant.

The projection extraction records additional source quirks for explicit compatibility decisions: loop availability reads the **previous** snapshot's duration, with initial `undefined` differing from `null`; positive infinity can survive `currentTime` normalization; malformed `ranges([null])` throws while packet-cache normalization returns unknown. These are preserved in the integrated projection, not newly promised API behavior. The candidate copies normalized graphs before freezing so it cannot freeze caller-owned tracks, policies or streaming records. Host reads remain in the shell; returned streaming graphs are now detached before freezing.

## Settings and automatic boundary cutover

The composed settings transaction accepts only the fields owned by the command. A delayed volume completion cannot overwrite an independently accepted emergency pause. Desired filters, tone mapping and timing/style remain private during candidate preparation and commit with source acceptance. An error during cleanup after acceptance cannot undo the accepted source or reapply a captured settings snapshot.

Direct filter/tone changes now attempt to restore the exact previous filter pipeline after partial application. Range and explicit-loop positioning likewise verifies the requested position before accepting the policy, and attempts to restore the previous position on failure. These are intentional compensation improvements. If restoration fails, the retained public preference is not evidence of physical restoration: the session reports `DECODE_FAILED` and the core retains degraded transaction metadata.

Automatic range/loop work owns a session, operation and generation through pause, seek, verification and optional play. Each completion must retain that authority before issuing the next effect. Its pending lease survives final queue publication; stale clock/EOF observations in that publication cannot enqueue a duplicate loop. A superseding source, close or destroy retires the lease atomically. Physical cleanup remains in the adapter.

## Track, PCM and remux lifecycle cutover

Stable public selections now belong to the composed Player preferences. Routed selection keeps desired identity private until source acceptance, where it commits together with the actual backend track IDs. An unchanged selection remains a no-op; remembering an already selected native track retains the raw backend setting. Subtitle visibility retains host-policy validation, presentation locks and promotion timing. A pre-acceptance failure discards desired identity; old-backend cleanup failure after acceptance cannot restore it.

The PCM reducer owns reset epochs, reset acknowledgments, posted/consumed bounds and stop completion identity. Native ring reads, copies, message ports and timers remain in the adapter. Playback PCM and standalone audio retain their distinct startup/running order. Stop completion is installed before reentrant callbacks; duplicate acknowledgments and stale/early deadlines cannot settle twice.

The remux lifecycle reducer owns explicit source/restart identity, worker generation, startup target, intent, and admission for one packaging retry and one recovery per explicit open. Worker callbacks and recovery continuations carry those identities. Retirement detaches physical handles before callbacks, so old cleanup cannot destroy replacement resources. Frame-prime cleanup cancels its callback once and continues even if listener removal throws. MSE append and buffered-output readiness remain separate pending ownership work.

## Attachment and worker request cutover

Attachment serial allocation still occurs before validation, and validation keeps its existing rejected-promise channel. The composed Player core now owns byte/count budgets and accepted versus pending attachment membership. A hidden replacement can read desired membership and stable-selection changes, while accepted membership remains unchanged until source acceptance. Removal and stable selection commit at the same boundary. Failures after that boundary retain the accepted change. Physical byte buffers, caller-owned URLs and branded handles remain in the shell registry, which prunes resources only after core ownership retires. Close/new source expires subtitles and text; fonts survive until explicit removal or destruction.

Attachment effects recheck operation/session authority after reads and backend completions. A read or text-track completion after close cannot populate a replacement source. Synchronous retirement that returns a rejected read promise remains observed. Exact byte/count boundaries, mismatched/forged/expired handles, deferred acceptance and 12 seeded mixed ownership histories are covered.

Private audio-worker state now owns initialization, replacement flush/load stages with existing poll bounds, context/pause ordering, close authority and source-scoped authorization requests. Native MSE-worker state owns boot/shutdown, source/operation epochs, sampled element facts, play/authorization requests and deadlines. Physical engine calls, message ports, timers and media resources remain in adapters. Shutdown retires requests before waiting on physical cleanup, and old authorization replies cannot update a replacement source.

## Route and controller cutover

The five source-policy functions retain their existing decisions. Immutable route overlays preserve rejection precedence, shared capability-family answers, finite plan order and bounded attempt history; late decoding answers require the accepted epoch/session. Probe/asset/discovery policy is still being migrated.

Private playback pause now waits for native acknowledgement and the final in-flight picture to be acknowledged by the UI before resolving, with a bounded 15-second presentation deadline. This intentionally corrects an ordering defect reproduced both before the migration and in the frozen candidate. The worker continues servicing native events and command replies while the paused render surface is held. Explicit play, seek, frame stepping, resize and visual changes may resume presentation; volume, rate and cache settings do not. A rejected timer cannot leave an unowned native command running, and close/replacement rejects late subtitle-inventory acceptance. Paused stability is separate from exact frame timestamp/fidelity qualification.

Remux-controller state retires requests and acquisition identity before cleanup callbacks. Reentrant iframe/worker/local acquisition cannot install a returned resource after destruction; late resources are cleaned up. Stale boot/fallback/error/authorization callbacks cannot mutate the new owner. The same-stack media play call remains in the adapter.

## Inspection, discovery and buffering cutover

Inspection results and asset flags are detached immutable metadata keyed by opaque source identity. The shell retains file/error objects only while that metadata owns them. Pre-acceptance candidate failure restores prior inspection and asset evidence together. Same-epoch caller cancellation permits that rollback; retirement by close/destroy rejects it. Fast inspection still excludes explicit private demuxers, non-auto tracks, attached text and the existing filename families, with the preserved component-repair exception. Missing preserved public stream IDs remain `missing`. Optional private-inspector fallback uses the identity observed after probing, preserving transport/permission constraints.

Discovery retains registry order, explicit mode/start exclusions, lazy adaptation probes, caption-renderer exclusions and existing terminal-versus-compatibility behavior. Each physical attempt has a unique completion lease. A short local Direct timeout may try only its already-admitted matching remux plan, then restore the original once with its 25-second budget when the existing fallback conditions allow. Fast metadata may trigger one full-inspection restart. Stale attempt/probe completions cannot advance a successor cursor. Discovery error text retains the latest 128 entries; the prior local array was unbounded. The finite registry and one reinspection keep ordinary histories below that limit.

MSE buffer and schedule domains share the remux lifecycle generation. Retirement invalidates pulls, queued payload IDs and append/remove receipts together; completed append evidence remains visible until a new MSE generation starts. The shell owns SourceBuffers, payload bytes and listener handles. Pure scheduling retains GOP-safe byte eviction, half-second gap admission, startup-coverage versus output distinction, and paused/playing window semantics. Retained-frame ingress keeps caller ownership when prior cleanup throws, avoiding double-close of an input that was not accepted.

## Gesture-sensitive effects

Source: [Player.play](../src/unified-player.ts#L1461), [presentation requests](../src/presentation.ts#L31), [output picker](../src/player/advanced-settings.ts#L146).

- When the player has a current backend, is not destroyed and has no queued work, `play()` starts `backend.play()` before yielding to the operation queue. Starting this effect after a blanket microtask or worker hop risks losing user activation.
- Fullscreen/PiP entry methods call browser entry APIs before their first asynchronous suspension. The advanced-settings output action similarly invokes `selectAudioOutput()` before awaiting permission; applying its returned sink happens later and remains owner/source guarded.
- A generic immediate-effect lane must retain eligibility and guards, not run every effect immediately. Play invoked while queued work exists may still require a fresh gesture; source code does not grant universal activation preservation.
- The public API documentation says play resolves when playback is accepted, not at first `timeupdate`; the Native path additionally awaits `verifyOutput`, while other backends have their own play completion. Preserve these route-specific checks; do not reduce play completion to one backend call or strengthen every route to one invented output metric.

Runtime checks required: same-stack browser-call probes, real user-gesture entry, queued-play denial/retry, permission completion after owner/source replacement, and non-activation calls that correctly reject. Stubbed same-stack checks alone do not establish browser permission behavior.

## Existing sequence-oracle review

The first implementation slice corrects several oracle assumptions found at `67ef9d3b`. These changes are source-reviewed, not runtime-validated. The broader fixture and schedule limitations remain explicit.

| Baseline finding | Correction / remaining characterization |
| --- | --- |
| [Browser model](../tests/api-stability/sequence-model.mjs) froze the initial plan and automatic mode after the first open. | Automatic histories now check an explicit per-mode route allowance for the finite H.264/AAC fixture; forced-mode histories retain route stability. Automatic fallback/promotion may legitimately occur during play or replacement. A simultaneous preview and route change does not establish causation; preview authority still needs effect-level assertions. Validate the allowance against candidate providers before counting results. |
| The browser preview step required a nonempty Blob, although [PreviewController](../src/preview/controller.ts#L191) permits `null` for suspended/cache-only/unavailable work. | The general history now accepts and records `null`, and checks image content when returned. Dedicated positive-preview scenarios still need explicit provider/readiness preconditions and a required image; an all-null history is not thumbnail qualification. |
| The browser observer repeatedly used queued `snapshot()` to inspect pixels. | The history now samples the public media surface with passive canvas readback, avoiding Player queue/preview/promotion effects. Browser validation must establish readback behavior for each renderer. Snapshot remains an explicit command covered separately. |
| Settled-state checks equate requested play with playing after a deadline and require visible pixel change. | This still requires healthy moving-video fixtures away from EOF and bounded starvation. Static frames, audio-only media, intentional holds, ended playback and buffering are legal under the broader API; they need their own observations and expected states. No audio-fidelity claim follows from pixel/clock progress. |
| [Unit fixture](../tests/api-stability/sequences.mjs) installs a backend/session and directly updates private observed fields; its long histories check after settled commands. | It tests real queue/public projection code with controlled assumptions, not general source transactions or arbitrary interleavings. The separate foundation harness introduces deferred completion/retirement schedules, but is not yet integrated with Player state. |
| The injected buffering failure made both update and rollback throw, but asserted requested policy retention. | The retention case now explicitly rejects the new policy before application and permits rollback. This does not establish physical restoration after partial application. A partially applied backend model and explicit rollback-failed state/error expectations remain necessary. |

## Required evidence before first ownership cutover

1. Build source and generated declarations together in the authorized environment; package-boundary/consumer checks must include the narrowed remux preview readback shape, without concrete provider types in public core declarations.
2. Resolve or explicitly scope the source/documentation mismatches above, particularly initial subscriber exceptions and route-specific play completion. Add independent expected traces for accepted behavior.
3. Validate all latest contract and browser changes on the exact candidate revision, preserving fixture/browser/provider identity and acknowledging untested permission paths.
4. Demonstrate the compatibility cases in this ledger through the deterministic executor and appropriate real browser checks. A static check or green pure model is not output/permission proof.
5. For each cutover, record old mutation sites removed, the one new state owner, effects retained in the shell, and the evidence that public timing/ownership contracts remain intact.
