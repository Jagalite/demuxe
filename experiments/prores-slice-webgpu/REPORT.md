# Isolated WebGPU ProRes one-slice reconstruction

**Historical correctness milestone.** The later [real-packet CPU investigation](../prores-real-packet-webgpu/ATTRIBUTION.md) found ProRes WebGPU performance-negative; production registration remains deferred. The results below remain a correctness oracle, not a current optimization recommendation.

This is an experiment only. It does not register a codec, alter routing, or
connect to playback. `prepare.py` reads the validated FFmpeg 9.0.2 pre-IDCT
capture from `experiments/prores-coefficients/` and compares GPU output with
the normal FFmpeg 9.0.2 decoder's planar `yuv422p10le` frame capture prepared
by `experiments/prores-idct-webgpu/`. The one-block proof's integer inverse
quantization, IDCT, and clipping are shared through `idct-core.wgsl`.

## Parity

`node experiments/prores-slice-webgpu/run.mjs` passed in Chrome
153.0.8010.53 on an Apple Metal 3 WebGPU adapter. Three complete real slices
were checked in each of frames 0, 90, and 179: left/top slice 0, right/top
slice 4, and bottom/right slice 114. All 9 real slices matched **every visible
Y, U, and V sample**: 30,720 samples and zero mismatches. The bottom slice
starts at macroblock row 22 (coded y=352), reconstructs the full 16 coded
rows, and writes only the 8 visible rows through y=359. Another 4,032 visible
samples matched in a derived right-edge crop case, for **34,752 / 34,752
visible samples**, zero mismatches total. All 6,208 output positions outside
the requested visible rectangles retained their sentinel values. No WGSL
compiler messages, validation errors, or device loss were observed.

The 640×360 fixture has 20,700 slices, all with 8 macroblocks and none with
partial visible width. Its rightmost
real slice occupies x=512..639 and is full width, so **no real partial-width
slice exists in this fixture**. The derived crop uses that real slice's
coefficients and matrices but limits visibility to 126 luma / 63 chroma
columns. It tests horizontal placement and guarding; it is not evidence that
a partial-width bitstream slice was decoded.

## Layout and execution

The input is macroblock-major. Each macroblock contains eight 8×8 blocks in
`Y0,Y1,Y2,Y3,U0,U1,V0,V1` order. Coefficients are signed 16-bit values,
packed two per `u32`; one 8-macroblock slice uses **8,192 bytes**. The frame's
64 luma and 64 chroma matrix entries are unsigned bytes, packed four per
`u32` (**128 bytes**). A **32-byte** uniform carries slice count, coded and
visible dimensions, qscale, and plane sizes. The shared IDCT keeps the exact
16-bit truncation, unsigned 32-bit accumulation, shift, and 10-bit clipping
semantics of the earlier one-block proof.

One workgroup has eight invocations, one per block. A slice dispatches eight
workgroups. Luma blocks occupy 16×16 per macroblock; each chroma component
occupies 8×16, with the second chroma block below the first. Each invocation
writes its own 8×8 area, so no intra-workgroup barrier or atomic is needed.
Output is a planar `u32` storage buffer with coded-width strides: **8,192 B Y,
4,096 B U, 4,096 B V = 16,384 B**. A separate **16,384 B** buffer is used
solely for validation readback. Total allocated GPU buffer storage in the
proof is **41,120 B**. `u32` samples avoid concurrent packed 16-bit writes;
this is a staging layout, not a presenter format.

An initial test exposed an incorrect plane-base selection that displaced
luma into the next plane. Correcting the offset made all visible and guarded
positions pass. Commands are ordered explicitly: setup writes, coefficient
upload, compute, then validation copy/map. The measured stages wait for queue
completion before the next stage. No other placement or synchronization
issues were observed in these cases.

## Timing

For frame 0, slice 0: 20 warmups, 150 measured serial iterations. Browser
wall-time medians on this Apple Metal 3 adapter:

| Stage | Median |
| --- | ---: |
| Coefficient upload (`writeBuffer` + queue completion) | 0.050 ms |
| Command encoding and submission | 0.005 ms |
| GPU completion wait after submit | 0.365 ms |
| Validation-only copy and readback/map | 0.205 ms |

These are browser wall times, not shader timestamps or full-frame decode
times. The GPU completion figure includes scheduling and queue wait. Output
sentinel reset and metadata uploads were outside measured stages. Readback is
only for parity validation and is not a proposed playback cost. Raw timings,
case geometry, hashes, adapter information, and shader diagnostics are in
`result.json`.

## Recommendation

Proceed to an **isolated full-frame reconstruction experiment** with the same
macroblock packing and crop guards. Before considering playback integration,
validate every slice of representative frames, verify the combined planar
frame, and measure batched uploads/dispatches and GPU-resident output without
validation readback. Test a separate fixture with a genuine partial-width
slice. This proof does not establish full-frame throughput or CPU savings.

To reproduce, first prepare the existing one-block FFmpeg 9.0.2 reference
assets if absent, then run `node experiments/prores-slice-webgpu/run.mjs` from
the repository root. Set `ITERATIONS=20` for a shorter timing run. The large
prepared coefficient and decoded-frame assets remain under ignored `build/`.
