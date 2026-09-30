<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# PCM path and audio thread profiling

Current retained EOF-observer change, original 10 ms PCM polling, original interactive AudioContext latency. Same HEVC10/AC3 URL fixture. No production source changed in this investigation.

## JavaScript and Wasm sampling

A five-second headed-Chrome V8 profile covers 13 page/worker targets. It identifies PCM pumping, event pumping, main-thread publication and timing work, plus codec work on an mpv worker. The worker self-samples attributed 19.0 ms to pumpAudio, 14.9 ms to _emscripten_get_now, 8.9 ms to tick and 8.8 ms to setTimeout. Those are instrumented sampling weights, not a process-CPU attribution or expected optimization savings.

The mpv threads spend most observed stack residence in emscripten_futex_wait or idle. Waiting samples must not be counted as busy CPU. AC3 decoding functions appeared, but were not an obvious dominant sampled loop. I/O was mostly idle. AudioWorklet JavaScript is not fully represented by these ordinary page/worker targets, so these profiles cannot clear its metadata scanning or output processing as negligible.

Raw V8 profiles: profiles.json; condensed self-samples: js-summary.json. There is no evidence here of a single pathological PCM copy loop explaining the entire renderer cost.

## Native thread scheduling trace

After stopping V8 sampling, playback was paused, sought to 3 seconds, resumed, and allowed two seconds to settle. A separate three-second Instruments System Trace attached to the renderer. Thread-state Running intervals were clipped to trace time [1s,3s] to avoid incomplete startup intervals, filtered by renderer PID 41635, and summed by thread. This is instrumented execution, not an unprofiled benchmark or comparison to previous CPU windows.

| Thread | Running time during the 2-second slice |
| --- | ---: |
| Main thread | 28.36 ms |
| Realtime AudioWorklet | 23.60 ms |
| AudioOutputDevice | 18.91 ms |
| Two busiest dedicated workers combined | 29.70 ms |
| VideoFrameCompositor | 10.92 ms |
| All renderer threads | 173.15 ms |

The AudioWorklet and AudioOutputDevice threads together account for 42.51 ms, about 24.5% of observed renderer running time in this trace. This includes browser audio execution, not just our PCM loops, and must not be called removable overhead. Dedicated-worker OS thread IDs are not mapped conclusively to individual V8 targets. Main and thread-pool work likewise cannot all be assigned to audio.

Both P and E cores executed these threads. AudioWorklet running time split approximately 11.74 ms P / 11.86 ms E; AudioOutputDevice 8.88 ms P / 10.03 ms E. This demonstrates mixed residency during this instrumented slice, not where earlier unprofiled windows ran. Profiler overhead, startup work and scheduling perturbation remain limitations.

Raw trace: renderer.trace. Exports: trace-toc.xml, thread-state.xml, time-profile.xml. Summaries: thread-summary.json and thread-core-summary.json. XML values are nanoseconds; references resolve by id/ref.

## Low-latency configuration experiment

WasmPlayer constructs AudioContext with latencyHint=interactive even for selective media playback. Given the observed audio-thread activity, a test-only override requested playback latency for selective audio. A separate correctness context exercised the same AC3 lifecycle while an intended CPU comparison waited at its startup gate.

The prototype passed steady playback, pause/resume, 0.5x/2x/1x rates, forward/backward and paused seeks, and the 0.5x EOF/replay path, with zero recorded pre-EOF underruns through those phases. It then failed the 2x EOF check: the selected backend no longer exposed mpvAudio, so the drain predicate could not complete. The available failed record does not capture the underlying transition reason; the catch-state collector has been improved to preserve diagnostics when the audio service disappears. This is a failed candidate screen, not proof of causality from the latency hint.

Correctness record: ../2026-09-26T20-52-59.925Z/hevc10-ac3.json. The CPU run was cancelled before any measurement window; see ../playback-latency-2026-09-26T20-52-59.383Z/status.json. The correctness harness required forced termination after browser shutdown hung. No CPU saving is claimed. Interactive latency remains unchanged in production.

## Result

The evidence narrows the remaining work to a distributed path: native decode/runtime, PCM/event pumping, browser audio rendering/output, and main-thread coordination. It does not identify a large, safely removable function or qualify an audio-buffering change. No production fix is justified by this profile alone. The prior 40 ms polling regression remains reverted. Further work should isolate PCM/metadata processing while preserving the existing output buffering and lifecycle, rather than simply widening polling or switching latency defaults.
