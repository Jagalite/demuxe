# API roadmap review and implementation plan

Review date: 2026-09-27. Original status: preparation only. See the implementation update below for subsequent work.

Reviewed input: `Demuxe-API-Review-and-Roadmap.md`, SHA-256 `5dd8c7150b34d974d68d0b23b3348c38039f8940f7602b7f773517d96b27a663`.
At the initial review, both its pinned baseline and checkout HEAD were `e7a8d02d126e381b50af9836b202f3d5186082ea` (`0.3.0-beta.4`). The working tree also contains existing watchdog/API/backend/generated-output changes and research files. Those are not part of this plan's changes. Recheck their state before implementation; do not reset or stage them incidentally.

## Assessment

Adopt the roadmap's architecture and overall sequence. The public-boundary findings are supported by current source. The proposal is suitable as a direction, but its later phases need explicit contracts before they become implementation tickets. Competitor references are design context; this review makes no new claims about those products.

### Findings that affect implementation

| Priority | Finding and current evidence | Implementation consequence |
|---|---|---|
| First slice | `Player.preview` is a `PreviewController`; it exposes `setSourceIdentity`, `setDuration`, `setSuspended`, `drain`, and `destroy` (`src/unified-player.ts:55`, `src/preview/controller.ts`). The component's scrubber also types the full controller (`src/player/preview.ts`). | Introduce an actual wrapper, keep the owned controller private, and update component types. A TypeScript-only narrowing does not establish the runtime boundary. |
| First slice | `modechange` and `selectionchange` are emitted, but absent from `PLAYER_EVENTS` / `PlayerEventMap` (`src/types.ts:178`, `src/unified-player.ts:679`, `:764`, `:770`, `:776`). | Add distinct payload types. Do not add the names to the existing mapped type without excluding them from snapshot events. |
| Contract decision | New-source acceptance happens inside `replace()`, after readiness and optional target seeking; caller cancellation detaches at acceptance (`src/unified-player.ts:631–764`). `select()` and `replace()` already carry optional targets. | Thread `startTime` through candidate selection and every retry before acceptance. Calling public `seek()` after `open()` would violate transactional replacement. Audit the existing readiness-at-zero check for live windows before widening support. |
| Contract decision | Subtitle assets clear on new-source acceptance and close; fonts survive those operations and clear on destruction (`src/unified-player.ts:754`, `:1375–1397`). | Revise the proposal's universal source-replacement invalidation rule. Preserve player-scoped font lifetime and use source-scoped subtitle handles, unless a separate breaking migration deliberately changes font retention. |
| Contract decision | Shaka's active variant and variant list are observable; the current adapter publishes them as diagnostics and derives selected video from them (`src/internal/shaka-backend.ts:194–202`, `:254`). | Distinguish requested policy, backend-selected variant, and presented-quality observation. Do not label an active variant as already presented while old media may remain buffered. |
| Sequencing | `inspectFastSource()` already has budgets and explicit incomplete results, but is designed around routing facts and sufficiency (`web/fast-source-inspector.js:636`). | Reuse parser/I/O machinery behind an inspection adapter. Do not expose routing status such as `qualified` as a claim of exhaustive metadata or supported playback. Chapters/artwork/tags need separately established coverage. |
| Compatibility | `open()` accepts arbitrary objects through the remote-source branch; a plain `Blob` currently reaches URL validation (`src/unified-player.ts:1118`). | Blob support needs input normalization and an audit of File-specific inspectors, readers, workers, providers, and filename/demuxer hints. Widening the type union alone is insufficient. |
| Documentation | Native ASS defaults to automatic-selection policy; embedded mpv subtitles default on (`src/unified-player.ts:262–263`). The public API still contains opt-in Native ASS wording (`docs/PUBLIC-API.md:378`). | Publish exact conditional defaults and classify options without changing routing behavior. Include the current watchdog additions when their integration state is settled. |
| Documentation | Output dimensions reject widths above 1920 or heights above 1080 (`src/unified-player.ts:49–50`); software decode resource policy is separate (`src/types.ts:25`). | Clarify both limits. Do not relax either as part of contract cleanup. |

Line numbers describe the reviewed working tree and may move.

## Proposed contract decisions

These were the reviewed implementation defaults. Current implemented contracts and limitations are in [API-EXTENSIONS.md](API-EXTENSIONS.md).

### Player-owned previews

Expose `PlayerPreview` with `getFrame`, `request` (including refinement callbacks), `prefetch`, `addProvider`, `setProviders`, `clear`, `enabled`, and a read-only diagnostics snapshot. Preserve current signatures initially. `clear()` explicitly cancels pending preview requests and evicts cached frames; document that effect.

Keep `setProviders` for compatibility with existing provider-control consumers and `tests/preview-software.mjs`. It changes the preview lane, not playback ownership. `addProvider()` continues to return an idempotent removal function. Keep standalone `PreviewController` exported for applications owning an independent lane.

Hide source identity mutation, duration mutation, playback-pressure suspension, drain, and destruction from `player.preview`. Use a stable wrapper object with closures over the controller, not a cast or a proxy forwarding arbitrary members. Preserve `enabled` assignment while preventing replacement of the facade's methods. Player internals must call the owned controller directly. Treat removal of previously accessible owner methods as an intentional API migration and document it.

### Events

Define `ModeChangeDetail` as a discriminated union of the actual loading, ready, and failed payloads. Define `SelectionChangeDetail` from the actual attempt contract, including optional fields where emitted. Preserve runtime payload shapes in the first patch; retain the generic event-listener overload for compatibility.

Keep snapshot events separately enumerated so state publication cannot accidentally dispatch routing events with snapshot payloads. The component currently registers listeners over `[...PLAYER_EVENTS, ..., 'modechange', 'selectionchange', ...]` (`src/player/index.ts:295`): deduplicate or remove the explicit entries when expanding `PLAYER_EVENTS`, and test exactly one forwarded event per core event. Audit `inspectionchange`, preparation, and legacy `mpv` events for a follow-up typed surface; do not describe typing two routing events as complete coverage of every emitted event.

Specify ordering against subscriber-observed state. Loading refers to a candidate, not the accepted source. Ready can also occur for a configured mode before any source opens. Failed must preserve rollback semantics and redaction. Do not change cancellation, event ordering, or error behavior merely to fit a type.

### Statistics

Split phase 1 into schema/measurement definitions and a subsequent implemented statistics slice. A published type alone does not provide statistics.

For each field, record unit, observation point, scope, reset rule, and availability. Start with source/session identity, operation timings, and observable buffering transitions. Distinguish open-to-acceptance from first presented frame; count rebuffering only after playback begins and exclude pause/seek/initial startup as defined by the contract. Use monotonic clocks and bounded aggregate state. Add frame/throughput metrics only where adapters can establish their meanings. Route switches need explicit counter epochs or documented continuity. Never turn an unavailable backend value into zero.

### File and streaming controls

- Initial position: finite nonnegative seconds; reject invalid input before candidate work. First qualify finite seekable VOD. Reject targets outside established playable bounds before acceptance; specify tolerance without promising frame accuracy. Defer live start offsets until live-window semantics are explicit. Preserve prior playback on failed/cancelled replacement.
- Subtitle delay: positive means later. Store requested policy separately from effective support. Retain the user setting across close/open; reject unsupported routes and block fallback that cannot preserve it. Reset both timeline and renderer scheduling on seeks and transitions. Plain text, ASS, bitmap, and embedded/external paths require distinct evidence.
- Attachments: add handle-returning APIs while retaining `addSubtitle()` / `addFont(): Promise<void>` wrappers. Source-scoped subtitle handles survive eligible route switches and expire on replacement/close. Player-scoped font handles survive close/open and expire on destruction/removal. Selected-subtitle removal should turn subtitles off only when policy allows it; otherwise reject without mutation. Removal must preserve unrelated IDs, enforce locked/allowed track policy, and invalidate renderer caches safely.
- Metadata: distinguish unknown inventory from an observed empty inventory. Chapters need source-scoped identity, deterministic ordering, and explicit incomplete coverage. Preserve reported versus verified color/HDR meaning. Artwork extraction needs separate byte/dimension limits.
- Quality: separate requested policy, backend selection, and presented observation (nullable). Keep source authorization and existing ceilings/pins binding unless an explicit contract permits changing them. Filter variants against accepted audio policy; do not silently change language/roles/channels. Account for manifest refresh and discontinuities when mapping IDs. Reject constraints a fallback cannot honor.
- Live navigation: ask the backend for its recommended playable live position; do not seek blindly to `seekable.end`. Define near-live tolerance and observable latency provenance. Existing live permission remains mandatory.

## Delivery sequence

The original rows below were proposed as reviewable slices. The user subsequently authorized all five phases; the current implementation status is recorded below.

| Slice | Scope and source touchpoints | Completion gate |
|---|---|---|
| 1A | Preview facade: new wrapper module; `src/preview/controller.ts`, `src/unified-player.ts`, `src/player/preview.ts`, public exports; `docs/PREVIEWS.md`, `docs/API-MIGRATION.md`. | Typed and JavaScript callers cannot access owner controls through the facade; useful preview operations and standalone controller remain compatible; close/destroy still await cleanup. |
| 1B | Routing event detail types, exports, listener inference, event documentation. | Consumer type assertions plus runtime event-order, failed-replacement, cancellation, stale-candidate, and redaction checks. |
| 1C | Option/default/stability table and decode-versus-output limit documentation. | Each documented default traced to constructor/normalizer behavior; no route-policy change. |
| 1D | Statistics contract, then a minimal implemented observation set using the existing state/operation owners. | Units/resets/nullability defined; deterministic lifecycle checks; no unbounded history or backend diagnostic casts masquerading as stable measurements. |
| 2A | Transactional `startTime`; extend existing `select`/`replace` target plumbing. | Applicable Native/Hybrid/Software VOD paths, failed replacement, fallback, abort, invalid/out-of-range targets, retained intent. |
| 2B | Metadata and chapters via parser/backend adapters and normalized state. | Known/unknown/incomplete inventories, stable IDs, missing tags, reported color facts, source replacement. |
| 2C | Subtitle delay, then attachment handles/removal as separate changes. | Renderer-specific timing and route retention; policy-safe selected removal; teardown and font-cache ownership. Audio delay/style follow independently. |
| 3A | Runtime quality policy/list/backend selection, then presented-quality observation where supported. | Audio-policy preservation, refresh/discontinuity IDs, pending transitions, source constraints, unsupported fallback. |
| 3B | Live navigation/state over Shaka. | Moving DVR windows, latency unknowns, recommended live target, permission and cancellation. |
| 4A | Blob normalization; standalone inspection after metadata result design. Blob can be moved earlier as an independent slice if the File audit is small. | Bounded memory/I/O, incomplete results, cancellation, no audio/session creation for inspection, local/remote policy separation. |
| 4B | Custom source adapter contract and implementation. | Safe integer bounds or explicit large-offset model, short reads/EOF, max in-flight/bytes, provider ownership, cancellation/late completion, worker bridge, route eligibility, authorization guarantees. |
| 5 | Presentation integration, loops/ranges, snapshots, frame stepping as independent features. | Per-route/browser output and lifecycle evidence. Specify gesture/global ownership, subtitle composition, snapshot taint/fidelity, EOF/loop endpoint and stepping limitations before coding. |

Framework integration, DRM, offline, casting, and processing/export remain separate product decisions. Do not bundle them into these changes.

## First implementation patch: concrete checklist

1. Refresh `git status`, HEAD, and the overlapping watchdog diff. Use the settled integration base, or explicitly isolate the patch without losing the existing changes. A clean worktree at HEAD would omit the uncommitted work and must be labeled accordingly.
2. Add and export `PlayerPreview`; keep `PreviewController` export. Introduce private owned-controller storage and a stable public wrapper. Replace all internal owner calls (source acceptance, publish/suspension, close/drain, destroy).
3. Update `ScrubberPreview` and any component-facing preview declarations to consume the facade. Search all `player.preview` consumers, including tests, examples, and docs.
4. Add meaningful ownership tests: owner methods absent at runtime; negative TypeScript access assertions; enabled/provider/cache controls still work; pending requests settle on close/destroy; old source results cannot publish into a replacement source. Keep standalone controller tests.
5. Add migration notes and current public examples. Generate declarations through the normal build; do not hand-edit generated files.
6. Review only this patch's diff and record commands, environment, fixture identity, and failures. Do not stage unrelated generated or research files.

## Validation plan (not executed)

For 1A/1B, start with `npm run build`, targeted compile-only public-consumer assertions, then:

```sh
node --test tests/preview.mjs tests/preview-pregeneration.mjs tests/preview-range.mjs tests/public-api-state.mjs
node tests/public-api.mjs
node tests/preview-browser.mjs
node tests/preview-ui.mjs
node tests/preview-options-browser.mjs
node tests/preview-software.mjs
node tests/preview-shaka-browser.mjs
node tests/player-component.mjs
```

Run the supported alternate browser coverage where the harness exposes it. Check required runtime assets and fixtures first. The existing `tests/public-api-consumer.mjs` is a package/install/browser suite, not a lightweight type-only test; reserve it for the package gate and add focused type assertions separately. Validate declarations and runtime exports together. Regeneration writes into `web/generated` and license stamping may touch other outputs, so inspect generated changes before staging.

For later slices, add focused tests to track-policy, Shaka/network, file/range-reader, inspection, and route-specific browser suites as appropriate. Exercise idle/configuration, acceptance, failed replacement, route switch, cancellation, concurrent controls, close/open, destruction, unknown facts, and redaction. Passing mocked or Node contracts does not qualify browser playback. No CPU benchmark is needed to establish a type/facade cleanup.

## Current implementation status — 2026-09-27

The user authorized all five recommended phases after the original preparation review. All rows now have implementations with explicit route and resource bounds. No DRM, offline, casting, editor, transcript, secondary-subtitle system, second playlist owner, or framework dependency was introduced; those were deferred or optional in the supplied roadmap.

| Slice | Implemented surface | Evidence / limits |
|---|---|---|
| 1A | Runtime `PlayerPreview` facade, private owner, component types, exports, migration. | Consumer type/runtime checks and existing preview browser suites. Standalone controller remains available. |
| 1B | Typed routing/selection event details; component forwarding deduplicated. | Consumer inference/negative type checks and public lifecycle regression suite. |
| 1C | [Option/default/stability table](API-OPTIONS.md), corrected component defaults, separate source/presentation/resource limits. | Traced to constructor and policy normalizers; limits unchanged. |
| 1D | Frozen source/session statistics and structured playback explanation with redacted admission codes. | Deterministic observation/reset tests. Unobserved frame/throughput values remain null. |
| 2A | Transactional finite-VOD `startTime`. | Native, Hybrid, Software browser acceptance and failed replacement. Live offsets reject. |
| 2B | Richer observed tracks, tags, color facts, bounded chapters, source-scoped chapter navigation. | Real chapter/tag MKV plus normalization tests. Unknown backend inventories stay null. |
| 2C | Subtitle/audio delay, plain-text style, opaque subtitle/font/URL-track handles and transactional removal. | mpv route persistence, unsupported Native rollback, independent attachment identities. Fonts retain player lifetime. |
| 3A | Runtime Shaka qualities, auto ceilings/manual pins, selected and observed quality state. | Real adaptive fixture plus policy tests; audio constraints retained. Presented identity remains unobserved/null. |
| 3B | Shaka `seekToLive`, observed DVR window, near-live/nullable latency. | Real permitted dynamic EVENT navigation plus existing live-window lifecycle tests. |
| 4A | Blob input and standalone bounded file inspection. | No inspection-created playback worker/audio session; byte/read budgets and incomplete metadata explicit. |
| 4B | Immutable callback source contract, serialized bounded reads, short-read/EOF/identity checks, ownership/cancellation. | Node and browser contracts. Playback stages at most 32 MiB into a File; callbacks do not cross worker boundaries. Large/lazy/forward-only playback remains outside this contract. |
| 5 | Fullscreen, video/document PiP, explicit Media Session owner, output sink retention, loops/ranges, snapshots, mpv stepping. | Route-specific browser lifecycle tests. Temporary PiP documents never own the playback worker tree. Capture/stepping/presentation restrictions are explicit. |

See [the roadmap validation report](../results/api-roadmap/20260927/README.md) for commands, observed outcomes, hashes, and remaining qualification limits. [API-EXTENSIONS.md](API-EXTENSIONS.md) is the current application contract. The earlier [preview-only report](../results/api-preview-facade/20260927/README.md) remains historical evidence, including its component autoplay-test mismatch and Firefox software-harness variability.

Existing local work was preserved. The shared checkout advanced independently to watchdog commit `4576bba9d65cc35cc4a1462acb87e2465ae85924` during the work. This task issued no commit, push, deployment, or engine rebuild and makes no performance claim.

## Follow-on integration work

The original five phases are retained as historical implementation planning. The
committed API baseline is `f68c1b1b`; subsequent integration work is tracked in
[the integration ledger](API-INTEGRATION-LEDGER.md). This does not retroactively
change historical qualification or promote old illustrative names over the
implemented exports.
