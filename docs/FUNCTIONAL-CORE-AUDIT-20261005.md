# Functional-core follow-up audit — 2026-10-05

Reviewed revision: `c5e501c6205ead389db1513a614856b2c197a68c`. Tracked working tree was clean at audit start. This is an audit and review, not an implementation change.

The earlier answer understated the remaining scope. Five confirmed ownership-gap families remain in the inspected adapters, plus a stale ownership gate. One retry defect was reproduced against the current TypeScript method with synthetic physical dependencies. This is not an exhaustive semantic audit of all code or a browser qualification.

Implementation follow-up: the five groups below are now implemented, with sequence tests and refreshed ownership annotations. See [the completion receipt](FUNCTIONAL-CORE-POLICY-COMPLETION-20261005.md). Findings below preserve the pre-migration audit.

## Findings

### 1. Preview retry can stop before an available candidate — reproduced defect

`src/internal/shaka-backend.ts:104–120` chooses whether to continue by comparing the failed URI value with `thumbnail.uris.at(-1)`. Value equality does not identify the final candidate position.

With candidates `[A, B, A]`, if A fails and B would succeed, the first failure is treated as the final attempt. B is never requested. The source method does not deduplicate the list. This affects lists containing a repeated final URI; no claim is made about how frequently actual manifests produce them.

The audit probe extracts and transpiles the current `previewFrame` method, substitutes Shaka metadata, network and rasterization boundaries, and compares `[A, B]` with `[A, B, A]`. The former calls A then B and succeeds; the latter calls only A and rejects. Both destroy the preview network policy once.

Fix candidate identity by position, or explicitly deduplicate before admission. As part of finding 2, let a pure retry owner determine next/finish from a candidate index and normalized outcome. Preserve abort and source-retirement checks.

Evidence: `results/functional-core-review-20261005/source-probes.mjs` and `source-probes.json`. This reproduces the adapter control flow, not real networking or rendering.

### 2. Preview provider and image-candidate orchestration is still shell policy

Evidence:

- `src/preview/controller.ts:256–278`: provider iteration, `deferred` accumulation, unsupported/result rejection, exact-result acceptance, continue-after-error, and exhausted-list outcome are decided by the async method.
- `src/internal/shaka-backend.ts:104–120`: thumbnail URI iteration retries fetch and rasterization failures.
- `src/preview/images.ts:22–39`: authored-image URI iteration advances after URL, response, range, byte-budget or rasterization failure.

The existing `machine/preview.ts` owns job identity, cache/admission, active/pending work and decoder deferral. `machine/shaka-observation.ts` owns image-track choice. Neither represents these candidate cursors or the failure-dependent next-attempt policy. A failure counter is not a transaction owner.

Move provider/candidate identities, attempt phase, normalized outcome classification, exact-result admission and exhausted/deferred outcome into pure decisions. Provider objects, signals, URL resolution, byte acquisition, blobs and rasterization remain adapters. Pure functions are sufficient for scalar result checks; persistent attempt state is appropriate across asynchronous completions.

Validation needed: unsupported provider, invalid result, exact-request mismatch, deferred decoder, fetch versus raster failure, duplicate URIs, replacement between candidates, and abort during candidate completion. Do not let preview acquire playback-route authority.

### 3. Worker startup and retirement have unmigrated deadline transactions

Evidence:

- `src/internal/wasm-player.ts:83–86`: 60-second initialization timeout is selected and delivered in the constructor closure.
- `src/internal/wasm-player.ts:490–504`: 10-second destruction acknowledgment timeout controls when worker containment occurs and whether destruction rejects.
- `web/software-full-engine-worker.js:63–105` and `web/filter-retained-engine-worker.js:127–164`: I/O close acknowledgment waits 1.5 seconds; remote opening waits 20 seconds.
- `web/software-full-engine-worker.js:268–279` and `web/filter-retained-engine-worker.js:308–334`: decoder startup waits five seconds; the Hybrid closure also retains `ready` and `failed` and decides whether a worker error rejects startup or fails active playback.

`machine/wasm-lifecycle.ts` has lifecycle phases and pure deadlines for RPC requests/event waiters, but no initialization or retirement deadline. `machine/legacy-playback-worker.ts` has coarse init/ready/open/close/fail and command/pump ownership, but no decoder or I/O handshake deadline owner. The child I/O worker's own request state does not own the parent's handshake.

Move handshake identity, start/deadline, awaiting/settled/retired phases and timeout-to-containment/error decisions into the relevant existing lifecycle owners. Native cancellation, timer registration, message delivery, worker termination and actual release acknowledgment remain effects. Logical timeout must not imply physical release.

Validation needed: ready exactly at timeout, duplicate ready, close during initialization, late error/ready after timeout, acknowledgment after containment, and termination failure. No new browser leak or crash was reproduced by this audit.

### 4. Shaka quality compensation remains an adapter-owned transaction

`src/internal/shaka-backend.ts:207–223` uses a pure quality plan and control lease, but the shell owns configure → select → verify → commit and catch → restore-old-configuration. The old configuration lives only in the method closure; `machine/shaka-backend.ts` has no corresponding transaction phases or compensation outcome.

This is the previously documented unfinished migration, confirmed in current code. Move normalized configuration/selection results, commit/rollback decisions and compensation status into the existing Shaka owner. Keep the third-party configuration object behind an adapter receipt. Do not claim restoring configuration necessarily restores the previously active media variant.

Validation needed: configuration rejection, selection mismatch, retirement during provider calls, rollback rejection/throw, and failure after logical commit. This audit does not establish a new quality-selection regression.

### 5. Preview scheduling and waits are only partly owned

- `src/preview/controller.ts:67–69`: the catch path independently decides pregeneration `wait` versus `next` using deferred status, suspension and a hard-coded 500 ms foreground interval. `machine/preview.ts:86–89` already selects admission using 100 ms for the demuxe strategy and 500 ms otherwise. These are two separately expressed policy decisions; their different intervals are not by themselves proof of a bug.
- `src/preview/controller.ts:225–247`: caller timeout identity is guarded, but start/deadline is not represented in core state. A timer directly invokes cancellation; the core sees the resulting settlement/cancellation, not a deadline observation.
- `src/preview/providers.ts:22–35`: local-browser preview owns its 1.5-second media waits and metadata/seek/loadeddata progression. Dimension/duration admission and target clamping are also in the provider; LocalRemux repeats those admission/target decisions at lines 76–79.

`machine/preview-pregeneration.ts` already owns scheduling and interprets `next`/`wait`/`stop`, but receives an outcome chosen by the controller. Move outcome selection and deadline admission into pure helpers/owners. Reuse the current pregeneration/job domains; do not create a second independent scheduler. Capture browser observations as scalar facts; keep video elements, listeners and canvas operations outside.

Validation needed: each strategy near the foreground boundary, suspension during provider failure, timeout versus completion, source replacement during waits, and invalid media dimensions/duration. Callback cleanup and Promise settlement remain adapter work.

### 6. Private Software readiness deadline remains external to its owner

`src/internal/private-software-player.ts:168–176` chooses `performance.now() + 25000` and retains the deadline in an async closure. `machine/private-software.ts:45–46` receives the deadline and decides wait/ready/retired/closed/timeout.

This is a narrow replay-completeness gap, not an entirely unmigrated readiness implementation. Move wait identity and deadline creation into the private-software owner; retain polling, clock observation, timers and physical predicate sampling in the adapter.

Validation needed: source replacement, ready at deadline, close during polling, and consistent timeout precedence. This was already documented as a follow-up.

### 7. The frozen retained-state audit no longer passes on this revision

A fresh scanner/classifier run, written to a temporary output directory so the maintained inventory stayed untouched, reports:

| Result | Count |
| --- | ---: |
| Supported runtime fields with current reviewed annotations | 780 |
| Supported runtime fields whose source hash changed | 115 |
| Changed or newly unrecorded source files | 9 |
| Pending indexed-write reviews | 4 |
| Dormant fields reviewed | 67 |
| Historical/development fields excluded and pending | 225 |

The nine files are `src/internal/backend.ts`, `src/internal/machine/native-backend.ts`, `src/internal/machine/playback-deadlines.ts`, `src/internal/machine/player-monitor.ts`, `src/internal/machine/player-transport.ts`, `src/internal/native-player.ts`, `src/internal/watchdogs.ts`, `src/types.ts`, and `src/unified-player.ts`. Eight differ from their recorded hash; `playback-deadlines.ts` is newly absent from the frozen manifest. This supersedes the preliminary eight-file hash-only check, which could not detect additions.

Indexed-write reviews are pending in NativePlayer, watchdogs and two Player sites. These counts mean the old review is stale, not that all 115 fields are policy defects. Semantically review the changed paths and refresh annotations only after that review. Do not just update hashes to obtain a green gate. This behavioral audit does not approve every retained field in those files.

Detailed evidence is saved in `results/functional-core-review-20261005/{source-review-pending,supported-review-pending,pending-dynamic-writes}.json`.

## Reviewed boundaries and scope limits

The broad screen covered Player orchestration, Native/Shaka/Wasm/private-software adapters, preview controller/providers/images/pregeneration, presentation/consumer bindings, provider acquisition/runtime, and the packaged Software/Hybrid/I/O/retained-decoder workers. Detailed comparisons concentrated on the findings above and their corresponding machine owners. This is not a line-by-line review of every worker, remux helper, private engine, decoder or UI implementation.

The earlier seven primary Player policy migrations are present: transport play/seek phases, recovery, settings-driven routing, startup policy, track confirmation and promotion attempt ownership. Native remux audio-track rollback also calls the load owner (`track-failed`/`track-settled`); a local try/catch alone is not an ownership gap. Provider acquisition/runtime deadlines and request budgets already delegate to pure owners.

DOM and browser calls, sampled host facts, typed buffers, handles, callback/resolver maps, native allocations, physical cleanup and DSP cursors remain intentional adapter responsibilities. Static input validation and error normalization do not automatically require a state machine. Historical demo workers and dormant unqualified WebGPU paths are excluded as documented in `FUNCTIONAL-CORE-WORKER-SCOPE.md`.

## Validation and recommended order

- Static functional-core source guard: passed. This checks the pure directory; it cannot discover all policy left outside that directory.
- Fresh retained-field scanner: passed; classifier: failed with the counts above. The committed audit annotations were not modified.
- Nine existing focused test files: 143 passed, zero failed/skipped/cancelled. These import the existing generated runtime; no build was run, so this is supporting baseline evidence, not fresh package/source qualification.
- Current-TypeScript preview retry probe: confirmed the duplicate-URI defect under synthetic dependencies. The probe asserts the observed defective behavior for review; it is not a regression test asserting corrected behavior.
- No production source changes, full build, browser matrix, native endurance, performance run, commit or push.

Fix the demonstrated retry defect first. Then migrate preview candidate orchestration and worker handshake policy with targeted sequence tests, followed by quality compensation and the smaller scheduling/readiness gaps. Re-review the stale ownership inventory independently; a green storage inventory does not establish complete behavioral ownership.
