# Demuxe — R307–R312 research proposals

Date: 18 September 2026
Status: PROPOSED / NOT TESTED

This document creates six new research cards. It does not revise earlier cards, record any playback result, qualify a route, or claim a performance improvement. External references support the named primitives; the complete constructions below remain hypotheses. No media fixtures, decoder implementations, or benchmarks were executed in this pass.

Preserve the existing Native / Hybrid / Software public architecture. Implement initial pilots as separately bounded components. Count preparation, parsing, copies, validation, synchronization, teardown, and runtime loading where relevant. Missing APIs or fixtures are capability blockers, not failed playback. A host result is not a Wasm speed prediction. Do not bypass browser origin or administration restrictions.

## R307 — Extract an MVC base view for explicitly requested 2D playback

**Class:** Existing-file route and packet-copy construction.
**Output contract:** The declared MVC base view, with its original decoded pictures and timing; not a stereoscopic presentation and not an arbitrary selected dependent view.
**Related:** R29's compatible-core principle, but applied to MVC video.

### Mechanism and basis

H.264 Multiview Video Coding provides an AVC-compatible base view. Fraunhofer HHI describes its base-view syntax and its compatibility with ordinary H.264 decoders [S1]. Investigate extracting that view into ordinary AVC access units, constructing truthful decoder initialization and container timing, and using a qualified browser decoding destination.

Proposed path: MVC parsing -> qualified base-view access units -> AVC configuration and optional fragmented MP4 -> browser playback.

The base-view design is established. The Demuxe experiment is whether extraction and packaging recover an actually missing route without reconstructing and re-encoding pictures. Do not mistake a dependent view for an independently decodable source.

### First pilot

Use a clear, synthetic, two-view progressive MVC fixture with stable parameter sets, regular base-view IDRs, distinct visible view identifiers, and a known reference decode. Preserve the base-view coded picture payloads. Independently compare the resulting decoded base view against the reference, including reordering, audio synchronization, seeking, and EOF.

Start with elementary input before adding one particular source container. The WebCodecs AVC registration specifies the access-unit, parameter-set, and IDR expectations relevant to the browser stage [S2]. Qualify direct video, MSE, or WebCodecs separately rather than inferring one from another.

### Negative controls

An absent parameter set; an incomplete access unit; a mid-GOP cold start; a request for the dependent view; a midstream configuration change; retained stereo-only signaling; and timestamps accidentally derived from both views rather than the selected presentation.

Do not implement this as a blind NAL-type deletion recipe. Preserve or correctly translate required metadata, captions, configuration, and timing. Do not relabel an unsupported base profile as supported.

### Baseline, measurements, and rejection

Compare against existing base-view-only playback, ordinary native playback of an extracted reference, and a qualified software route. Do not force the baseline to decode the unused second view. Count inspection, packet parsing, container production, copied bytes, startup, seeks, and complete browser output.

Reject as an optimization when the current parser already admits the same base view efficiently. Reject a particular source when the requested view is not the independently decodable base or extraction cannot preserve the presentation contract. This is an explicit 2D mode, never a silent replacement for requested 3D playback.

## R308 — Move already-filtered pixels instead of filtering them again

**Class:** Exact downstream video-work reuse.
**Output contract:** Same processed picture as rerunning the specified filter graph on every decoded source frame.
**Related:** R237's region requirements and R290's exact motion mappings; neither prior implementation is a prerequisite.

### Mechanism and basis

A controlled ZMBV decoder exposes block motion copying and optional XOR differences [S3]. For an admitted block with no changed pixels, use the validated copy mapping to identify pixels that have already passed through the same effects.

Let a source patch obey F_t(p) = F_(t-1)(p-v). For a fixed translation-equivariant local operator P, P(F_t)(p) = P(F_(t-1))(p-v), provided every source sample in the operator's full dependency footprint obeys the same mapping.

Copy the previously processed result for those eligible interiors. Recompute changed patches, mixed-motion neighborhoods, borders, and all other uncertain regions. Compose support requirements across the entire eligible filter chain, rather than treating each stage's nominal rectangle as independent.

### First pilot

Use 32-bit ZMBV with controlled integer motion, in-bounds source regions, some pure-copy blocks, and some XOR changes. Normalize the unused byte of BGR0 consistently; it is not an alpha channel. Apply an explicitly defined finite integer convolution followed by a fixed pointwise color operation. Produce an independently calculated complete-frame reference.

First verify codec-derived copy certificates against reconstructed source samples. Then compare every processed output sample. Allow several neighboring blocks with identical translation to form a larger proven patch, or restrict reuse to a block's eroded interior.

### Negative controls

Different motion in adjacent blocks; a one-pixel residual change; an out-of-bounds copy; a source edge; a coordinate-dependent vignette; time-dependent noise; an effect-parameter change; a seek; and a color or pixel-layout change.

Temporal denoisers, adaptive global tone mapping, deinterlacing, screen-fixed effects, and unknown footprints are outside the first profile. A zero residual alone is not a general certificate of unchanged decoded pixels in every codec. Do not transplant the ZMBV rule blindly to H.264 deblocking or subpixel prediction.

### Baseline, measurements, and rejection

Compare full-frame processing, an optimized dirty-region renderer, and motion-aware processed-patch reuse. Include certificate production, support erosion, geometry management, retained processed pictures, copies, synchronization, and the unchanged source decode.

The candidate still displays every requested frame and performs all needed source decoding. It saves post-processing, not presentation frames. Reject when copies cost more than the filters, regions fragment excessively, or the present renderer already captures the useful reuse.

## R309 — Recalculate mix loudness from cached cross-products

**Class:** Reusable analysis for interactive fixed-gain mix queries.
**Output contract:** The specified filtered block energies and derived gated loudness of a declared linear mix, within explicit numerical tolerances. Not a waveform or peak reconstruction.
**Related:** R217's summaries and R304's shared linear structure, but computes a different result.

### Mechanism and basis

For aligned source stems, perform the specified K-weighting once using a common timeline and consistent filter-state history. For each measurement window, retain cross-products between filtered stems. The pinned FFmpeg EBU R128 implementation provides concrete filter, channel-weighting, window, and gating behavior to compare [S4].

For mono filtered stems z_i and a window W of N samples:

G_ij = (1/N) * sum_(n in W) z_i[n] z_j[n]

For gains g_i held constant throughout the evaluated history:

E_W(g) = g^T G_W g

For fixed multichannel output, accumulate the corresponding per-output-channel cross-products with the declared channel weights. The off-diagonal terms capture reinforcement and cancellation; multiplying individual stem energies by gains is not sufficient.

Recompute window energies for a new gain vector, then rerun absolute/relative gating and the other declared measurement steps. Do not reuse the previous mix's gate decisions or average already logarithmic loudness values.

### First pilot

Three synchronized mono stems, fixed source alignment, fixed rate, zero or consistently combined initial states, and fixed gains for the whole evaluated signal. Compare many gain choices with independently rendering and measuring each complete mix. Include window-energy comparisons before integrated loudness.

Use 400 ms windows at the pinned reference's 100 ms step. Source decoding and initial cross-product construction are preparation costs, not eliminated work. Storing symmetric matrices requires O(number_of_stems^2) values per window.

### Negative controls

Identical stems; opposite-polarity stems; near-perfect cancellation; gates just at a threshold; a one-sample timing shift; silence; a replaced source; gain automation; changed EQ; nonlinear clipping; and independent limiter processing.

Floating-point regrouping can change rounding and gate membership. Use stable accumulation and explicit error handling, and directly recompute ambiguous windows when required. Do not silently clamp unexplained negative computed energies and report success. Arbitrary edits or time-varying gains invalidate the initial fixed-history contract.

### Baseline, measurements, and rejection

Compare repeated queries against an optimized render-and-measure path, including preparation amortization and retained statistics. Report first-query cost, repeated-query latency, memory, window-energy error, and gated-measurement differences. Peak and true-peak checks remain separate.

Reject when too few repeated gain queries repay construction or too many stems make the matrix representation impractical. The proposal changes how analysis is reused, not how the final audio must be rendered.

## R310 — Compile G.711 processing chains into exact lookup tables

**Class:** Exact finite-input-domain processing specialization.
**Output contract:** Byte-identical output to one fully pinned decode/process/re-encode recipe; the requested processing and companding may intentionally alter samples.
**Related:** R292 specializes decoding code; this specializes the whole stateless processing chain.

### Mechanism and basis

G.711 PCMA/PCMU encode a sample in one octet [S5]. FFmpeg exposes A-law/mu-law conversion functions and conversion tables, so ordinary table-based decoding must be part of the baseline [S6].

For a fixed samplewise operation P and pinned decode/encode maps D and E, compile:

T[a] = E(P(D(a)))

For two aligned inputs and a fixed mix-plus-nonlinearity recipe Q:

T[a,b] = E(Q(D_A(a), D_B(b)))

There are 256 input values in the first case and 65,536 pairs in the second. An eight-bit-output two-input table occupies 64 KiB. A two-input table can replace explicit decode, mixing, memoryless clipping/processing, and re-encoding steps at runtime.

### First pilot

Two aligned PCMU streams, matching sample clocks, fixed rational mix weights, an exactly specified rounding rule, a fixed memoryless clipper, and pinned PCMU output encoding. Enumerate every input pair and compare its table result against an independent implementation of the complete recipe.

Then process realistic packet traces while preserving sample order, layout, timestamps, and total duration. Apply the same test to PCMA only as a separately identified profile.

### Negative controls

The alternative zero codes where present; all polarity combinations; extrema; quantization transitions; one changed processing parameter; mixed channel order; wrong table identity; and unaligned sample timelines.

Stateful filters, attack/release dynamics, arbitrary gain automation, and random dithering are excluded initially. Continuous parameter interpolation between tables does not automatically reproduce the original operation. Rebuild an exact table or use the ordinary path.

### Baseline, measurements, and rejection

Compare against an optimized fused implementation that already uses codec conversion tables and avoids unnecessary PCM buffers. Count table construction, code/data footprint, cache misses, number of concurrent profiles, and complete packet handling.

This is not lossless restoration of pre-G.711 audio. It reproduces a declared processing/re-encoding result. Reject when simple existing arithmetic is faster, table churn dominates, or the workload has too few samples to amortize setup.

## R311 — Use frame CRCs to narrow a repair, then require trusted-hash verification

**Class:** Bounded recovery from sparse corruption; no weakened integrity admission.
**Output contract:** Only bytes matching an independently trusted expected identity can be admitted as repaired.
**Related:** R181 identifies contaminated output; this investigates repairing compressed bytes before decoding.

### Mechanism and basis

FLAC specifies a frame CRC with a fixed polynomial and zero initialization [S7]. For a known frame length and an explicitly single-bit candidate model, precompute how each possible bit flip changes the observed CRC mismatch. The mismatch can then nominate candidate error locations much more efficiently than repeated full-frame CRC scans.

CRC agreement is only a candidate filter. After applying a candidate to a temporary view, verify the exact frame or containing verified chunk against an independently trusted SHA-256 value or equivalent authenticated identity. Web Crypto provides the digest primitive, not trust in the expected digest [S8].

Proposed flow: trusted extent -> checksum mismatch -> bounded candidates -> temporary correction -> trusted-identity verification -> valid parsing and playback.

### First pilot

Create small synthetic FLAC frames, retain their trusted lengths and hashes separately, and inject one bit flip at every possible position, including header and footer. Require accepted repairs to restore the exact original bytes. Keep the original corrupt input unchanged.

Record all candidate positions for a syndrome; never assume a unique location for arbitrary lengths. Bound frame size, candidate count, hashing work, and elapsed repair budget. Do not discover an unlimited parse boundary from corrupt lengths.

### Negative controls

Two-bit corruption; insertions/deletions; truncation; corrupted frame length; wrong expected identity; absent expected identity; stale sidecar; deliberately colliding CRC syndromes; and CRC-valid but hash-invalid content. Failed or ambiguous verification must retain the ordinary failure/re-fetch policy.

Without independently trusted identity, checksum-consistent output is merely a salvage hypothesis and is outside this card's accepted-repair contract. FLAC's decoded-audio MD5 field is not the external authenticated compressed-byte identity required here.

### Baseline, measurements, and rejection

Compare with rereading the local range and refetching a verified range. Count syndrome-table preparation, candidate generation, copies, hashing, and source access. The hypothesized benefit is avoiding expensive recovery I/O for rare sparse corruption, not accelerating normal playback.

Do not treat this as a way to ignore failed authentication on encrypted media. Do not modify the user's original file automatically. Reject when identity is missing, corruption does not fit the bounded model, or ordinary rereading is simpler and cheaper.

## R312 — Find oversampled peaks by ruling out regions before reconstructing them

**Class:** Exact-result branch-and-bound analysis relative to a specified digital reference.
**Output contract:** Same maximum value as a pinned oversampled finite-filter reference, or the same ceiling pass/fail decision. Not a proof of the maximum of every possible analog reconstruction.
**Related:** R199 uses a bound to permit image approximation; this uses bounds to retain the full reference analysis result.

### Mechanism and basis

FFmpeg's true-peak measurement uses oversampling, and its pinned implementation explicitly runs the resampler and scans resulting samples [S4, S9]. Investigate computing conservative bounds on those samples before evaluating all of them.

For a fixed filter phase phi:

z_phi[n] = sum_k h_phi[k] x[n-k]

If M_B bounds absolute source values throughout every input sample needed by an output region B, then:

abs(z_phi[n]) <= M_B * sum_k abs(h_phi[k])

Take the maximum over all relevant phases and add a proven rounding margin. Include every neighboring input sample required by the filter, not only those whose timestamps are inside B.

Evaluate promising regions to obtain an actual peak witness. Skip another region only when its conservative upper bound proves it cannot exceed that witness. For a declared ceiling-only query, regions proven below the ceiling need no individual oversampled output calculation.

### First pilot

Mono 48 kHz input, one fixed four-times-oversampling finite filter, pinned coefficients, explicit phase, finite endpoint treatment, and bounded arithmetic. Compare against evaluating every reference output sample. Build exact input min/max summaries first, then try hierarchical subdivision to tighten loose bounds.

Require the same maximum value and define tie behavior if reporting its location. The safe-skipping proof must bound the actual reference arithmetic, not only an ideal real-number convolution.

### Negative controls

Intersample overshoots; impulses immediately outside a region; near-Nyquist signals; phase-shifted tones; alternating signs; long quiet intervals; final filter tails; values just around the ceiling; and nearly tied peaks. A bound that cannot decide must trigger ordinary evaluation.

### Baseline, measurements, and rejection

Count scanning the original samples, building/querying summaries, bound computation, task ordering, and all remaining oversampling. Compare with a tuned contiguous full-scan implementation, not an allocation-heavy baseline.

Reject when bounds are loose or branching/locality costs exceed saved convolution. This does not downsample the analysis grid, miss a peak by design, or establish universal standards compliance. Qualification against any named true-peak standard remains a separate gate.

## Suggested first investigations

R307 is the route-admission pilot. R310 has the simplest exhaustive numerical oracle. R308 offers the most direct moving-video computation reuse. R309 and R312 target repeated or expensive audio analysis. R311 is a narrow fault-recovery investigation whose integrity requirements must never be relaxed to improve its apparent success rate.

## Primary-source register

References retrieved on 18 September 2026. Rolling documentation and draft interfaces do not prove availability in any specific browser or Demuxe build. FFmpeg source references below are pinned to n7.1.1. Formulae and experiment designs are proposed reasoning, not measured findings attributed to these sources.

[S1] Fraunhofer HHI — MVC Extension of H.264/AVC. Base-view compatibility and inter-view dependencies.
https://www.hhi.fraunhofer.de/en/departments/vca/research-groups/video-coding-technologies/research-topics/past-research-topics/mvc-extension-of-h264-avc.html

[S2] W3C — AVC (H.264) WebCodecs Registration. Access units, decoder description, Annex B, and key-chunk requirements.
https://www.w3.org/TR/webcodecs-avc-codec-registration/

[S3] FFmpeg n7.1.1 — libavcodec/zmbv.c. Motion copying, XOR differences, BGR0 output, and boundary behavior.
https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/zmbv.c

[S4] FFmpeg n7.1.1 — libavfilter/f_ebur128.c. Weighting filters, block energy, gates, and true-peak resampling.
https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavfilter/f_ebur128.c

[S5] IETF RFC 3551, section 4.5.14 — PCMA and PCMU eight-bit sample representation.
https://www.rfc-editor.org/rfc/rfc3551.html#section-4.5.14

[S6] FFmpeg n7.1.1 — libavcodec/pcm_tablegen.h. A-law and mu-law conversion and existing table construction.
https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/pcm_tablegen.h

[S7] IETF RFC 9639, sections 9.1.8 and 9.3 — FLAC header and frame CRC definitions; also malformed-input resource constraints.
https://www.rfc-editor.org/rfc/rfc9639.html

[S8] W3C — Web Cryptography API. Digest operations and application-level integrity use cases; the primitive does not authenticate an expected digest by itself.
https://www.w3.org/TR/webcrypto/

[S9] FFmpeg Filters Documentation — ebur128 true-peak mode and its oversampled peak lookup.
https://ffmpeg.org/ffmpeg-filters.html#ebur128

## Record integrity

Keep IDs, exact titles, output contracts, and negative controls attached to any future test. A nearby smoke test does not replace a card's stated hypothesis. Successful construction, sample equality, browser playback, performance, and production admission are separate milestones. This document records only the proposal milestone.
