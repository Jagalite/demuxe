<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — batch 13

## Scope and evidence

**Temporary items D59–D61.** Three new bounded questions and destination tests; these are not claims of globally novel algorithms or three completed production features. Current repository lineage was read at `6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36` (2026-09-20). No repository source was changed, pushed, or executed as the maintained player.

The experiments ran in Chromium 144.0.7559.96, FFmpeg 7.1.5, and Pillow 12.3.0 with libTIFF; see `evidence/environment.json`. Browser tests use an ordinary blank page with media passed through an exposed local read function. WebCodecs was unavailable on this page. The browser remained on this restricted page; no secure-origin override was used to expose unavailable APIs.

**Measured:** byte identity, container metadata, full decoded sample/pixel comparisons at specified endpoints, actual browser seeks and EOF, isolated audio rendering, and negative controls. **Not measured:** CPU benefit, total process memory, energy, hardware decoding, browser compositor acceleration, real-world frequency of affected inputs, or maintained-player performance.

A fresh-directory replay regenerated **73 fixture files with identical hashes**, reproduced every browser JSON result byte for byte, and passed the same **68 consistency checks**. Those checks include expected rejection and known fidelity failure: an all-green verification report is not an all-green candidate qualification. See `evidence/replay_summary.json` and the independent replay records under `evidence/replay/`.

## Summary

| Item | Question | Result | Decision |
|---|---|---|---|
| D59 | Decode JPEG-compressed TIFF pages through native JPEG image decoding, including bounded regions | Seven pages, 42 strips, and 2,184,084 RGBA values match the independent TIFF reference exactly; four partial-page requests also match | Pursue the narrow adapter |
| D60 | Correct false non-sync sample labels only when actual coded pictures support the correction | Eight changed byte values restore native-direct seeking; unchanged damaged media already works in MSE | Conditional direct-seek repair, not a blanket transform |
| D61 | Reuse a small audio loop without constructing a repeated input waveform | Isolating one cycle gives 350,014 exact same-rate output values; full-buffer subrange loops expose boundary problems | Pursue isolated-cycle same-rate output; reject broader exactness claims |

## D59 — Native JPEG decoding for restricted TIFF pages and regions

### Hypothesis

A JPEG-compressed TIFF can be treated as a source of independently decodable compressed strips. Restore each strip's shared JPEG tables, preserve its compressed scan, and compose the decoded strips at their declared positions. The adapter need not decode TIFF pixels and encode a new complete image.

The format basis is TIFF Technical Note #2: Compression 7 uses JPEG segment streams; `JPEGTables` supplies shared quantization/Huffman tables. This mechanism is related to prior D21 and repository R140, but the new consumer is an actual multi-strip/multi-page TIFF with per-directory geometry and table scope, rather than an abbreviated camera transport frame.

### Authored sources and implementation

`build_tiff.py` uses the installed libTIFF encoder through Pillow to create four single-page TIFFs (RGB at two quality settings, YCbCr, and grayscale) and one three-page TIFF. Each page is 321 × 243, split into six strips: five 48-row strips and one 3-row strip. The source is deliberately lossy JPEG; the oracle is the image decoded from the TIFF, not the pre-encoding synthetic picture.

The candidate is an independent Python classic-TIFF metadata parser, not Pillow's parser. It reads actual IFDs, offsets and lengths, validates a bounded subset, and constructs standalone JPEG strip files from the source tables and original strip data. It does not call an image decoder to construct those candidates. The host oracle independently decodes the complete original TIFF through libTIFF; PNG is only an exact transport of those reference pixels into the browser.

The browser candidate decodes the JPEG strips with `createImageBitmap`, draws them into a Canvas at their declared offsets, and closes the image bitmaps. No full-TIFF raster is sent to the browser candidate. This is native-backed image decoding plus composition, **not an HTML video/native hardware route**.

### Results

All five TIFF containers were rejected by the tested browser image endpoint. Their reconstructed strips produced seven exact pages: **42 native JPEG image decodes; 546,021 pixels; 2,184,084 RGBA component values**. Both full-TIFF-versus-reconstructed host decoding and browser-versus-reference comparisons were exact.

The region extension selects only intersecting strips and composes directly into the requested output rectangle. It does not create an intermediate full-page candidate Canvas.

| Requested rectangle (x, y, width, height) | Decoded strips | Decoded strip pixels | Full-page pixels | Output result |
|---|---:|---:|---:|---|
| (17, 101, 123, 20) | 1 | 15,408 | 78,003 | Exact |
| (7, 40, 127, 65) | 3 | 46,224 | 78,003 | Exact |
| (9, 240, 99, 3) | 1 | 963 | 78,003 | Exact |
| (12, 149, 143, 39) | 1 | 15,408 | 78,003 | Exact |

These counts are not measured CPU or I/O savings. The current constructor still loads and parses the complete small source and prepares all strip candidates. Range-only reading is a next implementation step, not an executed claim.

### Negative controls

Using valid JPEG tables from the wrong-quality source remains decodable but changes **40,162 RGBA values**, with a maximum difference of 95. Swapping the first two strips also remains decodable and changes **88,354 values**, with a maximum difference of 255. Corrupt tag extents, excessive output dimensions, changed source identity, missing tables, and an actual orientation-6 TIFF are rejected by the restricted parser.

### Accepted and excluded scope

Accepted here: classic TIFF, unsigned 8-bit contiguous samples, baseline JPEG strips, RGB/grayscale and 1:1-sampled YCbCr, ordinary reference levels, orientation 1, bounded page/strip counts. Color-significant auxiliary fields, ICC, alpha, tiles, alternate predictors, other orientation, and other sample formats are not silently discarded. YCbCr subsampling, general tiled TIFF/BigTIFF, CMYK, progressive JPEG strips, exact color-managed/HDR output, arbitrary malicious files, asynchronous source replacement, and public streaming remain unqualified. The parser is a research component, not a hardened general TIFF implementation.

**Decision:** pursue a real thumbnail/page/region consumer. First compare with the existing software TIFF path and inspect whether a maintained adapter already exposes strip data. Do not load a second full raster or transcode the JPEG again merely to reach the browser.

Evidence: `evidence/tiff_manifest.json`, `evidence/browser_tiff.json`, `evidence/browser_tiff_region.json`.

## D60 — Destination-specific recovery of mislabeled random-access samples

### Hypothesis

Some seek failures may be metadata failures rather than decoder incompatibility. For a known closed-GOP AVC profile, can false non-sync flags be corrected using actual slice types and source-bound packet identity?

### Construction and controls

The source is a four-second, 80-picture AVC presentation, with B pictures and four closed GOPs. All four first samples contain IDR slices; the other 76 samples do not. The candidate operates on existing `trun` first-sample-flags fields. It preserves byte positions and all coded packets and timestamps. It checks NAL framing and first-VCL types and uses the supplied source-bound packet hashes; it is **not a general proof of arbitrary corrupted access-unit completeness or SPS/PPS dependency closure**.

A damaged variant sets each first sample to dependent/non-sync. The repair clears that false non-sync classification and restores independent-sample classification. Exactly **eight byte values** change across four four-byte fields. The repaired canonical file is byte-identical to the original canonical file. Full host decoding of original, damaged, and repaired files produces the same 80 pictures.

The final fixture uses signed composition offsets so that both tested browser endpoints report a four-second timeline. The FFmpeg encoder's trailing `mfra` index is omitted identically from all three canonical variants; this prevents an index-presence confound. Its unmodified encoder output is retained separately.

### Actual browser outcomes

| Route | Original | Damaged flags | Repaired |
|---|---|---|---|
| Direct Blob URL | 10 seek witnesses and EOF pass | Loads, then first tested seek fails with FFmpegDemuxer seek error | Same 10 picture/dimension/timestamp witnesses and EOF as direct reference |
| MSE complete presentation | 10 witnesses and EOF pass | Same 10 witnesses and EOF pass | Same 10 witnesses and EOF pass |
| MSE cold start from third GOP | Four witnesses and EOF pass | Same four witnesses and EOF pass | Same four witnesses and EOF pass |

**The repair is unnecessary for the tested MSE destination.** A production choice should not add a parser/patcher if an already-qualified unchanged route meets the request. Conversely, the direct-seek result shows a legitimate destination-specific reason to investigate the adapter.

The actual guard is exercised against all 76 genuine dependent sample payloads and rejects them as IDR candidates. It also rejects malformed NAL lengths and incorrect expected packet identity. No non-IDR picture is relabeled as an IDR by this experiment.

### Important fidelity limit

The final original direct and original MSE routes do **not** have identical pixel hashes at their ten common requested positions. Their timelines and dimensions match, but the experiment did not isolate the cross-endpoint rendering cause. The adapter qualification compares each route to **its own unchanged-source reference**. This does not authorize a silent exact-pixel switch from direct playback to MSE. This known differential is retained in `analysis.json`, not counted as a successful cross-endpoint comparison.

### Initial fixture record

An initial unsigned-composition-offset fixture produced MSE [0.1, 4.1] versus direct [0, 4] timelines. Its records and files remain under `evidence/initial_video/` and `fixtures/initial_video/`. The final reference was authored with signed composition offsets; that was a fixture correction, not a new timing-repair mechanism or a reason to erase the initial observation.

**Decision:** conditional direct-seek repair or regression for malformed metadata. Demonstrate affected real sources and inspect current admission/index ownership before integration. No corpus prevalence, broad keyframe-repair safety, video-only-to-A/V extension, decoder acceleration, or cost benefit is established.

Evidence: `evidence/video_manifest.json`, `evidence/browser_video.json`, `evidence/analysis.json`.

## D61 — One bounded copy can make native audio looping correct

### Hypothesis and contract

For an explicitly requested repeated PCM interval, use one native looping source instead of constructing a full repeated input waveform. Compare three representations: a loop inside the existing larger buffer, a copied single-cycle buffer looped in full, and an independently materialized repeated reference.

The exact same-rate contract is source interval [start, end), an integer sample phase within it, an integer requested output length, and unchanged Float32 values. Five cases cover periods of 1,874, 257, 128, and one frame, nonzero starting phase, 44.1/48 kHz rates, and a scheduled start 13 output samples into the context. All output is actual OfflineAudioContext output, not a model of native processing.

### Positive results

Copying exactly one requested cycle into a smaller AudioBuffer and looping the full buffer matches all **350,014 requested channel values** across the five same-rate jobs. The independent repeated-input reference also matches. The first four jobs additionally work as subrange loops inside the larger source buffer.

The 1,874-frame stereo cycle contains **14,992 bytes** of Float32 sample data. It produces, for example, 75,001 stereo output frames without storing 75,001 repeated input frames. The harness retains the full source and reference, and the browser allocates output and internal state; this is not measured memory savings or proof of zero-copy browser internals. Creating a bounded cycle buffer intentionally adds one copy relative to an existing full-buffer owner.

### Failed whole-buffer assumptions

The one-frame loop inside the larger source returns the correct first frame, then repeats the adjacent, excluded frame: **2,002 of 2,003 frames differ in each channel**. The isolated one-frame buffer is exact. Off-by-one loop-end controls fail for all five jobs.

During rate conversion, the full-buffer region has larger seam differences from the materialized periodic signal. At 24→48 kHz, 11 values per channel differ over the 40,003-frame comparison. The largest absolute difference is approximately **0.069849**. At 44.1→48 and 48→44.1 kHz, maximum full-buffer deviations are approximately **0.129221** and **0.134946** respectively.

### Causal boundary controls

A separate actual-browser test changes only samples outside the requested loop. Mutating the samples before the loop does not change output in any of three cases. Mutating the samples after it does: for the rate-doubling case, exactly three seam positions per channel change in a 12,007-frame render. The first is output frame 2,285. The one-frame loop is also affected by changes to the immediately following source material.

This establishes an excluded-neighbor dependency under the requested exact-periodic-output contract. It does not establish a security issue or a complete account of browser resampler internals. Web Audio allows interpolation differences and has specific boundary rules; we do not turn the observation into a universal specification-conformance verdict.

### Fractional rates remain nonexact after isolation

The isolated-cycle representation exactly matches the 24→48 kHz materialized reference. At 44.1→48 and 48→44.1 kHz, isolation reduces the maximum observed difference to **2.9802322387695312e-8**, but those comparisons remain nonexact. Repeated identical full-buffer jobs are deterministic in all three rate conversions. The small measured fractional-rate residual is **not** a retroactively declared tolerance pass; a bounded-error contract would be a separate experiment.

**Decision:** pursue the isolated-cycle same-rate native operation for decoded-buffer consumers. Do not promise arbitrary-rate bit identity, infer live gapless/A/V playback, or replace a cheaper working compressed loop by default. The adjacent repository R036 concerns MSE/AAC queue boundaries and remains a separate stopped profile; this result does not repair its independent encoder-delay problem.

Evidence: `evidence/browser_loop.json`, `evidence/browser_loop_followup.json`.

## Next smallest gates

1. D59: port the metadata-only constructor into the existing image source owner, preserve source/color provenance, add selected-strip reads and cancellation, compare complete request cost with the maintained decoder.
2. D60: demonstrate actual affected content or a justified malformed-source feature; use source-bound AVC parsing and compare repaired-direct against the cheapest already-correct route under the user's requested fidelity.
3. D61: add a real same-rate decoded-loop consumer, explicit start/stop/seek ownership, and physical capture; qualify fractional conversion separately before accepting any tolerance.

## Primary references and lineage

- [TIFF Technical Note #2](https://libtiff.gitlab.io/libtiff/specification/technote2.html): JPEG strip and shared-table representation. This explains the file format, not the measured outcome.
- [MSE ISO BMFF byte-stream format](https://www.w3.org/TR/mse-byte-stream-format-isobmff/): initialization, relative addressing, and random-access requirements.
- [Web Audio loop semantics](https://www.w3.org/TR/webaudio-1.1/#looping): native loop boundaries and interpolation; native implementations are not inferred solely from the specification.
- Repository `R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images`: bounded RTP/JPEG reconstruction already qualified; TIFF and page/region handling are new subcases, not a new reconstruction principle.
- Repository `R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop`: exact AAC queue recipe stopped on its audio seam gate; decoded-loop work here is not the same contract.
- Prior conversation D21 (JPEG reconstruction), D44–D45 (destination and access-point distinctions), D35/D43 (native scheduling/resampling) remain the local lineage.
