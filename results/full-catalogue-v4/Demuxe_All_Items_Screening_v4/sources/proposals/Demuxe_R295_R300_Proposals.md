# Demuxe — R295–R300 research proposals

**Status:** PROPOSED / NOT PLAYBACK-TESTED.  
**Date:** 18 September 2026.  
**Scope:** Additional hypotheses following the visible R289–R294 batch. These are not measured performance improvements, production admissions, or claims of industry novelty. No Demuxe source was edited and no media playback benchmark was run. The R299 difference identity received only a small arithmetic self-check, not a FLAC implementation or codec qualification.

The theme is removing avoidable work around an otherwise valid media path: composition, mux-session state, expanded metadata, retained allocations, predictive representation, and repeated reconstruction calculations.

## R295 — Preserve hardware-overlay eligibility through subtitle and UI composition

**Type:** Presentation/energy experiment. **First owner:** Local hardware/browser laboratory. **Related:** R19, R21, R23; not another subtitle decoder.

**Hypothesis.** Two interfaces that display the same video, subtitles, and controls may cause the browser to choose different composition paths. Test whether an equivalent layer arrangement can keep the video eligible for a platform video overlay rather than forcing additional general-purpose composition.

**Source basis.** Chromium separates overlay candidates from content requiring ordinary composition, and does so through platform-specific implementations. Its candidate construction checks such properties as transform support, clipping, mask filters, and backdrop filters. Those are implementation observations, not a portable promise that one CSS rule always enables or disables overlays. [S1, S2]

**First scope.** Unencrypted native video, fixed output size, ordinary captions, and one controlled desktop/browser/driver combination. Keep decoded content, caption styling, controls, geometry, and user-requested effects unchanged. Compare the current interface against equivalent constructions with a stable video layer, separately updated captions/controls, and no unnecessary wrapper effects. Do not remove requested features to manufacture an efficiency result.

**First experiment.** Exercise plain playback, caption changes, controls appearing, resize, fullscreen, and scrolling. Record actual compositor/overlay decisions using appropriate local diagnostics. Compare CPU, GPU activity, frame delivery, and measured system energy under matched display and workload conditions. A headless or purely JavaScript callback test does not establish physical overlay use or battery benefit.

**Correctness/negative controls.** Verify caption placement, blending, clipping, color interpretation, output cadence, and A/V synchronization. Include an intentionally more complex layer construction. Diagnostic capture can perturb composition, so separate correctness instrumentation from clean performance runs and verify the path in both.

**Pass/reject.** Pass only for a qualified construction that preserves the requested appearance and measurably improves complete presentation cost. Reject an apparent benefit caused by omitted effects, changed colors, missing subtitles, or a different display setting. No application-controlled guarantee of hardware-overlay admission is proposed.

## R296 — Generate seek fragments without replaying a mux session

**Type:** Packet-copy mux architecture. **First owner:** Indexed-source construction harness, then browser integration. **Related:** R109, R162, R222.

**Hypothesis.** Construct an output fragment from explicit immutable inputs: source identity, track configuration, source sample interval, output timeline mapping, fragment identity, and the required sample bytes. A seek should not require replaying unrelated earlier samples merely to rebuild a writer's mutable counters.

**Source basis.** The ISO BMFF MSE byte-stream specification defines initialization segments, fragment-relative sample addressing, track-fragment decode times, and the requirement that referenced samples be present. MP4Box.js demonstrates fragment construction from sample descriptions, while also relying on session values such as a sequence counter and first decode time. Those values would need to become explicit inputs in this experiment. [S3, S4]

**First scope.** Finite, unencrypted H.264/AAC MP4, stable codec configuration, validated sample tables, and closed-GOP video entry points. Preserve payloads, durations, composition offsets, initial trimming, and requested track semantics. More complicated edit lists, encryption, and configuration transitions are outside initial admission.

**First experiment.** Request fragments in the generation order 50, 3, 51, 3. Compare each result with the same recipe generated in canonical order. Require deterministic construction for the same complete recipe, identical ordered payloads, and correct metadata. Then append the appropriate media at valid playback/seek boundaries and verify pictures, audio, synchronization, seeking, and EOF.

**Important distinction.** Out-of-order generation is not permission to submit arbitrary decode dependencies out of order. A fragment being independently constructible does not make every first sample independently decodable. Include a mid-GOP negative control.

**Measurements.** Compare against an optimized persistent demux/mux path, not a new host process per request. Include index construction, source reads, buffer assembly, initialization, cancellation, and browser delivery. Measure cold opening separately from repeat seeks and overlapping requests.

**Pass/reject.** Useful only if session reconstruction or serialization is a real bottleneck. Reject when index cost or per-fragment construction exceeds the saved work, or when the current implementation is already equivalently sample-addressable.

## R297 — Query MP4 timing tables without expanding every sample record

**Type:** Metadata representation/query optimization. **First owner:** Parser/index component. **Related:** R45, R75; distinct from compressing a derived sparse keyframe index.

**Hypothesis.** Keep source metadata in its original run structure and generate detailed per-sample records only for an active window. Build compact cumulative indexes over timing and chunk runs to support random queries.

**Source basis.** MP4Box.js stores `stts` timing as sample counts and duration deltas and provides an unpack operation that assigns timestamps to individual sample records. This is a concrete representation contrast, not evidence that Demuxe uses that exact expansion. [S5]

For a run beginning at sample ordinal s with decode time t and constant delta d, an ordinal s+j has decode time t+j*d. A cumulative run index can locate the relevant run without materializing a timestamp for every sample.

**First scope.** Ordinary unencrypted MP4, simple edits, and no reordered pictures. Preserve source tables and add bounded indexes for timing runs, sample-to-chunk mapping, offsets, and sizes. Materialize records only for the playback/seek working set.

**First experiment.** Use long synthetic tracks with constant timing, variable timing, irregular chunk layout, and different sample sizes. Compare every queried offset, size, timestamp, configuration, and sync flag against an independent fully expanded reference. Include empty tables, inconsistent counts, large offsets, arithmetic boundaries, and source invalidation.

**Extension gate.** Add signed composition offsets and reordered pictures separately. Presentation timestamps must not be treated as sorted merely because decode timestamps are ordered. Some arrays, such as variable sample sizes, remain inherently per-sample; do not claim constant memory for arbitrary files.

**Measurements.** Peak metadata memory, startup, query latency, active-window construction, and actual playback/seek overhead. Compare with the real existing representation and an optimized typed-array baseline, not only allocation-heavy objects.

**Pass/reject.** Useful when full metadata expansion materially affects large sources. Reject when extra lookup complexity slows the common case or saves insignificant memory. This may support R296 but should first be tested independently.

## R298 — Copy surviving packets to release oversized backing buffers

**Type:** Encoded-buffer ownership/memory optimization. **First owner:** JavaScript source/demux buffer component. **Related:** R42, R47, R124; targets encoded allocations rather than decoder surfaces.

**Hypothesis.** Retaining a tiny packet view can retain a much larger source allocation. After most consumers finish, copy the small remaining live regions into compact owned storage and drop the obsolete views and allocation references.

**Source basis.** ECMAScript defines `TypedArray.prototype.subarray()` as a new typed array referencing the same ArrayBuffer. The proposed retained-memory consequence follows from that shared ownership; the specification does not promise immediate physical-memory reclamation after references disappear. [S6]

**Illustrative case, not a measurement.** A 16 MiB application-owned input buffer has only 24 KiB of packets still needed. Moving all those surviving packets into appropriately sized owned buffers can remove the application's need to retain the original 16 MiB buffer, provided no other live reference still owns it.

**First scope.** Immutable application-owned ArrayBuffers and internal packet handles. Do not silently invalidate externally exposed typed arrays or reuse storage still held by a parser or consumer. Do not infer that freeing an allocation inside a fixed Wasm memory shrinks that memory.

**First experiment.** Interleave audio/video consumption so small packets survive after most large packets are consumed. Compare always-copy, always-view, and density/lifetime-aware compaction under equal cache budgets. Include seeks, cancelled consumers, concurrent owners, duplicate views, delayed consumption, and transferable-buffer boundaries.

**Correctness.** Require byte-identical packets and identical timestamps/source identities. Verify that compaction occurs only at a safe ownership boundary and that all eligible surviving references are migrated consistently.

**Measurements.** Unique live backing-buffer bytes, useful retained packet bytes, copy volume, peak allocation, and whole-session latency. Observe actual process memory separately; garbage collection and allocation reuse are not instantaneous or deterministically controlled by this policy.

**Pass/reject.** Pass when modest copying substantially reduces real retained allocation without playback regressions. Reject copying churn, hidden surviving owners, or negligible savings under the existing bounded read strategy.

## R299 — Change FLAC predictor order directly in the residual domain

**Type:** Exact compressed-to-compressed audio preparation. **First owner:** Bitstream construction and independent PCM oracles. **Related:** R234; that card preserves residuals while simplifying equivalent syntax, whereas this card changes the predictor and residual representation.

**Hypothesis.** Convert between eligible fixed-predictor orders by transforming decoded residual integers instead of reconstructing a complete PCM block and running a general-purpose encoder.

**Source basis.** FLAC fixed predictors are specified for orders zero through four and carry order-dependent warm-up samples. LibFLAC already implements the corresponding finite-difference expressions. The mathematics is established; the proposed additional mechanism is its use in a compressed-input adapter. [S7, S8]

For first-order residuals, r1[n] = x[n] - x[n-1]. Second-order residuals satisfy r2[n] = r1[n] - r1[n-1] = x[n] - 2*x[n-1] + x[n-2]. To convert a first-order block to second order, recover the one extra warm-up sample x[1] = x[0] + r1[1], retain x[0] and x[1], and encode the differences of the remaining adjacent residuals.

**First scope.** Mono 16- or 24-bit FLAC, order 1 to order 2, no wasted-bit or stereo-decorrelation extension. Validate all arithmetic ranges and the legality of target residual coding. Keep frame sample count and decoded signal unchanged.

**First experiment.** Compare transformed residuals with those generated independently from source PCM, then require sample-exact decoding through independent FLAC implementations. Test negative values, ramps, impulses, noise, extreme samples, short legal blocks, and block boundaries. Regenerate Rice partitions, alignment, CRCs, frame-size metadata, and seek offsets correctly.

**Measurements.** Preparation CPU, generated bytes, destination decode cost, memory traffic, and repeat-use break-even. Compare against an optimized decode/re-encode baseline using the same candidate predictor orders and entropy settings; do not manufacture a benefit by forcing expensive unrelated encoder analysis.

**Pass/reject.** This changes prediction representation without another lossy generation, but entropy decode/re-encode remains. It does not support arbitrary shifted LPC predictors automatically. Reject when the source is already efficiently represented or the new order merely trades worse playback cost for inconsequential preparation savings.

## R300 — Reuse repeated inverse-transform results across different video blocks

**Type:** Exact software-decoder computation cache. **First owner:** Instrumented decoder, then bounded kernel prototype. **Related:** R151, R235, R292; caches transform calculations rather than entire frames, reference interpolation, or codebook programs.

**Hypothesis.** Nontrivial coefficient blocks may recur across different pictures. Cache the exact signed reconstruction residual produced by the inverse transform, then combine it with each block's own prediction normally.

**Source basis.** FFmpeg's H.264 inverse-transform implementation performs fixed integer arithmetic and then adds the resulting values to destination prediction samples with clipping. This provides a precise stage at which the reusable result must be separated from picture-specific input. [S9]

Conceptually, output = clip(prediction + T(coefficients)). The cache stores T(coefficients), including the specified transform rounding, not the clipped final output. Reusing the final pixels would be wrong when prediction differs.

**First scope.** Ordinary 8-bit inter-coded H.264 4x4 luma transforms, no transform bypass. Key on every relevant normalized transform input and mode, and cache only within a bounded controlled implementation. Verify the full key after hash matching; a fingerprint alone is not an equality proof.

**First experiment.** Instrument real coefficient traces to measure reuse before building the cache. Exclude all-zero and DC-only blocks from the claimed opportunity because the existing implementation already has cheaper handling for them. Test repetitive graphics and animation as candidate workloads and varied natural video as adverse controls.

If traces justify implementation, compare a small per-worker cache against the existing optimized kernel. Require identical signed residuals, every reconstructed frame, and continuing reference behavior. Exercise identical coefficients with different predictors, one-coefficient near misses, forced hash collisions, mode changes, seeks, and eviction.

**Measurements.** Lookup/key verification, packing, insertions, misses, cache traffic, loss of fused kernel efficiency, and complete decoding cost. Report hit rate as diagnostic evidence, not as a performance result.

**Pass/reject.** Reject immediately if a lookup costs more than the transform it replaces or realistic nontrivial reuse is too low. There is no native-decoder internal access claim: this is a controlled software path experiment.

## Initial investigation order

R298 is the smallest ownership experiment. R296 is the clearest mux/seek architecture investigation. R297 is conditional on real metadata expansion costs. R295 needs actual local display hardware and compositor evidence. R299 has a sharp integer oracle but uncertain economic value. R300 is the most speculative computational-cache experiment.

All cards require the smallest correctness pilot and negative controls before timing. Existing optimized behavior is the baseline. Missing APIs, fixtures, or builds are blockers, not playback failures. A host or component result is not a matching Wasm/browser or whole-Demuxe result.

## Primary-source register

References support the named primitives; they do not establish the proposed complete-route outcome. Rolling source URLs must be mapped to the exact implementation revision when executing a card.

- **S1 — Chromium overlay processor interface:** https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/overlay_processor_interface.h — platform-specific separation of overlay candidates and ordinary composition; per-frame processing and power-benefit hooks.
- **S2 — Chromium overlay candidate construction:** https://raw.githubusercontent.com/chromium/chromium/main/components/viz/service/display/overlay_candidate_factory.cc — transform/clipping/mask/backdrop-filter eligibility conditions.
- **S3 — W3C ISO BMFF MSE byte-stream format:** https://www.w3.org/TR/mse-byte-stream-format-isobmff/ — initialization, fragment addressing, tfdt, sample presence, random access.
- **S4 — MP4Box.js ISOFile:** https://raw.githubusercontent.com/gpac/mp4box.js/main/src/isofile.ts — sample records and createMoof(), including explicit sample metadata and mutable session counters.
- **S5 — MP4Box.js stts parser:** https://raw.githubusercontent.com/gpac/mp4box.js/main/src/boxes/stts.ts — timing runs and the per-sample unpacking interface.
- **S6 — ECMAScript specification source:** https://raw.githubusercontent.com/tc39/ecma262/main/spec.html — section `%TypedArray%.prototype.subarray` and the shared `[[ViewedArrayBuffer]]` relationship.
- **S7 — RFC 9639:** https://www.rfc-editor.org/rfc/rfc9639.html — fixed predictors, warm-up samples, residual coding, framing, and checksums.
- **S8 — libFLAC fixed predictor implementation:** https://raw.githubusercontent.com/xiph/flac/master/src/libFLAC/fixed.c — fixed-order finite differences and range-aware arithmetic.
- **S9 — FFmpeg n7.1.1 H.264 inverse transform:** https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/h264idct_template.c — transform, prediction addition, clipping, and specialized DC handling.
