# Isolated full-frame WebGPU ProRes reconstruction

**Historical correctness milestone.** The later [real-packet CPU investigation](../prores-real-packet-webgpu/ATTRIBUTION.md) found ProRes WebGPU performance-negative; production registration remains deferred. The results below remain a correctness oracle, not a current optimization recommendation.

This experiment reconstructs FFmpeg 9.0.2 ProRes Proxy 10-bit 4:2:2 frames
into one **device-local planar Y/U/V storage buffer**. It changes no playback,
routing, or codec registration. The CPU input comes from the existing exact
coefficient harness; `idct-core.wgsl` supplies the previously validated
inverse quantization, integer IDCT, 16-bit wrapping, and clipping arithmetic.
Readback exists only for this parity proof.

## Parity and fixtures

Chrome 153.0.8010.53 on an Apple Metal 3 WebGPU adapter passed **all 180
frames** of the locked 640×360 ProRes Proxy fixture. Every visible Y, U, and
V sample matched the normal FFmpeg 9.0.2 decoder: **82,944,000 / 82,944,000
samples**, zero mismatches. Each frame has 115 eight-macroblock slices. The
last macroblock row begins at y=352; only its first eight rows are visible.

The added locked [642×360 fixture](fixtures/partial-642x360.mov) was generated
with FFmpeg 8.1.2 `prores_ks` Proxy, then captured and decoded with the same
FFmpeg 9.0.2 experiment build. Its independent reference/extraction captures
match all 482,816 quantized coefficients. It has 138 real slices: 115 with
eight macroblocks and **23 with one macroblock**, one narrow right-edge slice
per macroblock row. Only two luma columns and one chroma column of each
rightmost macroblock are visible. The full frame matched **462,240 / 462,240
visible samples**, zero mismatches, including the bottom-right crop.
Combined parity is **83,406,240 / 83,406,240 samples** across 181 frames.
There were no WGSL compilation messages, validation errors, or device losses.

The fixture SHA-256 is
`7bff19784b3851aa4cbd4bfde1eaceea9821c66fc3f30c6b5ef1b5093cd67854`.
`fixture.py` verifies it and can regenerate it only when the encoded bytes
match this hash. The original 640×360 fixture and coefficient capture are
also hash-checked before preparation. Capture, oracle, and shader hashes are
in [compressed result.json](result.json.zst); per-frame coefficient hashes are in the
generated frame metadata.

## GPU layout and execution

The CPU repacks each slice's component-major captured coefficients into the
existing macroblock-major `Y0,Y1,Y2,Y3,U0,U1,V0,V1` layout. One macroblock is
512 signed 16-bit coefficients, or **1,024 B**. The frame's 64-entry luma
and 64-entry chroma matrices occupy **128 B**; each slice has a **32 B**
descriptor containing coefficient offset, macroblock origin/count, and
qscale. A **16 B** uniform gives visible width, height, and plane lengths.

A single two-dimensional dispatch reconstructs every slice in a frame:
workgroup `x` selects a macroblock within a slice and `y` selects the slice.
Each eight-invocation workgroup assigns one 8×8 Y/U/V block per invocation.
The 640×360 frames schedule 920 workgroups; the 642×360 frame schedules 1,104,
of which 943 contain an actual macroblock. The remaining groups exit on the
slice's macroblock-count guard. Output planes have visible-width strides and
store one `u32` per exact 10-bit sample. A buffer clear precedes compute in
the same command submission; the readback copy follows GPU completion.

| Frame | Coefficients uploaded | Y output | U output | V output | Dispatches |
| --- | ---: | ---: | ---: | ---: | ---: |
| 640×360, each of 180 | 942,080 B | 921,600 B | 460,800 B | 460,800 B | 1 |
| 642×360, partial width | 965,632 B | 924,480 B | 462,240 B | 462,240 B | 1 |

The pooled buffers are sized for the largest frame: 965,632 B coefficients,
4,416 B descriptors, 128 B matrices, 16 B frame uniform, 1,848,960 B planar
output, and a separate 1,848,960 B validation readback buffer. Peak explicit
GPU buffer allocation is **4,668,112 B**. Without the validation readback
buffer, the corresponding device-local allocation is **2,819,152 B**. This
estimate excludes opaque pipeline/device allocations and any future
presentation surfaces.

## Frame timing

The table is the distribution over all 180 640×360 frames on the same browser
run. Values are browser wall milliseconds; local asset fetch and pipeline
creation are excluded. CPU preparation measures **post-entropy coefficient
repacking** in JavaScript, not FFmpeg packet parsing or entropy decoding.
Upload stages include queue completion. GPU completion is a queue wait, not a
shader timestamp. Total wall includes validation readback and the CPU sample
comparison; device-local wall ends before either.

| Stage | Min | P50 | P95 | Max |
| --- | ---: | ---: | ---: | ---: |
| CPU coefficient preparation | 0.185 | 0.205 | 0.260 | 0.830 |
| Coefficient upload | 0.470 | 0.505 | 0.635 | 2.425 |
| Matrix/descriptor/uniform upload | 0.050 | 0.075 | 0.095 | 1.375 |
| Command encoding/submission | 0.010 | 0.015 | 0.030 | 0.390 |
| GPU completion wait | 1.895 | 2.215 | 4.005 | 4.250 |
| Device-local frame wall | 2.705 | 3.025 | 4.915 | 6.905 |
| Validation readback | 0.515 | 0.635 | 0.800 | 2.210 |
| Validation comparison | 0.455 | 0.480 | 0.520 | 3.300 |
| Total validated frame wall | 3.785 | 4.155 | 6.020 | 11.170 |

The partial-width frame took 3.060 ms through GPU completion and 4.170 ms
including validation. These are component measurements, not continuous
playback throughput or a CPU-savings claim. The browser proof begins with
already extracted quantized coefficients. The existing FFmpeg coefficient
profile remains separate evidence for parsing and entropy work.

## Placement and next step

Preparation verifies that every coded macroblock belongs to exactly one
slice, with no overlap or gap. Each GPU workgroup writes a distinct visible
pixel region, so slices need no mutual barrier or atomics. The output clear
and compute dispatch are ordered in one command buffer; validation copy is
submitted after compute completion. No cross-slice placement or
synchronization issue appeared across the 181 frames. The narrow right edge
and bottom crop produced exact visible samples.

Proceed to an **isolated device-local presentation proof** using this planar
output directly. A continuous playback experiment should then include real
packet parsing/entropy work, worker scheduling, a bounded pool of resident
frames, presentation, and sustained frame pacing. Keep readback confined to
validation. This result does not qualify a production route or continuous
playback performance.

Run `node experiments/prores-frame-webgpu/run.mjs` from the repository root.
`MAIN_FRAMES=0,90,179` runs the minimum frame subset plus the partial-width
fixture. Prepared coefficient streams and oracles live under ignored
`build/experiments/prores-frame-webgpu/`; `result.json` retains per-frame raw
timings and pass/fail evidence.
