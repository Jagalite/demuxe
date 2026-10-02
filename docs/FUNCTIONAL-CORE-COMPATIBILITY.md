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

`state` is a deeply frozen snapshot. When the derived public values compare equal, `publish()` keeps its previous object identity. `subscribe` adds the observer, invokes it synchronously with the current snapshot, then returns an idempotent remover. The initial callback is not wrapped by the later publication exception handler; a throwing initial subscriber currently throws from `subscribe` and remains registered. This conflicts with any broad reading that all observer failures are isolated: characterize it and make an explicit correction decision before cutover.

For a normal non-reentrant changed-state publication, current ordering is:

1. Derive state and configure preview priority/suspension/duration/position.
2. Update statistics, install the frozen snapshot, and call a copied subscriber list in insertion order. Update-callback exceptions are reported using `reportError` when available and do not veto the committed snapshot.
3. Emit `statechange`, then changed-field events in this order: `sourcechange`, `durationchange`, `trackschange`, `capabilitieschange`, `volumechange`, `ratechange`, `timeupdate`.
4. Emit `play` for newly accepted play intent; emit the corresponding status transition (`playing`, `pause`, `waiting`, `ended`). Looping suppresses the public ended notification in this path.
5. Enforce a reached range/loop boundary, which can enqueue more work.

Backend property/activity bursts normally schedule publication in a microtask. Candidate/busy/retired-session observations have separate suppression rules; they must not become accepted observations merely because they arrive later.

An operation begins by publishing its named pending state; `seeking` follows that publication. Body failures publish and emit their structured operation error, then the finalizer clears pending state and publishes again. `seeked` follows only a successful operation and final publication. `modechange` loading/ready/failed and `selectionchange` have their existing lifecycle payloads; they are not interchangeable with state snapshots.

These are source paths, not yet a complete reentrant trace guarantee. Subscribers may issue commands, unsubscribe, subscribe new listeners, or call close/destroy. Update delivery iterates a copied observer list and reads `this.stateSnapshot` when each callback is called. A reducer runner must commit atomically and serialize new transitions, but must not silently change same-stack delivery, acceptance cancellation, or gesture invocation. Capture nested subscription/command traces before declaring a particular reentrant ordering compatible.

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

Private `qualityPolicy` currently survives close until the next accepted new source resets it; no streaming state is exposed while there is no backend. Record the distinction between inaccessible retained implementation data and a promised source-scoped API value. Reset/source-scope changes need deliberate tests rather than a blanket “clear all state” action.

`getStats()` samples elapsed rebuffer time at getter invocation; extracting it must supply an explicit clock observation while preserving the getter's units/meaning. Diagnostics and capability getters include current backend facts. A frozen public snapshot does not make those physical facts constant.

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
