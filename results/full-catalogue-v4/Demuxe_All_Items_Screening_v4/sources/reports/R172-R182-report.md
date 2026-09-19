# Demuxe media/browser frontier — R172–R182 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0, Linux x86-64.  
**Scope:** compressed representation routing, bitstream surgery, browser/Wasm I/O, selective decode, subtitle resources, compressed-domain mixing, corruption tracking, and restart-interval composition. No Demuxe production source changes.

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R172 | **PROMISING COMPONENT / BROWSER GPU BLOCKED** | Hap Snappy unwrap preserved the exact 1,536-byte BC1 payload on all 4 frames; CPU decode and seek oracles match. Browser GPU texture presentation could not be exercised. |
| R173 | **PROMISING COMPONENT / GPU PRESENTATION BLOCKED** | A real FLC palette/index state machine—including palette-only and index-only updates—expanded exactly to FFmpeg RGB and replayed exactly after seek. |
| R174 | **PROMISING / STRONG, NARROW** | A valid mono FLAC 20→24-bit rewrite preserved coded subframe payload bits and decoded with `x24 = 16*x20`; Chromium normalized output was identical. |
| R175 | **PROMISING, NARROW** | Tightening H.264 `max_num_ref_frames` from 8→1 on a verified one-reference I/P-only stream preserved all 60 decoded frames, timestamps, frame types, and non-SPS slice payloads. |
| R176 | **PROMISING COMPONENT** | JSPI suspended a synchronous Wasm export across two asynchronous reads, resumed the same call, propagated cancellation, and rejected pending work on teardown. |
| R177 | **BLOCKED** | The permitted Chromium page exposes neither WebGPU nor WebGL; the localhost-origin retest was blocked by browser administration. No honest GPU JPEG entropy kernel could be run. |
| R178 | **PROMISING PARTIAL — spatial selectivity** | Exact 256×256 tiled JPEG 2000 region decodes read about 50–59% of a 65.6 KB codestream, but the same region did not read fewer bytes when resolution/quality restrictions changed. |
| R179 | **NEGATIVE — exactness gate failed** | Subsetting two Noto fonts to 14.8% of their original bytes changed libass raster output for decomposed `A + combining acute`. |
| R180 | **PROMISING / STRONG, NARROW** | Two real compatible FLAC frames were mixed by summing warmups plus 4,093 Rice residuals directly; the output decoded exactly to the 4,096-sample PCM sum. |
| R181 | **PROMISING CONSERVATIVE MODEL** | Dropping a non-reference B picture left every remaining emitted frame exact; reference loss and `frame_num` corruption recovered to an exact suffix at the next IDR. |
| R182 | **PROMISING / STRONG** | Eight JPEG restart-row entropy intervals were rearranged A/B without pixel/coefficient reconstruction; the decoded 64×64 mosaic is pixel-exact. |

**QA:** 52/52 explicit assertions passed.

## R172 — keep Hap BC1 compressed to presentation

Two four-frame Hap fixtures were authored with the same BC1 image sequence: one used uncompressed Hap texture payloads and one used Hap's Snappy wrapper. Parsing and Snappy-unwrapping the compressed form produced exactly the same 1,536 BC1 bytes per frame as the raw form for all four frames. FFmpeg RGBA decodes match, and the 0.5-second seek control resolves to the same decoded frame.

This proves the useful source-side component: Demuxe can unwrap Hap compression while retaining GPU-compressed BC1 rather than expanding it on the CPU. It does **not** prove the browser texture-upload/presentation half. On the permitted Chromium page, `navigator.gpu` and WebGL are both unavailable; S3TC therefore cannot be qualified here.

**Integration implication:** retain Hap texture blocks as a first-class representation, but gate the route on an admitted GPU compressed-texture capability. Do not silently expand to RGBA and still call the route zero-expansion.

## R173 — preserve FLIC indices plus palette

The controlled 16×8 FLC has four meaningful state transitions: initial palette+indices, palette-only, index-only, then another combined update. A small state machine preserves the 128-byte index plane and 768-byte palette separately. Expanding that state to RGB matches FFmpeg exactly for all frames, including the palette-only update. Replaying state from the beginning to the seek target reproduces the same RGB hash.

This validates palette/index retention and the seek-state requirement. Browser shader lookup remains untested because the environment exposes no WebGL/WebGPU context.

**Integration implication:** this is a legitimate indexed-image route only if palette state is part of the seek dependency graph. Palette-only packets are presentation-significant even when index bytes do not change.

## R174 — FLAC bit-depth promotion without sample reconstruction

A valid one-frame mono 20-bit FLAC was transformed into 24-bit by declaring four wasted low bits and rebuilding framing/checksums while preserving the coded fixed-predictor payload bits. The destination therefore represents `x24 = 16*x20` exactly. Both files contain 4,096 samples; the normalized WAVE bytes are identical, and Chromium `decodeAudioData()` reports zero normalized difference over all samples.

The source frame is 3,652 bytes and the promoted frame 3,653 bytes. This is genuine bitstream surgery, not a decode/re-encode round trip.

**Integration implication:** bit-depth promotion can be metadata/framing work for admitted independent FLAC subframes. The current evidence is deliberately narrow: one mono profile, not stereo decorrelation or arbitrary FLAC frame forms.

## R175 — tighten verified H.264 decoder requirements

The fixture is progressive H.264 with 60 frames: 2 I and 58 P, no B pictures, one actual active reference, and no list-0 reordering flags. An intentionally overstated SPS advertises eight reference pictures. The corrected stream advertises one.

Decoded frame-MD5 sequences are identical. Slice payloads are unchanged outside the SPS, and the MP4 muxed timestamps/frame types are identical for all 60 frames.

**Integration implication:** Demuxe may safely lower advertised requirements only after deriving a certificate from actual bitstream behavior. This is not permission to rewrite arbitrary SPS constraints optimistically.

## R176 — JSPI-backed synchronous Wasm I/O

Chromium exposes both `WebAssembly.Suspending` and `WebAssembly.promising`. A tiny Wasm function that appears synchronous from inside Wasm performed an async read at offset 2,000 and then a distant async read at 1,002,000. The single exported call resumed after both waits and returned the expected value 1,004 in about 31 ms, consistent with two injected 15 ms delays.

A cancellation control rejected with `Error: aborted`, and closing the page during a deliberately pending call rejected rather than leaving the harness hung.

**Integration implication:** JSPI is a credible way to adapt synchronous demux I/O to browser asynchronous byte providers. The next gate is an actual FFmpeg/libmpv reader with reentrancy, parallel demux activity, teardown, and cost measurements.

## R177 — GPU JPEG entropy decoding

This card is **BLOCKED by the execution environment**, not disproven. The permitted page reports no WebGPU adapter and no WebGL context. A localhost-origin capability retest could not run because Chromium returned `ERR_BLOCKED_BY_ADMINISTRATOR` for the navigation.

No CPU implementation was substituted for the requested GPU entropy kernel, because that would not test the card.

**Integration implication:** keep the experiment pending for a GPU-enabled browser environment with exact coefficient or pixel oracle coverage and malformed-input bounds.

## R178 — selective JPEG 2000 source reads

The fixture is a 1,024×1,024 grayscale JPEG 2000 codestream, 65,562 bytes, with 256×256 tiles and RPCL progression. A custom OpenJPEG source callback recorded every read/seek and its unique source-byte footprint while decode-area, resolution reduction, and layer limits were applied. Each streaming-source output was compared byte-for-byte against the same decode using the whole codestream as backing.

Results:

| Request | Output | Unique source bytes | Fraction | Exact |
|---|---:|---:|---:|---|
| top-left 256², reduce 2, layer 1 | 64×64 | 32,770 | 49.98% | yes |
| bottom-right 256², reduce 2, layer 1 | 64×64 | 38,647 | 58.95% | yes |
| top-left 256², full resolution/all layers | 256×256 | 32,770 | 49.98% | yes |
| top-left 256², reduce 2/all layers | 64×64 | 32,770 | 49.98% | yes |
| full image, reduce 2/layer 1 | 256×256 | 65,562 | 100% | yes |

The strong result is **spatial/tile selectivity**: a requested region need not force all codestream bytes through the source adapter. The negative/unfinished part is equally important: this fixture did not show additional source-byte reduction from resolution or quality-layer restrictions within the same tile region.

**Integration implication:** pursue a source-bound packet/tile index, but do not yet claim quality-progressive or resolution-progressive sparse fetching from this evidence.

## R179 — exact subtitle font subsetting

Two Noto fonts totaling 756,780 bytes were subset for the controlled ASS track to 112,164 bytes, or 14.82% of the original footprint. Tests included Latin ligatures, `AV` kerning, decomposed combining acute, Greek, Cyrillic, Arabic shaping, and an explicit line break.

The exactness gate failed. The composite libass frame differs in 162 RGBA bytes with a maximum channel delta of 43. Isolated rendering found the mismatch in **decomposed A + combining acute**; the office/affine/AV/naïve/Greek/Cyrillic/Arabic controls were exact.

This should be treated as a useful rejection, not rounded into a success because the visible difference is small.

**Integration implication:** a prepared font subset is acceptable only with a track-specific shaping/raster witness suite. This current subset recipe is rejected for exact playback.

## R180 — residual-domain FLAC mixing

Two real mono FLAC frames were parsed. Both use compatible fixed predictor order 3 and Rice parameter 1. Instead of reconstructing the complete PCM signals, the prototype sums the predictor warmups and all 4,093 coded residual values directly, chooses a valid output Rice parameter, authors a new FLAC frame, and rebuilds integrity fields.

The output contains 4,096 samples and decodes **sample-for-sample exactly** to the ordinary PCM sum. The observed output range, −6,581 to 7,887, remains safely inside signed 16-bit headroom.

**Integration implication:** exact lossless mixing can exist below the PCM layer for carefully admitted, aligned predictor-compatible FLAC. General gain, clipping, resampling, stereo coupling, mismatched predictors, and arbitrary frame alignment remain outside the proven route.

## R181 — dependency-aware corruption tracking

The test H.264 stream has 36 access units: 3 I, 18 P, and 15 B. Three perturbations were tested.

- Removing a chosen non-reference B picture yields 35 decoded frames, and **every emitted remaining frame** matches the intact stream.
- Removing a reference P picture yields 35 frames; the final 12-frame GOP beginning at the next IDR is exact to the intact stream.
- Flipping a slice-header bit that changes reference/frame-number handling produces one decoder warning; the final IDR GOP is again exact.

This supports a conservative model: non-reference loss contaminates that picture only; reference loss contaminates dependent output until a reset point; malformed reference management should be considered unknown until the next certified reset.

**Integration implication:** attach trust/contamination provenance to decode dependencies so unaffected output can still be surfaced. Exact per-picture certification inside a damaged inter-IDR interval remains future work.

## R182 — JPEG mosaic from restart intervals

Two 64×64 grayscale JPEGs were encoded with matching headers/tables and one restart interval per MCU row. Their entropy scans each contain eight independent row intervals. A new JPEG was authored by alternately copying row intervals from source A and B and rewriting the restart-marker sequence; no DCT coefficient or pixel-domain composition was used.

The resulting 64×64 JPEG decodes pixel-for-pixel exactly to an oracle mosaic assembled from the corresponding decoded 8-pixel source rows. All eight compressed entropy intervals were reused.

**Integration implication:** restart intervals can act as compressed composition tiles when JPEG coding parameters and MCU geometry are compatible. This is currently a grayscale, row-aligned, matching-table result—not arbitrary rectangle composition.

## What this batch changes for Demuxe

The most directly architectural results are:

1. **Compressed representations can remain first-class farther into the pipeline:** R172, R173, R180 and R182 all avoid an ordinary full pixel/PCM reconstruction step for useful transformations or routing.
2. **Validated metadata rewriting can reduce requirements without touching payloads:** R174 and R175 show two concrete versions of that idea.
3. **Browser async I/O does not necessarily force async semantics throughout Wasm:** R176 makes a synchronous demux API over asynchronous reads plausible.
4. **Selective source access needs to be measured, not assumed:** R178 proves spatial sparsity for its tiled JPEG 2000 profile but also shows that requested lower quality/resolution did not automatically reduce source bytes.
5. **Exactness witnesses are valuable even when they reject an optimization:** R179 prevented a 6.7× font-size reduction from being mislabeled exact.
6. **Damage can be modeled as dependency provenance rather than whole-stream failure:** R181 is a promising basis for partial trustworthy playback.

## Recommended next probes

- **R172:** rerun on GPU-enabled Chrome with BC1/S3TC upload, texture sampling, orientation/color oracle, seek churn, and texture lifetime/resource measurements.
- **R176:** insert JSPI underneath an actual FFmpeg/libmpv synchronous reader and compare it with explicit async/range scheduling.
- **R178:** prepare packet-indexed JPEG 2000 fixtures whose layers/resolutions occupy separable byte ranges, then test whether Demuxe can avoid them deliberately rather than relying on decoder callback behavior.
- **R180:** test mixed predictor orders, stereo-independent channels, weighted integer sums, and overflow admission.
- **R181:** parse real reference-picture dependencies and emit a machine-checkable trust mask per output picture.
- **R182:** extend from restart rows to multi-source MCU-aligned rectangle assemblies and color/subsampled JPEGs.

## Evidence integrity

`results/qa.json` contains **52/52 passing assertions** over the recorded experimental outputs. Raw JSON, fixtures, scripts, browser capability observations, and environment metadata are packaged with this report. Blocked browser/GPU paths are explicitly marked blocked; they are not replaced with host simulations and counted as successes.