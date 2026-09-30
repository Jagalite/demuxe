# Root isolation: HEVC Main10 / AC-3, 2026-09-26

## Conclusion

The large cost is the sum of native HEVC video presentation and a separate real-time browser PCM pipeline. In this fixture the native video path alone costs about 19% of one core. Removing the complete mpv worker tree saves about 5 points, but leaves most of the extra audio-path cost intact. Replacing the synthetic timestamped PCM pipeline with browser-generated stereo audio removes a further large renderer cost. The dominant extra cost is therefore in PCM production/transport/output and its browser coordination, not exclusively AC-3 decoding or an accidental mpv video decoder.

This isolates a subsystem/architecture cost. It does not claim that a single function accounts for every CPU cycle, that all of the engine delta is codec math, or that a production replacement has already been qualified.

## Protocol

Two fresh headed-Chrome launches, each with the standard 150-second startup trace and completed hardware-key task gate; profiling was stopped before playback. Same frozen bafdb3f3 runtime and HEVC10/AC-3 fixture as the published retest. Five-second warmup, one 12-second observation per diagnostic arm, fresh contexts. Raw samples retain process IDs, CPU counters, frame progression, visibility/focus, audio underruns, sync observations and errors. See identity.json and each result.json. Browser-process CPU remained approximately 0.3-0.4%; no whole-player idle subtraction. These are diagnostic interventions, not replacement README measurements or full lifecycle qualifications. Fixed arm order and one observation per arm limit precise savings estimates; compare only arms within the same launch.

## Block 1: remove mpv while retaining its browser audio pipeline

| Arm | Whole Chrome CPU | Renderer | GPU process | Frames / drops |
| --- | ---: | ---: | ---: | --- |
| Production split route | 32.88% | 17.76% | 13.89% | 360 / 0 |
| Same route, mpv worker tree replaced by synthetic timestamped PCM producer | 27.59% | 13.01% | 13.54% | 360 / 0 |
| Same native video, audio service destroyed | 18.78% | 5.00% | 13.28% | 360 / 0 |

The synthetic intervention terminates the engine worker and removes its worker-owner iframe (including pthread/IO descendants), retaining the AudioContext, AudioWorklet, gain, timestamp conversion, native-video clock and sync controller. A small worker fills the same ring with continuous 440/880 Hz stereo samples and matching PTS/rate metadata. The full and synthetic arms both consumed 576,000 frames, with zero pre-EOF underruns, zero drift corrections, zero selected mpv video tracks and no playback errors. Synthetic sync error remained approximately 1 ms. The synthetic audio is deliberately an isolation signal, not bit-identical AC-3 output.

Within this block, the roughly 14.1-point split-audio increment separates into roughly 5.3 points for the engine/pump versus its lightweight substitute, and 8.8 points retained by the synthetic PCM/browser-audio path. These are coarse ablation differences, not independent microbenchmarks.

## Block 2: distinguish PCM transport from browser-native audio synthesis

| Arm | Whole Chrome CPU | Renderer | GPU process | Frames / drops |
| --- | ---: | ---: | ---: | --- |
| Synthetic timestamped PCM, same selective AudioWorklet | 26.64% | 12.66% | 12.66% | 360 / 0 |
| Browser-native stereo oscillators, interactive AudioContext | 18.01% | 5.52% | 11.46% | 360 / 0 |
| Browser-native stereo oscillators, playback AudioContext | 16.69% | 4.76% | 11.06% | 360 / 0 |

The interactive native-oscillator arm preserves the video and stereo tone frequencies/amplitude but destroys the PCM service and supplies the tones through native OscillatorNode/GainNode/ChannelMergerNode processing. Interactive contexts report the same 5.33 ms base latency and 32 ms output latency in the PCM and native-tone arms. Thus a changed output latency does not explain their difference. Renderer CPU falls by about 7.1 points when the PCM path is removed. GPU variance contributes another 1.2 points, so the entire whole-Chrome delta must not be attributed to audio transport. Native tones are a diagnostic control, not a decoder or a production substitute for source audio.

The playback-latency arm reports 21.33 ms base latency and 48 ms output latency. It does not prove that changing latencyHint on the selective AudioWorklet would yield the same saving.

An additional `synthetic-no-control` arm was retained (24.49% total, 10.32% renderer), but its attempted AudioWorklet source interception did NOT take effect: server logs show the original module was fetched, and continuing finite timeline estimates confirm timestamp delivery remained active. It did disable the main-thread drift interval, EOF frame callback and timing interval. Do not describe this as timestamp-free PCM or use it to isolate all sync overhead. Its raw `accepted` flag checks playback progression, not success of this intended intervention.

## Code path and practical implication

`src/internal/wasm-player.ts` creates an interactive AudioContext and AudioWorkletNode. `web/filter-retained-engine-worker.js::pumpAudio` bridges PCM and per-sample PTS/rate metadata from native Wasm memory into a second shared ring. `web/selective-sync-worklet.js::process` consumes that ring at audio-render quantum cadence, scans rate metadata and posts timeline messages. The main-thread port handler obtains a DAC timestamp and the NativeMpvAudio controller coordinates it with browser video, including continuous EOF frame callbacks.

The standalone/ordinary mpv audio results cannot be compared to this full HEVC-video-plus-audio total as if they had identical workloads. The matched video-only control already costs about 19%; a very low whole-player target is not demonstrated for this video pipeline even without mpv.

The substantive optimization target is the PCM delivery architecture: investigate batched browser-native PCM scheduling while preserving sample accuracy, DAC-based A/V sync, seek/pause/rate behavior and EOF drain. The current evidence does not establish which replacement meets all those requirements or its final CPU figure. Decoder flags or additional diagnostics caching cannot eliminate the transport cost that survives removal of the entire decoder engine. No production files were changed during this investigation.

## Subsequent instruction-counter comparison

The [identical-video AAC/AC3 comparison](../hevc-audio-path-comparison/REPORT.md) supersedes strong attribution from these CPU-only deltas. It confirms real extra work in the selective route, but finds only about a 6% renderer-instruction reduction for scheduled PCM; changing processor execution conditions can magnify CPU-time differences. Retain the observations above as historical diagnostic evidence, not a demonstrated fixed transport cost or a promised 33% production saving.
