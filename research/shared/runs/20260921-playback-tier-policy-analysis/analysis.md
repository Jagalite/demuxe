# Playback tier policy feasibility

Decision: all three policies are feasible, with different implementation depth. Extend deterministic startup/fallback first; add event-driven promotion next; split background work into asset warming and, later, full candidate preparation. This is source analysis and existing unit-test validation, not a new browser/performance qualification. No production code changed.

## Current implementation evidence

- `src/unified-player.ts:593` discovers finite admitted plans in registry order, verifies startup and records failure evidence. `recover` at line 654 falls back only on classified compatibility failures, with direct-to-remux recovery before advancing modes. Transport, permission, identity and unknown errors are not codec fallback opportunities.
- `replace` at line 403 preserves source position and settings, maps selected track identities, builds a candidate, validates its actual plan, commits it and disposes the old session. Crucially, line 450 pauses the old backend before candidate creation. Rollback exists; uninterrupted background preparation does not.
- `setAutomaticSelection(true)` already explicitly reselects. Filter and tone-mapping setters invoke selection. Subtitle selection generally updates the active backend; `subtitleVisible(false)` does not generally promote Software/Hybrid to Native. Audio selection reselects only under specific existing conditions.
- `RuntimeCapabilities.begin` resets per-attempt records. Previously verified evidence is retained in a bounded map, but this is not a persistent failed-configuration cache. New promotion policy must not assume failed attempts are already suppressed across rediscovery.
- `enqueue` serializes player operations and caps pending operations at 32. It is unsuitable for a long speculative operation that must yield immediately to seeks, pause, track changes, open and close.
- `EnginePreparation` caches/deduplicates immutable Wasm modules and font bytes without media workers or audio devices. Its public player entry currently avoids preparing when a source or operation is active. In-play warming needs an explicit lifecycle change; compilation and fetching are not zero-cost background work.
- Candidate surfaces start with `display:none`. Native output verification can depend on playback/presentation. A muted hidden candidate is not automatically a verified audible/visible replacement.

## 1. Startup selection and failure fallback

Feasibility: high; most machinery exists.

Add a finite Native-remux-plus-mpv-subtitle plan with accurate component ownership, prerequisites, runtime asset/loading behavior and execution-plan identity. Existing `native-*-ass` external-libass plans must not be mislabeled as the new mpv subsystem. Route only when browser A/V and selected subtitle requirements can be preserved. Keep WebCodecs Hybrid as an independent capability path: a WebCodecs HEVC rejection must not veto HTMLMediaElement HEVC decoding.

Use cheap source inspection/capability rejection before expensive engine startup. Persist stable incompatibilities per source/configuration; scope keys to selected codec initialization, tracks, presentation requirements, deployment and plan. Invalidate when relevant inputs change. Keep network/authentication/source-change errors distinct. A startup deadline is not proof of incompatibility.

Dependencies for the new subtitle plan remain bounded source transport, font/track lifecycle, seek epochs, geometry, cleanup and qualified output. Failure policy alone does not complete that route.

Acceptance: exact expected plan for qualified sources, no forbidden feature loss or lossy adaptation, useful rejection reasons, bounded startup/cleanup, and rollback on candidate failure. Preserve existing explicit mode pinning.

## 2. Event-driven promotion

Feasibility: medium; reuse selection and replacement, add policy and event coverage.

Reassess after a meaningful requirement change: subtitles disabled or deselected, filters removed, tone mapping disabled, compatible audio selected, or explicit return to automatic mode. Enabling a required feature that the active route cannot provide is a required transition; disabling a feature is an optional optimization. Treat them differently.

Apply the requested setting to the accepted session first where safe. Determine whether another admitted plan is actually preferable. Do nothing when the accepted plan remains best. Coalesce rapid setting changes, attempt at most once per eligible configuration, and back off after a failed optional promotion. Do not switch merely because volume, mute or the playback clock changed.

Optional promotion failure must preserve the setting the user just requested and healthy playback. Manual mode remains pinned until the user enables automatic selection. Hidden captions and deselected captions have different track semantics and require separate tests.

For the initial version, promote while paused or after a short stable period, using the existing brief-pause transaction. Describe this honestly in UX; do not promise seamless switching. Explicit selected track identities, attachments, delay, speed, volume, mute and playback intent must survive.

Acceptance: subtitles-off unlocks the intended Native plan, re-enabling subtitles selects the required capable plan, no-op settings do not restart a player, rapid toggles produce one current result, failures leave the accepted player usable, and seek/close wins over optimization.

## 3. Background promotion

Feasibility: high for asset warming; significantly more work for active dual-session preparation.

Stage A: reuse immutable engine warming, allow an explicitly bounded in-play warm operation, and verify it does not disturb playback. This saves fetch/compile work but still uses a brief-pause replacement for media startup and seeking. It requires extending the current pre-open-only public preparation guard.

Stage B: refactor replacement into `prepareCandidate`, `alignCandidate`, `commitCandidate` and `disposeCandidate` phases. Keep the accepted player running during preparation. Candidate events, audio output, reads and errors must remain isolated. At most one candidate and one accepted player may exist. A seek, track change, new source or close cancels obsolete preparation immediately through its own controller/generation, outside the main serialized operation queue.

The playback clock advances while a candidate is prepared. A position captured at preparation start will be stale. At handoff, capture current intent and clock again, pause the accepted player briefly, align/verify the candidate at that position, then transfer visible output and audio ownership and resume. On failure, dispose only the candidate and resume the accepted player. Fully gapless cross-engine audio/video handoff requires additional clock/output control and browser qualification; it is not provided by the current APIs.

Resource control needs a combined budget for two Wasm heaps, decoded queues, MSE, source reads and subtitle caches. Per-backend limits do not provide that budget. Cancel or defer preparation while the accepted player is starved or dropping frames. Low-priority fetch is only a scheduling hint; it does not isolate decoding, GPU or compilation costs. Avoid speculative audio-output devices and duplicate audible playback.

Do not always start Software first. Choose the fastest known viable start using measured fixture/browser evidence; Software itself has fetch/compile and CPU costs. Promote only when expected remaining playback can repay preparation cost and interruption risk. A useful CPU-only estimate is setup CPU-seconds divided by expected steady-state core savings, but memory, stalls and fidelity are independent gates. The prior aggregate Chrome CPU figures are not a portable scoring model.

Acceptance: side preparation leaves accepted playback continuous, one audible owner, bounded combined resources, no stale candidate commits after user actions, current-clock handoff, no repeat probing loop, and retained old playback on candidate failure. Exercise paused and playing handoffs, browser backgrounding, hidden-surface behavior, decoder resource limits and autoplay denial.

## Implementation order

1. Production Native-remux-plus-mpv-subtitle contract and startup/fallback integration.
2. Shared eligibility comparison and configuration-scoped attempt history.
3. Event-driven promotion using the existing transaction; prefer paused handoffs initially.
4. In-play immutable asset warming with resource/cancellation tests.
5. Opt-in full candidate preparation and measured handoff; enable automatically only after browser qualification.

Retain the public Native/Hybrid/Software modes and expose detailed plan/reason diagnostics. Candidate preparation should not publish a new active tier until commit. No browser preference override belongs in automatic tier selection.

## Validation performed

Read the current selection, replacement, settings, operation queue, capability evidence and preparation code. Ran existing engine preparation, runtime capability contracts, plan admission and seek-frame race tests: 33 passed. These tests validate reusable foundations, not the proposed promotion scheduler or concurrent playback behavior. New source snapshots and measured browser overlap/handoff tests are required during implementation.
