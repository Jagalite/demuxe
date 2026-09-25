# Subtitle timing scheduler PoC — 2026-09-23

**Recommendation: EVENT-DRIVEN POC SUCCESS — WORTH PRODUCTION QUALIFICATION.** This is a test-only engine bridge and browser route patch. It does not change production behavior.

## Metadata found in the pinned mpv build

`sub-start/full` and `sub-end/full` return the active cue's precise start/end after mpv has rendered that position. They return unavailable outside a cue. The current pinned build does **not** have `sub-lines` (`MPV_ERROR_PROPERTY_NOT_FOUND`, −8), although newer mpv documentation describes that list. The existing read-only `SD_CTRL_SUB_STEP` used by mpv's `sub-seek` command returns the next in-memory event: 0.51 s before the first 0.50 s cue, approximately 16.01 s while the first cue is active, and 16.01 s in the gap. The control adds about 10 ms seek offset, removed when scheduling the deadline. After seeking into the second cue, no later event was available. See [probe](probe.json) and the test-only [bridge](../../experiments/subtitle-timing-poc/bridge.c).

The test-only fixture retains H.264/AAC and has SRT cues at 0.50–12.00 s and 16.00–25.00 s. After track selection, the worker exposes a tiny timing RPC using `sub-start/full`, `sub-end/full`, and subtitle step. The deadline arm uses a timer for the earliest known start/end, then calls the unchanged render path; it uses a slow 1 Hz metadata check when no deadline exists. The cheap-poll arm sends the timing RPC about every 50 ms and renders only on a detected boundary. Seek, track, playback, and resize invalidations still trigger the existing render path in the PoC.

## Measurements

Chrome 153.0.8010.53, Native A/V + mpv subtitles, 960×540, fresh Chrome per trial with the same persistent profile, steady media time about 2–10 s inside the first static cue. CPU is one-logical-core percent. All table runs passed video-frame, dropped-frame, and audio-byte gates. The host had an unrelated `ANECompilerService` consuming about one core, so whole-Chrome totals are secondary. Renderer ranges include three accepted 60 Hz, two deadline, and two poll runs. Worker CPU was sampled in the latest run of each arm.

| Arm | Full renders/s | Cheap checks/s | Renderer CPU | Worker CPU (sampled) | Whole Chrome CPU (sampled) | Cue timing |
|---|---:|---:|---:|---:|---:|---|
| Current 60 Hz | 60.0 | 0 | 11.82–13.64% | 3.55% | 42.43% | First +18 ms, clear +13 ms, second +19 ms in sampled run |
| Cheap 20 Hz timing poll | 0 | 19.3 | 7.75–8.48% | 0.72% | 39.37% | First +25 ms, clear +56 ms, second +48 ms in repeat; first clear was +163 ms |
| Event/deadline | 0 | 0 in static window | 6.70–7.45% | 0.27% | 46.89% | First +5 ms, clear +34 ms, second +46 ms in repeat |

Raw accepted [baseline](baseline-thread.log), [deadline](deadline.json), and [poll](poll20.json) results; earlier accepted [baseline pair](baseline-two-accepted.json), [deadline](deadline-first.json), and [poll](poll20-first.json) results. A baseline run with 30 dropped frames was rejected. Two early deadline harness attempts accidentally retained the 60 Hz loop and were discarded before these results.

In the 20 Hz repeat, timing calls took 12.55 ms of worker wall time over 7.89 s (about 0.083 ms/check); their host-to-worker round trips totaled 50.89 ms. The accepted 60 Hz thread run spent 165.22 ms in full worker render handling over 7.90 s. The measurement is a short static-window comparison, not a whole-player CPU claim.

Both PoC arms displayed the first cue, cleared it, displayed the second cue, recovered on seek into the first cue and into the gap, and preserved a visible cue across pause/resume. The 20 Hz arm's one +163 ms clear illustrates timing jitter; production qualification must set a latency bound and test it under load.

## Other formats and limits

For ASS, current start/end and subtitle-step can identify event boundaries, but they do not say whether pixels change inside an event. The pinned `sd_ass.c` contains an animation detector for karaoke, transforms, fades, moves and event effects, and records an `animated` packet flag. That check is not enabled for this subtitle-only service with no video output and is not exposed by the current bridge. Static versus animated ASS scheduling appears implementable with a small metadata addition, but is **not demonstrated** here.

For bitmap subtitles, pinned `sd_lavc.c` holds decoded seekpoints with presentation and end timestamps and supports subtitle-step. Whether those points are available early enough for PGS/VobSub deadlines, especially after clear events and seeks, is untested. No bitmap scheduler was built.

The smallest promising production design is a bounded timing snapshot from mpv containing current end, next start, and an animation-required flag. Use a media-clock deadline for static text events, retain frame cadence during animated ASS events, and re-render on seeks, track/source change, resize, and visibility change. Include a slow safety check for newly decoded events. The PoC does not qualify incomplete future-event caches, source replacement, timer throttling, rapid cues, animation, bitmap clear events, or full lifecycle behavior. No production subtitle code changed.
