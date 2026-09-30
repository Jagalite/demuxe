# Identical-video comparison: browser AAC versus mpv AC-3

## Finding

The repeated native-AAC versus selective-AC3 gap includes real additional computational work. Processor execution conditions strongly change the displayed CPU percentages, but do not explain away that work. With identical compressed video frames and timestamps, the renderer executes about 35 million instructions per second on native AAC, 71 million with AAC remuxing, and 169 million with the production selective AC-3 path. The scheduled-PCM prototype reduces the latter to 158 million, only about 6% below the existing selective path in this diagnostic comparison.

The earlier claim that replacing the AudioWorklet removes most of the large audio overhead was too strong. The prior CPU-only experiment cannot distinguish reduced work from a change in processor execution conditions. This new result supports at most a modest steady-playback work reduction for that prototype, not the earlier apparent 33% whole-Chrome saving.

## Matched source and runtime

AAC was encoded from the original HEVC10/AC3 fixture's audio; HEVC packets were stream-copied. `fixture-identity.json` verifies equality of all 1,080 video packet hashes, PTS, DTS and durations. Both files are MKV with the same HEVC Main10 320x180/30 fps video and stereo tone content. AAC is a diagnostic derivative, not a bit-exact audio substitute or a replacement published fixture. Runtime assets are the frozen bafdb3f3 snapshot used by the 30.8% published AC3 retest; source and runtime hashes are retained in `runtime-identity.json`. Local main remains 54795399.

Four paths:
1. AAC Auto: browser-native direct playback.
2. AAC with nativeRemux=always: browser-native audio/video after Demuxe remuxing.
3. Original AC3 Auto: native-video-mpv-audio, with existing selective worklet.
4. Same AC3 with the test-only scheduled-PCM adapter, retaining the mpv decoder and native video.

The remux control helps expose bridge/control overhead but is not a perfectly isolated per-component subtraction: the AAC remux controller can use worker-owned MSE, whereas selective AC3 uses window-owned MSE and video-only remuxing. Audio format/container metadata and demux paths necessarily differ. Do not assign every instruction in the between-arm difference to the AC3 codec or to one function.

## Result

One startup-gated headed Chrome, fresh context per arm, fixed order, source seek to 3 seconds, 5-second warmup, one 10-second CPU window per arm. No external load generator, no V8 profiler, and no correctness audio tap in the CPU contexts. Native counters bracket each CPU window and are normalized by their own slightly wider elapsed intervals. These are diagnostic comparisons, not refreshed README cells or precise production guarantees.

| Path | Whole Chrome CPU | Renderer CPU | Renderer million instructions / s | Renderer effective active GHz | Frames / drops |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native AAC direct | 4.62% | 1.09% | 34.51 | 2.72 | 300 / 0 |
| Native AAC remux | 5.60% | 1.96% | 71.22 | 2.89 | 300 / 0 |
| AC3 selective worklet | 7.48% | 3.92% | 168.55 | 2.95 | 300 / 0 |
| AC3 scheduled PCM prototype | 7.30% | 3.69% | 158.36 | 2.99 | 300 / 0 |

Both AC3 paths had zero new audio underruns, no drift corrections and no selected mpv video track. The scheduled prototype's maximum timestamp-derived A/V error was 3.52 ms during the CPU run. Correctness-only fresh contexts first verified the 440/880 Hz stereo markers on all four paths; their startup/seek drops are retained and are not included in the zero-drop steady-window claim. The prototype remains unqualified for mid-playback seek, rate changes, full pause/resume lifecycle, EOF tails and scheduler stalls.

The effective renderer execution rates (2.72-2.99 GHz) are much closer than the earlier audio variability experiment's 1.16 versus 2.99 GHz. They are derived aggregate cycle/time ratios, not direct core residency measurements. All four CPU windows passed their diagnostic acceptance gates. Source behavior was stable, but only one window per path was taken and host applications remained active.

## Interpretation and next engineering target

Native direct AAC lets the browser own demux, decode, timing and presentation. Selective AC3 adds our video remux/controller machinery plus the mpv/Wasm engine, its PCM bridge and separate synchronization. The remux control alone more than doubles renderer instruction rate; adding selective AC3 more than doubles it again. Native GPU-process CPU remains close across these observations (2.83-3.14%), consistent with the same video work.

The worklet-to-scheduled-buffer replacement saves about 10 million renderer instructions per second here, while about 87 million instructions per second remain above the AAC-remux arm. This does not establish a universal decomposition, but it rules out treating the worklet replacement as the dominant demonstrated fix. Existing ordinary-mpv MP3/AAC/AC3 probes also show that the additional runtime cost is not unique to AC3 codec math.

The next justified optimization target is the remux/controller plus mpv runtime path: attribute its worker/native event and PCM-pump work before committing to a new audio transport. Keep the scheduled prototype experimental. A precise mpv decoder-versus-runtime split still requires attribution; this report does not pretend that the extra 97 million instructions over AAC remux are all decoder instructions.

Historical 14-19% native and roughly 30% selective results can coexist with today's 4.6% versus 7.5% because CPU time is sensitive to execution conditions. The recurring route gap is real; the absolute size in CPU percentage points is environment dependent. No README cells were replaced, no production code or runtime binaries were changed, and no builds were run.

## Evidence

- `check-01/result.json`: stereo checks, route and initial timing observations.
- `cpu-01/result.json`: all raw CPU windows, state, native counters and route diagnostics.
- `cpu-01/counter-summary.json`: role-level instructions, cycles, CPU time and derived rates.
- `fixture-identity.json`: complete video packet identity and timestamps.
- `runtime-identity.json`, each run's `harness.mjs`, and `scheduled-pcm.mjs`: exact implementation provenance.
- `tests/hevc-audio-path-comparison.mjs`, `tests/audio-process-counters.py`, `tests/summarize-audio-path-counters.py`: diagnostic harness and attribution tools.
