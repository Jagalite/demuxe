# Demuxe media/browser frontier — R289–R294 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0, GCC 14.2, Clang 17.  
**Proposal source:** recovered Project file `Demuxe_R289_R294_Proposals.md`; these IDs/titles were not reconstructed or substituted.  
**QA:** 55/55 checks passed.

## Summary

| ID | Verdict | Decisive result |
|---|---|---|
| R289 | **BLOCKED — browser capability** | `VideoDecoder` is unavailable on the permitted page; localhost secure-context navigation is blocked by administrator policy. |
| R290 | **PROMISING COMPONENT / PARTIAL DECODER INTEGRATION** | A real restricted MPEG-2 I/P fixture contains 12/16 exact Y/U/V copied macroblocks in each P picture. Three generations of composed maps reconstruct requested pictures exactly; map lookup was 2.41× faster than repeated chain walking in the microprobe. |
| R291 | **PROMISING / STRONG, NARROW** | A 30-slice CAVLC derivative disables deblocking only under a zero-threshold QP proof and remains byte-exact in all decoded planes; browser samples at four seeks are identical. A QP28 negative control changes 81,658 decoded bytes when filtering is forcibly disabled. |
| R292 | **PROMISING SPECIALIZED KERNEL / PARTIAL DECODER** | A generated 5.5 KiB Wasm JPEG Huffman kernel reconstructs all 1,024 blocks' quantized coefficients exactly, including stuffing/restart cases, and rebuilt output is pixel-exact. Kernel-only median speedup is 1.25× (1.26× with restart intervals) over the table-driven Wasm path. |
| R293 | **BLOCKED — reference implementation** | The required Tink Streaming AEAD reference implementation is not installed and cannot be fetched in this environment; WebCrypto is also unavailable on the permitted page. A different crypto library was deliberately not substituted. |
| R294 | **PROMISING / STRONG MODEL COMPONENT** | Exact rational cases all match. Across 500 floating tests max error is 4.86e-14 under a 1e-12 contract. A 12M-sample OpenMP run is output-identical in that fixture and 1.22× faster on four threads. |

## R289 — shared independent-picture WebCodecs decoder service

The first required gate fails in this managed Chromium environment. `EncodedVideoChunk` and Worker exist, but `VideoDecoder` is `undefined` on the permitted `about:blank` page. WebCodecs decoder exposure can depend on secure context, so the test also attempted a localhost origin. Chromium rejected that navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`.

Because the card specifically asks whether multiple independent-picture jobs can share a native **WebCodecs** decoder, a native FFmpeg substitute would answer a different question. No decoder-pool performance claim was made.

**Verdict:** BLOCKED, not failed.

## R290 — symbolic motion-copy composition

A real 64×64 progressive MPEG-2 I/P fixture was created with macroblock-aligned content that moves right by one 16×16 luma macroblock each generation. Chroma content moves consistently at its 8×8 4:2:0 granularity.

After ordinary FFmpeg decoding, each of the three P pictures contains:

- **12/16 macroblocks** whose complete Y/U/V reconstructed samples are byte-identical to one macroblock in the previous decoded reference;
- **4/16 left-edge macroblocks** that are not exact copies and are therefore materialized leaves.

The copy relationships were composed across three generations. Reconstructing each P picture from the composed terminal leaves is byte-exact to the ordinary decoded picture. Maximum chain depth is three. In a 200,000-iteration map-lookup microprobe, direct composed lookup was **2.41×** faster than repeatedly walking the three-generation dependency chain.

An 8-pixel-shift control produces **0/16 whole-macroblock copy matches** per P picture and therefore falls back completely, demonstrating that the prototype does not approximate changing block boundaries.

**Boundary:** the experiment establishes the exact mapping/composition component over a real MPEG-2 decoded sequence. It does not yet parse MPEG-2 residual syntax inside a maintained decoder or prove end-to-end decoder speedup from skipping reconstruction.

## R291 — certified no-op H.264 deblocking rewrite

The first fixture is progressive 8-bit 4:2:0 CAVLC, one slice per picture, B-frames disabled, one reference, AQ disabled, and constant low QP. Decoder QP debug output shows:

- IDR macroblocks: QP 7;
- P macroblocks: QP 10;
- alpha/beta offsets: 0.

At zero offsets those QPs lie in the H.264 alpha/beta zero-threshold region. FFmpeg's loop-filter implementation returns immediately when alpha or beta is zero.

x264 already notices this condition and emits `disable_deblocking_filter_idc=1`. To test the proposed transformation rather than merely observe an encoder optimization, the experiment first built a controlled equivalent source by replacing the three header bits for `idc=1` (`010`) with the same-length representation of `idc=0, alpha_offset=0, beta_offset=0` (`111`) in all 30 slices. That artificially enabled source still decodes byte-exactly, confirming the proof condition.

The candidate rewrites all 30 slices back to `idc=1` without changing payload lengths. Results:

- all decoded YUV bytes identical;
- MP4 packet size/timing metadata identical;
- four Chromium seek/canvas samples identical;
- legal parse and playback to the same final media time.

A QP18 fixture is conservatively rejected by the structural gate because it enters the nonzero-threshold region. A stronger QP28 control demonstrates the danger of ignoring the gate: forcing deblocking off changes **81,658 decoded bytes**, maximum absolute delta **9**.

**Verdict:** strong narrow proof; not a generic skip-loop-filter mode.

## R292 — source-specialized JPEG Huffman Wasm kernel

A deterministic 256×256 grayscale JPEG was encoded with a reused validated Huffman table set. The prototype parses the actual JPEG DHT/scan, removes byte stuffing at the entropy-wrapper boundary, and supplies entropy bytes to two Wasm paths sharing the same coefficient reconstruction logic:

1. an ordinary canonical table-driven Huffman decoder;
2. a generated source-specialized kernel whose Huffman decisions are emitted as fixed codebook-specific Wasm control flow.

The JPEG contains **1,024 8×8 blocks**, **56 stuffed 0xFF bytes**, and AC codes as long as **16 bits**. Both paths consume the same final bit position and reproduce **every quantized coefficient exactly** against libjpeg's coefficient oracle.

A second JPEG uses restart interval 32 and contains **31 restart markers** plus 60 stuffed bytes. Both paths again reproduce every coefficient exactly after the wrapper resets predictor/alignment at restart boundaries.

The specialized coefficient output was written back through libjpeg using the original critical parameters. Its decoded grayscale pixels are byte-exact to the original JPEG.

Median kernel timings over alternating benchmark rounds:

- ordinary table-driven: **1.5305 ms**;
- specialized: **1.2255 ms**;
- **1.25×** kernel speedup.

Restart case: **1.5387 → 1.2191 ms (1.26×)**.

Negative controls:

- truncated entropy returns an error;
- an optimized-coding JPEG has a different Huffman-table hash and therefore cannot hit this specialization;
- an oversubscribed synthetic Huffman table is rejected by validation;
- restart and byte-stuffing cases remain exact.

The combined Wasm module is 5,469 bytes. First `WebAssembly.Module` construction measured ~0.39 ms in this Node host, but this is not a production break-even claim because the module contains both compared paths and the prototype's offline C/Clang generation is not a runtime code generator. Native `ImageDecoder` is unavailable in this browser, so that comparison is BLOCKED.

**Boundary:** this proves a specialized entropy/coefficient kernel, not a full Wasm MJPEG player speedup.

## R293 — authenticated random-access encrypted source

The proposal requires an existing reviewed Streaming AEAD construction and a pinned reference implementation, specifically suggesting Tink AES-GCM-HKDF Streaming.

Environment gates:

- Python Tink package: unavailable;
- network package installation: unavailable;
- permitted page WebCrypto: unavailable (`crypto.subtle` is not exposed in this non-secure page);
- Python `cryptography`: available, but deliberately **not substituted** because independently reimplementing the Tink wire/segment construction would defeat the card's reference-implementation requirement.

No security result was claimed from a substitute scheme.

**Verdict:** BLOCKED at the required implementation/API gate.

## R294 — max-decay envelope prefix composition

The recurrence tested is exactly:

`e[n] = max(p[n], a * e[n-1])`, for finite nonnegative `p` and `0 <= a <= 1`.

Each block is summarized as `F(e) = max(A*e, B)`, and summaries compose as specified in the proposal. Two validation layers were used.

### Exact arithmetic

Python `Fraction` tests cover `a = 0`, `1`, `3/4`, and `999/1000`; block sizes 1, 3, 7, and 16; impulses across boundaries; ties; and nonzero initial state. **16/16 exact-arithmetic configurations match the sequential recurrence exactly.**

### Floating implementation

A 500-case randomized sweep includes varying lengths/block sizes, very slow decay, ties, tiny values, and nonzero initial state. Because floating reassociation can alter rounding, tolerance is declared as `1e-12` rather than bit identity. Results:

- 130/500 cases show at least one rounding difference;
- maximum absolute error: **4.8628e-14**;
- all cases satisfy the declared tolerance.

NaN, infinities, and negative magnitudes are explicitly rejected by the tested policy.

A C/OpenMP implementation on 12,000,000 samples performs the two local passes plus summary/prefix work. In that deterministic fixture it happened to reproduce every double bit-for-bit and measured:

- sequential median: **36.36 ms**;
- four-thread block-summary/prefix implementation: **29.83 ms**;
- **1.22× speedup**.

This remains a component benchmark, not a complete compressor/limiter result.

## Evidence boundary

R289 and R293 are capability/reference blockers, not negative media results. R290 proves map composition on exact copied reconstructed macroblocks but not decoder-integrated syntax skipping. R291 is intentionally narrow and source-bound. R292 measures the Huffman/coefficient kernel rather than full playback. R294's real-arithmetic identity does not imply universal floating bit identity; the practical contract is tolerance-based.