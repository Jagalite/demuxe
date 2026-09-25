# Native to Hybrid CPU gap attribution — 2026-09-24

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local. Linked full Chrome traces remain local-only; the index records their paths and hashes.

**Forensic update:** A later offline inspection of these same traces identified `VideoToolboxVideoDecoder` in the decoded-frame shared-image descriptors for all three arms, and linked the visible Hybrid path to per-frame source-size RGB allocation/copy in matching Chromium source. See the [presentation mechanism report](../hybrid-presentation-matrix/REPORT.md). CPU measurements below are unchanged.

## Decision

**PRESENTATION/COMPOSITOR IS THE MAIN GAP** for this frozen H.264 1080p60/AAC workload. Across five accepted counterbalanced rounds, forced Hybrid used **31.12 more percentage points of one CPU core** than Native Direct (median paired difference; **+56.8% relative to Native**). The test-only Hybrid no-draw arm kept WebCodecs decode, retained-frame ownership, mpv frame selection and acknowledgement, AAC output, and normal cadence. Suppressing visible Canvas2D presentation removed **24.46 points** (median paired B−C), or a median **79.0% of each round's Native→Hybrid difference**. The residual C−A whole-Chrome difference was **+6.15 points**.

The 24.46-point subtraction is an **upper bound for visible Hybrid presentation and the browser work it triggers**, not a measured cost of one `drawImage` call. C is blank while Native remains visible; C−A therefore is a net comparison, not an isolated mpv or decoder timer. The high no-draw renderer bucket is partly offset by the absence of Native's GPU presentation. The Chrome trace locates the removed work in Canvas2D GPU raster and compositor activity, but does not separate VideoFrame import, raster, texture/mailbox handling, and final composition into additive CPU shares.

## Frozen fixture and method

All three arms used the **same file**, `h264-1080p60-aac.mkv`, SHA-256 `ff9eaa0edcf2984122af9b4f7fe16fdfa088c7bed2c27606f291f23e4eeb5223`. Its H.264 packet signature is `cd34a31cc50cb250fd28b3936c73a24f001e6dd79b9f0f750b7a598c31e58c9a`: 1,800 identical encoded video packets with the same PTS, DTS, sizes, payload hashes, and GOP structure in every arm. AAC is 48 kHz stereo. The source is motion-bearing Big Buck Bunny animation at 1920×1080, 60 fps, about 3.64 Mb/s video, 30 seconds. [Prior packet manifest](../unsupported-audio-cpu/20260924-three-arm-qualified/fixtures/h264-1080p60-packet-manifest.json).

The browser was headed Chrome `153.0.8010.53` on Apple M1/macOS 25.5.0. Each arm had a fresh launch, the same 960×540 stage, 4 seconds warmup, and a roughly 20-second CPU window. Five rounds rotated A/B/C order. CPU is the sum of CDP `SystemInfo.getProcessInfo` CPU-time deltas divided by measured elapsed wall time, expressed as percentage points of **one core**. Process IDs remained stable at the start, middle, and end of all 15 accepted windows. All arms passed route, progress, frame-cadence, audio-continuity, and browser-error gates.

The research [preparation script](../../experiments/hybrid-gap/prepare.mjs) clones the prior frozen AAC fixture and runtime into `build/hybrid-gap/assets`, verifies the runtime hashes, and patches only its cloned worker and generated worker URL. In C, the worker skips `videoPresenter.draw()` and subtitle drawing, while still receiving, selecting, retaining, closing, and acknowledging each frame. B uses the same cloned runtime with that branch inactive. The source revision recorded with the fixture is `904853dd1f126badbaf44b0c4936ecfd5e66d04d`; the two patched asset hashes are in `build/hybrid-gap/assets/attribution-preparation.json`. Production routing and behavior were not edited.

An initial three-round exploratory run accepted its playback windows but its JSON was truncated by an exclusive request-log collision during a later resume attempt. It is **excluded** from every number below. The five-round run used a new directory, unique request logs, and atomic result writes. The failed run's request log and empty result file remain in `20260924-h264-three-arm/` for audit.

## Matched CPU result

Medians of five **accepted** windows. Each table column is medianed independently, so row components need not sum exactly to its whole-Chrome median. `Other` is network and storage services, each negligible here.

| Arm | Whole Chrome | Browser | Renderer | GPU | Audio service | Other |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Native Direct H.264/AAC | 54.77% | 32.54% | 6.30% | 15.02% | 0.84% | 0.06% |
| B — production Hybrid H.264/AAC | 84.96% | 40.42% | 20.53% | 23.35% | 0.62% | 0.02% |
| C — Hybrid no-draw H.264/AAC | 61.20% | 33.52% | 21.26% | 4.84% | 0.53% | 0.02% |

Paired differences are calculated *within each round* before taking their medians. They therefore need not add exactly when displayed as medians.

| Comparison | Whole Chrome | Browser | Renderer | GPU | Audio service | Paired whole range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| B−A: total Hybrid tax | **+31.12 pp** | +8.49 | +13.93 | +8.72 | −0.23 | +29.34 to +32.08 |
| B−C: visible presentation upper bound | **+24.46 pp** | +7.25 | −0.81 | +18.50 | +0.02 | +23.19 to +26.23 |
| C−A: residual net gap | **+6.15 pp** | +1.16 | +15.07 | −10.09 | −0.29 | +4.67 to +8.76 |

B−A, B−C, and C−A were positive in all five pairs. Their direction is stable on this host and fixture; the exact two-sided sign-test p-value for five same-direction pairs is 0.0625, so these are descriptive replication results rather than a conventional p<0.05 population claim. The per-round B−C share of B−A ranged from 72.7% to 84.2%, median 79.0%. A net residual of six points does not imply that all non-presentation components cost six points: C removes visible video work that A still performs.

Three fresh headed `about:blank` controls, using the same launch and 4+20-second timing, consumed **29.64–31.45%** of one core, almost entirely in Chrome's browser process. This establishes a substantial browser-process baseline unrelated to media. It is not subtracted from different launches. Network service was at most 0.07 point in playback windows; storage was about 0.001 point. B−C's browser-process increase is repeatable across the paired rounds, but the idle control prevents treating the whole browser bucket as playback-specific.

## Frame, audio, and mpv checks

Both Hybrid arms submitted and produced about **1,200 WebCodecs frames per 20 seconds**, with about 10.9 MB of compressed packet input, shared packet inputs, zero shared-packet fallbacks, zero explicit frame-copy time, and bounded retained/pending peaks of four and one. Both received, logically presented/acknowledged, and closed about 1,200 frames; C made **zero visible canvas draws**. The worker's `drawn` and `canvasSubmissions` counters increment after acknowledgement even in C, so they are *logical frame counters* there. The output-versus-ack count at a window boundary is not a display-drop counter. Missing retained frames and WebCodecs errors were zero. Native reported zero HTML video drops; mpv recorded one frame drop in one B window, zero in the other nine Hybrid windows, and zero decoder frame drops.

The Hybrid AAC chain stayed selected: mpv reported selected H.264 video and AAC LC stereo audio tracks, a 2×2 video placeholder (`video-params`), `avsync` of about 2–14 ms at sampled window ends, and a 48 kHz stereo AudioWorklet consuming about 960,768 PCM frames per window. There were zero audio underruns; audio-consumption versus media-position drift was within ±18 ms. This runtime does not export a direct mpv video/audio chain count or internal demux, audio decode, and filter CPU timers. Track selection, placeholder video parameters, WebCodecs counters, PCM consumption, and progress are the available chain-state evidence.

Worker pump ticks were about 1,576 in B and 1,453 in C per 20 seconds. The no-draw arm therefore preserves polling and mpv selection but does not have identical pump counts; drawing's completion timing can affect scheduling. Browser tracing's synchronous `FunctionCall` spans for the engine worker totaled about 161 ms in a six-second B trace and 66 ms in C. These wall spans include waiting inside calls and exclude subsequent raster/GPU work; they are not CPU shares. Their difference is far smaller than the approximately 4.9 CPU seconds represented by the 24.46-point B−C gap over 20 seconds. The compressed-packet bridge submitted the same order of bytes/frames in B and C, and the trace showed comparable `VideoDecoder::Decode` and output events. Per-component CPU for packet construction, mpv clock, and VideoFrame transfer remains unmeasured; the counters and trace rule out a change in throughput as the explanation for B−C.

## Decoder backend and asynchronous presentation trace

A separate six-second trace per arm was collected after the CPU study, with Chrome `Media` events plus media, GPU, compositor, Skia, timeline, and V8 categories. Trace instrumentation was **not** active during the CPU windows. Native's `Media.playerPropertiesChanged` explicitly reports `kVideoDecoderName=VideoToolboxVideoDecoder` and `kIsPlatformVideoDecoder=true`; its log says VideoToolbox was selected for H.264. Hybrid does not emit an equivalent media-player property. Its WebCodecs configuration requested `hardwareAcceleration: no-preference`. A subsequent offline inspection found the explicit `VideoToolboxVideoDecoder` producer label in every decoded-frame shared-image descriptor in A, B and C; their NV12 storage/color descriptions match. The same named backend is therefore established for these H.264 traces. The matching ARM H.264 source requires hardware decode, although a direct per-session hardware-use property was not recorded. See the [forensic evidence](../hybrid-presentation-matrix/REPORT.md#decoder-evidence-corrected). Mojo/GPU activity, NV12, and `isConfigSupported()` alone would not establish this.

| Six-second trace event | Native A | Hybrid B | No-draw C |
| --- | ---: | ---: | ---: |
| Decoded-frame callback (`MojoVideoDecoder::OnVideoFrameDecoded`) | 364 | 360 | 362 |
| `VideoDecoder::Decode` (WebCodecs-facing trace) | 0 | 720 | 724 |
| `RasterDecoderImpl::DoRasterCHROMIUM` | 0 | **362** | **0** |
| `GpuChannel::ExecuteDeferredRequest` | 29 | **1,922** | **12** |
| `GPUTask` | 0 | **1,188** | **0** |
| `Display::DrawAndSwap` | 362 | 358 | 0 |
| Native direct `VideoFrameSubmitter::SubmitFrame` | 362 | 0 | 0 |

These event counts locate a new raster/GPU submission path tied to visible Hybrid canvas presentation while decoder output persists in C. Both Hybrid traces also had **363 `MojoVideoFrameHandleReleaser::ReleaseVideoFrame` events**, showing that frame ownership/release activity remained active in no-draw. Native uses a direct video-frame submission path rather than the traced Canvas2D raster sequence. Chrome's asynchronous events do not expose reliable additive CPU time for VideoFrame import, texture/mailbox copy, raster, and compositor. No explicit full-frame `VideoFrame.copyTo()` runs in this Hybrid route. The no-draw trace has no visible redraw work after its initial static canvas state.

## Prior small-gap audit

The earlier [real-resolution report](../head-to-head/real-resolution-20260923-01/REPORT.md) contains a **+3.7% relative** figure for *Demuxe Native Direct versus plain browser* on a **different, synthetic** H.264 1080p60/AAC fixture. It is a Native wrapper comparison, not a Hybrid overhead measurement. The same campaign's forced Hybrid row was **74.3% versus 53.3% Native**, a **+21.0 core-point** gap, using headed Chrome and roughly 20-second windows. Its HEVC 4K24 Hybrid row was +25.8 points versus Native. It used a 36-second `testsrc2` source and did not establish the actual WebCodecs backend.

The older [README dual-audio row](../../README.md#L240) places 41.7% for its Native lane next to 46.2% for Auto, but Auto selected Native Direct while AAC was selected and switched to Hybrid only on AC-3 selection. Those figures do not compare forced Hybrid AAC against Native AAC under one route and CPU protocol. The earlier [320×180/same-player presentation study](../hybrid-presentation/REPORT.md) used different fixtures, shorter windows, and a large varying browser-process baseline; its native-video-only arm omitted selected audio and a shared A/V clock. None of these is a reproducible roughly 3% Native→Hybrid control for the present realistic fixture.

| Earlier apparent small-gap case | Fixture and cadence | Actual route comparison | Chrome/window and visible path | Decoder backend evidence |
| --- | --- | --- | --- | --- |
| `+3.7%` in real-resolution report | synthetic 1080p60 H.264/AAC, 36 s | plain browser Native vs Demuxe Native Direct | headed Chrome 153, rotated fresh launches, ~20 s; both visible native video | not established there |
| forced Hybrid in the same report | same synthetic 1080p60 file | Demuxe Native Direct vs forced Hybrid, **+21.0 pp** | same campaign and method; native video vs retained canvas | WebCodecs active; concrete backend not established |
| README dual-audio small row gap | separate dual-audio H.264 MKV | Native lane vs Auto with AAC selected; **both Native Direct** | older campaign; no matched Hybrid AAC arm | not established |
| small-fixture presentation study | 320×180 synthetic video and a different 1080p60 remux | Hybrid variants or native *video only* | 12 s windows, some same-player phases, different audio/visible contracts | not established |

## Limits and evidence

This result supports a **presentation-associated main cost** on one realistic, motion-bearing H.264 workload and one Chrome/macOS machine. The later forensic inspection identifies the same named VideoToolbox implementation in both routes, but does not isolate the residual renderer work among mpv audio/demux/clock, compressed-packet bridge, native decoder callbacks, and worker runtime. Native AAC uses Chrome's FFmpeg audio decoder while Hybrid AAC uses mpv PCM and AudioWorklet; C−A still includes that architecture change. The no-draw arm intentionally fails visible-video correctness and gives an upper bound, not an alternative player route or a production saving. No selective native-video/software-audio route is justified by this attribution alone.

- [Five-round raw result](20260924-h264-five-rounds/h264-1080p60-result.json.zst), [paired analysis](20260924-h264-five-rounds/analysis.json.zst), [idle control](20260924-idle.json).
- [Trace summary](20260924-traces/analysis.json.zst), [Media events and full trace index](20260924-traces/summary.json.zst), and compressed Chrome traces [A](20260924-traces/A-trace.json.gz), [B](20260924-traces/B-trace.json.gz), [C](20260924-traces/C-trace.json.gz).
- Research scripts: [prepare](../../experiments/hybrid-gap/prepare.mjs), [CPU runner](../../experiments/hybrid-gap/run.mjs), [CPU analysis](../../experiments/hybrid-gap/analyze.mjs), [trace runner](../../experiments/hybrid-gap/trace.mjs), [trace analysis](../../experiments/hybrid-gap/analyze-trace.mjs), [idle control](../../experiments/hybrid-gap/idle.mjs).
