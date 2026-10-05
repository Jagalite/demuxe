# Firefox startup and thumbnail investigation — 2026-10-01

> Historical investigation: observations and runtime identities refer to the recorded runs, not the current checkout. Diagnostic harnesses are optional and were not rerun for this archival commit. Some raw captures and external fixtures remain local; only selected supporting evidence is versioned.

The user reported slow or stuck Native startup and slow thumbnails that interrupted playback with `full_subs_test.mkv`.

## Fixture and limits

The run used `/Volumes/seed2/Projects/startup-repro/full_subs_test.mkv`: 1,632,771,887 bytes, 1604.127 seconds, 1080p H.264, AAC, ASS and 14 font attachments. The Downloads copy has the same size but macOS denied reading it; byte identity was not verified. Source media was not modified or copied into this repository.

Timing captures use fresh headed Playwright Firefox 146.0.1 and the actual playground/file input. Component preparation is completed and recorded separately before timing file opening. Later runs benefit from uncontrolled OS caches; these are diagnostic observations, not a cold-start benchmark or a general speed guarantee. The harness pins the accepted mode after startup for the hover comparison so automatic promotion cannot confound preview work. Installed Firefox 157.0 also exercises playback, subtitle pixels at seeks, and cleanup.

## Findings and changes

- A startup trace took 10.96 seconds: 1.5 seconds for a direct MKV attempt, about 2.2 seconds for remux, and about 6.6 seconds for ASS service initialization and verification.
- Another run hit a subtitle packet deadline, then retried the original container for a full 25 seconds and failed at 35 seconds. Subtitle-only compatibility errors now use the existing renderer-failure classification and skip that futile restoration; source permission/identity/cancellation remain terminal, and missing remux assets retain their original retry. Injecting the same renderer failure now reaches Hybrid in 5.35 seconds.
- The subtitle worker now updates decoder state while waiting for packets and renders pixels only once ready, instead of invoking libass for every wait-loop iteration. Startup verification still requires actual subtitle output and restores the current playback position.
- Built-in decoder-based previews now yield to active playback. Already cached and authored thumbnails remain usable. Missing generated thumbnails require paused playback, explained beside the toggle.
- A paused preview previously took 9.75 seconds in the software engine or hit the 10-second deadline. Accepted local packet-copy playback now gets an independent Native remux preview provider before the direct-browser/software fallbacks. Final uncached observations were 0.99 and 2.85 seconds; a cached request during playback took about 1 ms. The primary source identity, position and play/pause intent were identical before and after generation.

The baseline hover run did **not** reproduce an actual primary pause, though it did launch secondary decoding. The protected runs continued presenting frames with no preview decoder work during playback. Dropped-frame counts varied (including 13 in one run); this is not a zero-drop or physical A/V fidelity qualification. Successful startup observations after the changes ranged from 3.3 to 6.1 seconds; the delay is reduced, not eliminated.

## Evidence and reproduction

Raw captures live under [results/firefox-startup-preview-20261001](../results/firefox-startup-preview-20261001/). `baseline.json`, `protected.json` and `traced.json` precede the subtitle fixes; `fixed-1.json` and `fixed-2.json` still use software previews. `remux-preview.json` precedes provider reordering; `final.json` and `verified.json` include the faster provider order. `verified.json` asserts primary-state preservation, cache reuse during playback, and actual subtitle alpha pixels after seeking to 5 seconds. `recovery.json` injects a subtitle renderer failure to exercise fallback. The latter maintained-harness reports record runtime hashes and browser version.

```sh
SOURCE=/Volumes/seed2/Projects/startup-repro/full_subs_test.mkv \
CASE=verified node tests/firefox-startup-preview-repro.mjs

SOURCE=/Volumes/seed2/Projects/startup-repro/full_subs_test.mkv \
CASE=recovery STARTUP_ONLY=1 node tests/firefox-startup-preview-repro.mjs

SOURCE=/Volumes/seed2/Projects/startup-repro/full_subs_test.mkv \
SUBTITLE_EMPTY_TIMES='[31,950]' \
REPORT=results/firefox-startup-preview-20261001/firefox157-subtitles.json \
node tests/mpv-subtitle-firefox.mjs
```

The subtitle test's prior generic SOURCE assumption expected ink at 31 seconds. This fixture has no subtitle packets in the inspected 24.024–33.992-second window; its prior cue ends at 20.24 seconds. The test now accepts explicit empty times for caller-provided media and can write its measurements before asserting. This does not change renderer behavior or the default fixture expectation.

The Firefox scrubber UI suite passed, including continuous motion, cache reuse, stale cancellation, playback isolation and cleanup. Installed Firefox 157.0 passed the explicit fixture checks for visible captions at 5/12 seconds, blank intervals at 31/950 seconds, seeking back to 5 seconds, and subtitle-canvas cleanup.

TypeScript compilation passed. The 54 focused preview, facade, recovery, selection, runtime-error and subtitle-scheduler contract tests passed. The full `npm run build` license stage reports pre-existing research SPDX/map mismatches in `results/head-to-head/readme-refresh-20261001/row-01` through `row-15`; these unrelated research outputs were left untouched. No native/Wasm engine rebuild or release was performed.


## Follow-up: thumbnails during playback

The pause-only policy did not meet the requested hover behavior. The element now prepares 48 samples across a finite timeline, with a 16 MiB / 96-entry cache. Native browser/remux providers may decode independently during playback; software generation remains suppressed while playing. Buffering, source operations and pointer departure still cancel appropriate work. Cache-only hover lookup bypasses a busy decoder; a hit does not cancel useful generation already in progress. Nearby images retain their approximate represented timestamps. Unprepared positions still require decoding.

The frontend has been rebuilt and is served at port 4179. The first headed Firefox follow-up (`storyboard.json`) displayed uncached images at 20% and 40% in 1119 ms and 884 ms; returning to 20% took 40 ms. Its 86 playback samples were all playing/unpaused, media time advanced from 0.066 to 8.554 seconds, and video frames increased from 4 to 210 with zero recorded drops. This is a bounded observation for this fixture and run, not a general no-drop guarantee.

The 33 preview/controller/pregeneration/facade tests and 32 startup/subtitle/runtime tests pass. Firefox UI checks cover actual image visibility (not merely the loading label), continuous motion, approximate represented times, stalled image recovery, shared image downloads, cancellation on pointer departure, and source/destroy cleanup. TypeScript compilation and the core dependency boundary pass; generated license headers were restored using the repository policy.

`storyboard-final.json` is explicitly rejected as coverage evidence: its asynchronous polling predicate returned too early. Its hover observations remain valid. `storyboard-coverage.json` ended when its browser closed and does not qualify coverage. The subsequent `storyboard-coverage-final.json` uses explicit awaited cache probes and records its headless setting and source/runtime identities.
