<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Active retained-owner reconciliation

This appendable note corrects the earlier batch-B/E owner citation without changing or erasing prior audits. Their `web/retained-engine-worker.js` citations describe an experimental predecessor. The maintained Hybrid path selected by `src/internal/wasm-player.ts:58` is **web/filter-retained-engine-worker.js?mode=retained**.

## Current owner chain

`src/internal/wasm-player.ts:41-59` selects the Hybrid worker. `web/filter-retained-engine-worker.js:11-26` owns the bounded retained-frame map, closes stale generations and rejects a full 16-frame bound. Lines 29-50 present on a deadline, replace/close the old held frame, draw video through drawRetainedVideo, then compose subtitles. Lines 52-64 service selected-frame redraws and cap pending requests at eight. The browser decoder remains in `web/retained-decoder-worker.js`: encoded packet submission at 124-145, VideoFrame ownership transfer at 174-181.

## Earlier record applicability

- **R124.copy-a-frame-once-to-free-the-decoder** (batch B): the current owner still retains one `heldFrame` until replacement, at lines 35-38, and reuses it for redraw at line 58. The stated opportunity survives this corrected citation. Whether the retained handle creates actual decoder-surface pressure remains unmeasured.

- **R085.out-of-order-gop-decode-and-reverse-presentation** (batch E): current lines 17-26 explicitly discard stale/old frames and bound current generation retention; lines 55-56 evict older selected PTS. This is stronger evidence that a separate reverse GOP cache/owner would be needed. No reverse pipeline is thereby validated.

- **R151.parsed-coefficients-as-a-cache-tier** (batch E): current map still holds decoded VideoFrames, not JPEG coefficient images. Correcting the worker name does not create a coefficient cache or a repeated JPEG ROI workload. STOP_PROFILE remains scoped to this playback owner.

- **R025.try-a-generated-video-track-as-an-alternative-presenter** (batch E): the faithful baseline is active worker lines 29-50 plus drawRetainedVideo and subtitle composition, not the predecessor direct drawImage alone. The candidate must preserve current geometry, overlay and deadline/generation semantics. Its current generated-track API capability remains unqueried; INCONCLUSIVE is unchanged.

These corrections do not import performance evidence or establish hardware behavior. Source snapshots below preserve exact current owner bytes; prior audits remain immutable historical records.

## Exact current snapshots

- `src/internal/wasm-player.ts` -> `work/batch_h/snapshots/src__internal__wasm-player.ts` SHA256 `4ea02800ba05106c51e5c8ee2ec4b7a7b7a49a973d17c8211f57e7ca4f8dad53`

- `web/filter-retained-engine-worker.js` -> `work/batch_h/snapshots/web__filter-retained-engine-worker.js` SHA256 `9c8e46ccab7d338e334895d4c1d7e1fe9c66ed1913106c2633a7115b84b86d98`

- `web/retained-decoder-worker.js` -> `work/batch_h/snapshots/web__retained-decoder-worker.js` SHA256 `ee28b3a8b13e5daa7fe18cb5b6beec81adb17d8ef8ced637dcea582c028dd2c5`

- `web/retained-video.js` -> `work/batch_h/snapshots/web__retained-video.js` SHA256 `58420f808dfa75ff561b68cd3347deeb60ef6e8545c2e04f4d603508b02541ff`
