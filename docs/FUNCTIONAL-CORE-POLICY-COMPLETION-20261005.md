# Remaining policy migration — 2026-10-05

Implemented the five policy groups identified in the follow-up audit. Changes are local and uncommitted; native binaries were not rebuilt.

| Area | Core ownership added | Physical boundary |
| --- | --- | --- |
| Preview candidates | Positional attempt cursor, deferred/exhausted outcome, scalar result and exact-result admission | Providers, URIs, fetch, bytes, images and rasterization |
| Worker lifecycles | Initialization, I/O open/close, decoder readiness/error, thread-join and containment deadlines; stale/duplicate observations; physical release failure | Workers, messages, timers, native teardown and AudioContext closure |
| Shaka quality | Configure/select/verify/commit/rollback phases and rollback-failure outcome | Shaka calls and the saved configuration payload |
| Preview scheduling | Strategy-specific foreground cooldown outcome, caller deadline identity, media readiness deadline and metadata/seek plan | Timer/listener registration, media element observations and rendering |
| Private Software | Generation-scoped output wait identity and deadline, 128-wait bound and retirement | Polling, clock capture and physical readiness observations |

Existing owners compose the small pure helpers in `machine/async-policy.ts`. The public generated dependency closure and explicit beta worker helper list include that module.

The duplicate-URI regression is fixed: `[A, B, A]` now reaches B after the first A fails. A saved negative-control probe passes against current TypeScript and fails against `c5e501c6` at the expected candidate-sequence assertion.

Quality rollback preserves an important ordering rule: a logically superseded operation may restore its physical configuration while it still owns the execution slot, before the queued successor runs. It cannot commit the retired request or restore after backend closure. A later observation failure after successful commit does not silently revert the physical configuration behind the accepted policy. Failed rollback retains both errors.

Deadlines now compare sampled time in the core, including ready exactly at the deadline. A timeout requests containment; it never proves physical release. Wasm destruction attempts all cleanup actions even after a failure and leaves `releaseFailed` recorded if physical cleanup fails. I/O close callbacks carry the worker identity, preventing an old worker acknowledgment from settling a successor's close.

## Tests and sequences

`tests/api-stability/remaining-policy-sequences.mjs` is registered in the maintained core gate. It covers 192 ordered wait histories (24 permutations for each of eight wait kinds), 24 quality event/retirement permutations, stale candidate indices, duplicate URIs, source replacement, bounded private waits, foreground boundary times, exact-result admission, real adapter cancellation, worker timer interpretation and old-worker acknowledgment fencing. Separate Shaka adapter regressions cover rollback rejection and post-commit observation failure. Existing reentry and ownership suites remain part of the full gate.

Test fixtures that inject synchronous deadlines now advance the fake clock to the deadline. The failed-containment assertion now requires explicit retained failure rather than reporting a successful close. These changes preserve the exercised schedules while checking the new ownership contract.

The source scanner and classifier report 895 supported fields reviewed, zero changed sources and zero pending indexed writes. The eight pre-existing fast-recovery changes were compared with the exact frozen source revision before annotations were updated. The review and bounds are documented in [the source-review receipt](functional-core-audit/policy-followup-20261005.md).

Validation receipts are in `results/functional-core-migration-20261005/`. The final unit-gate result and consumer type-check status are recorded in `summary.json`.

Browser smoke used the local source runtime in T3's Chromium browser. Local video previews produced 160×90 encoded frames at 0, 1 and 2 seconds. Both Software and Hybrid initialized, opened the example file, completed a seek request/restart event and shut down. Their immediately sampled position remained zero, so this is not target-position or advancing-output evidence. Four served asset hashes match the local generated/worker files. This is not an installed-package, cross-browser, endurance or performance qualification.
