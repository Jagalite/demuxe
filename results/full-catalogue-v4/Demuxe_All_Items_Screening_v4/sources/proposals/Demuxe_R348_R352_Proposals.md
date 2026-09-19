# Demuxe — R348–R352 research proposals

**Status: PROPOSED / NOT TESTED.** Source review and experiment design, 19 September 2026. No media fixtures, playback tests, performance benchmarks, production changes, or route admissions were performed for this batch.

These cards continue the visible R343–R347 series. Names and mechanisms below are the experiment identities; testing a nearby primitive does not complete the named card. Preserve the existing Native / Hybrid / Software architecture. Each additional path needs its actual deployment, source, fidelity, and destination gates. Missing APIs or matching builds mean BLOCKED, not an invitation to substitute a different experiment.

## R348 — Convert packed DSD directly to the requested PCM rate

### Mechanism and distinction

Investigate fusing a specific DSD-to-PCM low-pass/decimation stage with the following fixed-rate PCM decimator. The candidate avoids generating a high-rate intermediate PCM stream that the application immediately reduces again.

FFmpeg's pinned DSD implementation already filters packed bytes with precomputed tables. Replacing a naive bit-expansion loop is therefore not a new optimization; the baseline must retain that existing efficient behavior. [S1, S2]

For an illustrative two-stage factor-8 construction, let s[n] be the signed one-bit input, h the first filter, and g the second filter:

    u[m] = sum_k h[k] s[8m-k]
    y[n] = sum_j g[j] u[8n-j]
    K[l] = sum_j g[j] h[l-8j]
    y[n] = sum_l K[l] s[64n-l]

In exact arithmetic, K implements the same filter cascade and sampling phase. Its contributions can also be grouped into byte-value lookup tables. This identity is a proposed implementation basis, not a benchmark or bit-identical floating-point guarantee.

### Initial profile

Mono uncompressed DSD64 input, one specified bit order, fixed conversion to 44.1 kHz PCM, fixed filters, fixed starting phase, and explicit finite-stream extension/flush rules. A raw synthetic source can establish the component result; a DSF or DSDIFF integration is a separate file-reader gate. No DST decompression, clock-drift correction, integer quantization, dithering, or time-varying filter settings in the initial profile.

### Decisive experiment

Compare (A) the optimized packed-byte first stage followed by a strong polyphase second stage, (B) the composed kernel, and (C) an independently evaluated high-precision cascade. Establish delay, sample count, phase, filter response, and a declared PCM error tolerance before timing. Compare whole processing including table construction and final output conversion.

### Controls and rejection

Exercise alternating bits, long runs, impulses represented as perturbations to a known bit sequence, short final inputs, every byte alignment, chunk boundaries, and incorrect bit-order controls. Later seek tests require the appropriate finite filter history; arbitrary reset is not equivalent to continuous conversion.

Removing the first stage's float rounding changes numerical evaluation. Exact-output requests need a separately demonstrated result, not the real-arithmetic identity alone. DSD-to-PCM is not preservation of the original DSD bitstream, and this path does not claim native DSD or DoP device output.

Reject when the composed filter/table working set, increased input scanning, or loss of efficient multistage decimation exceeds the avoided intermediate work. Include the necessary anti-alias filtering; changing the response to make the candidate faster is a different experiment.

### Measurements

Total conversion CPU/time, first useful output, intermediate and table bytes, input rereads, output error, phase/delay, short-job versus long-session break-even. Browser playback and physical-device output remain separate qualifications.

### Relation

A codec-specific extension of R155/R339's operation-composition idea, exploiting packed binary-valued source data rather than reconstructing an unnecessary intermediate PCM rate.

## R349 — Seek through hierarchical MP4 indexes without loading the whole index

### Mechanism and distinction

Investigate a lazy seek reader for an already indexed fragmented-MP4 source: root sidx -> relevant child index -> leaf media range -> qualified playback. GPAC explicitly supports hierarchical SIDX construction and distinguishes it from daisy-chain indexing. The sidx representation contains reference types, sizes, times, durations, and random-access information. [S3, S4]

This is index-on-demand, not smaller per-sample arrays and not rebuilding a writer's state. The initial root range and source length/version are supplied by a validated manifest or another bounded discovery mechanism; discovering an arbitrarily located root is not assumed free.

### Initial profile

Finite, immutable, unencrypted fMP4; bounded two-level hierarchy; stable H.264/AAC configuration; leaf fragments beginning at independently verified suitable access points; simple presentation mapping. Audio/video sample data remains unchanged.

### Decisive experiment

Create a reference source with many short fragments and compare eager hierarchy flattening with branch-only traversal under the same cache and network conditions. Seek into early, middle, late, and adjacent intervals, then replay sequentially. Compare chosen sample ranges, timestamps, first correct output, continuation, and EOF against an independent fully parsed reference.

### Controls and rejection

Validate each node's local offset origin, timescale, durations, reference ranges, declared sizes, and source identity. Use checked wide-integer arithmetic; do not assume JavaScript Number can represent arbitrary 64-bit values exactly. Set explicit caps on depth, nodes, total requested bytes, and outstanding requests. Test truncated children, inconsistent durations, overlapping or out-of-source references, stale source versions, and random-access claims contradicted by actual samples.

An index reference is not proof of independent decoding. Fetch any necessary initialization and bounded preroll. The MSE byte-stream specification permits certain top-level index boxes to be accepted and ignored; appending sidx to MSE does not instruct the browser to traverse the hierarchy. [S5]

Reject when the complete index is already tiny, the current parser already traverses it lazily, or extra dependent round trips make real seeks worse. Do not manufacture a win by comparing against a fresh FFmpeg process or an unnecessarily uncompressed index.

### Measurements

Index and media bytes fetched separately, cold/warm seek latency, number of dependent reads, parsed-node count, retained index bytes, complete first-correct-A/V latency, and sequential playback regression. Count packaging cost for newly prepared sources rather than pretending all files already have the hierarchy.

### Relation

R297 avoids per-sample expansion after metadata is available; this avoids retrieving and parsing unrelated portions of an existing distributed index.

## R350 — Extract a declared lower-frame-rate AV1 operating point before decoding

### Mechanism and distinction

Investigate a source-native lower-frame-rate mode for a genuinely temporally scalable AV1 stream. The AV1 specification defines operating-point masks and layer-based OBU dropping. [S6, S7]

Candidate: validate the selected advertised operating point, retain its required OBU payloads and global configuration, normalize the advertised configuration only where needed, construct legal output framing, and decode the extracted stream. This uses an existing independently decodable temporal subset instead of decoding everything and discarding displayed outputs afterward.

### Initial profile

One spatial layer, two temporal layers, stable dimensions and bit depth, closed qualified starting points, no decoder-model timing fields in the first header-normalization pilot, and an authored base temporal layer. For example, a fixture may offer 60 and 30 presentation instants per second. Those numbers are fixture choices, not claims about arbitrary AV1 files.

### Decisive experiment

Compare (A) full-stream decode followed by selection of the requested presentation instants, (B) a reference decoder explicitly selecting the source operating point, and (C) extracted/qualified browser input. Require the same selected pictures, original presentation positions, specified holds, audio alignment, and complete duration.

Retained coded picture payloads should remain unchanged. A separately generated sequence header or changed container timing must be recorded and verified as such. Check the whole suffix, not just the first lower-rate picture.

### Controls and rejection

Do not infer layer independence from a numeric temporal_id alone. Reject unlayered streams, malformed dependency structures, missing global configuration, frame headers without their required tile groups, and purported entry points that are not legal cold starts. Preserve hidden pictures and metadata required by the chosen operating point. Start changes only at separately qualified sequence/random-access boundaries; seamless arbitrary rate switching is outside the initial scope.

AV1's WebCodecs registration expects the low-overhead bitstream format and actual KEY_FRAME content for chunks marked key. Rewriting configuration must not be used to disguise dependent input. [S8]

Fewer presentation instants intentionally change temporal fidelity. This is an explicitly selected preview, lower-frame-rate playback, or export mode, not a silent optimization of a full-rate request. Pixel equality of retained pictures does not make the entire 30 fps presentation equivalent to 60 fps.

### Measurements

Parsing/rewriting/muxing, submitted encoded bytes, decoder work, output resource pressure, total cost, and output correctness. Source-byte savings require suitable delivery granularity and are not inferred from discarding bytes already downloaded. Hardware and physical-energy claims need actual corresponding evidence.

### Relation

Unlike sparse exact-frame dependency slicing, this selects a continuous lower-rate substream already defined by the source's scalable coding structure.

## R351 — Parallelize phase-vocoder accumulation without resetting phase at job boundaries

### Mechanism and distinction

Investigate a parallel implementation of one precisely specified phase-vocoder algorithm. Librosa's pinned reference computes increments from adjacent input spectra and then accumulates output phase. It also explicitly warns that its simple reference does not handle transients. [S9]

For output analysis step m and frequency bin k, determine increment d[m,k] from the same input columns, expected phase advance, and wrap/tie rules as the chosen reference. Then:

    psi[m,k] = psi[0,k] + sum_(j=0)^(m-1) d[j,k]

The exclusive prefix sum gives each job the correct phase rather than restarting that job at an arbitrary local phase. Magnitude interpolation remains input-local. Subsequent inverse transforms and overlap-add need their own correct boundary handling.

### Initial profile

Mono PCM, fixed transform length and hop, one fixed positive stretch factor, fixed padding, no transient detection/resets, no adaptive phase locking, and no channel-linking extensions. Test the selected algorithm rather than substituting it for a higher-quality production stretcher.

### Decisive experiment

First compare complex output spectra for sequential and irregularly chunked prefix implementations, then compare complete PCM after identical inverse transforms, overlap-add, window normalization, delay, and output trimming. A zero-error timing/count result is separate from bounded floating-point sample error.

Use isolated tones, bin-boundary tones, two close tones, chirps, silence, tiny magnitudes, impulses at chunk boundaries, noninteger stretch factors, and long signals. Test wrap decisions at plus/minus pi and precisely defined zero-phase behavior. Every output job uses global input/output coordinates and an explicit phase anchor.

### Controls and rejection

Floating-point addition is not associative. Require a declared tolerance against a higher-precision reference and inspect long-run phase error. Periodic anchors or compensated accumulation, if used, belong in the implementation and cost record. Avoid a large unbounded global spectrum cache; test bounded batches too.

Spectral equality does not establish PCM equality if overlap-add contributions are lost at job edges. Include all contributing windows and correct normalization. Input decoding and final audio delivery remain separate responsibilities.

This does not prove that Rubber Band, another transient-aware stretcher, or a native browser preserves-pitch implementation can be parallelized by the same substitution. Restoring excluded higher-quality behavior is a separate research step.

### Measurements

Complete STFT, increment calculation, prefix scan, inverse STFT, overlap-add, transfers, peak storage, startup/latency, and final error. Compare against optimized sequential and independently parallelized-frequency implementations, not the Python interpreter overhead of a teaching reference. If transforms dominate or scans increase storage substantially, reject the acceleration claim.

### Relation

R233 fixes resampling-grid alignment. This preserves accumulated spectral phase in pitch-preserving duration changes. The equality contract is to the declared altered-duration algorithm, not the original audio timeline.

## R352 — Integrate video exposure over real frame durations instead of frame counts

### Mechanism and distinction

Investigate an explicitly requested temporal box-exposure renderer for a variable-frame-rate timeline. FFmpeg's tmix provides an established frame-mixing baseline, but a fixed count of frames and fixed weights do not by themselves define duration-aware exposure. [S10]

Model each admitted input picture F_i as held on [t_i,t_(i+1)). For output exposure [a,b):

    w_i = max(0, min(b,t_(i+1)) - max(a,t_i))
    Y = (sum_i w_i F_i) / (b-a)

For example, linear-light red held for 10 ms and blue held for 30 ms contribute 25% and 75% to a 40 ms exposure, not 50% each.

The proposed optimization sweeps actual presentation events. For overlapping output exposures, subtract portions leaving the window and add portions entering it, rather than rendering many uniformly spaced temporal subframes or repeatedly visiting every contributing picture.

### Initial profile

Known finite grayscale/linear-light pictures, integer timeline ticks, fixed box-exposure width, explicit last-frame duration, no spatial interpolation, no invented motion, no animated effects, and no ambiguous gaps. Start on CPU with exact rational reference arithmetic; a floating-point GPU implementation gets a separately declared tolerance.

### Decisive experiment

Compare independent exact interval integration with a bounded sliding accumulator and an optimized direct time-weighted implementation. Test fixed-rate and variable-rate input, very short flashes, long holds, exposures crossing cuts, irregular output positions, first/last partial windows, and seeks.

Only the chosen integration contract is the equality target. Changing a nearest-frame or motion-interpolated request into exposure blending is not an equivalent optimization. Quality comparisons to uniform temporal supersampling should not be mislabeled equal-output performance comparisons.

### Controls and rejection

Integrate in the declared color domain. For color/alpha extensions, establish linear-light and premultiplied-alpha semantics, then convert for display after integration. A gamma-coded component average is a different operation. Define whether shot boundaries allow blending and what happens in actual timeline gaps; do not guess.

This creates an intentional blend/blur and may show ghosting. It does not recover motion or physical shutter behavior absent from the source frames. The source hold model is an explicit interpretation, not a claim about the camera's original exposure.

Sliding floating-point sums can drift; compare against direct recomputation and count periodic rebuilding or compensation. Retaining all contributing frames can pin decoder resources, so use a bounded shutter window and explicit ownership. GPU copies or owned textures used to relieve pressure count in memory/time. Any lookahead increases interactive latency and must be reported.

### Measurements

Correct output relative to exact integration, full processing cost, retained frames/textures, requested-duration coverage, accumulated numerical error, rebuild frequency, and interactive latency. Reject when ordinary direct weighting is already cheap, when the effect is unwanted, or when lookahead/resource retention erases the benefit.

### Relation

R169 schedules existing pictures and R157 synthesizes motion-based intermediate pictures. This computes an explicitly requested time-integrated image from the source's actual held intervals, using event timing rather than assumed equal frame spacing.

## Suggested first gates

| Card | Smallest useful gate | Principal risk |
|---|---|---|
| R348 | Match the declared two-stage filter response and alignment with a composed kernel. | More filter/table work than efficient multistage decimation. |
| R349 | Read only the required index branch and reach the same qualified samples. | Additional dependent round trips for an already-small index. |
| R350 | Match an independently selected AV1 operating point. | Confusing source-layer structure with arbitrary frame dropping. |
| R351 | Match phase and overlap-add across irregular job boundaries. | Reordered floating-point sums, excess spectrum storage, and omitted quality features. |
| R352 | Match exact duration-weighted exposure on VFR fixtures. | Ghosting, lookahead, retained frames, and numerical drift. |

These are engineering priorities, not measured rankings. Actual browser/API availability, complete output, and a strong existing implementation remain mandatory gates. No production routing default is proposed.

## Primary source register

Sources were read for primitives and existing implementation behavior, not as evidence that these complete experiments succeed.

- [S1] FFmpeg n7.1.1 DSD conversion, packed-byte tables and FIR implementation: https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/dsd.c
- [S2] FFmpeg n7.1.1 DSD conversion API: https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/dsd.h
- [S3] GPAC DASH packaging options, subsegs-per-sidx and hierarchical versus daisy-chain indexing: https://wiki.gpac.io/MP4Box/mp4box-dash-opts/
- [S4] MP4Box.js SIDX reader/writer, rolling implementation reference: https://raw.githubusercontent.com/gpac/mp4box.js/main/src/boxes/sidx.ts
- [S5] ISO BMFF MSE byte-stream format, fragment requirements and ignored top-level index boxes: https://www.w3.org/TR/mse-byte-stream-format-isobmff/
- [S6] AV1 syntax, operating-point OBU selection: https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/06.bitstream.syntax.md
- [S7] AV1 semantics, operating points and temporal/spatial masks: https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/07.bitstream.semantics.md
- [S8] AV1 WebCodecs registration, low-overhead framing and key-frame requirements; draft registration, not a browser-support inventory: https://www.w3.org/TR/webcodecs-av1-codec-registration/
- [S9] Librosa 0.11.0 phase-vocoder reference, accumulation and explicit limitations: https://librosa.org/doc/0.11.0/_modules/librosa/core/spectrum.html
- [S10] FFmpeg filters documentation, tmix temporal frame mixing and weighting; rolling documentation: https://ffmpeg.org/ffmpeg-filters.html#tmix
