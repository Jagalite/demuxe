# Demuxe media/browser frontier — R193–R202 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0.  
**Scope:** compressed-domain media manipulation, browser decompression/decoding primitives, prepared representations, content-addressed media reuse, and bounded arithmetic models. No Demuxe production source changes.

The R193–R202 definitions were recovered from the Demuxe Project conversation. Tests preserve each card's narrow claim; unavailable prerequisites are reported as **BLOCKED**, not replaced by a different mechanism.

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R193 | **BLOCKED ENVIRONMENT** | Controlled 2×2 tile inputs exist, but this libheif has no HEIC encoder plugin and permitted Chromium exposes no VideoDecoder. |
| R194 | **PROMISING COMPONENT GPU BLOCKED** | Browser DecompressionStream emitted all four real ZMBV Z_SYNC_FLUSH outputs incrementally and exactly; CPU motion/XOR reconstruction matched FFmpeg. |
| R195 | **BLOCKED ENVIRONMENT** | Basis/KTX tools and browser GPU APIs are unavailable, so ETC1S→multiple GPU compressed-format destinations cannot be exercised. |
| R196 | **PROMISING STRONG** | Two independent AAC-LC mono SCE streams were combined structurally under a truthful PCE; 49,152 samples/channel are bit-exact in FFmpeg and Chromium, without PCM reconstruction. |
| R197 | **PROMISING STRONG** | Two JPEGs with different quantization tables were rebased to an elementwise-GCD basis with exact dequantized coefficients and zero pixel changes in FFmpeg and Chromium. |
| R198 | **PROMISING COMPONENT GPU BLOCKED** | Direct PGS-style RLE run-span rendering exactly matches bitmap materialization for transparency, overlap, palette update, crop, clear, and seek restore; GPU path unavailable. |
| R199 | **PROMISING MODEL COMPONENT** | A conservative omitted-IDCT-contribution bound held for every tested block and 50,000 adversarial coefficient blocks. |
| R200 | **PROMISING STRONG** | The same 30-frame closed AVC group embedded in two different files reused identical coded content and decoded exactly to the independent group in both timelines. |
| R201 | **PROMISING MODEL** | Solved periodic steady-state initialization for a stable IIR filter matched long-run converged output to floating-point precision, including a=0.9999. |
| R202 | **PROMISING MODEL** | A conservative int16 admission guard for an H.264-style 4×4 inverse transform admitted 57,948 random blocks; all 57,948 matched the wide reference with zero guarded overflow. |

**QA:** 80/80 assertions passed.

## R193 — tiled HEIC through browser video decoding

The intended route requires a tiled HEIC item graph, extraction of independently decodable HEVC tile access units, browser `VideoDecoder`, and tile composition. Four controlled tile images were generated for the planned 2×2 oracle, but `heif-enc --list-encoders` reports no HEIC encoder plugin in this lab; the tiled HEIC construction therefore stops before the coded-media gate. Chromium on the permitted page also exposes `VideoDecoder` as `undefined`.

This is **BLOCKED**, not a negative result about tiled HEIC or WebCodecs. No AVIF or uncompressed substitute was accepted as equivalent evidence.

Evidence: `results/r193.json`, `results/browser-capabilities.json`, `work/r193_enc.log`.

## R194 — browser zlib + ZMBV reconstruction

A real 64×64 BGR0 ZMBV stream contains four controlled frames: a keyframe, an unchanged frame, a moved-block frame and a changed-block frame. Packet sizes are [65, 10, 63, 59]; corresponding inflated payload sizes are [16384, 32, 5152, 4128].

One persistent browser `DecompressionStream('deflate')` received the real compressed bytes frame by frame. Without closing the stream, it emitted the exact payload at each `Z_SYNC_FLUSH` boundary. A CPU implementation of ZMBV motion copying and XOR residual application reconstructs the complete sequence byte-for-byte to FFmpeg (`eaf06b60ccbaf2a32d28da9364d6fc8143b4fcdd48f070035108daaa54bd648a`).

The proposed GPU copy/XOR stage remains untested because browser GPU APIs are unavailable. The component result is that browser-owned zlib satisfies ZMBV's incremental stateful inflation requirement in this Chromium build.

## R195 — prepared texture video to several GPU destinations

The card requires an ETC1S/Basis prepared sequence, a reference transcoder and at least two real GPU compressed-texture destinations. `basisu`, `toktx` and KTX tooling are absent; this browser also exposes neither WebGPU nor a usable WebGL context. A CPU-only invented texture format would not test the route.

Verdict: **BLOCKED — environment**.

## R196 — independent AAC channel assembly

Two synchronized 48 kHz AAC-LC mono streams were encoded with PNS, TNS, M/S and intensity-stereo tools disabled; there is no SBR or coupling. Each contains 48 aligned raw-data blocks. The assembler retains each source SCE bitstream, changes only the second SCE's `element_instance_tag` from 0 to 1, authors a Program Config Element declaring two front SCEs (tags 0 and 1), and writes ADTS with `channel_configuration=0` so layout authority stays in the PCE.

No PCM samples are reconstructed during assembly. The output contains 49,152 decoded samples per channel. FFmpeg decodes channel 0 bit-for-bit identical to source A and channel 1 to source B. Chromium `AudioContext.decodeAudioData()` independently reports **0 differing float samples** and max absolute error 0 for both channels.

This demonstrates genuine compressed-domain AAC channel assembly under the card's independence restrictions. It does not cover coupled stereo, PNS/TNS-dependent content, SBR, mismatched priming or arbitrary AAC syntax.

## R197 — common JPEG quantization basis without requantization loss

Two 128×128 grayscale JPEGs used different quantization tables. For every coefficient position the transformer chose `G=gcd(Q_A,Q_B)` and replaced each quantized coefficient with `C' = C·Q/G`. Every transformed coefficient remained within JCOEF range (maximum absolute 513).

The dequantized coefficient hashes are unchanged for both images. FFmpeg reports zero decoded-pixel differences, and Chromium `createImageBitmap` + canvas reports zero RGBA component differences for both transformed files.

The representation is not automatically smaller: A grew 516→1494 bytes and B 1329→2292 bytes. This is a lossless compatibility/editing basis, not a compression win.

## R198 — bitmap subtitles directly from RLE runs

A bounded PGS-style run parser retained spans as row/start/length/palette-index records. The direct run compositor and conventional materialized-index-bitmap compositor share the same exact integer source-over RGBA rule. Exact equality passes for the base subtitle, overlapping objects/palette/crop, palette updates, clear events and seek-state restoration, including transparent and partially transparent palette entries.

This proves the run representation and direct rasterization component. The proposed GPU execution remains blocked by missing GPU APIs, and the fixture is a controlled PGS-style packet model rather than a full demux integration.

## R199 — certified-error preview reconstruction

Using libjpeg-turbo quantized coefficients and a pinned double-precision 8×8 IDCT basis, the prototype omits transform contributions only when their conservative absolute contribution plus rounding allowance remains within the requested per-pixel budget.

| Requested budget | Max observed rounded error | Max certificate | Violations | Omitted non-DC fraction |
|---:|---:|---:|---:|---:|
| 2 | 0 | 1.000 | 0 | 97.63% |
| 4 | 3 | 3.987 | 0 | 97.67% |
| 8 | 7 | 7.253 | 0 | 99.21% |
| 16 | 15 | 15.937 | 0 | 99.27% |

An additional 50,000 adversarial coefficient blocks produced **0 bound violations**; the worst observed error/certificate ratio was 0.999700. This validates the certificate for the pinned reconstruction model, not yet a production JPEG decoder.

## R200 — content-addressed reuse across different files

A 30-frame closed H.264 group was encoded once and stream-concatenated between different pre/post groups to create two different 90-frame files. The exact shared coded byte sequence appears at byte offsets 17051 and 1420.

Frames 30–59 extracted from both complete files match the independent shared-group decode exactly and match each other exactly. The cache identity also changes when color metadata, dependency-boundary identity or decoder configuration changes.

This supports caching verified immutable work for closed dependency groups across authorized files while keeping current-file timestamps/timeline semantics outside the cached object. It does not justify sharing mutable live decoder state.

## R201 — periodic steady-state filter initialization

For the scalar stable IIR model `y[n]=a·y[n−1]+(1−a)·x[n]`, one loop is represented as `s_next=M·s+b`. The prototype solves the fixed point and starts the first requested loop there. Across `a=0.8, 0.98, 0.999, 0.9999`, end-state closure is within 2.220e-16; maximum output difference from a 5,000–20,000-loop converged reference is 2.220e-16.

This is strong evidence for periodic-state initialization on a controlled stable linear filter, not a general solution for nonlinear or time-varying filter graphs.

## R202 — guarded narrow arithmetic

The H.264-style integer 4×4 inverse-transform model derives a cheap conservative intermediate bound from the maximum absolute dequantized input. For int16 intermediates the largest admitted threshold is **2672**; 2672 is admitted and 2673 rejected.

Across 120,000 randomized blocks, the guard admitted 57,948. Every admitted block matched the wide-integer reference exactly and **zero admitted blocks overflowed**. The guard intentionally rejects 38,366 actually-safe blocks, favoring correctness over maximal admission.

This validates the admission strategy; it is not yet a SIMD speed benchmark or production decoder kernel.

## What this batch adds

The strongest new mechanisms are R194 (browser-owned incremental ZMBV inflation), R196 (sample-exact compressed AAC channel assembly), R197 (lossless JPEG quantization rebasing), and R200 (cross-file closed-group reuse). R199/R201/R202 add a complementary design pattern: an optimization is admitted only after a concrete mathematical correctness bound passes.

R193 and R195 should be rerun only where their actual codec/GPU prerequisites exist. R198 should next use a real PGS demux fixture and GPU implementation.

## Evidence integrity

**QA: 80/80 assertions passed.** Raw results, fixtures and runnable scripts are included in the evidence archive. Blocked cards are not counted as failures of their hypotheses.