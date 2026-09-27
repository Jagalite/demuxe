# Restricted mpv audio component — September 27, 2026

Both JSPI and Asyncify passed in Chrome 153.0.8010.53. The actual mpv browser AO
feeds a bounded, private-memory AudioWorklet transport. No SharedArrayBuffer or
COOP/COEP headers are used; the Asyncify Worker has both JSPI APIs removed.
`verified.json` independently binds the two cases to their source snapshots,
private dependency archives and Wasm artifacts.

| Check | JSPI | Asyncify |
| --- | --- | --- |
| Original stereo PCM16, 48 kHz, 96,000 frames | exact samples | exact samples |
| Pause and AudioContext suspension | consumption stopped | consumption stopped |
| Paused mpv clock versus consumed frames | floating-point epsilon | floating-point epsilon |
| Seek to 0.5 seconds | new epoch, resumed consumption | new epoch, resumed consumption |
| 2x speed through EOF | 48,000 output frames | 48,000 output frames |
| Replace source and recreate mpv client in same Wasm | 24,000 exact frames | 24,000 exact frames |
| Final teardown | no tasks/handles/timers retained | no tasks/handles/timers retained |

PCM equality compares the actual AudioWorklet-rendered Float32 samples with the
known PCM16 integers divided by 32768. It is an exact source oracle, not a pthread
comparison. The worklet is connected to a running AudioContext through a muted
gain node. This exercises real rendering callbacks but does not establish audible
output, hardware latency, device switching, or physical-device behavior.

The ring and maximum outstanding transport are capped at 8,192 stereo frames;
each transferred block is at most 1,024 frames. Only frames copied to a rendering
quantum advance consumption. Underflow leaves silence and does not invent
consumed frames. This run observed two underrun quanta for JSPI and zero for
Asyncify; these are raw observations, not a performance comparison or a zero-
underrun guarantee. The four focused host tests separately exercise pause,
underflow, stale epochs, invalid sequence/chunk/capacity and malformed epochs.

Two real issues were found and fixed without changing mpv dispatch/thread-pool
code or weakening the original sample assertions:

- Runs 01/02: after context suspension, the AO running flag could remain set while
  mpv was paused. The private transport now also gates playback on user pause.
- Runs 03/04: PCM/lifecycle assertions passed, but manual review found paused mpv
  time ahead of consumption after context suspension. Context transitions now
  pause mpv before reporting a stopped device, and restore mpv pause state on
  resume. Run 05 adds a 25 ms paused-clock assertion; observed error is below
  6e-17 seconds for both backends.

The maximum observed live task count was six; Asyncify saved at most 4,812 bytes
per suspended task. All task slots were returned. These are short-fixture
observations, not endurance or performance qualifications.

Builds: `mpv-audio-deps-01` and `mpv-audio-01`, Emscripten 4.0.14. Build inputs,
commands, audits and hashes are preserved in `../mpv-audio-builds-01/`. The exact
served JS and artifact/fixture hashes are recorded beside this report. The
favicon 404 is unrelated to the service assets.

Remaining gates: compressed codec correctness/priming/padding, multichannel and
resampling, long media/counter rollover, induced browser transport starvation,
real devices and latency, mpv-audio-specific pending-read cancellation, other
browsers, CPU/startup measurements, runtime asset admission, Player integration
and release qualification. AAC/AC-3 decoders present in the experimental build
are not qualified by these PCM tests. No automatic route/fallback is enabled.
