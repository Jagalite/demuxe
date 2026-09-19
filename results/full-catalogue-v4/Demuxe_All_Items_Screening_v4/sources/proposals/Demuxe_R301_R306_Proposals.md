# Demuxe — R301–R306 research proposals

**Status:** PROPOSED / NOT TESTED.  
**Date:** 18 September 2026.  
**Scope:** Six additional hypotheses for routing, muxing, decoding, and presentation. This pass reviewed primary specifications and implementation sources; it did not run media experiments, benchmarks, builds, or production changes. The mathematical constructions are arguments for experiments, not measured improvements. Numbering continues the visible R295–R300 catalogue; earlier IDs are unchanged.

Rolling upstream sources below establish primitives, not availability in a particular Demuxe binary or browser. Pin revisions and inventory the actual test environment before execution. No runtime route admission or automatic fidelity change is proposed.

## Index

| ID | Exact title | Initial result contract |
|---|---|---|
| R301 | Edit displayed frames without changing the prediction history | Intentional change at selected display times; exact unchanged decoded pictures and preserved required reference state elsewhere |
| R302 | Develop Ultra HDR gain maps after native image decoding | Match a specified gain-map reconstruction and output target under a declared numerical tolerance |
| R303 | Schedule H.264 deblocking as a dependency graph | Exact integer equality to the qualified filtering operation and complete continuing decode |
| R304 | Factor a multichannel effect into fewer independent filters | Same linear filter bank in exact arithmetic; bounded numerical difference in the implemented arithmetic |
| R305 | Compose Ogg checksums from reusable byte-range summaries | Identical CRC values to full rescanning of the actual generated pages; unchanged coded packets |
| R306 | Defer Opus redundancy processing until it can repair a real gap | Same selected repair and timeline as an eager, pinned DRED implementation; no claim of lossless recovery |

## R301 — Edit displayed frames without changing the prediction history

**Type:** Prepared-media construction; high-risk follow-on to R135 and R142.

### Hypothesis and mechanism

Preserve a source picture as a non-displayed reference-building picture, and insert an independently coded edited picture that is displayed but does not refresh the reference slots. Later source pictures could then continue using their original references rather than requiring re-encoding solely because of the visual edit.

AV1 distinguishes display decisions from reference refresh decisions. Its syntax includes `show_frame`, `INTRA_ONLY_FRAME`, and `refresh_frame_flags`; the reference-update process stores picture and auxiliary state in the selected slots. These primitives do not establish the complete proposed edit operation. [A1–A3]

Conceptually: original A → B → C becomes decoded A → hidden B → displayed edited-B → C. The output time assigned to edited-B is B's original display time. Retaining B while inserting edited-B increases work at the edited point; it does not make the edit free.

### First scope

Use a deliberately authored AV1 sequence already restricted to one stable configuration, simple inter-picture references, and a source profile without film grain, frame IDs, order-hint-dependent tools, or `show_existing_frame` reuse. Begin at a genuine keyframe, but edit a later non-keyframe display time. Do not claim that arbitrary existing sources can be made eligible by flipping sequence flags.

Construct a legal non-showing version of B's header while retaining its coded reconstruction and reference updates. Add an appropriately initialized intra-only edited picture with zero reference refresh. Preserve or restore every other relevant state dependency; zero refresh flags alone are not accepted as proof. A bitstream-aware writer must rebuild all affected syntax and sizes rather than patching a presumed bit offset.

### First experiment

Use a short sequence with one annotation. Compare every unchanged displayed picture against the original reference, the edited picture against the declared reference encoding of the requested edit, and all later pictures through end-of-stream. Instrument relevant reference samples and auxiliary state in an independent software decoder. Separately verify unchanged coded tile payloads.

Only after structural and software correctness should the construction be tested through an actual browser decoder. Preserve timestamps, sample counts, random-access rules, and cancellation. A fresh WebCodecs decoder must still receive a genuine key entry; an intra-only insertion is not to be mislabeled as a key chunk. [A4]

### Negative controls and rejection

Test an edited picture that accidentally refreshes a reference, unsupported frame-ID or order-hint dependencies, output reordering, a seek on either side of the edit, and a purportedly independent replacement with incompatible configuration. Any change in the unedited suffix rejects the profile.

**Not a redaction format:** the original unedited picture remains recoverable in the file. Use only for non-sensitive edits such as annotations. Never use it to remove confidential imagery.

### Cost and baseline

Compare against smart rendering of the affected temporal region, not only a full-file transcode. Count preparation, added bytes, hidden-picture decoding, replacement decoding, frame delivery, and seeking. For ordinary subtitle playback, use the normal overlay route as the baseline instead of unnecessarily baking pixels into a new video.

**Stop:** unchanged-reference equivalence cannot be established, the browser rejects the valid construction, or the additional decode/bitrate burden exceeds its editing value.

## R302 — Develop Ultra HDR gain maps after native image decoding

**Type:** Existing-image capability; source-specific extension of split reconstruction ownership.

### Hypothesis and mechanism

Use a small parser to extract a qualified Ultra HDR image's compressed base, compressed gain map, and metadata. Decode the component images with browser image decoding, then apply gain-map reconstruction in a GPU stage. Retain the decoded components so changing the declared output HDR capacity does not repeat JPEG decoding.

Libultrahdr exposes a probe that parses information without decompressing the images, accessors for both compressed images and gain-map metadata, and an output-display-capacity parameter. Its reference implementation performs metadata-dependent gain reconstruction, including gamma, offsets, and gain-map weighting. [U1–U3]

### First scope and test

Start with a single supported SDR-base Ultra HDR profile and a grayscale gain map, then extend to RGB gain maps separately. Use explicit fixed target capacities in the laboratory; do not assume a browser exposes a trustworthy continuous measurement of physical display headroom.

First compare reconstruction using identical decoded component arrays, isolating the shader math from JPEG-decoder differences. Then qualify the complete browser-decoded route against a pinned libultrahdr output under stated absolute and relative error bounds. Test resizing the gain map, metadata gamma and offsets, color primaries/transfer functions, orientation, clipping, and changes of target capacity while paused.

Treat the gain map as reconstruction data rather than an ordinary photograph. Reject a component path that applies incompatible color, tone, or gain processing before the shader can use its values.

### Output boundary and baseline

Matching a floating-point or specified encoded output surface does not establish physical HDR-screen correctness. Test the display path separately. This is an image route; a timed sequence is an explicit extension, not automatic support for arbitrary HDR video.

Compare against direct native Ultra HDR handling when available and correct, and against a complete software libultrahdr route. Count parser/runtime loading, both image decoders, upload, retention, reconstruction, and presentation.

**Stop:** the normal native image path already meets the request more cheaply, component values cannot be recovered correctly, or two decoders plus a shader offer no useful capability or complete-cost improvement.

## R303 — Schedule H.264 deblocking as a dependency graph

**Type:** Controlled GPU reconstruction experiment; exact-output follow-on distinct from R291's no-op elimination.

### Hypothesis and mechanism

Represent each deblocking edge operation by conservative sample read and write sets. Preserve the reference ordering between operations whenever a read-after-write, write-after-read, or write-after-write conflict exists. Execute only independent operations together; use valid dispatch-level ordering between dependent batches.

FFmpeg's implementation provides explicit edge order and integer kernels. The kernels modify samples on both sides of an edge, and strong filtering can reach farther than its nearest samples. Thus merely assigning one GPU invocation per visible edge is not a correctness argument. [H1–H2]

A schedule based on worst-case footprints may be prepared for a qualified geometry and reused, while frame-specific strengths and thresholds remain input data. A shader barrier is not assumed to synchronize all workgroups. [G1]

### First scope and test

Begin with eight-bit progressive luma, a single slice, and no adaptive field/frame coding. Supply complete unfiltered reconstructed samples and validated edge parameters captured from a reference decoder. Compare every filtered sample against independent scalar and optimized reference execution. Include intersecting strong edges, disabled edges, picture boundaries, threshold equality cases, and adversarial scheduling orders.

Extend to chroma only after the luma profile passes. Then integrate into complete continuing decoding and confirm that filtered reference pictures produce the same later pictures. Preserve the relationship between unfiltered intra-prediction inputs and filtered references; this prototype does not license changing reconstruction semantics.

### Cost and baseline

Count scheduling, metadata upload, dispatches, barriers, final output, and any readback required by subsequent reconstruction. This is most plausible beside GPU-resident reference reconstruction. A CPU/Wasm decoder that needs every filtered picture copied back may lose any benefit.

This does not intercept the internals of an opaque browser decoder. It requires a controlled reconstruction path. Compare with optimized CPU deblocking and established threaded paths, not just a scalar loop.

**Stop:** schedule overhead or data movement dominates, exact ordering cannot be maintained, or existing parallel execution already captures the opportunity.

## R304 — Factor a multichannel effect into fewer independent filters

**Type:** Linear DSP structure optimization; mathematical derivation, not a new convolution identity.

### Hypothesis and mechanism

Let H[k] be the matrix of filter coefficients at delay k. For a filter bank admitting

`H[k] = A · diag(g1[k], ..., gr[k]) · B`

with the same constant matrices A and B at every delay, calculate

1. `u[n] = B x[n]`,
2. `vj[n] = sum_k gj[k] uj[n-k]`,
3. `y[n] = A v[n]`.

Expanding the equations gives `y[n] = sum_k H[k] x[n-k]`. The result is the same linear operation in exact arithmetic.

For an authored eight-input/eight-output bank with r = 2, this means two shared filtered signals surrounded by input/output mixes, rather than treating all 64 input-output responses as unrelated filters. This is a count of logical filtering paths, not a predicted speedup. The correct baseline is an optimized multi-input/multi-output convolver already sharing transforms.

### First scope and test

Start with an authored exact factorization and dyadic or rational coefficients. Build the full impulse-response matrix independently. Exercise an impulse on every input channel, random inputs, cancellation, block boundaries, final tails, and nonzero processing state where applicable. Keep filter lengths, sample rate, output latency, channel order, and normalization identical.

Web Audio specifies impulse-response normalization separately from linear convolution; disable it or reproduce it consistently in any reference nodes. An arbitrary 8×8 implementation belongs in controlled DSP, not an assumption that one browser ConvolverNode supports that layout. [W1]

Compare numerical output against a higher-precision reference. Floating-point regrouping may differ from the original evaluation, so this does not claim bit-identical PCM without an implementation-specific proof.

### Rejection and extension boundaries

Low rank at one frequency is insufficient: the same constant A and B must reproduce every coefficient matrix. Test full-rank and nearly-factorable controls; they stay on the ordinary path. Truncating small singular values is an approximation and is not part of this experiment.

Exclude nonlinear stages, clipping, changing matrices, and independent time-varying channel delays from the initial profile. Count both mixing operations, factorization/preparation, transform plans, storage, and complete processing.

**Stop:** useful banks do not admit a smaller representation, the graph is already factored, or added mixing costs exceed the saved filtering. Difference from R219: reduce the number of independent filtered signals, rather than only sharing their input transform.

## R305 — Compose Ogg checksums from reusable byte-range summaries

**Type:** Mux-stage computation reuse, without changes to checksum semantics.

### Hypothesis and mechanism

Ogg computes a CRC over its header with the checksum field zeroed, followed by its body. Cache the exact length and Ogg-convention CRC of immutable payload spans. For later page layouts, checksum the small new header and combine it with the selected span summaries rather than rescanning every unchanged payload byte. [O1]

For zero-initialized, zero-final-XOR CRC state in the chosen convention, let Z_n(c) mean advancing state c through n zero bytes. Then

`CRC(A || B) = Z_len(B)(CRC(A)) XOR CRC(B)`.

This is a compositional property of the CRC state transition. Zlib documents a combine API for its own CRC convention, but its stored CRC values are not to be substituted blindly for Ogg's. Implement and validate Ogg's exact polynomial, bit ordering, initialization, and final convention. [Z1, O1]

### First scope and test

Start with fixed page bodies and changing valid stream serial numbers or sequence headers. Then introduce different page boundaries at indexed packet-fragment cuts while retaining valid lacing, continuation, and granule semantics.

Generate actual page bytes and independently rescan them using libogg's checksum code. Require equality for every page and ordered codec-packet identity. Test empty packets, lengths that are multiples of 255, cross-page continuation, zeroed checksum fields, corrupted cached lengths, reordered spans, and mutation of a formerly cached source buffer. [O2]

Cached summaries must be bound to immutable bytes. A novel subrange without a valid summary still needs a correct scan or derivation from a suitable index. The cache is not a replacement for cryptographic authentication or trusted source identity.

### Cost and baseline

Payload bytes still have to be stored or delivered. The avoided work is repeated checksum scanning, not all memory traffic. Count cold summary construction, metadata, joins, newly split spans, copying, and complete mux time. Compare against libogg's optimized checksum loop, including any checksum calculation already fused with copying.

**Stop:** few payloads are reused, small spans make summary metadata excessive, the muxer is dominated by unrelated work, or cached identities cannot be safely maintained.

## R306 — Defer Opus redundancy processing until it can repair a real gap

**Type:** Optional loss-recovery scheduling and capability experiment; not lossless source recovery.

### Hypothesis and mechanism

Parse and retain bounded DRED coverage information, but defer its expensive processing while ordinary packets cover the required output. When an actual gap remains repairable before its playback deadline, process a selected redundancy payload and synthesize only the needed interval. Expire unused work.

The inspected libopus API explicitly provides `opus_dred_parse(..., defer_processing=1)`, `opus_dred_process`, and DRED audio synthesis using an OpusDecoder state. Therefore deferred processing exists as a primitive; the experiment is a deadline- and coverage-aware browser/Wasm integration. [P1]

DRED represents redundant acoustic information and requires integration with buffering/latency decisions. It is not recovery of the lost original packet bytes or guaranteed sample-exact reconstruction of the no-loss primary output. [P2]

### First scope and test

Pin a mutually compatible DRED encoder, model, bitstream revision, and decoder build. Start with one continuous controlled software Opus decoder, not an assumed state handoff from a browser AudioDecoder. Inventory the actual build for the required APIs and models before testing.

Compare eager and deferred DRED processing using the same packets, selected redundancy, decoder state, and output-latency budget. Test loss-free input, one missing packet, bursts, original packets arriving before repair is needed, redundancy arriving after its deadline, incompatible payloads, and cancellation/seek epochs.

Require identical ordinary output on the no-loss path, and the same repaired samples and timeline as the eager pinned reference when it selects the same repair. This equality target is the reference repair implementation, not the original uncompressed signal.

### Cost and rejection

Measure unused expensive processing avoided, processing spikes when loss occurs, maximum time to ready repair, output underruns, model/runtime costs, retained coverage data, and complete session CPU. Keep code and model availability controlled; do not hide a cold model download inside a supposed real-time repair operation.

An already-output sample cannot be replaced. Do not increase playout delay only for the candidate and call the quality gain a scheduling win. Also compare to an already-lazy qualified upstream integration; do not claim the defer API itself as a new invention.

**Stop:** deferred work cannot meet deadlines, normal packets already make redundancy irrelevant, required history forces an uncounted duplicate full decode, or the deployed implementation already performs equivalent demand-driven processing.

Difference from R161: R161 replaces speculative output after the original data arrives. R306 schedules processing of redundant side information that remains a lossy repair representation.

## Primary source register

All sources were read during this proposal pass. Rolling sources must be pinned for experiments. These URLs document primitives, not successful complete routes.

- **A1 — AV1 frame-header syntax:** https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/06.bitstream.syntax.md — display flags, intra-only frames, primary reference selection, reference refresh, frame IDs and order hints.
- **A2 — AV1 decoding process:** https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/08.decoding.process.md — reference-update and saved-state semantics.
- **A3 — AV1 bitstream semantics:** https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/07.bitstream.semantics.md — meaning and constraints of frame syntax.
- **A4 — AV1 WebCodecs registration:** https://www.w3.org/TR/webcodecs-av1-codec-registration/ — low-overhead bitstream input and actual KEY_FRAME requirement for key chunks; browser support remains a separate gate.
- **U1 — libultrahdr project:** https://github.com/google/libultrahdr — base image, gain map and metadata architecture.
- **U2 — libultrahdr API:** https://raw.githubusercontent.com/google/libultrahdr/main/ultrahdr_api.h — non-decompressing probe, compressed-image accessors, gain metadata and max-display-boost controls.
- **U3 — libultrahdr reconstruction math:** https://raw.githubusercontent.com/google/libultrahdr/main/lib/src/gainmapmath.cpp — gain application, gamma, offsets and target weighting.
- **H1 — FFmpeg H.264 filtering order, pinned tag:** https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/h264_loopfilter.c
- **H2 — FFmpeg H.264 filtering kernels, pinned tag:** https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/h264dsp_template.c
- **G1 — WGSL:** https://www.w3.org/TR/WGSL/ — workgroup synchronization and memory semantics; no assumed universal cross-workgroup barrier.
- **W1 — Web Audio:** https://www.w3.org/TR/webaudio/ — ConvolverNode impulse-response normalization, linear convolution, channel and tail semantics.
- **O1 — Xiph Ogg framing:** https://xiph.org/ogg/doc/framing.html — lacing, page construction, and the exact Ogg CRC convention.
- **O2 — libogg implementation:** https://raw.githubusercontent.com/xiph/ogg/master/src/framing.c — `ogg_page_checksum_set`, checksum update loop and page construction.
- **Z1 — zlib manual:** https://zlib.net/manual.html — CRC-combine primitive for zlib's own convention; not an Ogg CRC drop-in.
- **P1 — libopus API:** https://raw.githubusercontent.com/xiph/opus/main/include/opus.h — deferred DRED parsing, processing and synthesis APIs; rolling source, not an installed-build inventory.
- **P2 — Opus team's 1.5 technical explanation:** https://opus-codec.org/demo/opus-1.5/ — historical primary explanation of redundant acoustic features, buffering and latency tradeoffs. Its 2024 version/standardization statements are not asserted as current status.

## Common execution rules

1. Preserve ID, exact title, mechanism, output contract, and source/configuration scope together. Nearby proxy tests do not establish the original hypothesis.
2. Record primitive availability separately from structural validity, decoded correctness, actual browser output, performance, and production integration.
3. Require source/configuration-specific negative controls and an independent oracle before optimization timing.
4. Include preparation, copying, storage, dispatch, cleanup and teardown in complete-cost measurements. Report conditional capabilities and tradeoffs rather than invented universal gains.
5. Keep changed presentation, bounded numerical equivalence, exact decoded equality, and loss-recovery quality as distinct result classes.
