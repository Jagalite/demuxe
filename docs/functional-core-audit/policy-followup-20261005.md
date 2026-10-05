# Policy follow-up source review

This review covers the five remaining policy groups in `../FUNCTIONAL-CORE-AUDIT-20261005.md` and the pre-existing fast-recovery changes. It supplements the retained-field annotations; it is not native-memory, endurance or release qualification.

## Reviewed source changes

- `async-policy.ts`: immutable scalar attempt cursor and wait lease. Candidate count is the finite input list, not a universal provider-count bound. Wait kinds have fixed budgets; identity mismatches and terminal observations do not mutate state. Ready at or beyond the deadline times out. No clock, callback or host object enters the core.
- Preview controller/images/Shaka preview: snapshot candidate lists for each admitted operation; pure cursor chooses advancement and exhaustion, pure metadata/exact-result helpers select acceptance. Original job/signal/source fences remain around awaits and host observations. Provider objects and encoded payloads remain in adapters. Attempt state is local to the existing job/acquisition lifetime and retains no additional global work. URI identity is positional, fixing premature exhaustion for repeated URIs.
- Preview caller: one scalar deadline joins the existing caller ID; timer callbacks consult identity and sampled time. Once-only Promise settlement and physical timer/listener cleanup remain adapters. Pregeneration failure outcome shares the strategy-specific foreground interval with admission. Local preview waits use immutable wait state; metadata dimensions/duration/seek target use normalized facts. Each media wait has one timer and one listener set, cleaned on all terminal outcomes.
- Private Software: output waits belong to the existing policy root, bounded to 128 identities. Start captures generation and deadline; source start/close removes authority and finalization removes the matching wait. Polls and predicates remain physical observations. No new class storage was added.
- Shaka quality: one transaction in the existing control root contains detached policy, plan, lease and phase. Shaka configuration remains a borrowed rollback payload in the active adapter call. Only the active physical effect owner may restore configuration, including after logical supersession while its successor is queued; retired source/closed owner cannot restore. Logical commit requires current request authority. Rollback failure preserves both errors. A failure in observation after commit no longer restores physical configuration behind the accepted core policy.
- Wasm: existing lifecycle root contains two bounded handshake records and a physical-release failure flag. Timers and the destroy resolver remain existing adapter receipts. Initialization/retirement deadlines and late/duplicate completion decisions are pure. Native cleanup timeout requests containment but does not mark resources released. All cleanup actions are attempted independently; a failed physical release leaves the lifecycle retiring with `releaseFailed`, while the joinable destruction promise rejects.
- Both packaged workers: existing control root contains four fixed handshake slots (I/O open, I/O close, decoder, native thread join) and one monotonic serial. Parent handshake identity is distinct from child I/O request identity. Timer closures contain only the admitted ID, callbacks and timer handle. Decoder ready/error distinction is pure; late decoder messages after timeout/close cannot resume work. Close acknowledgment and thread deadlines authorize containment, not proof of successful native release. Existing worker handles/resolver slots and sample buffers retain their prior physical roles.
- Packaging: the explicit beta worker-helper inventory now includes `async-policy.js`; public generated imports also include it transitively. No native binary or historical worker generator was changed.

## Pre-existing stale annotations

For all eight pre-existing changed sources, the frozen hashes exactly match their contents at `fd4dc89e^`. The diff from that revision through `c5e501c6` was reviewed before refreshing annotations. `playback-deadlines.ts` is the additional new pure source.

The changes add sampled Firefox/local/route facts, pure fast-recovery budget selection, configurable watchdog defaults, and inconclusive-output classification. Native/Player adapter fields retain their prior physical or pure-root classification; no new persistent adapter fields were added. Browser observations remain rechecked against session/operation authority. Backend/types changes are signatures and documented defaults. The new deadline module contains only constants, a scalar fact type and a deterministic predicate. Existing guarded property-map writes retain the same finite key domains.

## Indexed-write review

The 15 affected indexed-write records were matched by file/scope/expression to their prior reviewed records, then checked at their current source locations. There are no new expressions:

- Native track array selection writes a captured browser track list.
- Private Software asset keys are the fixed manifest/player companion names.
- Wasm tags remain bounded metadata scratch output (128 visited entries, truncated keys/values).
- Watchdog options use the fixed validated option-key list.
- Preview metrics use the fixed metric names and finite nonnegative values.
- Player deployment availability uses the finite runtime set; provider rejections use admitted plan IDs.
- Worker PCM, frame bytes and metadata writes are bounded physical sample/ABI copies; software profile indexed writes update diagnostic counters only.

Updated hashes are limited to these reviewed source files and their existing annotations. The fresh scanner/classifier is rerun after the review; no syntactic classifier result is treated as a proof of complete behavioral purity. Source, simulated adapter, browser smoke and package/native qualification remain separate evidence layers.

## Preview cleanup review correction

Reviewed the local media-wait cleanup correction in `src/preview/providers.ts`: the wait remains terminal before release to fence reentry, while all four independent timer/listener removals are attempted. Cleanup failures reject successful readiness; setup/action failures retain their original error. The scratch error list is bounded by four release actions and creates no retained adapter authority. The outer provider finally still releases the media resource and cleanup receipt. Eight regression sequences cover each throwing release after synchronous readiness or action failure, including late readiness/abort callbacks. The readiness regression fails against the pre-fix generated source with an unsettled promise.

## Adversarial coverage follow-up

Reviewed the remaining-policy adapter boundaries after commit `3c1be98a`. Added 24 deterministic adversarial tests across the maintained remaining-policy, Wasm lifecycle, private-software state and Shaka adapter suites:

- Preview acquisition: deadline during timer registration, cancellation during each listener registration, late handle release, and no source assignment after retirement.
- Preview release: independent pause/source reset/load/URL revocation failures; throwing host cleanup-receipt registration must still release media and settle the offered receipt.
- Wasm: actual readiness immediately before/at/after the deadline without firing the timer, early-timer rearming, stale timer callbacks, and destruction acknowledgment before/at containment deadline with exactly one physical cleanup.
- Private Software: predicate throw, abort, source replacement, deadline crossing and success; every outcome releases wait capacity and admits a successor.
- Shaka: selection and verification exceptions restore configuration, clear transaction ownership, and permit a succeeding quality change.
- Both production worker interpreters: early deadlines, readiness at each handshake deadline, duplicate callbacks and superseded decoder errors.

Pre-fix probes failed for timer-acquisition retirement, late abort-listener registration, and three interrupted media-release sequences. The adapter now releases late-acquired handles, checks retirement between registrations, attempts every final release, and includes host receipt registration inside the resource lifetime. No new persistent fields or core authority were added. Local release-error arrays are bounded by four actions. These are deterministic fault-injection and simulated adapter checks, not browser/native concurrency or endurance qualification.

Validation: 140 affected-suite tests passed; the full unit gate passed 3,405/3,405 (`results/api-stability/gate-unit-all-node-1791232047213`). TypeScript compilation, static core boundaries and source ownership classification passed (895 supported fields reviewed; zero changed sources or pending indexed writes). Browser/native runtime checks were not rerun for this follow-up.
