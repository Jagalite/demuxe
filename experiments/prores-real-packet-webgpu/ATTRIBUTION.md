# Experiment-only ProRes CPU attribution and direct-pack ablation

**Status: experimental / correctness-proven / performance-negative / deferred.**
Keep this as a WebGPU architecture reference and correctness oracle. It does
not qualify ProRes for production registration or Auto routing. Reopening the
work requires a changed cost model, as recorded in the
[architecture note](../../docs/WEBGPU-DECODER-ARCHITECTURE.md).

## Scope and correctness

This investigation used the same 180-frame, 640×360, 30 fps ProRes Proxy
10-bit 4:2:2 fixture as the real-packet proof. It changed only files under
this experiment. mpv still supplies real demuxed packets and selects each PTS;
the integer WebGPU reconstruction shader, GPU-resident surface pool, and
WebGPU presenter are unchanged. There is no production codec registration or
Auto route.

The ablation changes the destination of FFmpeg 9.0.2's existing DC and AC
entropy writes. Each coefficient goes directly to its macroblock-major
position in the ticketed Wasm mailbox. Slice descriptors, qscale, and quant
matrices are written next to it. The browser uploads typed views of that
shared mailbox, without a DPC1 capture, a mailbox `memcpy`, a JavaScript
`.slice()`, or a second macroblock repack. Chrome accepted shared-memory
views for `queue.writeBuffer`; a reusable ArrayBuffer staging fallback exists
for browsers that reject them. No per-frame large input buffer is allocated
in the tested direct path.

The direct path matched SHA-256 of packed coefficients, slice descriptors,
and quant matrices for **all 180 frames**. Validation-only readback of frames
0, 90, and 179 matched all **1,382,400** tested visible Y/U/V samples with
**zero mismatches**. The unchanged reconstruction shader was already checked
against all 180 captured frames in the separate full-frame proof. All normal
direct runs decoded and presented **180 distinct PTS values, with zero drops
or missing selections**; P95 lateness was 12.5–13.3 ms. No per-frame GPU
completion wait or CPU pixel readback entered normal playback. The ready queue
peaked at one frame, and at most three 1,843,200-byte surfaces were pooled
(5,529,600 bytes). All tracked GPU buffers were released on shutdown.

## Clock boundary

Chrome `SystemInfo.getProcessInfo` CPU-time deltas are the CPU measure in
this report. The original experiment called `clock_gettime` with
`CLOCK_THREAD_CPUTIME_ID` inside Wasm. In this Emscripten build,
`libwasi.js` implements all non-realtime clocks with `emscripten_get_now`,
so those FFmpeg counters are **decoder-thread elapsed time**, not CPU time.
JavaScript `performance.now()` counters are worker elapsed time. The raw JSON
from earlier rounds retains the old `*CpuMs` names; current diagnostics add
`*ThreadWallMs` and identify the clock kind. Stage times are useful for
locating work, but they cannot be summed into Chrome CPU. Per-component
clock probes also perturb decode, so the CPU comparison uses separately
built no-probe engines.

The earlier [native FFmpeg coefficient harness](../prores-coefficients/REPORT.md)
does provide genuine thread-CPU stage data for this fixture: 0.328 ms/frame
for coefficient preparation and 0.425 ms/frame for IDCT and pixel writes.
It is a separate native Apple M1 campaign, not a matched Wasm/Chrome CPU
baseline, and is excluded from the paired result below.

## Where the legacy path spends work

All byte totals are for 180 frames. The input `AVPacket`s carry 4,200,776
bytes in total and were refcounted in all 180 GPU submissions.

| Movement or write | Legacy DPC1 | Direct-packed |
| --- | ---: | ---: |
| FFmpeg coefficient destination writes | Temporary blocks | 169,574,400 B directly in final layout |
| DPC1 `memcpy` into Wasm mailbox | 176,038,560 B | 0 |
| JavaScript `.slice()` of mailbox | 176,038,560 B | 0 |
| JavaScript macroblock repack writes | 169,574,400 B | 0 |
| Explicit WebGPU uploads, coefficients plus metadata | 170,262,720 B | 170,262,720 B |
| Large JavaScript input allocation | DPC1 copy plus packed output each frame | 0 in tested Chrome |

Median elapsed stage times from three instrumented rounds per mode (ms per
180 frames):

| Stage | Software | Legacy GPU | Direct GPU |
| --- | ---: | ---: | ---: |
| FFmpeg full frame / pre-IDCT frame | 733 / — | — / 611 | — / 458 |
| FFmpeg entropy and block clear | 250 | 238 | 319 |
| FFmpeg integer reconstruction | 354 | — | — |
| DPC1 serialization / direct metadata | — | 228 | 28 |
| Wasm mailbox payload copy | — | 7.7 | 0 |
| JavaScript mailbox copy | — | 34.6 | 0.4 |
| JavaScript parse and repack / direct view check | — | 199 | 2.2 |
| `queue.writeBuffer` | — | 124 | 133 |
| Decode command encode / submit | — | 2.5 / 3.2 | 4.4 / 4.8 |
| Presenter submission | — | 48 | 52 |

The direct entropy destination writes across macroblocks instead of the
original contiguous FFmpeg block scratch space. Its instrumented entropy
interval was longer, consistent with the scattered writes and probe overhead;
the removed serialization and JavaScript repack more than offset that local
cost in the profiled path. With per-component probes disabled,
direct FFmpeg parse, entropy, and packed output took a median **255 ms** of
decoder-thread elapsed time; `writeBuffer` took **158 ms**, decode command
encode **5.0 ms**, submit **5.6 ms**, and presenter submission **55 ms**.
The no-probe Software worker spent a median **444 ms** in its mpv render call
and **70 ms** copying/placing the RGB canvas image. These are different
presentation implementations. The 727 mailbox operations, roughly 1,600
poll ticks, and 19 worker messages per run did not dominate: selected-frame
mailbox receive work was about 5 ms, and worker message posting about 2–3 ms.

## Paired Chrome CPU result

The final no-probe, no-readback campaign used fresh headless Chrome 153
processes for each mode, the same fixture, normal playback speed, and a
roughly 5.8-second sampled interval per run. Its order was
Software→direct, direct→Software, Software→direct. Chrome CPU is the sum of
process CPU-time deltas divided by sampled wall time, expressed as percent
of one core. The separate validation run is excluded.

| Pair | Software | Direct GPU | GPU minus Software |
| --- | ---: | ---: | ---: |
| 1 | 26.41% | 28.54% | +2.13 points |
| 2 | 25.47% | 33.52% | +8.05 points |
| 3 | 26.54% | 30.98% | +4.43 points |
| Median by mode | **26.41%** | **30.98%** | **+4.57 points** |

Median Chrome CPU seconds by process type over the three final rounds:

| Process type | Software | Direct GPU | Difference |
| --- | ---: | ---: | ---: |
| Renderer | 1.161 s | 1.050 s | −0.111 s |
| GPU process | 0.227 s | 0.599 s | +0.371 s |
| Browser and utility | 0.150 s | 0.170 s | +0.020 s |

The resulting ~0.280 s over 5.8 s accounts for about **4.8 core points**;
the measured difference of mode medians is 4.57 points. The GPU-process
bucket includes WebGPU upload, reconstruction, presentation, and driver work;
the current trace does not divide that bucket precisely among them. The
direct path saves renderer work, including FFmpeg IDCT and Software RGB
presentation, but the GPU-process increase exceeds that saving here.

For context, an earlier uninstrumented three-round legacy campaign measured
36.53% WebGPU and 32.01% Software at its mode medians, a 4.52-point gap.
Another no-probe three-way campaign during this investigation varied widely:
legacy GPU 24.59–36.67%, direct GPU 31.16–32.86%, and Software
25.24–33.25%. These are not a matched route or presentation baseline, so
**there is no defensible exact stage-by-stage decomposition of the historical
4.5-point number**. The final paired process account identifies the dominant
remaining bucket without claiming a shader/driver split that was not measured.

## Decision

Direct packing eliminates the large avoidable coefficient copies and passes
the exactness and zero-drop gates, yet it **does not materially beat Software
CPU** on this fixture. A few small reductions remain: avoid redundant tiny
matrix/parameter writes, reduce mailbox polling, and reduce presenter command
setup. Their observed worker times are too small to explain the remaining
roughly 0.28 s of Chrome CPU. The important unresolved cost is in Chrome's
GPU process and the ~0.16 s/180-frame `writeBuffer` boundary. A persistent
CPU staging buffer is already available for browsers lacking shared-memory
upload, but it would add a copy in this Chrome. Mapping a GPU staging buffer
per frame would add synchronization; it was not used.

**Stop treating CPU entropy plus GPU IDCT as a CPU-saving production path
for this fixture.** ProRes WebGPU work is deferred. If new evidence changes
the cost model, a bounded GPU-side entropy proof fed by real packets would be
one possible new investigation, with correctness first and a separate
GPU-process CPU profile. It should not be registered or routed until it beats
the matched Software path while preserving exactness and playback pacing.
This experiment does not qualify seek, audio, subtitles, or drain.

## Reproduction and raw data

```sh
bash experiments/prores-real-packet-webgpu/build.sh
bash experiments/prores-real-packet-webgpu/build-fast.sh
node experiments/prores-real-packet-webgpu/test.mjs
MODES=gpu-direct-fast-validation,software,gpu-direct-fast,gpu-direct-fast,software,software,gpu-direct-fast \
  RESULT_FILE=attribution-final-result.json \
  node experiments/prores-real-packet-webgpu/run.mjs
```

Raw rounds, Chrome process samples, stage counters, asset hashes, exact PTS,
validation comparisons, and cleanup diagnostics are in
[`attribution-result.json`](attribution-result.json.zst) (instrumented),
[`attribution-fast-result.json`](attribution-fast-result.json.zst), and
[`attribution-final-result.json`](attribution-final-result.json.zst). The
post-label validation is in [`attribution-clock-check.json`](attribution-clock-check.json.zst).
These raw JSON files are stored as lossless zstd archives; the
[evidence index](../prores-evidence-index.json) records original and archive hashes.
