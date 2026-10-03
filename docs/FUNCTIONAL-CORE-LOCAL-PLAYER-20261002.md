# Local player functional exercise — October 2, 2026

Broad interactive testing completed in the T3 collaborative browser with real local video. The original run found two product issues. Both Hybrid snapshots and PiP were subsequently fixed and verified below; fullscreen was blocked by the browser environment. This is not an all-features or release qualification pass.

## Runtime and evidence

- Browser: Electron 44.4.2 / Chromium 152.0.7977.130, macOS, cross-origin isolated; desktop viewport 1402 × 877.
- Server: `http://127.0.0.1:4183/`, left running with `example.mp4` loaded and paused at 4 seconds.
- Source: HEAD `1c8c42653b5a0ce45bdc17439da3291f379d7e73` plus the uncommitted retained-first-frame and retired-bitmap fixes.
- TypeScript compiled successfully into `build/local-player-rereview-20261002/web/generated`; served unified player, retained presentation helper, private host and worker hashes matched the staged/current files.
- Main checkout private playback binaries predate retained lease v1. Staging uses both matching production JSPI/Asyncify directories from `/Volumes/seed2/Projects/demuxe-functional-native-lease-20261002/lease-production-installed-02/web/`. No native build was run.
- [Raw browser results](../build/local-player-rereview-20261002/browser-results.json), [served asset hashes](../build/local-player-rereview-20261002/asset-verification.json), [final screenshot](../build/local-player-rereview-20261002/final-player.png).
- Raw record: 55 scenario attempts, 45 passing; four failing assertions reproduce the two issues below; two expected capability rejections; three harness mistakes corrected and retested; one fullscreen environment block. No captured uncaught page errors or unhandled promise rejections.

## Confirmed issues from the original run

### Hybrid snapshots time out

**Follow-up: fixed.** The retained worker now admits `preview-snapshot` through the existing pure snapshot owner, forces a redraw, encodes PNG only after confirmed video/subtitle presentation, and suppresses completion after source replacement or close. No new retained mutable state was added. Focused worker/presentation tests passed 34/34, including four new delayed-frame, encoding-error/retry and source/close retirement checks. Five local browser scenarios passed: paused capture (about 41 ms), playing captures after four seeks, subtitles plus timing/gain, close/reopen race, and destroy race. Interrupted captures rejected with ABORTED; reopening captured successfully. [Follow-up browser results](../build/local-player-rereview-20261002/hybrid-snapshot-fix-results.json). The static pure-core guard and refreshed ownership audit passed with zero changed sources or pending dynamic writes. This follow-up does not fix PiP.

The pthread Hybrid route renders and plays, but `player.snapshot()` times out with `NETWORK_TIMEOUT`. Reproduced after timing/gain changes and independently on the replacement MKV. Native, pthread Software, JSPI private and Asyncify private snapshots succeeded.

`src/internal/wasm-player.ts` selects `filter-retained-engine-worker.js` for Hybrid and sends `preview-snapshot`. That worker has a readiness check mentioning this request but no dispatch handler. The Software worker implements the request. Source comparison against pre-migration baseline `092445fe` confirms this mismatch already existed.

### Component PiP ownership is not recognized and close leaves an orphan

**Follow-up: fixed.** PiP detection now checks the video's own Document/ShadowRoot as well as the owner document, including cleanup of a retired entry request. Player.close() retires PiP entry and joins native exit alongside source cleanup. Existing replacement policy is preserved: exit active video PiP before changing playback surface. No new stored authority was introduced. TypeScript compilation and 60 focused presentation/readiness/teardown checks passed, including shadow-root observation, exit/destruction, late retired entry, isolation from another player's PiP, and close joining native exit. Local browser verification passed entry/state, replacement rejection, explicit exit, close/reopen, and destruction with no remaining browser PiP element. [Follow-up browser results](../build/local-player-rereview-20261002/pip-fix-results.json).

With a native video in `<demuxe-player>`, invoke `player.presentation.requestPictureInPicture()` from a real click and wait 500 ms. Browser PiP is active, but `player.presentation.state.pictureInPicture` is null:

- `document.pictureInPictureElement` is `DEMUXE-PLAYER`.
- `player.surface.getRootNode().pictureInPictureElement === player.surface` is true.
- `document.pictureInPictureElement === player.surface` is false.

`src/presentation.ts` relies on the document-level comparison, missing shadow-root retargeting. After `player.close()`, `document.pictureInPictureElement` becomes a detached VIDEO (`isConnected === false`) and remains active. The test explicitly exited browser PiP afterward. Baseline source has the same ownership comparison and close behavior; this is pre-existing, not an established migration regression.

## Covered successfully

### Follow-up review — October 3

Reviewed both fixes and repaired two additional gaps:

- The shared snapshot owner could publish an encoder result after a playback-pump failure. It now suppresses that stale completion while retaining the single encoding slot until physical settlement. A negative-control test reproduced the previous `publish: true`; core and retained-shell regression tests now pass. This shared helper gap also affected the existing Software adapter, although no user-visible stale image was demonstrated.
- Opening another file during active video PiP preserved the original source but exhausted route fallback and incorrectly reported UNSUPPORTED_MEDIA. Selection now rejects before inspection/routing with UNSUPPORTED_FEATURE and the explicit exit-PiP instruction; the existing replacement guard remains for later races.

TypeScript compilation, 98 focused tests, static pure-core checks and the refreshed ownership audit passed. Browser checks passed Hybrid EOF and seek-to-start snapshots; after the review fixes, source replacement during PiP returned the correct error without replacing the source, close cleared native PiP, and reopening Hybrid produced a PNG. Added coverage also verifies that a failing native PiP exit does not skip source cleanup or strand the close operation. [Review browser evidence](../build/local-player-rereview-20261002/review-fix-20261003.json). Changes remain uncommitted; no broad browser/performance qualification was run.

| Area | Exercised behavior |
| --- | --- |
| Native playback | Actual H264/AAC MP4 rendering and clock progress; pause/resume; forward/back/start seeks; queued play/pause/seeks; rates 0.5/1/2; volume/mute; snapshots; invalid-setting rejection |
| Boundaries | A–B looping, bounded playback stopping, end/replay, queue advancement at EOF |
| Mode transitions | Native → Software paused; Software → Hybrid playing; preserved position/intent; Hybrid/Software → Native recovery |
| Pthread engines | Hybrid and Software progress/seeks; Software frame stepping, video flip and audio volume filters; Hybrid timing/gain controls |
| JSPI private engines | Explicit `hybrid-private` and `software-private` selection; open/seek/play/pause; snapshots; embedded subtitles; rate/volume/mute; frame step; close/reopen |
| Asyncify private engines | Explicit private Hybrid/Software selection; snapshots; mode switch; four repeated paused opens/seeks with nonblank pixel checks; latest-seek bursts; destruction during playback |
| Retirement | JSPI capture raced against destruction: capture rejected ABORTED, destroy fulfilled; overlapping opens; close during seek; component disconnect destroys old owner and reconnect opens successfully |
| Subtitles | MKV embedded ASS; external ASS and font attachment; style; visibility and seeks across cue times; attachment removal; native external VTT attachment/select/hide/remove |
| Audio tracks | Two tagged AAC tracks switched between IDs, off and auto during Hybrid playback; continued time progression |
| Previews | Paused thumbnail creation without moving main position; cache-only preview during Software playback without stalling; cancellation; native preview; strategy changes and enable/disable |
| UI | Real pointer play/settings clicks; keyboard pause/mute/seek/rate; layout/theme changes; file-input queue append; previous/next and EOF progression; narrow component rendering |
| Source recovery | Local MP4/MKV replacement; remote finite file; missing remote URL rejection followed by successful local recovery |
| HLS VOD | Local segmented stream, native-direct route, progress, seek, EOF; adaptive quality correctly rejected on this route |
| DASH VOD | Local static manifest, Shaka MSE route, progress/seeks/EOF; manual and automatic quality policy with one representation; buffering update |
| Other controls | Browser buffering hints; default audio device; Media Session acquisition and release |

## Limits and corrected test attempts

- Fullscreen did not enter: the player request remained pending. A direct `document.body.requestFullscreen()` from a real click also remained pending without a fullscreen element. Do not classify as a confirmed player regression. T3 viewport resize timed out; narrow component width was tested instead, not mobile device/browser behavior.
- Initial HLS/DASH staging URLs used `/examples/`, which this server resolves from the checkout. Corrected to `/web/stream-fixtures/`; subsequent playback passed. Initial buffering assertion incorrectly read `getBuffering().preload`; corrected to `.requested.preload` and verified effective settings.
- Forced Native correctly rejected a retained subtitle style from earlier tests; clearing style restored playback. Preferences persist across close.
- Fixtures are approximately 12 seconds at 640 × 360. HLS/DASH and the two-audio-track MKV were remuxed locally with stream copy. Both audio tracks have identical sound: identity/selection tested, not an audible language difference.
- Playback/frame/clock evidence is not a listening test or measured A/V synchronization, cadence, CPU, memory endurance or leak proof. Short retirement scenarios do not establish long-run boundedness.
- No Firefox/Safari/device matrix, HDR content, DRM, adaptive multi-bitrate switching, live/DVR stream, chapter fixture, alternate physical audio device or network fault/authorization campaign. The previously recorded Shaka authorization-callback accounting issue was not addressed here.
- Tests used public APIs and DOM events in the real visible player, plus real pointer/key interactions. File objects were loaded from local fixture bytes; OS file-picker automation was not used.

No product fixes, commits or pushes were made during this testing pass. Existing checkout changes were preserved.
