<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# AudioWorklet performance research — 2026-09-26

## Finding

The evidence supports overhead distributed across our mpv/PCM transport, synchronization, and browser audio machinery. It does not establish that AudioWorklet alone explains the high whole-browser CPU. The most actionable new finding is that **the installed Chrome 153 supports larger worklet processing blocks**, which we have not yet used in Demuxe. That offers an optimization that preserves PCM precision.

This research used primary browser documentation, current Chromium sources, Demuxe source inspection, and existing local measurements. The only new browser execution was a small API/block-size capability probe: no CPU benchmark, media playback qualification, build, or production change.

## Browser costs and why they exist

### Small processing blocks repeat fixed work

The Web Audio default is 128 sample frames. At 48 kHz that requires 375 graph/process invocations per second of continuous rendering. Smaller blocks reduce response latency but repeat invocation, graph, and bookkeeping work more often. Blocks are not necessarily individual OS wakeups: a device callback can cause several graph blocks to be processed together. Increasing a ring's capacity alone does not alter this processing size. [Web Audio render-size explainer](https://github.com/WebAudio/web-audio-api/blob/main/explainer/user-selectable-render-size.md), [current specification](https://webaudio.github.io/web-audio-api/#dom-audiocontextoptions-rendersizehint).

Chromium's worklet processor validates the port layout, reuses arrays when possible, zeroes output arrays, invokes JavaScript, and copies output into its native audio buses. Consequently a trivial PCM-copy processor still has browser-side overhead. The source does **not** support claiming fresh output-array allocation on every callback. [Chromium processor implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/webaudio/audio_worklet_processor.cc).

### Extra thread coordination

Activating a worklet introduces a separate worklet rendering task runner and output buffering in Chromium's audio destination. This creates scheduling/coordination work beyond the PCM loop. Native media-element playback also has audio threads; it is not free. [Chromium audio destination at the tested Chrome revision](https://raw.githubusercontent.com/chromium/chromium/792bf6722e73a45aa9e47c163b9901bdc17f3230/third_party/blink/renderer/platform/audio/audio_destination.cc).

The old Chrome profiling article describes worklets as lacking real-time priority. That statement should not be repeated as current fact: the tested revision requests real-time audio priority by default, subject to feature/platform behavior. Real-time priority also does not pin a thread to a performance core. [Historical profiling guide](https://web.dev/articles/profiling-web-audio-apps-in-chrome), [tested-revision worklet thread source](https://raw.githubusercontent.com/chromium/chromium/792bf6722e73a45aa9e47c163b9901bdc17f3230/third_party/blink/renderer/modules/webaudio/realtime_audio_worklet_thread.cc).

### Allocation and messaging can interfere with audio deadlines

Browser authors recommend preallocated storage, bounded work, and shared buffers for communication with worker-based audio engines. Repeated object allocation and MessagePort traffic can add collection and dispatch costs. These are potential causes of glitches/overhead, not evidence that GC dominates this application. Demuxe already keeps decoding outside the worklet and uses a SharedArrayBuffer for PCM, matching the recommended worker/sink architecture. [Chrome design patterns](https://developer.chrome.com/blog/audio-worklet-design-pattern), [Mozilla implementation guidance](https://hacks.mozilla.org/2020/05/high-performance-web-audio-with-audioworklet-in-firefox/).

## Costs specific to Demuxe

Source inspected on the current shared checkout:

| Area | Actual behavior | Implication |
| --- | --- | --- |
| `src/internal/wasm-player.ts:55` | Always requests `latencyHint: 'interactive'`; no render-size hint | Uses a low-latency configuration and the default 128-frame quantum even for movie playback |
| `native/ao_browser.c:49` and `web/filter-retained-engine-worker.js:117` | mpv writes a native PCM ring; a worker forwards samples into a second, fixed shared ring | Additional copy and consumption-feedback stage; the worklet does not directly consume mpv's ring |
| `scripts/build-selective-audio.py:31` | Produces a timestamp and playback-rate value for every PCM frame, then copies that metadata into the native ring | Work specific to separately synchronizing native video and mpv audio |
| `web/filter-retained-engine-worker.js:141` | Creates two Float64Array view objects during each active pump and copies metadata and PCM per frame | View-object churn and scalar loops; the views share existing buffers, so this is not allocation of two entire data buffers per pump |
| `web/selective-sync-worklet.js:51` | Scans newly published metadata for rate boundaries | Additional per-frame work; it does **not** rescan the entire 8192-frame buffer on every callback |
| `web/selective-sync-worklet.js:56` and `src/internal/wasm-player.ts:108` | About 47 timeline messages/s at 48 kHz, plus rate-boundary messages; main thread obtains output timestamps and dispatches events | Additional objects, messaging and clock coordination |
| `web/selective-sync-worklet.js:59` | Deinterleaves PCM into browser-provided channel arrays, with atomic epoch/generation/publication checks | Necessary output/safety work in the current architecture; removing those checks blindly could publish stale audio |

At 48 kHz stereo, PCM is 384,000 bytes/s, and the two Float64 metadata values contribute another 768,000 bytes/s before counting repeated passes. This is modest memory bandwidth. The concern is repeated loops, calls, synchronization and wakeups; byte volume alone does not explain a large CPU percentage. These code observations identify engineering targets, not measured per-function CPU shares.

## What existing evidence establishes

- The prior native-thread trace counted **23.60 ms on the AudioWorklet thread out of 173.15 ms across renderer threads** in its two-second slice: approximately 13.6%. Including AudioOutputDevice gives 24.5%. These are instrumented thread running times, not a removable percentage of whole-Chrome CPU. See `../selective-audio-scheduling/pcm-profile-2026-09-26T20-48-47.377Z/REPORT.md`.
- Replacing worklet output with scheduled AudioBufferSourceNodes reduced renderer instructions only about **6%** in that separate matched diagnostic. The mpv/PCM machinery remained. It did not establish a large worklet-only fix. See `../hevc-audio-path-comparison/REPORT.md`.
- Live AC3-to-FLAC24 removed the broader mpv/PCM/worklet path and reduced renderer instructions about **56%**, with live conversion included. That result favors simplifying the complete path; it cannot assign the saving to the worklet. See `../ac3-transcode/REPORT.md`.
- Removing the 20 ms latency-check timer or periodic diagnostics did not establish a substantial CPU saving. See `../selective-audio-scheduling/overhead-cost-2026-09-26T20-38-56.911Z/REPORT.md`.
- Slowing the PCM pump to 40 ms caused reproduced underruns while decoded data waited in the native ring. It was reverted. Fewer polls alone are not a safe fix; the producer feedback/forwarding design must preserve buffer headroom. See `../selective-audio-scheduling/poll-margin-2026-09-26T20-28-54.968Z/REPORT.md`.

These are separate experiments, not one normalized CPU campaign. No percentages from them were subtracted to fabricate an exact cost breakdown.

## New verified opportunity: configurable processing blocks

Chrome 153 added `renderSizeHint`. The normative property exposing the accepted size is `renderQuantumSize`; the older explainer's `renderSize` name is obsolete. The hint is not guaranteed to be honored. [Chrome 153 release notes](https://developer.chrome.com/release-notes/153#webaudio-configurable-render-quantum), [Web Audio specification](https://webaudio.github.io/web-audio-api/#dom-audiocontextoptions-rendersizehint).

`experiments/audio-worklet-research/quantum-probe.mjs` created short-lived contexts in installed Chrome **153.0.8010.53**, requested 48 kHz, and observed actual worklet output-array lengths. It reported:

| Requested render size | Latency hint | Actual block size | Nominal calls/s of continuous rendering | Reported base latency |
| --- | --- | ---: | ---: | ---: |
| 128 | interactive | 128 | 375 | 5.33 ms |
| 512 | interactive | 512 | 93.75 | 10.67 ms |
| 1024 | interactive | 1024 | 46.875 | 21.33 ms |
| 128 | playback | 128 | 375 | 21.33 ms |
| hardware | interactive | 128 | 375 | 5.33 ms |

Evidence: `quantum-capability.json`. Calls/s are computed from sample rate/block size, not timed benchmark results. Base latency is the API's early observation, not measured end-to-end or physical output latency. The 512-frame probe includes a startup gap between observed currentFrame values; this probe verifies block sizes only and provides no glitch-free or timing-continuity qualification.

This is different from the previous `latencyHint: 'playback'` experiment. That setting changes output buffering; it does not necessarily reduce JavaScript graph/process calls. The probe confirms that distinction on this installation. Neither `playback` nor `hardware` should be assumed to enlarge the processing block.

## Recommended implementation order

1. **Try a 512-frame render quantum behind an internal experimental option.** This preserves decoded PCM precision and reduces fixed invocation frequency by 4x; it does not promise a 4x CPU reduction. Our output loops already use the actual output-array length. Verify accepted size, timing, epoch acknowledgements, rate boundaries, drain/EOF and seek behavior before one bounded CPU comparison. Keep the existing worker pump cadence initially so two changes are not confused.
2. **Replace per-frame timeline metadata with bounded span descriptors.** For a run of samples with a common rate, store a starting media timestamp, absolute PCM-frame index, count, and slope/rate. Reconstruct times arithmetically while retaining true discontinuities, rate changes, generations and native epochs. This could eliminate several 48,000-iteration/s metadata passes without quantization, but its benefit and correctness are unmeasured.
3. **Cache the typed-array views and batch contiguous ring copies.** Refresh Wasm-backed views on memory-buffer identity change and preserve reset checks. This is a smaller cleanup; no large saving is predicted from it alone.
4. **Consider a demand-driven single-ring bridge as a larger change.** Avoid the intermediate copy/feedback timer if a safe shared-memory ABI can handle Wasm growth and epoch resets. Google describes low-watermark notification to a worker as a useful pattern. Never block the real-time worklet waiting for production.

Larger processing blocks leave the amount of PCM and metadata sample work essentially unchanged. If sample-level loops dominate, metadata/transport changes will matter more. FLAC24 remains the strongest measured alternative so far, with its explicit quantization tradeoff. No evidence justifies declaring every AudioWorklet implementation inefficient or automatically transcoding every format.
