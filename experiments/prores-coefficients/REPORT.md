<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# FFmpeg 9.0.2 ProRes coefficient extraction experiment

**Historical correctness milestone.** The later [real-packet CPU investigation](../prores-real-packet-webgpu/ATTRIBUTION.md) found ProRes WebGPU performance-negative; production registration remains deferred. The results below remain a coefficient oracle, not a current optimization recommendation.

## Result

On the existing 640×360, 180-frame ProRes Proxy 10-bit 4:2:2 fixture, the
extraction path and the normal FFmpeg decoder produced **exactly matching
pre-IDCT data**: 20,700 slices, 1,324,800 blocks, and **84,787,200 quantized
coefficients**. The comparator checked every signed 16-bit value plus frame,
slice, scan, matrix, and qscale metadata. Both 176,037,844-byte captures have
SHA-256 `773985480f60222ae696513dc02c5569cb99e170f420e3e2a8fbe87cbb38621c`.
It reports the first mismatch with frame, field, slice, component, block, and
coefficient index. The complete counts and seven profile samples are in
[`result.json`](result.json).

The native single-thread CPU profile (median of seven paired rounds, capture
I/O disabled) is:

| Stage | CPU ms / frame | Fraction of full decoder callback |
| --- | ---: | ---: |
| Coefficient preparation: block clear, bitreader, DC/AC entropy | 0.328 | 38.7% |
| IDCT, dequantization, and pixel writes (`idct_put`) | 0.425 | 50.1% |
| Other decoder work, including headers and frame setup | 0.095 | 11.2% |
| **Full ProRes software decoder callback** | **0.848** | **100%** |

The extraction-only callback took 0.378 ms/frame in a separate paired run.
The direct timed reconstruction loop is the more specific estimate: **at most
about 50% of this decoder's CPU on this fixture could disappear by moving
reconstruction off CPU**, before coefficient transfer, GPU work, synchronization,
or presentation overhead. This is not a predicted player or system CPU saving.
The measurement is native Apple M1 FFmpeg, not Demuxe's Wasm build; it does not
qualify a WebGPU codec. The full decoder callback excludes MOV demuxing, CLI
output, audio, subtitles, and presentation.

## Method and artifact

`run.py` verifies the SHA-256 of Demuxe's locked FFmpeg 9.0.2 archive and the
existing fixture, extracts FFmpeg into ignored `build/experiments/`, and applies
`instrument.py` only to that isolated source. FFmpeg's own
[`proresdec.c`](https://github.com/FFmpeg/FFmpeg/blob/n9.0.2/libavcodec/proresdec.c)
still performs picture/slice parsing and DC/AC entropy decoding. The hook is
immediately before each call to `idct_put`. Reference mode records the input
blocks then continues normal software reconstruction; extraction mode records
the same blocks and returns before reconstruction. Profiling modes use the
same paths without capture I/O and measure decoder-thread CPU time with
`CLOCK_THREAD_CPUTIME_ID`. Both paths use one decoder thread, software decode,
and the same MOV fixture.

The `DPC1` capture format contains `FRAM` (index, dimensions, frame type,
packet PTS), `SLIC` (field/slice and macroblock positions, plane byte lengths,
qscale, scan order, permuted luma/chroma quant matrices), and `COMP` records
(Y/U/V component and packed little-endian signed 16-bit coefficients in
block-major order). The raw captures remain locally under ignored `build/`;
their hashes and parsed counts are retained in `result.json`.

Reproduce with `python3 experiments/prores-coefficients/run.py all` from the
repository root. `python3 experiments/prores-coefficients/run.py verify` checks
existing captures; `python3 experiments/prores-coefficients/test_compare.py`
checks exact parity and first-mismatch location on a small synthetic capture.
The locked source archive and fixture must already be present at the paths in
`run.py`.

This is an experiment-only CPU boundary and capture harness. It has no WGSL,
WebGPU reconstruction, production registration, or Auto route change. Exact
parity here confirms the two instrumented paths preserve FFmpeg's pre-IDCT
inputs on this fixture; it is not independent validation of another entropy
implementation or a GPU reconstruction result.
