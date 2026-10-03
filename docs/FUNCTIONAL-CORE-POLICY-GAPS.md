# Player policy ownership review

Initial review: 2026-10-03 against `bf6b2129` plus the current uncommitted refresh/simulation fixes. This is a source review, not a runtime failure report. The findings below preserve the pre-migration review; the implementation status is recorded next.

Scope: `src/unified-player.ts`, its composed machine domains, startup prefetch, Native event waits, and selected Shaka/private-software control paths. This is not a fresh exhaustive audit of every worker, provider or decoder. The earlier retained-field audit establishes storage ownership for reviewed fields; it does not prove that every behavioral branch is selected by a pure transition.

Criterion: host objects, handles and sampled observations may stay in adapters. Decisions that accept/reject commands, choose routes, govern recovery/compensation, or determine whether asynchronous work remains authorized should be pure decisions. A one-shot predicate may need only a pure function; a sequence spanning asynchronous completions needs explicit phase/identity state. Moving every local variable or `if` into PlayerControlState is not the objective.


## Implementation status (2026-10-03)

All seven primary findings are implemented in the working tree:

| Finding | Policy owner | Adapter boundary |
| --- | --- | --- |
| Startup speculation | `machine/startup.ts`, Native event waits | Recipe observations, fetch/compile, buffers and timer handles |
| Play verification/recovery | `machine/player-transport.ts` | Immediate user-activation play, output observations and selected effects |
| Seek admission/compensation | `machine/player-transport.ts` | Seekable samples, seek/restore/resume calls and error normalization |
| Fault response/recovery | `machine/route-recovery.ts` | Backend/watchdog observations, pause and replacement execution |
| Settings-driven routes | `machine/settings.ts` | Backend setters and existing source replacement transaction |
| Track confirmation | `machine/track-confirmation.ts` | Track samples, listeners, timers and Promise settlement |
| Promotion attempts | `machine/route-promotion.ts` | Discovery/selection execution and normalized completion facts |

Transport transactions retain operation/epoch/session identities, positions, intent and phases; operation retirement and source clear remove authority. Pause prevents further play restoration/retry effects. Track confirmation accepts either its current candidate or accepted session, so source acceptance does not invalidate an in-flight confirmation. Settings policy commits atomically with source acceptance. Promotion owns the ordered candidate IDs and cursor.

Startup immutable-code warming is explicitly Player-scoped and can survive source replacement. Its owner admits at most eight module paths, preserves the existing 32 MiB per-module limit, and retains canceled physical obligations until actual settlement. Destroy rejects late publication. Native soft deadlines have once-only identity authority.

The secondary Shaka backend compensation and private-software deadline-capture suggestions below remain separate follow-ups. This completes the seven primary policy gaps, not every possible refinement of every decoder/backend transaction. Browser/native/endurance qualification remains deferred.

Baseline committed as `63d41aba`. Latest adversarial follow-up: 479 focused tests pass, including real source transaction integration, overlapping controls and startup physical-settlement schedules. TypeScript, the static core boundary and ownership audit pass. See `results/api-stability/adversarial-sequences-2026-10-03/result.json` and the replay inventory for synthetic-boundary limits. The additional tests and fixes are uncommitted.

The evidence and line numbers in the following findings refer to the pre-migration code.

## Findings

### 1. Startup speculation still chooses policy and owns work outside the core

Evidence: `src/unified-player.ts:1523` (`startupFallback`), `:1535` (`prefetchStartup`), `:1587` (budget/prefetch selection), `:1659` (timeout retry classification); `src/internal/native-player.ts:222` (soft prefetch timer); `src/internal/startup-escalation.ts:14` (`StartupModules`).

Already owned: discovery identity/cursor, admissibility helpers, Native event request identity and its hard deadline. The discovery reducer also owns original-route restoration; that is not wholly missing.

Outside: selecting the speculative route and shortened budget, authorizing the soft timer, pending module deduplication/retry, physical prefetch obligations, and cache admission. `StartupModules.pending` determines whether new work starts and whether failures permit retry. Destroy clears that map while physical fetch/compile settlement is independent.

Recommended: pure startup-plan selection plus a bounded prefetch owner with request IDs, deadline/cancellation and physical-settlement facts. Keep bytes, compiled modules, controllers and fetch/compile calls outside. Do not assume that shared immutable-code warming must be canceled on every source replacement; decide that lifetime explicitly. Actual Player call sites constrain asset choices, so this review does not establish arbitrary unbounded path growth.

Validation: slow direct startup, replacement before soft deadline, fallback failure followed by original-route restoration, shared warm requests, ignored abort during fetch/compile, late completion after destroy.

### 2. Play verification and recovery are a shell-owned transaction

Evidence: `src/unified-player.ts:1853`, especially bounded-trial selection at `:1867` and original-route retry at `:1893`; compare `src/internal/machine/playback.ts` and `route-recovery.ts`.

Already owned: play intent IDs, retirement/capacity, operation identity, typed backend effects, route eligibility, and the pure `recoveryRoute` selector.

Outside: choosing the 1,500 ms output trial, interpreting inconclusive startup versus incompatibility, selecting fallback, deciding to restore/retry the original route, and pausing after final failure. Trial position and verification status survive awaits only in the method closure. The playback core tracks intent identity, not these phases.

Recommended: an explicit play-attempt transaction that accepts normalized output/failure facts and returns verify, select, restore-position, retry, pause or complete effects. Preserve synchronous play invocation for user activation.

Validation: play then pause during verification; inconclusive output versus codec failure; fallback fails while the old source survives; close during original-route restoration.

### 3. Seek admission and compensation remain outside the seek owner

Evidence: `src/unified-player.ts:1905`, with source/range/window checks at `:1914` and compensation/fallback at `:1921`; compare `src/internal/machine/playback.ts` and `player-readiness.ts`.

Already owned: seek IDs, latest-seek retirement, operation queue and presentation readiness.

Outside: validating the target against the current source/range/seekable window; recording previous position/intent; choosing restore-position, resume, reject or route fallback after a presentation-boundary failure. General seek failure handling also chooses retry policy using error categories and message matching in the adapter.

Recommended: pure admission from captured seekable facts, followed by a seek transaction with target, prior position/intent, session and phase. Error normalization may remain at the boundary; recovery policy should consume normalized facts.

Validation: changing seekable windows before execution, superseded seek, restore failure, paused versus playing compensation, close or replacement during rollback.

### 4. Fault detection is pure, but fault response is only partially owned

Evidence: `src/unified-player.ts:447` (`sampleWatchdog`), `:873` (`observeBackend`), `:1693` (`recover`); compare `src/internal/machine/player-monitor.ts` and `route-recovery.ts`.

Already owned: monitor eligibility, progress/inactivity detection, fault/session identity, duplicate recovery suppression and route-start selection.

Outside: choosing recovery versus pause/error publication, compatibility versus terminal handling, the pause-before-selection sequence, and handling a failed replacement's fault. `RecoveryState.pending` records identity but not the recovery phase or selected response. Some track-policy violations also initiate pause/error directly in the backend listener.

Recommended: normalize backend/watchdog/track-policy faults into a response decision; extend recovery with explicit phase/outcome effects. Keep original Error objects and browser observations outside.

Validation: automatic versus pinned mode, duplicate faults, terminal source failure, pause failure, replacement fault, and late fault after close.

### 5. Some settings-driven route transactions bypass the setting decision layer

Evidence: `src/unified-player.ts:1721` (`setAutomaticSelection`), `:1761` (`setMode`), `:1777` (`setAudioGain`); compare `src/internal/machine/settings.ts`.

Already owned: accepted automatic/mode/gain values, source replacement acceptance, ordinary gain apply/rollback, and filter/track/range/loop transactions.

Outside: gain's choice between direct application and route replacement; evidence refresh after direct gain changes; automatic-selection rollback held in a local `previous`; and mode-change orchestration that disables automatic selection. Storing the final value in state does not represent the transaction deciding when it is accepted.

Recommended: extend setting/source command planning to produce direct-apply, route-change and evidence-update effects, with explicit acceptance/rollback where needed. Reuse existing source transactions rather than adding a second replacement owner.

Validation: remux gain requiring replacement, direct gain failure, route failure, same-mode pinning, and cancellation while enabling automatic selection.

### 6. Track confirmation has a separate adapter-owned readiness policy

Evidence: `src/unified-player.ts:583` (`confirmTrackSelection`), especially its five-second timeout at `:602`; compare `src/internal/machine/settings.ts` (`track.verify`) and `player-readiness.ts`.

Already owned: selection transaction, requested track and operation lifetime. The core requests verification.

Outside: the auto/off/selected matching rule and confirmation success/timeout decision. They are held in a listener closure with a local settlement flag; the core receives only the final success/failure.

Recommended: pure track-match facts and a confirmation lease/deadline within the readiness or settings owner. Listener registration, timer handles and once-only Promise settlement remain physical adapter work.

Validation: requested track never becomes selected, unrelated track events, off/auto rules, timeout versus abort, synchronous listener reentry and stale session events.

### 7. Promotion owns its coarse phase but not each candidate attempt

Evidence: `src/unified-player.ts:267` (preferred-plan loop); compare `src/internal/machine/route-promotion.ts`.

Already owned: scheduling deadline, eligibility, cancellation lease, queued/inspecting/trying phases; `preferredPlans` and `promotionPlanAllowed` already provide pure selection helpers.

Outside: which candidate is currently being attempted, advancing after compatibility failure, and stopping after another failure category. Those decisions live in the asynchronous loop while promotion state remains `trying`.

Recommended: lower priority than play/seek recovery. Add a candidate cursor/attempt outcome only if full promotion replay is required; reuse the existing discovery attempt machinery and pure helpers. Physical iteration alone is not the gap—the failure-dependent next-attempt decision is.

Validation: first candidate incompatible then second succeeds, non-compatibility failure stops attempts, cancellation between candidates, accepted-source change during promotion.

## Adapter follow-up

`src/internal/shaka-backend.ts:207` already uses a pure quality plan and control lease, but its configure/select/verify/restore sequence remains a local try/catch. If backend compensation must be replayable at the same granularity, move phase and normalized success/failure decisions into the existing Shaka owner. Third-party configuration objects and configure calls should remain physical. This is a narrower backend transaction follow-up, not evidence that Shaka lacks a state machine.

`src/internal/private-software-player.ts:168` supplies a locally calculated output deadline to `privateSoftwareWait`. Readiness and deadline comparison are already pure; this should not be described as an entirely unmigrated wait. Capturing its start/deadline in the owner would improve full replay, but is lower priority than the missing multi-step Player transactions above.

## Boundaries that should remain outside

- DOM/video/canvas, backends, workers, promises, callbacks, timers, controllers, native pointers, raw frames/audio/bytes and compiled modules.
- Maps associating pure IDs with those physical objects; final Promise settlement and cleanup error aggregation.
- Host observation capture and normalized failure facts. Current-state rechecks around reentrant host calls remain necessary even after decisions move into the core.
- Constructor configuration and static argument validation do not automatically require mutable state-machine domains.
- Existing operation/source/settings/boundary/resource domains, Native controls/load/captions, private-software readiness, and Shaka quality/selection plans should be extended rather than replaced.

## Recommended order and qualification

First capture behavioral fixtures for play/seek recovery and settings-driven replacement. Then move their decision sequences and fault responses into existing owners. Complete startup speculation/module ownership and track confirmation next; promotion/backend compensation granularity follows.

These are architectural ownership/replay gaps, not newly reproduced user-visible bugs. The recent public simulation improves adapter interaction evidence but explicitly excludes route construction, automatic fallback and browser watchdogs; its passing results do not qualify the recovery branches listed here. No builds, tests or production edits were performed for this review. The pre-existing startup retained-field audit gaps remain separate from this behavioral inventory.
