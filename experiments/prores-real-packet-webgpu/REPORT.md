# Experiment-only real-packet retained ProRes playback

**Status: experimental / correctness-proven / performance-negative / deferred.**
This remains a real-packet architecture test and correctness oracle, not a
production WebGPU codec or a near-term CPU optimization. The later
[direct-pack attribution](ATTRIBUTION.md) removed avoidable coefficient copies
but still measured 30.98% Chrome CPU for WebGPU versus 26.41% for Software
in the final paired runs. The production codec registry and Auto routing stay
unchanged. Future investigation starts from the evidence retained here; no
further ProRes GPU optimization is planned from these results alone.

## Result

The **180-frame, 640×360, 30 fps ProRes Proxy 10-bit 4:2:2 fixture** played
through mpv's demux and selected-frame timing at normal speed. The experiment
used FFmpeg 9.0.2's instrumented ProRes parser and entropy decoder on the
mpv decoder thread, then reconstructed and presented the frame in the same
browser worker and WebGPU device. In each of three no-readback GPU playback
rounds, mpv delivered **180 packets**, and the GPU path decoded and presented
**180 distinct PTS values with zero drops, zero missing selections, and zero
per-frame GPU waits**. Playback reached PTS 5.966667 s and EOF. The mpv
selection hook fired 182 times, including two redraws. P95 presentation
lateness was 13–15 ms and maximum lateness was 15–17 ms.

This is an isolated proof, not a registered ProRes codec or a qualified Auto
route. The production WebGPU registry remains empty. Audio and subtitle
ownership remain in mpv's engine, but this source has **no audio or subtitle
tracks**, so their live behavior was not exercised. The experiment does not
qualify seek, reset during playback, or drain with delayed output.

## Real packet and correctness evidence

The experiment-only engine links the existing mpv external-decoder wrapper
with a copied, instrumented FFmpeg 9.0.2 `proresdec.c`. mpv hands the wrapper
the actual demuxed `AVPacket` in its normal packet order. The copied decoder
parses the packet and stops before IDCT. Its in-memory DPC1 capture contains
each frame and slice header, qscale, luma/chroma matrices, and all quantized
coefficients. The bridge sends that capture through the existing ticketed
decoder mailbox. JavaScript packs the coefficients into the validated
macroblock-major layout, and one compute dispatch reconstructs the frame into
a pooled device-local planar `u32` Y/U/V buffer. The existing
`WebGPUPresenter` reads that buffer directly and converts it to display RGB
in its fragment shader. mpv's selected PTS and deadline trigger each draw.

No pre-captured coefficient file is read during playback. The reference
capture is used only by the separate validation pass: SHA-256 of **packed
coefficients, slice descriptors, and quant matrices matched for all 180 live
frames**. A forced mailbox `EAGAIN` at packet 30 exercised retry without
another entropy decode, duplicate, or missing frame. Validation-only GPU
copies of frames 0, 90, and 179 were mapped **after playback** and compared
with the normal FFmpeg 9.0.2 YUV oracle: **1,382,400 visible Y/U/V samples,
zero mismatches**. The earlier [presentation proof](../prores-presentation-webgpu/REPORT.md)
validated the same buffer-backed presenter against FFmpeg display RGB. This
run did not read pixels back or convert them on the CPU during playback.

The live path used at most **three of eight** pooled 1,843,200-byte output
surfaces (5,529,600 bytes). The ready queue peaked at one frame; 177 surface
reuses occurred. On shutdown, retained frames and pending requests reached
zero, and tracked runtime GPU buffer bytes reached zero. A synthetic lifecycle
test checks pool bounds, duplicate release, reuse, and generation invalidation.
An exploratory two-surface run stalled after two frames: mpv needed another
decoded frame before it could release the held frame. That [failed raw run](pool2-failure.json)
is retained; the experiment now enforces a minimum of three surfaces. The
normal eight-surface limit had no backpressure in these trials. The forced
retry demonstrates the `EAGAIN` path without claiming sustained pressure
recovery under all timing patterns.

## Timing and CPU

Correction from the later [CPU attribution investigation](ATTRIBUTION.md):
Emscripten maps `CLOCK_THREAD_CPUTIME_ID` to a monotonic wall clock in this
build. The FFmpeg stage figure below is decoder-thread elapsed time despite
its original label; only the Chrome process totals are CPU time.

The [losslessly compressed raw result](result.json.zst) records the fixture and runtime hashes, all
frame PTS values, each Chrome CPU sample, six nonblocking queue-completion
markers per GPU round, and cleanup. Three fresh Chrome 153.0.8010.53 runs
per mode used the same fixture, 640×360 canvas, mpv playback speed, and
headless host. Chrome CPU is the sum of reported process CPU-time deltas over
approximately 5.8 s of playback, with no process turnover and no idle
subtraction.

| No-readback round | WebGPU Chrome CPU | Software Chrome CPU |
| --- | ---: | ---: |
| 1 | 38.43% of one core | 27.02% |
| 2 | 34.71% | 32.46% |
| 3 | 36.53% | 32.01% |
| Median | **36.53%** | **32.01%** |

The paired GPU minus Software differences were **11.41, 2.25, and 4.52 core
percentage points**. The current prototype showed **no Chrome CPU benefit**.
This is an exploratory comparison: Software uses FFmpeg reconstruction plus
mpv's RGB software canvas path; GPU uses coefficient serialization and
packing plus the WebGPU presenter. The presentation implementations therefore
are not identical, and the prototype writes the DPC1 coefficient capture
byte by byte. These numbers neither isolate IDCT savings nor predict a
production decoder's CPU cost.

Medians of the three no-readback GPU rounds, for all 180 frames:

| Stage | Time | Boundary |
| --- | ---: | --- |
| FFmpeg extraction, including DPC1 serialization | 388.5 ms | decoder-thread elapsed wall; IDCT skipped |
| Mailbox capture copy | 38.7 ms | browser-worker wall |
| DPC1 parse and macroblock packing | 250.7 ms | browser-worker wall |
| GPU input upload and decode command submission | 139.3 ms | browser-worker wall |
| WebGPU presenter submission | 51.7 ms | browser-worker wall |

The stages use different clocks and must not be summed as CPU time. The GPU
path uploaded **170,262,720 bytes** over 180 frames, or 945,904 bytes per
frame, including coefficients and metadata. Six nonblocking
`queue.onSubmittedWorkDone()` markers per round completed **2.0–4.4 ms**
after their associated submission. These are browser wall delays for queued
work, not GPU shader timestamps. No synchronous wait occurred per frame.
Test-only validation copies and readbacks are excluded from the no-readback
CPU comparison.

## Lifecycle and next qualification work

The bridge holds a rejected packet's captured bytes and PTS across `EAGAIN`;
the retry submits the same capture without reparsing. Surface ownership is
released after a newer selected PTS is drawn, with old PTS values discarded.
Generation changes close retained frames and clear pending selections. The
experiment still needs a real seek/reset run that checks parser restart,
mailbox epoch, same-PTS replacement, surface reuse, and mpv selected-frame
behavior. It also needs drain/EOF tests with delayed output and device-loss
reopen behavior. Audio/subtitle fixtures and actual subtitle compositing are
outside this video-only run.

Before production consideration, replace DPC1 record serialization with a
direct bounded coefficient writer, test a common presentation baseline,
profile whole-player CPU in matched headed runs, and qualify sustained
backpressure, audio/subtitle sync, seek/reset/drain, and failure fallback.
Do not register the codec or change Auto routing based on this proof.

Run from the repository root:

```sh
bash experiments/prores-real-packet-webgpu/build.sh
node experiments/prores-real-packet-webgpu/test.mjs
MODES=gpu-validation,gpu,software,gpu,software,gpu,software BACKPRESSURE_PROBE=1 \
  node experiments/prores-real-packet-webgpu/run.mjs
```

The build uses the existing FFmpeg 9.0.2 source and Wasm dependency build.
Generated Wasm engines, oracle hashes, and logs stay under ignored `build/`.
