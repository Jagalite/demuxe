# Browser video plus mpv AC-3 audio: isolated feasibility experiment

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local.

2026-09-24/25 local. This is an experiment-only route. It does not change Auto routing or production behavior.

## Source and route contract

The input is the exact 30-second 1920×1080/60 H.264 + 48 kHz stereo AC-3 Matroska fixture from the controlled unsupported-audio study, SHA-256 `4f8939c1607f7e369eaccae907ab00f65ffe6272616e1449d5b0882ae329fb68`. The AAC reference is the same frozen video packets, SHA-256 `ff9eaa0edcf2984122af9b4f7fe16fdfa088c7bed2c27606f291f23e4eeb5223`; the [original packet identity manifest](../unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/fixtures.json) records zero AAC/AC-3 video packet mismatches.

A **second source read and packet-copy remux** are required for the proof of concept. FFmpeg stream-copies H.264 video to a video-only fast-start MP4. All 1,800 output packets match the AC-3 source in hash, size, keyframe flag and presentation/decode time within 1 ms; [the preparation proof](preparation.json) records SHA-256 and the remux command. There is no video transcode. The browser `<video>` element loads that MP4 directly and owns video decoding and visible presentation; MSE is not needed for this file. The original AC-3 file is separately read by a cloned mpv Hybrid Wasm engine with `vid=no` set before load. mpv selects and decodes AC-3, then sends PCM through the unchanged shared ring and AudioWorklet.

The test-only clone selects a separate audio-only worker. It omits the WebCodecs decoder worker, retained VideoFrames, mpv render pump and canvas presenter. The hidden bootstrap canvas required by the existing WasmPlayer constructor is 1×1, detached, and never receives a drawing context; the visible stage contains only `<video>`. The production Hybrid engine Wasm and AudioWorklet hashes are unchanged. All runtime changes are under `build/selective-audio-poc/assets` and `experiments/selective-audio-poc`.

## Playback controls

The browser video's clock is the master. The initial PoC starts video and mpv audio together. An experiment-only controller samples mpv `time-pos` against `HTMLVideoElement.currentTime` every 250 ms and applies bounded audio speed trims of up to ±2% when sampled skew exceeds 45 ms. There are no periodic drift-triggered hard seeks; rate transitions deliberately make one explicit audio seek each. Forward and backward seek controls explicitly seek both owners. The final seek probe clears cached frame observations and waits for a fresh `requestVideoFrameCallback` near the target; its forward and backward probes completed with zero audio underruns. This is **a clock-skew proxy**, not an acoustic latency probe or proof of exact audible A/V alignment. Video `requestVideoFrameCallback` media times, AudioWorklet consumed frames, underruns and Chrome dropped-frame counters are retained independently.

The control sequence covered startup, normal play, pause/resume, forward seek to 18 s, backward seek to 4 s, 1.5× play, return to 1× and seek near EOF. The first full run passed the normal-speed controls with zero audio underruns; pause held browser time within 9 ms and the forward/backward seeks resumed at the requested positions. It revealed a large rate-change transient (up to 246 ms against `currentTime`) and an EOF cleanup bug. These raw failures remain in [the first control run](control-1790298294028/result.json.zst).

The EOF boundary fix stops the PCM ring, pauses mpv and suspends the AudioContext when browser video ends. A [targeted EOF rerun](eof-1790298367449/result.json.zst) reached both owners' EOF with five boundary underruns and no continuing growth. The later full control sequence had 22 boundary underruns after rate changes and seeks, then suspended the AudioContext. mpv audio ends near 29.973 s while the browser video ends at 29.999 s, leaving a roughly 26 ms end boundary to coordinate. With the final fresh-frame seek gate, the [EOF check](eof-1790299303773/result.json.zst) also completed: both owners ended, AudioContext was suspended, and seven boundary underruns were recorded. The first run's 392 accumulated EOF underruns are not accepted as correct behavior.

Changing speed by simply setting both clocks left about 117 ms skew after five seconds at 1.5×. A narrow experiment now pauses both owners and makes **one explicit mpv audio seek at each user-requested rate transition** after changing speed. The [rate rerun](rate-1790298961964/result.json.zst) ended 1.5× about 31 ms behind video and returned to 1× about 37 ms behind, with zero audio underruns. During the 1.5× transition, sampled skew reached 106 ms against `currentTime`, or 120 ms using `requestVideoFrameCallback` media time and expected display time. Thirteen browser frame drops at 1.5× reflect 90 source frames/s on this approximately 60 Hz surface. The rate change also caused several small ±2% audio speed trims. These hard seeks and trims are explicitly counted; the rate/seek experience needs further work before calling the route production-viable. The [full control rerun](control-1790299079921/result.json.zst) with those rate-transition seeks reached both owners' EOF. It counted 23 small rate trims, two explicit rate-transition audio seeks and three user-requested hard seeks (18 s, 4 s and 26 s). Its 1.5× phase peaked at 126 ms against `currentTime` and 142 ms against the frame-callback estimate; the steady end error was −23 ms. It had 16 browser video drops in the full control sequence, mostly at 1.5×, and 22 EOF-boundary underruns; AudioContext was suspended afterward. A [targeted seek rerun](seek-1790299207260/result.json.zst) additionally requires a fresh browser frame callback near each target before resuming both owners; both seek directions completed with zero audio underruns.

The two clock comparisons are independent observations of browser video time and mpv's AO-coupled presentation clock, with an optional browser frame-callback timing estimate. They do **not** measure the acoustic signal at the speaker. An end-to-end audible A/V sync qualification would need a marked source or capture rig.

mpv reports the video track unselected, `video-params=null`, `video-codec=null`, and AC-3 selected as audio. The audio-only worker reports `videoRenderCalls=0`, no video decoder worker and no visible canvas. During the initial 5-second screen Chrome reported `VideoToolboxVideoDecoder` with platform decoder true for the PoC video. The full CPU run captures this property for each fresh launch. The browser reports approximately 60 presented frames/s at normal speed with zero or low drops. This establishes native browser video presentation on this H.264/M1/Chrome case; no WebCodecs video API is used by the PoC.

## Matched CPU experiment

The three arms are A: Auto Native H.264/AAC; B: production Hybrid H.264/AC-3; C: browser H.264 video + mpv AC-3 audio-only. All use the same frozen H.264 packets, headed Chrome, 960×540 output, four-second warmup and roughly 20-second CPU windows. Fresh launches are ordered A/B/C, C/B/A, B/A/C. Each arm records whole-Chrome, browser, renderer, GPU, audio-service and other process CPU-time deltas plus per-thread Darwin counters. Browser background work is retained in whole totals, and concurrently measured non-browser sums are shown separately. No trace or sampling profiler runs during CPU windows.

All **9/9 CPU windows were accepted** in the [raw run](cpu-1790298492499/result.json.zst); [paired analysis](cpu-1790298492499/analysis.json.zst) retains every role and thread counter. All launches used Chrome 153.0.8010.53. Hybrid submitted/output/presented about 1,200 frames per window with no missing frames or decoder errors. Native and the PoC displayed about 1,200 browser video frames per window, with zero reported drops. PoC audio underruns were zero in all three CPU windows.

Columns are independently medianed percentages of one CPU core. Max drift is measured only for the PoC's clock proxy; HTML media internals do not expose an equivalent independent A/V skew for A, and it was not instrumented for B.

| Arm | Whole Chrome | Browser | Renderer | GPU | Audio service | Max observed A/V drift |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A Native AAC | 43.43 | 27.90 | 4.15 | 9.32 | 0.71 | Not observable |
| B Hybrid AC-3 | 85.34 | 40.53 | 20.85 | 23.93 | 0.64 | Not independently measured |
| C browser video + mpv AC-3 | 62.84 | 33.19 | 14.19 | 13.56 | 0.66 | 51.81 ms clock proxy |

Paired C−B whole-Chrome savings were **−22.50, −29.33, −15.19 core points**, median **−22.50** (about 26% of B's median whole CPU). The concurrently measured non-browser savings were **−14.98, −21.88, −17.23 points**, median **−17.23**. Both comparisons exceed the 10-point screen in all three rounds. Renderer savings are −5.23 to −9.29 points and GPU-process savings −9.81 to −12.59. The audio service remains approximately flat.

The browser-process difference C−B varies from −7.51 to +2.04 points. Named-thread CPU shows Hybrid's browser background worker at 30–37 points and the PoC at 30–31; prior native samples identified this recurring work in macOS Keychain / Secure Enclave call paths. It must not be assigned to audio or compositor work. Across the same rounds Native's renderer/GPU totals varied materially despite stable VideoToolbox identification and frame delivery; C−A non-browser differences span +0.80 to +21.59 points. Thus the experiment strongly establishes a Hybrid→PoC CPU win, but **does not establish a stable “Native plus small residual” cost**.

The renderer's `DedicatedWorker thread` group used 12.6–13.3 points in Hybrid and 2.4–3.1 in the audio-only PoC. The GPU main/anonymous worker groups also fell. These are matched role/thread observations, not fully symbolized function-level budgets. C's browser video decoder reports `VideoToolboxVideoDecoder` and `kIsPlatformVideoDecoder=true` in all three fresh launches. C has zero selected mpv video tracks, `video-params=null`, `video-codec=null`, no WebCodecs decoder worker, no visible canvas and no mpv render calls. AC-3 is selected for mpv audio in every C window.

The CPU run saved a snapshot of its exact [PoC page](cpu-1790298492499/harness/poc.mjs.zst). Subsequent experiment-only edits changed explicit seek/rate controls and fresh-frame gating; normal-speed startup, decoder/audio ownership and presentation were unchanged. The latest control runs use the current [PoC page](../../experiments/selective-audio-poc/poc.mjs).

The initial five-second preflight was A 22.50, B 50.48, C 36.64 whole-Chrome points. Its B arm was rejected only by a mistaken test gate that looked for a DOM `<video>` counter on Hybrid; Hybrid decoded and acknowledged 307 frames in five seconds with zero audio underruns. That preliminary run is retained separately. The corrected 20-second run above is the CPU evidence.

## Limitations and decision gate

The extra file fetch reads 14.39 MB of AC-3 Matroska plus the 13.68 MB browser video MP4. Both are prefetched before the CPU window; mpv File-reader fetched bytes, requests and reads changed by zero in all three C windows. The dual demux/startup cost and memory footprint are not fully accounted for by steady-state CPU windows. The incremental CPU of mpv's audio demux cannot be isolated from AC-3 decode, ring copy, AudioWorklet and worker polling by this three-arm design. Per-thread counters help bound worker work, but do not give function-level attribution.

No HEVC or DTS secondary case was attempted because the rate transition still reaches about 120 ms on the frame-callback clock and exact acoustic A/V sync remains unverified. This PoC does not establish subtitle/filter/HDR/track-switch compatibility or production-ready seek/rate coordination.

**Decision: CPU WIN BUT SYNC NEEDS MORE WORK.** The visible Hybrid presentation cost largely disappears for this H.264 case and the CPU win clears 10 points in every matched round. Playback correctness at rate transitions and actual speaker-to-screen sync require further qualification before a production route.

## Reproduce

```sh
node experiments/selective-audio-poc/prepare.mjs
node experiments/selective-audio-poc/control.mjs
node experiments/selective-audio-poc/eof.mjs
node experiments/selective-audio-poc/rate.mjs
node experiments/selective-audio-poc/seek.mjs
ROUNDS=3 WARMUP=4 SECONDS=20 node experiments/selective-audio-poc/cpu.mjs
python3 experiments/selective-audio-poc/analyze.py results/selective-audio-poc/cpu-1790298492499
```

Use new output directories for repeats; raw failed attempts are retained. The route source is [poc.mjs](../../experiments/selective-audio-poc/poc.mjs), preparation in [prepare.mjs](../../experiments/selective-audio-poc/prepare.mjs), and CPU harness in [cpu.mjs](../../experiments/selective-audio-poc/cpu.mjs).
