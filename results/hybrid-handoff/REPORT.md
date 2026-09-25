# Hybrid CPU gap: GPU command submission, canvas publication, and browser background work

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local.

Research-only investigation, 2026-09-24 local time. Production routing, decoding, scheduling and audio remain unchanged. This extends the [matched three-arm investigation](../hybrid-gap/REPORT.md) and [presenter-only WebGPU comparison](../hybrid-external-texture/REPORT.md).

## Frozen experiment

Realistic Big Buck Bunny H.264 1920×1080/60, AAC 48 kHz stereo, same single file in every arm: SHA-256 `ff9eaa0edcf2984122af9b4f7fe16fdfa088c7bed2c27606f291f23e4eeb5223`. Headed Chrome 153.0.8010.53 on Apple M1. Canvas and CSS output 960×540. Four seconds warmup, approximately 20 seconds CPU measurement, fresh Chrome per arm. CPU values are percentages of one core; differences are absolute core percentage points. Native stack samples and traces are separate diagnostic phases, never active in CPU windows.

A/B/C/D diagnostic pass adds OS per-thread cumulative CPU counters to the existing process counters. It is one pass, not a replacement for the previous five-round estimates. Darwin thread snapshots have slightly different boundaries, omit threads that exit or appear between snapshots, and should not be forced to sum exactly to CDP process CPU.

| Arm | Whole Chrome | Browser | Renderer | GPU | Audio service | All non-browser processes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A Native | 51.60 | 31.21 | 5.96 | 13.54 | 0.82 | 20.38 |
| B Hybrid Canvas2D | 81.51 | 38.79 | 19.65 | 22.40 | 0.66 | 42.72 |
| C Hybrid no-draw | 62.52 | 35.60 | 21.54 | 4.88 | 0.48 | 26.92 |
| D Hybrid WebGPU | 82.84 | 38.07 | 23.28 | 20.78 | 0.67 | 44.77 |

This pass reproduces a +29.92 point whole-Chrome B−A gap, with +22.34 points in non-browser processes. B−C is +19.00 whole / +15.80 non-browser; C−A is +10.92 whole / +6.54 non-browser. These latter quantities are counterfactual differences, not independent additive subsystem timers: C removes presentation that Native still performs. In particular, no-draw still has substantial renderer CPU while its GPU CPU falls below Native.

## 1. Browser background work is a separate confound

The browser's `ThreadPoolBackgroundWorker` consumes 28.16 points in A, 35.70 in B, 31.94 in C and about 34.86 in D. Its separate native stack samples are dominated by `SecItemCopyMatching` → macOS Security / CryptoTokenKit / `TKRemoteSEPKey` / XPC. The same call chain was present in the earlier idle-browser sample. This is evidence of browser background Keychain activity, not a media decoder or canvas call chain. No credentials or key contents were accessed by this investigation.

The matched-thread browser-background difference B−A is about +7.54 points, nearly the entire +7.58 browser-process difference in this diagnostic pass. Sampling occurred after the CPU window, so attribution of every CPU tick to a particular Security function is not established; the combination of named-thread CPU and recurring stacks strongly identifies the confound. Chrome release symbols do not reveal its exact higher-level caller here.

We retain whole-Chrome figures and also show the concurrently measured sum of non-browser processes. We do not subtract an unrelated idle launch, rename that sum whole-player CPU, or treat cross-launch browser changes as playback component cost.

## 2. Same decoded surface, different presentation machinery

All A/B/C/D lightweight traces identify `VideoToolboxVideoDecoder`-labelled NV12 opaque shared images with matching dimensions, color metadata and usage flags. Native invokes `VideoFrameSubmitter::SubmitFrame` / `VideoResourceUpdater::CreateForHardwareFrame` about once per displayed frame. Hybrid does not use that native video submission path.

The exact named backend is now observed for both Native and WebCodecs. A software WebCodecs fallback is not supported by this evidence. Per-session VideoToolbox hardware properties were not recorded; the exact-version ARM H.264 source's hardware requirement supports hardware use on this M1, but is distinct from direct session-property evidence.

Canvas2D creates a full-source 1920×1080 intermediate and performs raster work; WebGPU eliminates that observed sequence. Nevertheless both generate substantial GPU command-buffer processing, with separate native GPU samples showing Metal command submission and texture/IOSurface cleanup. Changing the presenter API therefore removes a particular conversion/allocation path without removing the broader GPU rendering and publication path.

Eight-second lightweight trace counts:

| Event | Native | Canvas2D | No-draw | WebGPU |
| --- | ---: | ---: | ---: | ---: |
| Decoded frame callback | 480 | 484 | 482 | 481 |
| Source-size shared-image creation | 0 | 483 | 0 | 0 |
| Canvas2D raster | 0 | 482 | 0 | 0 |
| GPU deferred request | 34 | 2,584 | 15 | 1,517 |
| Display draw/swap | 482 | 474 | 0 | 479 |
| V8 profiler threads | 0 | 0 | 0 | 0 |

GPU deferred-request thread durations total 6.62 ms Native, 503.71 ms Canvas2D, 3.20 ms no-draw and 368.22 ms WebGPU. The Canvas2D command-flush span is 373.99 ms; WebGPU 358.47 ms. These are **nested, partial instrumented spans**, not additive complete CPU budgets. Core Animation commit thread spans are actually larger in Native (276.59 ms versus ~64–66 ms Hybrid), so it would be wrong to label the entire presentation-associated difference final compositor commit CPU.

The earlier heavy trace created eleven V8 profiler threads and disrupted WebGPU display cadence. Removing that category restores nearly matched display-swap counts. Counts do not prove unique frame scanout, but the previous trace is not evidence of a normal-playback dropped-frame defect.

## 3. Remaining Hybrid machinery

Dedicated renderer workers consume about 12.45 points in Canvas2D, 13.70 in no-draw and 14.70 in WebGPU in the diagnostic pass. These aggregate multiple workers. The native samples are insufficiently symbolized to divide their Wasm/Chrome frames reliably into mpv demux, AAC decode, mpv clock scheduling, packet bridging and runtime bookkeeping. Those pieces must not be assigned invented percentages.

The unchanged pump runs roughly 1,632–1,688 times per 20-second window, polls mpv events and render selection, and services PCM. Around 1,204–1,205 frames are selected/acknowledged. Submitted compressed packets use the shared packet input; software decoder-copy time and shared-packet fallbacks are zero. No network bytes are fetched during these windows; network/storage CPU is negligible. Retained queue peaks are four to five, pending peak one, with no missing frames or decoder errors. The no-draw residual is consistent with a smaller but real Hybrid runtime cost; it is not evidence that software AAC decoding alone accounts for it.

### Attribution boundaries by component

| Component | Evidence | What remains unresolved |
| --- | --- | --- |
| Decode/backend | Same named VideoToolbox backend and NV12 shared-image descriptors in all four arms | WebCodecs versus native IPC/decoder-wrapper CPU is not isolated |
| Compressed-packet bridge | ~10.9 MB per window, ~1,205 shared packet inputs, zero fallback inputs | Per-packet callback/IPC cost is included in worker CPU |
| mpv video scheduling/clock | Same scheduler in all Hybrid arms; ~80–84 pump ticks/s | mpv demux, AAC decode, clock and event polling lack independent native CPU timers |
| VideoFrame transfer/ownership | ~60 frames/s, bounded queues, zero missing frames; no software frame-copy counter growth | Native shared-image handle lifetime and driver synchronization are not wholly visible to JS |
| Canvas2D import/raster | Full-source intermediates/raster disappear under WebGPU | Their removal does not predict a whole-player saving |
| GPU command processing/publication | Large Hybrid command streams; Metal submission samples; factorial GPU-target controls | Internal driver subregions cannot be assigned additive CPU shares from nested traces |
| Worker/runtime overhead | Dedicated-worker CPU persists with no draw; net non-browser C−A ~6.54 points in this pass | C removes Native's visible presentation too, so the residual is not a standalone mpv CPU budget |
| Browser noise | High-CPU background worker repeatedly sampled in Keychain/Secure Enclave call chains | Exact Chrome caller and reason for launch-to-launch intensity changes |

## 4. Video rendering versus visible canvas publication

A research-only 2×2 ablation retains WebCodecs decoding, frame receipt/selection/acknowledgement, mpv/audio and cadence. It varies only the render operation and its target:

- D: external-video texture → visible GPU canvas.
- E: external-video texture → persistent GPU texture, with the same shader and queue submission but no visible canvas publication.
- F: changing solid-color clear → visible GPU canvas, without importing/sampling the VideoFrame.
- G: changing solid-color clear → persistent GPU texture.

All modes submit one render pass per selected frame, use store operations and perform no readback or per-frame GPU-completion wait. Offscreen targets still receive explicit GPU queue submissions; this avoids relying on a detached Canvas2D whose work Chrome could defer until display. Nonetheless GPU execution is not timed and drivers may optimize clears. E/F/G are attribution ablations, **not correct video playback or candidate production presenters**. Retained frames continue to be decoded and released normally.

All **12/12 windows passed** route, logical cadence, audio continuity, process stability and browser-error checks. Orders were D/E/F/G, G/F/E/D, D/E/F/G. Three rounds are a bounded attribution check, not broad platform qualification. Medians are calculated independently; paired differences are calculated within each round before taking the median.

| Operation / target | Whole Chrome | Browser | Renderer | GPU | Audio service | Non-browser sum |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| D: Video → visible canvas | 79.46 | 36.55 | 22.75 | 19.63 | 0.56 | 42.91 |
| E: Video → persistent GPU texture | 74.54 | 37.75 | 22.43 | 13.65 | 0.65 | 36.79 |
| F: Changing color → visible canvas | 76.56 | 33.03 | 24.59 | 18.18 | 0.73 | 43.52 |
| G: Changing color → persistent GPU texture | 61.50 | 31.18 | 21.69 | 8.84 | 0.63 | 31.18 |

Controlled paired differences, in core points:

| Comparison | Whole-Chrome median | Non-browser median | Non-browser values across rounds |
| --- | ---: | ---: | --- |
| D-E: Visible publication with video | +5.70 | +6.91 | +5.81, +6.91, +7.40 |
| F-G: Visible publication with changing color | +9.56 | +11.48 | +11.48, +16.63, +9.53 |
| D-F: Video import/sampling with visible target | +5.29 | +0.26 | +0.26, -4.55, +0.66 |
| E-G: Video import/sampling with persistent target | +12.26 | +5.17 | +5.92, +5.17, +2.79 |

The visible-versus-persistent target difference repeats in every round: +5.81 to +7.40 non-browser points with video, +9.53 to +16.63 with changing color. Video import/sampling itself adds +2.79 to +5.92 points with a persistent target, but has no stable incremental cost with the visible target (−4.55 to +0.66). The full visible-video and visible-color paths therefore cost almost the same outside the noisy browser process. The whole-Chrome D−F difference of +5.29 points would give a misleading audio/video attribution: its paired browser difference is +4.62 points, while the non-browser median is only +0.26.

**These effects are not additive.** Import/sampling, rendering, command submission and publication share work, synchronization and possible driver optimizations. The experiment does not prove an isolated 6.91-point compositor function or a 5.17-point color-conversion function. It proves that substantial CPU persists when video import/sampling is absent, and that publishing the target introduces substantial cost even for a simple changing clear. Fixed GPU command/lifecycle and canvas publication costs explain why eliminating Canvas2D's full-source intermediate was insufficient.

Each accepted window submitted roughly 1,200 render passes. D/E imported once per draw; F/G imported zero VideoFrames. GPU error arrays stayed empty, missing-frame and audio-underrun counters remained zero, and decode/retained-frame throughput continued. One mpv frame drop occurred in D round 3 (counter 0 → 1); all other mpv frame-drop and decoder-frame-drop deltas were zero. This remained within the predeclared cadence gate. Excluding that round leaves the same direction for D−E in both remaining pairs and still no stable D−F saving. These controls do not claim visual correctness for the deliberately blank/color/offscreen arms.

The [runtime hashes](runtime-hashes.json) show only the cloned presenter and its URL selection changed relative to the preceding WebGPU candidate; decoder/mpv/audio workers are unchanged.

## Interpretation and decision

The best-supported explanation is a combination of:

1. **An expensive GPU/canvas presentation path:** GPU command-buffer processing, Metal resource/submission work and visible canvas publication. Native submits the decoded hardware frame through its video-specific path. The final Core Animation commit alone is not the culprit, and the Canvas2D source-size intermediate is not the sole cause.
2. **A smaller Hybrid machinery residual:** workers, mpv/audio/clock and WebCodecs bridge/lifecycle work persist without drawing. This pass leaves about +6.54 non-browser points above visible Native, without enough symbolized evidence to divide it reliably.
3. **A separate browser background confound:** repeated Keychain/Secure Enclave work explains most of the browser-process movement in the diagnostic A/B comparison. This inflates or masks whole-Chrome differences without explaining the persistent renderer/GPU penalty.

No evidence supports expensive unsupported audio, a software WebCodecs fallback, runaway duplicate draws, unbounded retained frames or synchronous PCM copying as the main explanation for this fixture. The external-texture API swap does not remove the expensive shared work. A future presenter experiment would need to reduce per-frame GPU/canvas work or use a video-specific presentation mechanism; merely changing the sampling API is not justified as a CPU fix. No replacement architecture or production routing change is implemented or qualified here.

**Conclusion: PRESENTATION/COMPOSITOR IS THE MAIN GAP**, specifically the broader GPU rendering/submission and canvas publication path. This is strong attribution of a cost region, not a completely symbolized accounting of every CPU tick or proof that every Hybrid route has the same penalty.

## Evidence and reproduction

- [Raw process/thread windows and native samples](thread-cpu-and-samples/), [reproducible analysis](thread-cpu-and-samples/analysis.json.zst).
- [Lightweight trace summary](light-traces/summary.json.zst), [descriptors and counts](light-trace-forensics.json).
- [Factorial raw windows](factorial/h264-1080p60-960x540-result.json.zst), [analysis](factorial/analysis.json.zst).
- [Preparation](../../experiments/hybrid-handoff/prepare.mjs), [offline analysis](../../experiments/hybrid-handoff/analyze.py).

```sh
cc -O2 tests/subtitle-thread-cpu.c -o build/hybrid-handoff/thread-cpu
ASSETS=build/hybrid-external-texture/assets CASE=h264-1080p60 ARMS=A,B,C,D ROUNDS=1 WARMUP=4 SECONDS=20 THREAD_CPU=build/hybrid-handoff/thread-cpu NATIVE_SAMPLE=1 RESULTS=results/hybrid-handoff/thread-cpu-and-samples node experiments/hybrid-presentation-matrix/run.mjs
ASSETS=build/hybrid-external-texture/assets CASE=h264-1080p60 ARMS=A,B,C,D SECONDS=8 LIGHT=1 HARNESS=results/hybrid-external-texture/three-pairs/h264-1080p60-harness RESULTS=results/hybrid-handoff/light-traces node experiments/hybrid-presentation-matrix/trace.mjs
node experiments/hybrid-handoff/prepare.mjs
ASSETS=build/hybrid-handoff/assets CASE=h264-1080p60 ARMS=D,E,F,G ROUNDS=3 WARMUP=4 SECONDS=20 THREAD_CPU=build/hybrid-handoff/thread-cpu RESULTS=results/hybrid-handoff/factorial node experiments/hybrid-presentation-matrix/run.mjs
python3 experiments/hybrid-handoff/analyze.py results/hybrid-handoff/thread-cpu-and-samples
python3 experiments/hybrid-handoff/analyze.py results/hybrid-handoff/factorial
```

Use fresh output directories when repeating. This experiment establishes behavior of the frozen H.264/M1/Chrome workload; it does not complete the paused HEVC/AV1/output-size matrix or establish universality across Hybrid routes/platforms.
