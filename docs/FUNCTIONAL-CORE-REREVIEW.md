# Functional-core behavioral re-review

Date: 2026-10-02. Candidate: `df1960885b1d0aa2ebcd1e9f7af4cc988327e85f`.
Comparison baseline: `092445feece0ec7769d5a61852d5744572ca1724`, the recorded baseline before active functional-core cutover. This review covers the migration sequence, not only checkpoint 23. The compatibility ledger's earlier characterization revision is `67ef9d3b`; it is not substituted for the executable comparison baseline.

The PCM epoch race and post-cancel native shutdown acknowledgement fixes are committed in the candidate. This re-review found two further migration regressions and a separate inherited resource-accounting limitation. Both regressions are repaired in the subsequent working-tree fixes described below; the inherited limitation remains open. Source review and short controls do not grant final runtime qualification.

## Confirmed migration regression: pending first-frame selection is discarded

**P2 — Hybrid can miss its paused first frame or first post-seek presentation.**

`src/internal/machine/legacy-retained-presentation.ts:34` clears every pending presentation when the first transferred frame establishes a decoder generation. Native rendering can select its timing placeholder before the engine worker receives the corresponding transferred VideoFrame: native mailbox wakeup and worker MessageEvent delivery use different channels.

Reproduction through the actual old/current presentation adapters:

1. Start with no observed frame generation.
2. Call `presentSelected()` for serial 1, timestamp 0.
3. Deliver the matching retained frame from the first decoder generation.
4. Baseline draws the frame; candidate draws nothing because receiving it canceled its selection.

The shell's `receiveFrame()` only calls `presentReady()` for the incoming timestamp. There is no remaining pending request to schedule. Its ordinary tick calls `presentSelected()` only when native `_web_render()` produces another render result. The production native render path consumes the pending render notification, so another selection is not guaranteed for a paused frame. During advancing playback, a subsequent selection can hide the missing first presentation.

Evidence: `/tmp/demuxe-retained-first-frame-review.mjs`, independently rerun against the baseline and candidate. Observed output: baseline `drawn:["first"]`, candidate `drawn:[]`. Source trace includes `web/filter-retained-engine-worker.js`, `web/retained-decoder-worker.js`, `scripts/build-unified-mpv.py`, and the production-used `experiments/retained-subtitles/player.c` render/selection path. The fixture simulates the channel ordering; this is not a browser capture of its frequency.

Required correction: distinguish first/new-generation frame admission from invalidation of genuinely obsolete selections. Preserve or rebind a valid already-selected frame while retaining stale timer/frame fencing. Add selection-before-frame controls for startup and seek, alongside existing frame-before-selection controls. Fixed after review: initial or explicitly reset presentation epochs preserve their pending selections when the expected first generation arrives; unexpected generation changes still cancel old timers. Startup (immediate and delayed) and post-seek selection-before-frame regressions pass and fail against the previous pure owner.

## Confirmed migration regression: late bitmap acquisition loses cleanup ownership

**P2 — Closing a private playback host during picture capture drops the acquired ImageBitmap without closing it.**

`web/private-mpv/playback-host.js:40` awaits the queued operation, then checks the operation epoch before resolving its result. `destroy()` at line 148 retires that epoch immediately. If the in-flight operation is `createImageBitmap(host.canvas)`, the late result is rejected before the worker receives it. The cleanup branch in `web/private-mpv/playback-worker.js:98–99` therefore cannot call `bitmap.close()`.

The baseline serial executor delivered the late result; its worker then detected closing/replacement and closed the bitmap. A short actual-host comparison delays capture, calls destroy, then resolves the bitmap: baseline reports `delivered-and-closed`, close count 1; candidate reports `rejected-before-consumer`, close count 0. Evidence: `/tmp/demuxe-private-bitmap-retirement-review.mjs`. This demonstrates lost explicit graphics-resource cleanup, not a measured permanent browser memory leak; garbage collection or worker termination may eventually reclaim it.

Required correction: give resource-producing serial operations a stale-result disposer, or arrange for the capture operation to close a late bitmap before rejecting. Preserve retirement checks for ordinary operations. Cover close-before-capture-settlement and normal delivery exactly once. Fixed after review: serial capture work retains a synchronous stale-result disposer, and the bitmap producer supplies `bitmap.close()`. Actual-host tests cover close-before-settlement, throwing disposal, normal delivery and failed acquisition; both late-disposal regressions fail against the previous host. Normal source replacement serializes native teardown before reset, so this finding specifically claims the demonstrated close/capture race.

## Inherited residual: authorization refresh work escapes Shaka request accounting

`src/internal/shaka-network.ts:98` races `refreshAuthorization()` against cancellation. The callback has no cancellation parameter; it can remain pending after the race rejects. The request's finalizer at line 139 nevertheless releases its request slot. Baseline source comparison shows the same cancellation pattern; the baseline authorization probe was not executed.

A focused actual-adapter reproduction leaves 40 external authorization refresh promises unresolved while the candidate reports zero pending requests (`/tmp/demuxe-backend-migration-review/shaka-refresh-charge.mjs`, corresponding `.log`). The 32-request playback limit therefore bounds the plugin/fetch-reader lifecycle, not every outstanding authorization callback. This is an inherited limitation, not evidence that the migration introduced a playback regression.

The retained-state annotation for `ShakaNetworkPolicy.controllers` currently says physical pending requests stay charged. That statement needs a narrower scope or a separate refresh-obligation owner. Retaining a charge until refresh settlement would be a behavior/resource-policy correction and needs its own focused cancellation tests. No such correction is included in this review.

## Review coverage and validation limits

The review compares old adapter branches with current pure decisions and effect ordering across:

- Player operations, play/seek, source preparation/application/acceptance, routing/recovery/promotion, settings, publication/readiness, resources and provider acquisition.
- Native, Wasm, private audio/software and Shaka backend controls, seek/verification, tracks, subtitles, buffering and decode policy.
- Production workers, native decoder/frame protocols, PCM, retained presentation, cooperative scheduling, remux/MSE, readers, metadata/parsers and renderer cleanup.
- UI controls, element lifecycle/queue/configuration, preview/cache/pregeneration/scrubber, presentation/Media Session, bindings, MediaView and Video.js.
- Relevant packaging/install source changes, including explicit worker helper inclusion and retained-frame ABI checks. No package was assembled for this review.

Short validation receipts:

| Scope | Result | Receipt |
| --- | --- | --- |
| Player/source/routing/settings/provider controls | 106 passed, 0.74 seconds | `/tmp/demuxe-full-review-player-focused.log` |
| Consumer/UI/presentation/preview ownership controls | 128 passed, 0.95 seconds | `/tmp/demuxe-df196088-consumer-review.log` |
| Backend and corresponding pure-owner controls | 390 passed, 2.40 seconds | `/tmp/demuxe-full-backend-review-focused.log` |
| Old/current preview pregeneration comparison | 120 matching histories, 150 events each | `/tmp/demuxe-pregeneration-differential.cjs` |
| Private bitmap close/capture comparison | Confirmed baseline/candidate cleanup difference above | `/tmp/demuxe-private-bitmap-retirement-review.mjs` |
| Hybrid selection-before-frame comparison | Confirmed baseline/candidate difference above | `/tmp/demuxe-retained-first-frame-review.mjs` |

The pregeneration comparison uses controlled timers and provider completions across sample, interval, timestamp and adaptive strategies. It checks the exercised request traces and retained timer/work counts, not real decoder output or scheduling cost. Existing passing controls supplement source review; they do not establish universal equivalence. `/tmp` scripts/logs are local review receipts, not durable release artifacts.

An internal Wasm rejected-reopen attachment-identity difference was investigated but excluded from actionable migration findings: supported callers use replacement/disposable instances, and no public trigger with retained attachments was established.

Fresh baseline diff passes included scheduler/continuations and private playback-host/playback-worker/retained-decoder shells with their pure owners. No additional actionable regression was established in those scheduler/continuation or decoder paths.

No long checks, native build, full contract gate, browser matrix, endurance campaign or performance comparison ran for this review. The previously running native build's status was not refreshed. Final package/source alignment and runtime qualification remain separate obligations in the handoff.

## Focused fix validation

The retained-presentation source helper was compiled with declarations and its generated output refreshed. Retained policy and actual-shell controls pass 27/27 (`/tmp/demuxe-retained-review-fix-focused.log`); three new cases fail against the old pure owner (`/tmp/demuxe-retained-review-fix-negative.log`). Private host/worker controls pass 83/83 (`/tmp/demuxe-bitmap-fix-focused.log`); two late-disposal cases fail against the old host (`/tmp/demuxe-bitmap-fix-old-control.log`). These are 110 focused checks, not a complete integrated or browser gate. The source ownership inventory was refreshed after semantic review of the three changed source files.
