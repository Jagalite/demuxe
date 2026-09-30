<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Audio underrun investigation and polling rollback

## Finding

The 40 ms selective-audio polling optimization reduces tolerance for worker scheduling delays. It was rolled back to the original 10 ms cadence. The EOF observer optimization remains. No native mpv/FFmpeg source or Wasm binary changed.

The PCM path has two buffers and two worker responsibilities: report AudioWorklet consumption to mpv, then copy newly decoded PCM into the worklet ring. mpv's push-AO thread has its own fallback wait of `device_buffer / samplerate * 0.25` (`build/sources/mpv/audio/out/buffer.c`), about 42.7 ms at 48 kHz / 8192 frames. A 40 ms worker interval adds latency before producer refill and again before publishing that refill. A quarter-buffer polling rule therefore did not preserve a quarter-buffer scheduling margin.

## Controlled reproduction

Same current EOF controller, same HEVC10/AC3 URL fixture, headed Chrome, fresh context per arm. The worker is instrumented to record pre-pump native/public write/read counters, epochs, run/gate state, underruns and timestamps. No CPU-performance claim is made: this is a timing robustness experiment without a startup gate. Each 10-second window introduces five extra 60 ms timer delays, spaced two seconds apart. Both arms use the same injected delays; only worker polling cadence differs.

| Poll interval | Maximum observed pump gap | New pre-EOF underrun callbacks | Minimum public queued frames | Video drops |
| --- | ---: | ---: | ---: | ---: |
| 40 ms | 105.05 ms | 8 | 0 | 0 |
| 10 ms | 75.04 ms | 0 | 2560 (53.3 ms) | 0 |

At the failing 40 ms sample, the AudioWorklet ring was empty (write = read = 518400) while the native ring already had decoded output through frame 525440. That is 7040 decoded frames waiting to be forwarded. The immediate failure is delayed PCM transfer, not AC3 decoding failing to produce data. The previous pump had only 1152 frames (24 ms) left publicly queued; its next poll arrived 44 ms later, after an earlier injected delay had depleted headroom. Thus a single late poll can leave subsequent ordinary polls with too little margin. Eight missing 128-frame callbacks are roughly 21 ms at 48 kHz.

An earlier instrumentation run (`../poll-margin-2026-09-26T20-27-02.844Z`) observed minimum steady queues of 1792 frames (37.3 ms) at 40 ms versus 4608 (96 ms) at 10 ms, with zero underruns/drops in those windows. Its requested delay injection matched the wrong timer and did not execute; it is not delayed-worker evidence. Its separate 10 ms startup attempt also hit a selective PCM timestamp timeout; that failure is retained.

The reproduction establishes a polling-margin regression. It does not prove that exactly this timer sequence caused the prior uninstrumented eight-underrun window, but it reproduces that failure mode with the same count and shows the 10 ms control survives the same scheduling disturbance.

## Video and remaining limitations

The earlier 65-dropped-frame CPU window has not been reproduced in this probe. Audio starvation here occurred with zero video drops, so the two failures must not be claimed to share a demonstrated cause. The native video decoder is separate and mpv owns no video. The startup timeout is also unresolved. These results do not establish full arbitrary-load playback qualification.

## Change and validation

`web/filter-retained-engine-worker.js` was restored exactly to HEAD's 10 ms polling. No polling optimization remains in the production diff. `tests/selective-audio-scheduling-browser.mjs` no longer asserts a reduced pump count, and retains the no-continuous-frame-callback assertion. The focused 22 unit tests passed after rollback. HEVC10/AC3 lifecycle passed in `../2026-09-26T20-30-37.589Z/hevc10-ac3.json`: audio tones, paused video marker, pause/resume, rate changes, playing/paused seeks, EOF drain at slow/fast rates, replay and cleanup, with zero pre-EOF underruns.

The earlier 14.1% CPU / 13% instruction reduction was for the combined 40 ms + EOF patch; it must not be presented as the performance of the retained EOF-only change. No new CPU campaign or README edit was made.

Reproduce the scheduling fault with `node tests/selective-audio-poll-margin.mjs`. The harness now applies diagnostic 40/10 ms variants to the restored worker and retains raw results; it does not modify production assets.
