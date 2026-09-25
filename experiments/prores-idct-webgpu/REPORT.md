<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# One-block WebGPU ProRes reconstruction proof

**Historical correctness milestone.** The later [real-packet CPU investigation](../prores-real-packet-webgpu/ATTRIBUTION.md) found ProRes WebGPU performance-negative; production registration remains deferred. The results below remain a correctness oracle, not a current optimization recommendation.

## Result

**Zero sample mismatches** across 341 independently dispatched 8×8 blocks
(21,824 samples): 125 synthetic cases and 216 real Y/U/V blocks selected from
eight frames of the existing ProRes Proxy 10-bit 4:2:2 fixture. The synthetic
set covers DC-only, positive and negative AC, sparse and dense blocks,
quantization, rounding, and both clipping limits. The DC rounding sweep
crossed adjacent FFmpeg output transitions at -18/-17 and 14/15. For the real blocks, the
FFmpeg 9.0.2 ProRes DSP oracle also matched pixels from the **normal FFmpeg
9.0.2 MOV decoder** before either was used as the GPU expectation. The full
case counts, input hashes, browser diagnostics, and timing measurements are in
[`result.json`](result.json).

| One-block operation | Median browser wall time, 150 runs after 20 warmups |
| --- | ---: |
| Input upload, command encoding and dispatch submission | 0.005 ms |
| Wait for dispatch queue completion | 0.330 ms |
| **Upload through dispatch completion** | **0.335 ms** |
| Separate output-buffer copy submission | 0.005 ms |
| Separate buffer mapping/readback wait | 0.268 ms |
| **Readback total** | **0.273 ms** |

These are sequential one-block measurements on Apple M1/Metal 3, headless
Chrome 153.0.8010.53, with one WGSL invocation and a 256-byte output buffer.
`crossOriginIsolated` was true. The adapter exposed no `timestamp-query`, so
these are **browser wall times, not GPU shader execution times**. The dispatch
number includes input upload and queue completion; the readback number is
measured separately and is **not a production decode cost estimate**. This
one-invocation shape is for correctness and does not predict slice throughput.

## Integer behavior

The shader follows FFmpeg 9.0.2
[`proresdsp.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/proresdsp.c)
and its
[`simple_idct_template.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/simple_idct_template.c)
10-bit path. Inputs are signed 32-bit storage values holding the captured
signed 16-bit coefficients, 8-bit quant matrices, and effective qscale. Matrix
scaling, coefficient dequantization, and both IDCT pass outputs are explicitly
narrowed to signed 16-bit values. Transform products and sums use wrapping
`u32`; the result is bitcast to `i32` for arithmetic right shifts, then clipped
to FFmpeg's 10-bit output range **4…1019**. This avoids dependence on floating
point IDCT rounding. [WGSL specifies 32-bit integer overflow modulo
2³²](https://www.w3.org/TR/WGSL/#integer-types).

The exercised cases included **64** scaled-matrix 16-bit wraps, **372**
dequantized-coefficient 16-bit wraps, and **one** row `a0+b0` mathematical sum
outside signed 32-bit range (`dense_7`, row 2). An ordinary signed-wide or
floating-point port would need separate proof at those boundaries. With the
explicit wrapping path, the final WGSL run had no arithmetic mismatches,
shader diagnostics, validation errors, or device loss. This validates the
tested 10-bit C decoder path on this host; x86 SIMD variants and 12-bit ProRes
are outside this proof.

## Reproduction and scope

Run `node experiments/prores-idct-webgpu/run.mjs` from the repository root.
`prepare.py` verifies the existing coefficient capture and fixture hashes,
links the two small C helpers against the locked FFmpeg 9.0.2 libraries,
decodes all 180 fixture frames through normal libavcodec, and prepares the
one-block cases. The generated cases, decoded reference frames, and helper
binaries live under ignored `build/experiments/prores-idct-webgpu/`; the hashes
and summary are retained in `result.json`. The shader is
[`idct.wgsl`](idct.wgsl); its FFmpeg-derived arithmetic is marked
LGPL-2.1-or-later and remains experiment-only.

**Recommendation: proceed to a one-slice correctness proof.** It should keep
the exact integer representation, compare every visible Y/U/V sample in the
slice against normal FFmpeg, and measure dispatch without requiring GPU-to-CPU
readback in the eventual path. This result does not qualify full-frame decode,
presentation, routing, codec registration, or a CPU/performance win.
