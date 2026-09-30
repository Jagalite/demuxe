# Selective-audio scheduling change — 2026-09-26

The patch removes two sources of scheduling work identified in `results/mpv-runtime-isolation/REPORT.md`:

- NativeMpvAudio now arms the final-PCM drain guard from its existing 250 ms observer, with 200 ms plus one rate-adjusted observer interval of lookahead. Play publication and completed seek arm it immediately when already near EOF. It no longer maintains a video-frame callback throughout playback.
- Audio-only engine polling uses at most 40 ms, additionally bounded by one quarter of the 8,192-frame ring at the actual AudioContext sample rate. Hybrid video keeps 10 ms; command wakeups and idle behavior are unchanged.

No mpv/FFmpeg source or Wasm binary changed. TypeScript-generated JS and declarations were regenerated with `npm run build`.

## Validation scope

`node --test tests/native-audio-scheduling.mjs tests/native-audio-diagnostics.mjs tests/audio-worklet.mjs tests/timing-coalescing.mjs`: 22 passed. Build and license checks passed.

`node tests/selective-audio-scheduling-browser.mjs` exercises current production assets, URL inputs, headed Chrome, and the marked 320x180 fixtures under `build/head-to-head/assets-row-refresh-20260926-01/fixtures`. Cases: HEVC10 + AC3, H264 + DTS, HEVC + PGS. It checks stable automatic routes, no mpv video ownership, audio tones, video marker after paused seek, pause/resume, 0.5x/2x/1x rates, forward/backward seeks, EOF draining at 0.5x and 2x, replay, paused near-EOF restart, and worker/iframe cleanup. Full diagnostics are retained per phase.

Final run: `2026-09-26T19-52-19.194Z`. This is a focused lifecycle check, not the README performance campaign or an arbitrary-device/background-playback qualification. High sample-rate devices were not browser-tested here.

## Retained failures and limitation

- `2026-09-26T19-46-13.733Z`: test incorrectly inspected nonexistent `player.state.paused`; corrected to the native video element's paused state.
- `2026-09-26T19-49-09.877Z`: all three candidates passed through slow/fast EOF and replay, then failed starting a paused seek only 120 ms before EOF with `Native output evidence timed out`.
- `2026-09-26T19-51-18.449Z`: AC3 with the HEAD controller reproduced the same 120 ms timeout. A later CPU-harness audit found that the baseline worker override did not match its query string, so this run still used patched worker polling. It establishes that the EOF observer change is not required for the timeout, but does not establish reproduction on fully unchanged HEAD. The timeout remains unresolved; the baseline URL matcher has been corrected for future runs. Reproduce with `SHORT_TAIL=1 BASELINE=1 CASES=hevc10-ac3 node tests/selective-audio-scheduling-browser.mjs`; omit BASELINE for the candidate. The final default checks a 1.2-second paused tail. The immediate short-tail arming logic is also unit-tested.

The failed candidate run already observed 34–35 worker ticks per 1.5-second steady window, zero recurring video-frame callback registrations, and zero pre-EOF underruns across all three routes. These are scheduling observations, not a CPU reduction claim. The earlier isolated 6% polling and 11% EOF instruction reductions must not be added into a promised combined saving. README CPU measurements remain unchanged.

## Final results

All three scenarios passed, including cleanup.

| Case | Lifecycle | Worker ticks / 1.5 s | New frame callbacks / 1.5 s | Pre-EOF underruns |
| --- | --- | ---: | ---: | ---: |
| hevc10-ac3 | passed | 30 | 0 | 0 |
| h264-dts | passed | 30 | 0 | 0 |
| hevc-pgs | passed | 35 | 0 | 0 |

## Superseding polling rollback

The 40 ms polling change was subsequently reverted after controlled delayed-worker testing reproduced audio starvation at 40 ms and zero underruns at 10 ms. The EOF observer change remains. See [the investigation](poll-margin-2026-09-26T20-28-54.968Z/REPORT.md). Earlier combined-patch CPU results do not describe the final EOF-only change.
