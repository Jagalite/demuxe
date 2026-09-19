# Demuxe media/browser frontier — R232–R238 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie); ffmpeg version 7.1.5-0+deb13u1 Copyright (c) 2000-2026 the FFmpeg developers; Python 3.13.5; libvorbis0a 1.3.7-3; gcc (Debian 14.2.0-19) 14.2.0  
**Scope:** bounded media decoding, representation, rendering, resampling and work-elision experiments. No Demuxe production source changes.

The R232–R238 definitions were recovered from the immediately preceding Demuxe idea-generation sequence. Each test preserves the narrow mechanism rather than substituting a different optimization when a prerequisite is missing.

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R232 | **PROMISING STRONG COMPONENT** | A 12-bit RGGB DNG sensor plane was demosaiced/color-converted in WebGL2 and matched the integer CPU oracle with **0 component mismatches**. |
| R233 | **PROMISING STRONG MODEL** | Absolute-index 44.1→48 kHz resampling matched the continuous reference exactly across **250 random chunkings**; naive per-chunk phase reset produced **144,124 mismatch/length errors**. |
| R234 | **PROMISING COMPONENT MODEL** | Eligible LPC coefficients produced exactly the same residuals/reconstruction as FLAC fixed predictors across **5,000 blocks / 2,034,372 sample values**; actual FLAC subframe rewrite/CRC was not exercised. |
| R235 | **PROMISING MODEL COMPONENT** | The fractional-prediction cache produced **0 pixel mismatches** across 3,000 controlled queries; reference-picture identity is required in the cache key. |
| R236 | **PROMISING STRONG COMPONENT** | Instrumented libvorbis Floor1 yielded **23,680 independently reconstructed envelope bins with 0 mismatches** across 24 blocks, and every captured curve reached inverse2 application. |
| R237 | **PROMISING STRONG MODEL** | Backward visible-region propagation reproduced the full pipeline exactly while requiring **3,763 vs 46,800 source pixels**, a **91.96% source-area reduction**. |
| R238 | **PROMISING STRONG MODEL** | Linear 8→2 channel mixing commuted before resampling with **0 sample differences**, reducing resampler instances from **8 to 2 (75%)**. |

**QA:** **45/45 top-level assertions passed.** Stress coverage additionally includes 250 randomized resampler chunkings, 5,000 predictor blocks, 3,000 fractional-prediction cache queries, and 24 instrumented Vorbis decode blocks.

## R232 — RAW sensor plane → GPU demosaicing/color

A controlled 64×48 12-bit RGGB sensor plane was serialized as a minimally tagged DNG/TIFF CFA image and read back exactly. The CPU oracle performs bilinear Bayer demosaicing followed by a fixed-point 3×3 color matrix and 12→8-bit quantization. The WebGL2 shader executes the same integer operations from an `R16UI` sensor texture.

The Chromium WebGL2 result has the same SHA-256 as the CPU output (`484bc3197724ea987ec06d6e50f64882b1840b960e3e823d19a81e9d713f4357`) with **0 differing components and maximum error 0**. Treating the raw Bayer samples as gray RGB instead differs in 8,865 components. The unmasked renderer is `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`.

This establishes functional exactness for a bounded Bayer/color path. It is not physical-GPU performance evidence, nor does it cover arbitrary DNG opcode lists, camera profiles, lens corrections, non-RGGB mosaics or malformed metadata.

## R233 — absolute-output-index resampling

The resampler maps output sample `j` directly to source position `j·147/160` for 44.1→48 kHz. A 132,437-sample controlled signal produces 144,149 output samples. Processing the same source through awkward source boundaries and **250 independent random chunkings** yields the exact continuous-reference hash `4b8eb5eca9dd75cddd5e6a42c10886e3682aaa596f38618c7290d6f3f1fc6cef` every time.

A deliberately wrong implementation resets phase at each source chunk. It emits 144,142 samples instead and accumulates **144,124 mismatch/length errors**. The result supports making resampler phase a function of absolute timeline/sample identity rather than delivery-buffer boundaries.

## R234 — equivalent FLAC LPC → fixed predictor

FLAC fixed predictors of orders 1–4 are exact polynomial predictors. The admission rule tested here is intentionally narrow: LPC shift must be zero and every QLP coefficient must exactly match the corresponding fixed-predictor coefficient. Under that rule, the general-predictor and fixed-predictor residuals are identical.

Across **5,000 randomized blocks / 2,034,372 sample values**, residual mismatches and reconstructed-sample mismatches are both zero. Eight negative controls change a coefficient or shift and all reject equivalence. At a representative 12-bit QLP precision, changing the subframe representation could avoid roughly **21, 33, 45 or 57 predictor-metadata bits** for orders 1–4 before considering framing effects.

This is a correctness/admission result, not yet a complete FLAC bitstream transformer: subframe serialization, residual partition coding decisions, frame CRC and decoder round-trip of a rewritten file remain open.

## R235 — fractional-pixel prediction cache

A controlled H.264-like six-tap fractional predictor was exercised over multiple reference pictures, subpixel positions, edges and block sizes. Repeated hot queries are cached by `(reference identity, fractional source position, width, height)` and compared against an uncached oracle on every access.

Across 3,000 queries there were **750 hits, 2,250 misses and 0 pixel mismatches**. A negative control proves reference-picture identity cannot be omitted from the key: identical coordinates in two different reference frames produce different predictor bytes.

The cache semantics are validated, but this pilot is deliberately labeled a model component: the controlled two-dimensional interpolation helper is H.264-like rather than a complete normative integration with FFmpeg/libavcodec motion compensation for every qpel position, chroma mode and weighted-prediction case.

## R236 — Vorbis Floor1-only spectral envelope

A real two-second mono Vorbis stream was decoded through installed libvorbis 1.3.7. A preload instrument intercepts the actual Floor1 `inverse1`/`inverse2` boundary, captures the decoded floor memo before residue-dependent reconstruction, and logs the Floor1 post geometry. An independent Python renderer then reconstructs the integer floor curve from those posts.

For the first **24 audio blocks**, all **23,680 curve bins** match the decoder-side instrumentation exactly, and all 24 captured floor memos are subsequently applied by `inverse2`. Floor decoding consumed **81–141 bits per captured packet**, median 129 bits; the median captured packet storage was 392 bits, so floor data represented about **32.9%** of those controlled packets.

This is direct evidence that a Floor1 spectral-envelope visualizer can obtain the coded envelope without reconstructing full PCM. Floor0, malformed setup/codebooks and production-browser integration are not covered.

## R237 — backward visible-region propagation

The controlled effect graph is `source → 3×3 box blur → crop → 2× nearest zoom → final visible crop`. The full-frame oracle processes all 46,800 source pixels. Backward propagation from the 137×101 requested output rectangle expands the blur halo and resolves only the source rectangle `[81,59]–[152,112]`, covering **3,763 source pixels**.

The ROI result has **0 visible-pixel mismatches** versus the full-frame oracle, reducing source area by **91.96%**. A negative control that fails to propagate the blur halo produces **681 mismatches**, demonstrating why effect footprints must participate in the backward dependency calculation.

## R238 — channel reduction before resampling

For a time-invariant linear 8→2 channel matrix and a linear 44.1→48 kHz interpolating resampler, the experiment computes both orders using exact integer/rational arithmetic: resample all eight channels then mix, versus mix to stereo first then resample.

Across 21,768 stereo output samples, both the pre-rounding rational numerators and final integer samples are **exactly identical**. Moving the matrix first reduces resampler instances from 8 to 2, a **75% reduction** in this topology. A nonlinear clipping control produces 40,000 differences, so the optimization must be admitted only across linear, time-invariant operations with compatible rounding/state semantics.

## Batch interpretation

R232 and R236 are the strongest implementation-level results in this batch because they exercise actual WebGL2 and an actual libvorbis decoder boundary. R233 and R238 establish useful algebraic invariants for scheduling/graph optimization. R237 demonstrates a large work-elision opportunity when effect footprints can be inverted exactly. R234 and R235 remain bounded component/model results and should be promoted only after real bitstream/decoder integration tests.

The common theme is increasingly clear: Demuxe can avoid work not merely by selecting a different codec route, but by **proving that a smaller representation, state window, region, or linear operation order is semantically equivalent for the requested output**.