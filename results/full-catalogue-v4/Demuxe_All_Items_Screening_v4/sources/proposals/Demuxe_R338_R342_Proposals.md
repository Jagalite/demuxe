# Demuxe — R338–R342 research proposals

**18 September 2026 · Five proposals · No media execution or production changes**

This pass reviewed upstream documentation and source and developed experiment designs. It did not build Demuxe, generate media fixtures, run playback tests, or benchmark any candidate. The mathematical identities below motivate experiments; they do not qualify implementations. No claim of industry-first invention is made.

## Catalogue

| ID | Exact title | Initial output contract | Smallest decisive gate |
|---|---|---|---|
| R338 | Decode into the layout the next stage already needs | Identical decoded samples and presentation | Does a qualified custom allocator remove a measured application-side repack? |
| R339 | Collapse chroma expansion and final resizing into one filter | Same declared filtering operation, with separately specified numerical tolerance | Does the composed kernel reproduce the two-stage reference, including siting and edges? |
| R340 | Edit an entire FLAC block by changing only its warm-up samples | Exact integer output for the explicitly requested correction; unchanged residual bits | Does an eligible fixed-predictor block accept the boundary edit without residual recoding? |
| R341 | Derive audio-effect preroll from a guaranteed error budget | Explicit bounded error relative to continuous filtering, not bit equality | Can a conservative state-error bound certify useful preroll lengths? |
| R342 | Recompute lookahead gain only where an edit can affect it | Exact output of a specified finite-window gain operator | Does selective invalidation reproduce a full recomputation for adversarial edits? |

These IDs continue the visible R332–R337 batch. Preserve titles as well as IDs when assigning tests. Do not substitute a neighboring mechanism or infer success from an existing request to test a card.

## Shared qualification rules

Use the existing finite playback-plan architecture. An internal optimization is not permission to invent a new automatic route-ranking system or weaken a fidelity gate. The actual Demuxe implementation was not audited in this pass: each pilot must check whether its proposed work is already avoided.

Keep an independently implemented oracle, negative controls, source and build identities, raw measurements, and preserved failures. Separate arithmetic proofs, host components, matching Wasm implementations, browser output, and complete-player results. Missing capabilities mean blocked, not an invalid source or failed codec.

Measure complete equal-output workloads. Include preparation, source validation, allocation, copying, compilation, queueing, cleanup, and repeated-use break-even where applicable. No numerical gain is predicted in these cards.

## R338 — Decode into the layout the next stage already needs

**Type:** Software-decoder allocation/presentation optimization. **Related:** R215 and R298. **Status:** PROPOSED.

### Mechanism

Negotiate a decoder-valid, downstream-friendly allocation before reconstruction begins. Instead of decoding into one layout and then repacking an entire picture, let the decoder populate an allocation whose plane offsets and row strides already fit the selected consumer.

FFmpeg's `get_buffer2` contract permits custom reference-counted output buffers for qualified decoders. It also explicitly constrains alignment, dimensions, supported allocation capabilities, and later decoder ownership. This is existing direct-rendering machinery, not a new allocation API. [S1]

The initial implementation would allocate ordinary CPU/Wasm-addressable storage. It does not make GPU memory a Wasm heap and does not promise zero-copy browser uploads.

### Initial profile and experiment

Start with a pinned software decoder advertising `AV_CODEC_CAP_DR1`, independent progressive pictures, fixed planar format, and a real downstream operation that currently repacks. Confirm the capability rather than presuming it from a codec name.

Compare the default allocation plus existing uploader, default allocation plus a layout-aware uploader, and consumer-shaped allocation plus that same uploader. Keep the pixel format and all presentation operations unchanged.

First obtain byte-identical visible planes. Then test complete timed output, odd dimensions, padding, repeated allocation/release, cancellation, delayed consumers, source replacement, and Wasm memory growth. Extend to predictive codecs only after independent-picture ownership passes.

### Ownership and failure rules

Use the actual frame's format and dimensions when calculating storage. Honor padded dimensions and all CPU/SIMD alignment requirements. Do not change strides between frames where the decoder prohibits that. A frame may remain owned by the decoder after presentation; storage cannot be recycled until every legitimate owner has released it. [S1]

Keep allocation budgets explicit. Pool exhaustion must trigger a controlled fallback or existing bounded scheduling, not reuse of live storage or a deadlock inside the allocation callback. Do not expose stale sensitive contents through padding or damaged-frame output.

A consumer may not request a format the decoder does not support merely by changing its allocation. Allocation layout and sample-format conversion are different operations.

### Measurements and rejection

Record repacked bytes, temporary peak bytes, retained allocation bytes including padding, CPU cache behavior where measurable, frame deadlines, and complete playback CPU. Compare against an optimized direct uploader, not an intentionally wasteful baseline.

Reject if direct upload already accepts the original layout, additional padding or poor decoder locality cancels the saving, or the ownership change is too complex for the measured benefit.

**Distinction:** R215 changes how an existing allocation is uploaded. R338 changes the allocation before decoding writes it. R298 compacts surviving allocations after their useful lifetimes diverge.

**Agent workload:** Small audit/instrumentation gate; moderate callback and lifetime integration; higher burden for predictive codecs.

## R339 — Collapse chroma expansion and final resizing into one filter

**Type:** Presentation graph simplification. **Related:** R23 and R237. **Status:** PROPOSED.

### Mechanism

Investigate a controlled path that expands subsampled chroma to the full source grid, only to resize that full grid to a smaller display. Replace those consecutive linear sampling stages by their exact mathematical composition, without constructing the intermediate plane.

Let U map a stored chroma plane to the source luma grid and D map that grid to the requested output grid. Then the desired final chroma is `(D U) c`. Construct the combined sampling kernel K = D U, including every phase, crop, and boundary rule, and evaluate K directly on the stored plane.

This is not permission to substitute an arbitrary one-pass resize. In general, a convenient off-the-shelf filter is not the composite of the two requested filters.

FFmpeg exposes separate scaling, chroma, range, rounding, and gamma-related choices; libplacebo explicitly accounts for chroma locations and merges compatible plane processing. These are implementation precedents and strong comparison baselines, not proof that Demuxe currently needs another intermediate. [S2, S3]

### Initial profile and experiment

Start with fixed planar 4:2:0 input, known chroma siting, fixed finite separable kernels, a fixed output size, and no intermediate clipping, quantization, dithering, or nonlinear color operation.

First construct small exact-rational U and D reference matrices and compare their product with the proposed phase-specific taps. Cover edges independently rather than assuming interior taps apply everywhere. Then build the equivalent GPU or SIMD implementation and compare against the two-stage floating-point reference under a predetermined tolerance.

Use chroma impulses, alternating saturated colors, odd dimensions, nonzero crops, and several sitings. Test the final RGB result with the same color conversion after sampling. A correct luma image is not sufficient evidence.

### Numerical and semantic boundaries

The algebra is exact before finite-precision evaluation. A rounded intermediate, nonlinear transfer function, tone map, or clipping between U and D changes the operator and can invalidate collapse. Preserve such stages or reject the profile. Do not silently change linear-light versus nonlinear-code-value scaling.

Begin with the color conversion after final plane sampling. Moving it across a resize is a separate proof with its own boundary and constant-preservation requirements.

A browser-owned decoder output must expose a usable qualified plane representation for this path; opaque or already converted images do not automatically qualify. Software-owned planes provide the simplest pilot.

### Measurements and rejection

Measure intermediate bytes, total sample fetches, tap count, kernel construction, GPU time, end-to-end frame deadlines, and numerical differences. Count kernel regeneration during resize or crop changes.

The composite can have more taps and poorer locality. An optimized renderer may already fuse the operations. Reject when the complete path is not cheaper or cannot meet the declared output contract.

**Distinction:** R23 merges passes generally. R339 asks whether a larger sampling grid can disappear algebraically. R237 restricts which spatial region is needed; this changes the intermediate sampling representation.

**Agent workload:** Small mathematical gate; moderate reference/kernel work; larger production integration for all sitings and color modes.

## R340 — Edit an entire FLAC block by changing only its warm-up samples

**Type:** Exact compressed-domain preparation for an explicitly requested signal edit. **Related:** R299 and R322. **Status:** PROPOSED.

### Mechanism

A fixed-predictor FLAC subframe stores its first p samples explicitly and then codes prediction residuals. For its order-p fixed predictor, those residuals are the p-th backward differences of the signal. The format and libFLAC implementation provide the concrete basis. [S4, S5]

For a requested integer-valued correction q[n] whose polynomial degree is less than p:

`Delta^p (x + q) = Delta^p x`, because `Delta^p q = 0`.

Therefore the same coded residuals can reconstruct the corrected signal if the warm-up values are replaced by `x[j] + q[j]` for j = 0 ... p-1.

The smallest case is a constant offset and order 1: `(x[n] + c) - (x[n-1] + c) = x[n] - x[n-1]`. Change one warm-up sample; retain the residual bits. For order 2, a constant or integer linear trend can be represented by changing two warm-ups.

### Initial profile and experiment

Begin with mono, fixed order 1 or 2, no wasted bits, no stereo decorrelation, unchanged bit depth, validated frame extents, and independently verified sample-range headroom. The requested constant correction is supplied as an input; finding an appropriate correction is a separate analysis cost.

Patch warm-up values in a derivative, rebuild affected checksums, and require each decoded sample to equal an independent integer application of the requested correction. Independently verify that every residual bit is unchanged.

Exercise positive and negative corrections, extremal samples, partial final blocks, changed predictor orders, and a correction valid at every warm-up but invalid at an interior sample. That last fixture must be rejected by admission.

Use absolute sample positions for any polynomial extension across frames. The polynomial must meet degree < predictor order in every admitted block. A changing order or frame-local correction must not create unintended steps.

### Integrity and range rules

A warm-up fitting its field does not prove all reconstructed samples fit. If range headroom is unknown, analyze it or fall back; include that analysis in costs. No clipping, wrapping, or saturation is permitted under the exact-edit contract.

Update frame CRCs. The whole-stream decoded-audio MD5 cannot remain the original value after an edit. Recompute it or use the format-defined unknown value only under an explicit policy; compare equivalent integrity policies in the baseline. [S4]

Scanning frame boundaries and checksums may still visit every compressed byte. The claim is fewer numeric changes and no residual entropy re-encoding, not constant total file-processing cost. Do not mutate the user's source in place.

### Measurements and rejection

Compare with optimized decode–correct–encode using the same predictor orders and entropy choices. Record validation, frame parsing, patching, checksums, metadata, destination playback, and preparation break-even across repeated variants.

Reject if the source profile is rare, headroom analysis dominates, integrity requirements require an equally expensive complete decode, or the requested operation is better served by ordinary playback DSP.

**Distinction:** R299 and R322 transform residual values and re-encode them. R340 leaves residual bits unchanged and alters reconstruction through boundary values. The edited audio is intentionally different from the original, but exact relative to the requested integer correction.

**Agent workload:** Small arithmetic proof; moderate bitstream/integrity prototype; source-profile frequency and headroom are major practical gates.

## R341 — Derive audio-effect preroll from a guaranteed error budget

**Type:** Explicit bounded-error seeking policy for controlled DSP. **Related:** R191 and R329. **Status:** PROPOSED.

### Mechanism

Instead of always restoring a saved effect checkpoint, replaying from the beginning, or using an arbitrary warm-up duration, calculate a sufficient preroll for an explicitly permitted numerical error.

For the same linear filter and identical subsequent input:

`s[n+1] = A s[n] + B x[n]`, `y[n] = C s[n] + D x[n]`.

Two different initial states differ after N samples by `A^N delta_s[0]`; their output difference is `C A^N delta_s[0]`.

If a proven bound gives `||A^k|| <= K rho^k` for all k >= 0 with rho < 1, and `||delta_s[0]|| <= E`, then all output from sample N onward has ideal-arithmetic error at most `||C|| K rho^N E`. Add a justified bound for the implemented arithmetic before claiming the numerical tolerance.

Web Audio's tail-time model makes the relevant issue explicit: earlier input can continue affecting output, and IIR tails are not generally finite. This candidate therefore belongs to a controlled filter implementation, not an assumed state interface inside a browser audio node. [S6]

### Initial profile and experiment

Start with exact PCM input and a fixed first-order filter `y[n] = a y[n-1] + (1-a)x[n]`, 0 < a < 1. Establish a valid initial-state bound from the defined start condition and a trustworthy global input bound. Then select the smallest certified N for a stated tolerance and compare against continuously processed output.

Use impulses before the replay region, long near-full-scale histories, a near-unit pole, beginning-of-file seeks, and several candidate initial states. Inspect the whole claimed output interval, not just the first sample after preroll.

Only extend to second-order sections after proving an appropriate uniform bound. Stable poles alone do not justify taking K = 1; transient amplification and numerical realization matter.

### Contract and fallback

This is bounded approximation to continuous filtering, never sample equality or automatically inaudible error. An exact-output request still needs exact state/history. If no useful bound is available, use the established path.

The earlier PCM must itself be correct. This experiment does not justify arbitrary resets of a stateful lossy audio decoder. Initially use PCM or independently verified lossless decoding.

Changing coefficients, automation, clipping, nonlinear effects, or an invalid input-amplitude bound invalidates the certificate. Account for actual arithmetic, overflow behavior, denormals, and any implementation-specific state truncation.

### Measurements and rejection

Measure bound construction, required source reads, replay samples, actual versus certified error, seek-to-ready latency, and repeated parameter-setting queries. Compare fixed preroll, exact checkpoints, and continuous history under their respective explicit contracts.

Reject if bounds are too conservative, arithmetic cannot be bounded adequately, or checkpoint restoration is already cheaper for the workload.

**Distinction:** R329 preserves exact pipeline state. R341 permits no saved state, but only by making the tolerated error and sufficient reconstruction history explicit.

**Agent workload:** Small first-order mathematics; substantial general-filter and finite-precision qualification.

## R342 — Recompute lookahead gain only where an edit can affect it

**Type:** Exact incremental evaluation of a declared nonlinear finite-window operator. **Related:** R265, R294, and R317. **Status:** PROPOSED.

### Mechanism

Start with a specified mono sample-peak gain operator, not an unspecified production limiter:

`p[n] = max_{0 <= k < W} |x[n+k]|`

`g[n] = 1` if p[n] = 0; otherwise `g[n] = min(1, T/p[n])`

`y[n] = g[n] x[n]`.

W >= 1 and T > 0 are fixed. With explicitly defined end padding and W-1 samples of live lookahead delay, this is a reproducible reference operation.

If input samples change only in the half-open interval [a,b), only windows starting in [a-W+1,b) can contain changed data. Outside that interval, both input and gain output remain unchanged. Maintain a range-maximum structure and recompute only the affected region.

Within it, some gains may also be certified unchanged: an unchanged sample still attains the old maximum, and every edited value in that window is no larger. This condition must be verified, not inferred from the edit's average level.

### Initial experiment

Use a finite known PCM signal, a fixed threshold/window, and deterministic arithmetic. Compare a full reference rerender after each edit with incremental peak, gain, and output updates. Begin with all eligible windows recomputed; add unchanged-maximum witnesses only after that passes.

Test lowering the unique maximum, tied maxima, a new louder sample, sign-only edits, edits at each window boundary, beginning/end padding, silence, and repeated edits that invalidate old witnesses. Measure complete output equality and use provenance to reject stale source or recipe identities.

Use a monotonic-deque full scan as a strong baseline, rather than an O(W) rescan for every output sample. Include index construction, cached output, edit publication, and subsequent export serialization.

### Scope and release-state warning

Real limiters can maintain attack, release, delay, and automatic-level state. FFmpeg's `alimiter` explicitly contains these stateful operations. The simple finite-window boundary must not be asserted for that implementation. [S7]

The initial result qualifies the stated operator or its envelope stage. It is not a recommendation to replace a requested limiter with a simpler, potentially different-sounding effect.

A finite extra smoothing filter requires a correspondingly expanded dependency interval. Recursive release may influence an unbounded suffix and requires exact state restoration, a separately proven bound, or full recomputation. Oversampled detection likewise needs its actual input-support halos and reference contract. No universal true-peak or audible-quality claim is made.

### Potential payoff and rejection

Interactive edits can update a small part of a long cached preview instead of repeatedly recalculating a complete nonlinear envelope. Unlike a linear correction, a changed winning peak can also alter gain applied to neighboring unchanged samples.

Reject if most edits affect the whole timeline, the existing graph already performs equivalent invalidation, the required limiter lacks a useful proven boundary, or cached-state maintenance outweighs rerendering.

**Agent workload:** Small exact finite-window prototype; much higher burden for a real stateful production limiter. Do not report the small prototype as implementation of the larger case.

## Suggested qualification order

These are engineering judgments, not measured rankings.

1. R338: inspect actual buffer movement and custom-allocation capability before writing a pool.
2. R340: prove residual identity and enforce headroom/integrity on tiny fixtures.
3. R339: validate composed sampling on tiny matrices before GPU work.
4. R342: establish exact invalidation on the specified operator before general limiter integration.
5. R341: establish first-order bounds, then decide whether more general numerical certification is economical.

The most broadly applicable playback targets are R338 and R339. R340 has the sharpest compressed-format construction. R341 deliberately exchanges exact history for a stated error contract. R342 targets repeated edited-preview work, not ordinary unedited decoding.

## Primary source register

Links establish documented primitives or strong baselines, not success of the proposed complete mechanisms. FFmpeg code links are pinned to n7.1.1. Rolling documentation and upstream main/master source must be pinned by an implementing agent before reproduction.

- **S1 — FFmpeg `AVCodecContext.get_buffer2`, n7.1.1:** https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/avcodec.h — custom allocation, reference ownership, dimensions, alignment, padding, and capability restrictions.
- **S2 — FFmpeg scaler documentation:** https://ffmpeg.org/ffmpeg-scaler.html — scaling, chroma interpolation, rounding, range, gamma, and dither choices. Rolling documentation; use options supported by the chosen build.
- **S3 — libplacebo renderer:** https://raw.githubusercontent.com/haasn/libplacebo/master/src/renderer.c — plane sampling, chroma siting, crop coordinates, and compatible-plane merging; a comparison implementation, not a Demuxe audit.
- **S4 — RFC 9639:** https://www.rfc-editor.org/rfc/rfc9639.html — sections 8.2, 9.2.5, and 9.3 for stream integrity metadata, fixed-predictor warm-ups, residuals, and frame CRCs.
- **S5 — libFLAC fixed predictors:** https://raw.githubusercontent.com/xiph/flac/master/src/libFLAC/fixed.c — concrete fixed-order finite-difference and reconstruction implementations.
- **S6 — Web Audio API 1.1:** https://www.w3.org/TR/webaudio/ — audio-node tail time and IIR behavior. Does not expose arbitrary native-node state restoration.
- **S7 — FFmpeg lookahead limiter, n7.1.1:** https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavfilter/af_alimiter.c — actual attack/release and lookahead state; explicitly not identical to R342's initial finite-window operator.
