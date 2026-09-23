<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# WebGPU compute decoder research, 2026-09-22

## Decision

**Defer a full WebGPU codec PoC or production integration.** The worker and
GPU-resident presentation architecture is feasible on this Chrome/Apple M1
combination, but this experiment does **not** show a CPU or end-to-end playback
win over Demuxe Software FFmpeg/WASM. The representative ProRes luma inverse-DCT
stage is fast in isolation; real stream coefficients, mpv-selected PTS, chroma,
and an exact WASM stage baseline are still missing. It would be reasonable to
reopen selected-kernel work only after profiling a real unsupported codec on the
same media identifies a dominant parallel reconstruction stage and its exact
CPU time.

The primary question remains unanswered for a complete codec. GPU-resident
frames can avoid the decoded-frame output readback/copy/upload path in this
worker, but this run cannot establish that those savings exceed parsing,
coefficient upload, synchronization, and presentation costs in Demuxe playback.

## Architecture tested

```
FFmpeg-generated ProRes fixture -> FFmpeg-decoded luma -> forward DCT/quantize
          -> WebAssembly.Memory SharedArrayBuffer -> worker queue.writeBuffer
          -> WGSL dequantize + 8x8 inverse DCT -> RGBA8 GPUTexture
                                            |-> readback -> ImageData/Canvas2D
                                            |-> GPUTexture -> WebGPU OffscreenCanvas
```

The experiment uses a single worker to own `GPUDevice`, frame textures, and
presentation. Each frame is keyed by generation and PTS. A synthetic `select`
message models the existing `web_selected_pts` mechanism; a four-frame bound,
generation reset, stale-frame cancellation, and explicit destruction model the
retained-frame ownership rules. This **does not execute mpv scheduling**. The
existing mpv placeholder/PTS seam is visible in
[`native/vd_browser.c`](../../native/vd_browser.c),
[`patches/0004-optional-browser-decoder.patch`](../../patches/0004-optional-browser-decoder.patch),
and [`web/filter-retained-engine-worker.js`](../../web/filter-retained-engine-worker.js).
No production source or automatic routing was changed.

The kernel is a floating-point 8x8 inverse DCT with a fixed quantization factor
of four, applied independently to luma blocks. The input coefficients are
forward transformed from the **first frame decoded by FFmpeg**, then replayed
for all 900 measured frames. They are not extracted from a ProRes bitstream and
do not reproduce FFmpeg's optimized integer IDCT or per-slice quantization
matrix. The output is grayscale RGBA8, not a complete 10-bit 4:2:2 frame.
FFmpeg's actual ProRes entropy-to-IDCT boundary is in `libavcodec/proresdec.c`
and its reference IDCT/pixel path is in `libavcodec/proresdsp.c` in the locked
FFmpeg source. The separate `build/sources` checkout used during the experiment
is a generated local build directory, not part of this research archive.

## Environment and versions

| Item | Observed |
| --- | --- |
| Source | local `main` `283a8effb99c356f1d6eb8ee8163628bb6fa7493`, one commit ahead of fetched `origin/main` |
| Browser | unflagged headless Google Chrome `153.0.8010.53`, Playwright `1.58.2` |
| Worker | `navigator.gpu=true`, `crossOriginIsolated=true`, module worker, OffscreenCanvas |
| Adapter | Apple, architecture `metal-3`, Apple M1 host |
| Features | `core-features-and-limits`; no `timestamp-query` |
| Host | Darwin `25.5.0`, arm64 Apple M1 |
| Toolchain | Node `23.5.0`; fixture FFmpeg `8.1.2`; Demuxe Software source FFmpeg `7.1.1`, configured build SDK Emscripten `4.0.14` |
| Input | 640×360, 30 fps, 180-frame ProRes proxy `yuv422p10le`; 8-bit H.264 4:2:0 transcode for the actual YUV presenter |

The first measured worker initialized WebGPU in 13.2 ms (readback) and 3.5 ms
(resident); these figures exclude page launch and engine preparation. The shader
had no compilation warnings, and the browser reported no validation errors or
device loss. The worker, rather than another thread, retained all GPU objects.

## Measured Software baselines

These are **full Demuxe playback** measurements, including FFmpeg/WASM decode
and presentation, at 640×360 after one second of warmup, over a three-second
window. Each row was a separate headless browser launch. CPU is the summed
Chrome process CPU time from CDP divided by wall time; it excludes WindowServer
and should not be treated as a GPU utilization measurement.

| Source and path | FPS | Browser CPU | Decoded-frame copies/uploads during window | WASM heap |
| --- | ---: | ---: | --- | ---: |
| ProRes, Software RGB | 30.12 | 42.9% | about 83.87 MB WASM→ImageData, 91 frames; Canvas2D internal copy uncounted | 128 MiB |
| ProRes, YUV selected | 30.28 | 30.7% | **91/91 RGB fallback frames**, 83.87 MB RGB copy/upload | 128 MiB |
| H.264 transcode, Software RGB | 30.30 | 23.1% | about 83.87 MB WASM→ImageData, 91 frames | 128 MiB |
| H.264 transcode, Software YUV | 30.30 | 37.3% | 31.45 MB plane copy and 31.45 MB WebGL upload, 91 frames, 0 fallback; 345,600-byte peak JS staging | 128 MiB |

The ProRes fixture is 10-bit 4:2:2, outside the current experimental YUV
presenter's supported 8-bit 4:2:0 format. The H.264 rows retain the visual
source and dimensions but change codec and pixel format. CPU percentages vary
across short, separate runs and cannot rank the RGB and YUV paths reliably.
Raw data: [`baseline result`](raw/baseline-2026-09-22T22-23-55.541Z/result.json).

## WebGPU results

Each GPU trial processed **900 repeats of one ProRes-derived luma frame** with
the same WGSL kernel at 640×360. The runner sent a frame, selected its PTS,
and waited for completed presentation before advancing. Resident presentation
waited for `queue.onSubmittedWorkDone`; readback waited for `mapAsync`. Results
were repeated with reversed trial order. These are **reconstruction-only**, not
decoder or playback FPS. No audio, entropy decode, mpv, or chroma is included.

| Mode | Processing FPS, two orders | Browser CPU | Input CPU→GPU | Output GPU→CPU | JS output copy |
| --- | ---: | ---: | ---: | ---: | ---: |
| Compute + CPU readback + Canvas2D | 390, 375 | 81.3%, 80.2% | 921,600 B/frame | 921,600 B/frame | 921,600 B/frame |
| Compute + GPU-resident WebGPU canvas | 437, 438 | 83.7%, 82.8% | 921,600 B/frame | **0** | **0** |

The input is an intentionally simple 32-bit coefficient array, so each mode
uploaded 829.44 MB over 900 frames. Readback additionally transferred 829.44
MB and copied 829.44 MB into `ImageData`; resident presentation avoided both.
The `queue.writeBuffer` source is a view of shared `WebAssembly.Memory`, with no
per-frame JS staging copy. Browser-internal upload and Canvas2D copies are not
directly observable. This input representation is much larger than compressed
ProRes and must be improved or amortized before integration.

CPU-side preparation plus command submission took 0.48–0.50 ms/frame for
readback and 0.55–0.62 ms/frame for resident mode. Readback mapping waited
1.75–1.83 ms/frame; resident render submission plus completion waited about
1.54–1.60 ms/frame. These are **wall-clock/queue measurements, not GPU shader
timings**. Chrome exposed no `timestamp-query` on this adapter, so this report
makes no GPU-time claim. End-to-end stage wall time was about 2.3–2.7 ms/frame.

Raw runs and screenshots:
[`readback-first`](raw/run-2026-09-22T22-26-26.883Z/result.json),
[`resident-first`](raw/run-2026-09-22T22-26-56.371Z/result.json).

## Correctness and lifecycle

Both GPU variants produced the same 230,400 luma pixels (mean and maximum
readback-versus-resident error: **0**). Against FFmpeg's decoded first-frame
luma converted to 8-bit grayscale, resident output had mean absolute error
**0.0143/255** and maximum error **1/255**. The screenshot used for this check
caused a **validation-only readback after timing**. See
[`correctness`](raw/run-2026-09-22T22-26-26.883Z/correctness.json).

For each mode, all 900 immediate selections and 12 clock-paced selections
appeared in order with no counted drops or duplicates. The 12 selections with
33.333 ms deadlines took 0.48–0.49 s. Reset dropped four owned frames and
cancelled a scheduled presentation; none appeared after its deadline. Destroy
reported zero retained frames and zero tracked live GPU buffers/textures, and
Playwright observed zero remaining workers. Peak tracked GPU buffers/textures
were **9** for readback and **5** for resident mode, or approximately **8.29 MB**
and **4.61 MB** of allocated coefficient/output/staging storage at this size.
These counts exclude pipelines, bind groups, canvas swapchain, and driver memory.
The experimental shared WASM memory was 15 pages (0.94 MiB); it is separate
from Demuxe's 128 MiB playback heap.

This proves synthetic generation/PTS ownership, not real mpv seek, source
replacement, audio sync, or long-running GPU lifecycle. No GPU objects crossed
workers. No browser errors or WebGPU validation warnings were recorded in the
passing runs.

## Blockers and interpretation

1. **No matched codec-stage CPU baseline.** The full Software player runs at
   30 fps on this ProRes source, but that includes parsing, entropy, color,
   scheduling, and presentation. The GPU run replays one derived luma frame. Its
   80–84% browser CPU cost cannot be compared as a codec speedup or reduction.
2. **No real codec bridge.** There is no extraction of entropy-decoded ProRes
   coefficients from FFmpeg 7.1.1, no actual mpv placeholder insertion, and no
   test where mpv-selected PTS chooses these GPU textures. The existing seam
   suggests a route, but this PoC has not exercised it.
3. **Input upload is significant.** A naive 32-bit coefficient representation
   costs 921,600 bytes/frame at 640×360, even with zero decoded-frame readback.
4. **Format is incomplete.** Chroma, 10-bit output, quantization matrices,
   slice layout, color conversion, filters, and subtitles are absent. Demuxe's
   current YUV presenter falls back to RGB on the matching ProRes source.
5. **GPU timing is unavailable.** `timestamp-query` was not exposed. Reported
   submission and queue waits include browser/driver overhead, and the short
   headless runs on a shared host are exploratory.

The early runs under `raw/run-2026-09-22T22-20-31.496Z` through
`raw/run-2026-09-22T22-25-58.871Z` are retained. Their throughput figures are
invalidated by a page/worker `performance.now()` origin mismatch; the final one
also had a lifecycle assertion that accidentally reused an earlier PTS. The
clock was changed to absolute epoch time, and the scheduled-reset test now uses
a unique PTS. These failures are evidence of harness issues, not WebGPU limits.

## Files and reproduction

All new files are under `experiments/webgpu-compute-decoder/`:

- `fixture.mjs`, `raw/prores-proxy.mov`, `raw/yuv420-h264.mp4`,
  `raw/coefficients.i32`, `raw/luma.u16`, `raw/fixture.json` — source and
  repeatable structured input.
- `worker.js`, `page.html`, `run.mjs`, `verify.mjs` — compute, ownership,
  readback/resident benchmark, and screenshot correctness check.
- `baseline.html`, `baseline.mjs` — existing RGB/YUV playback measurements.
- `raw/baseline-*/` and `raw/run-*/` — unedited JSON and screenshots, including
  invalidated exploratory runs.

The raw directories are `baseline-2026-09-22T22-22-25.019Z`,
`baseline-2026-09-22T22-23-55.541Z`,
`run-2026-09-22T22-20-31.496Z`, `run-2026-09-22T22-21-49.225Z`,
`run-2026-09-22T22-24-31.806Z`, `run-2026-09-22T22-25-14.000Z`,
`run-2026-09-22T22-25-58.871Z`, `run-2026-09-22T22-26-26.883Z`,
`run-2026-09-22T22-26-56.371Z`, and `run-2026-09-22T22-30-40.732Z`.
The last is a 30-frame post-fix lifecycle smoke run; its short CPU sample is
excluded from the sustained comparison.

From the repository root:

```sh
node experiments/webgpu-compute-decoder/fixture.mjs
node experiments/webgpu-compute-decoder/baseline.mjs
node experiments/webgpu-compute-decoder/run.mjs
MODES=resident,readback node experiments/webgpu-compute-decoder/run.mjs
node experiments/webgpu-compute-decoder/verify.mjs experiments/webgpu-compute-decoder/raw/<run-directory>
```

The runner uses the installed Chrome channel, COOP/COEP on localhost, and the
current checkout's `node_modules`. `HEADED=1` switches to a visible browser.
The benchmark scripts do not modify production defaults or routing.

## Source references

- [WebGPU specification: mapping, queue ordering, explicit destruction, and optional timestamp queries](https://gpuweb.github.io/gpuweb/)
- [FFmpeg ProRes decoder source](https://ffmpeg.org/doxygen/8.1/proresdec_8c_source.html)
- [FFmpeg ProRes DSP source](https://ffmpeg.org/doxygen/8.1/proresdsp_8c_source.html)
