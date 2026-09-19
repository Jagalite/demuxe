# Demuxe — R358–R362 research proposals

**Status:** PROPOSED / NOT TESTED. Source review and experiment design only. No media fixtures, decoder tests, performance benchmarks, production changes, or ongoing jobs were created in this pass.

**Continuity:** These IDs follow the visible R353–R357 cards. Earlier IDs and acceptance contracts are not redefined. “New” means an additional Demuxe experiment, not an assertion of industry novelty. Existing Native / Hybrid / Software boundaries and qualified fallback rules remain authoritative.

**Evidence discipline:** A specification primitive or upstream implementation is not a qualification of a Demuxe route. Browser-owned decoding does not establish hardware acceleration. Correct compressed payloads, correct decoded samples, correct presentation, and lower complete-session cost remain different assertions. Missing platform features produce BLOCKED, not a fabricated failure or success.

## R358 — Unwrap Matroska track compression before choosing a decoder

### Hypothesis and source basis
A codec-compatible track may be inaccessible to a lightweight route because an outer Matroska ContentEncoding has not been reversed. Matroska defines zlib compression and header stripping, scopes that can include frame payloads or codec-private data, and an order for reversing stacked encodings. FFmpeg already implements these mechanisms. The experiment is to qualify a bounded lightweight normalization component, not claim that Matroska decompression is new. [S1, S2]

For header stripping, prepend the declared shared prefix to each affected frame. For zlib, investigate a separately qualified DecompressionStream('deflate') path. That API expects a zlib wrapper; it rejects unsupported preset dictionaries, incorrect Adler-32, and extra bytes after the stream. [S3]

Proposed path: source blocks -> validated encoding reversal -> ordinary codec initialization and access units -> existing qualified browser-decoded or packet-copy route.

### First scope and experiment
Begin with a synthetic, unencrypted H.264/AAC source whose original configuration and access-unit bytes are retained as an independent oracle. Use one content encoding, scope 1 (frame data), fixed configuration, and no lacing. Test header stripping and per-frame zlib as separate profiles. Do not reset or share zlib histories arbitrarily.

Require exact recovered access-unit bytes, unchanged source sample order/timing, identical reference decoding, then correct output in one actual browser destination. A complete browser route remains unqualified until audio/video output, seeks, continuation, and end-of-stream pass.

Only later admit lacing, codec-private compression, or stacked encodings after their exact transformation order is implemented and tested. Normalizing codec-private data must occur before any capability conclusion depending on its contents.

### Negative controls and rejection
Test missing prefixes, wrong scope, unsupported algorithms, corruption near the end of a compressed unit, truncated units, oversized expansion, and late source cancellation. The no-lacing profile must reject or fall back on laced input. The first profile rejects encryption and multiple stacked encodings.

Bound compressed bytes, expanded bytes, concurrent units, and execution work. Hold a bounded recovered unit until decompression finishes successfully; partial output preceding a checksum failure must not have been irreversibly published to the codec.

### Cost and decision
Compare with the existing persistent FFmpeg/remux path, including module startup, decompressor construction per unit, payload copies, memory, source reads, and browser delivery. Report either a demonstrated destination/deployment gap or a measured complete-cost improvement. If the existing lightweight route already handles it or the replacement adds cost, close as already handled or not worthwhile.

**Distinct contribution:** Remove an outer per-track representation obstacle without changing the codec or re-encoding its media.

## R359 — Start with a bounded software prefix while browser decoding warms up

### Hypothesis and source basis
WebCodecs describes hardware acceleration as potentially having higher startup latency, and acceleration preferences are ignorable hints. This motivates a bounded experiment, not a claim about any specific machine. [S4]

Use one existing controlled frame presenter and one audio clock. Feed the same qualified starting access point to a browser decoder and an already-available software decoder. Let software provide only a short startup prefix. Once the browser decoder has independently reconstructed a timely continuation, switch output ownership at an explicit presentation boundary and retire the software branch.

No reference buffers are transferred. Both decoders receive complete dependencies from their own valid entry point. No ordinary HTML video element is assumed to hand its internal clock or decoding state to a software player.

### First scope and experiment
Use a small progressive eight-bit AVC I/P source, one reference, no reorder pictures initially, stable color/configuration, and a valid IDR. AVC's WebCodecs key-chunk contract requires an actual IDR with the appropriate parameter sets. [S5]

Start video-only to verify frame ownership, then integrate the same already-qualified audio path. Admit real A/V startup only after audio and video can proceed under one clock. Never produce speculative audio twice.

Set explicit limits for software picture count, wall-clock duration, submitted inputs, and retained outputs. Require the frame preceding and following the handoff, and the entire continuation, to match the independent reference under the admitted output contract. Match geometry, color/range, orientation, timestamp selection, and conversion rules.

### Negative controls and rejection
Test the browser branch winning immediately, browser failure or excessive delay, slow software output, cancellation, a seek during the prefix, picture mismatches, and cold software-module loading. Bound simultaneous execution; stop the software hedge if it slows the useful browser path. Do not describe a frozen early image as successful sustained playback.

If a decoder pair produces incompatible picture values, reject that exact-output profile. Broader tolerance profiles would be separately declared, not silently substituted. Platform limitations or unknown acceleration provenance must be reported.

### Cost and decision
Compare browser-only, software-only, and bounded-prefix constructions using the same presenter. Also compare direct HTML video when it can provide the requested features. Include duplicate reconstruction, Wasm download/compile/initialization, copies, retained frames, cold/warm starts, energy, and subsequent steady-state cost. Keep this experimental rather than a routine two-player capability probe or automatic default.

**Distinct contribution:** R126 measures job-size crossover; this tests a narrowly bounded continuous startup handoff. R116 changes decoders for incompatible sections; this changes ownership only to address startup latency.

## R360 — Retarget in-flight decoding instead of restarting a forward scrub

### Hypothesis and source basis
WebCodecs reset discards configuration, queued control messages, and pending callbacks. It is not cancellation of one presentation request. Reconfiguration requires a valid key entry. [S4, S5]

Separate a source/configuration/decode epoch from the identity of a user's requested output. If a newer forward seek is reachable by continuing the same intact decode sequence, change the requested presentation target without throwing away that sequence's work.

Illustrative case: one valid decode job starts at 100.0 seconds; successive requests move from 100.4 to 100.7 to 101.0 seconds. Continue supplying the required coded pictures and publish only the latest committed target. This example is a schedule, not a performance measurement.

### First scope and experiment
Start with paused exact scrubbing, one immutable source, stable configuration, a known closed GOP, I/P pictures, and unique presentation timestamps. Duplicate timestamps are an explicit rejection/fallback case in this initial profile. Compare tuned request coalescing plus normal restart, always continuing, and eligibility-gated retargeting under identical retained-frame and submitted-input budgets.

The index must prove that the requested frame remains ahead of delivered-and-released output, is already retained, or will be produced by continuing the intact sequence. A source timestamp, queue count, or same nominal GOP label alone is not sufficient. Track frame identity through explicit sample ordinals and presentation mapping.

Verify each committed target against an independent uninterrupted decode. Superseded targets may be correctly decoded and immediately released; they must not be displayed as the new result. No required reference input is dropped just because its picture is obsolete to the UI.

Then qualify audio commit/seek alignment and ordinary playback separately. Audio preroll is governed by its actual codec contract; a standard convergence recommendation must not be treated as a guarantee of bit-exact state restoration.

### Negative controls and rejection
Backward requests, distant forward jumps, source replacement, configuration change, previously discarded target outputs, reordered pictures, duplicate timestamps, cancellation, and decoder failure must select an explicit valid path. A far seek with a nearby later keyframe may favor restarting over continuing a long chain.

Retargeting never resurrects an output from a previous source/configuration epoch. Bound all outstanding output references and close unneeded frames promptly. A renderer request can be cancelled without automatically cancelling useful common decoder work.

### Cost and decision
Measure latest-target response latency, all reconstructed/submitted pictures, resets, source reads, retained bytes, and time after the user stops moving. Do not benchmark against one avoidable reset for every pointer event; the baseline must already coalesce requests. Reject if keeping the chain delays the latest target or the current implementation already does equivalent reuse.

**Distinct contribution:** R40 avoids initiating unnecessary jobs; R360 repurposes a job already running. It also differs from replay avoidance based on saved decoder checkpoints.

## R361 — Keep frame-adaptive analysis and rendering on one GPU timeline

### Hypothesis and source basis
A per-frame GPU analysis stage followed by CPU readback and a GPU consumer introduces a dependency through JavaScript. WebGPU mapping waits until relevant GPU use has completed before the CPU can access a buffer; GPU compute and render work can instead be submitted with valid resource dependencies. [S6]

Proposed path: owned input plane -> GPU histogram -> GPU percentile selection -> GPU integer lookup-table generation -> render using that same frame's table. Keep optional UI telemetry off the current frame's critical path.

### First scope and experiment
Use an explicitly requested per-frame contrast operation on a known 10-bit grayscale/luma-code plane. Define percentile ranks, tie conventions, degenerate equal-endpoint behavior, clipping, and integer rounding independently. This is not an automatically enabled tone map or a claim about perceptual luminance.

Compare the existing mixed CPU/GPU path, optimized CPU analysis, and the GPU-resident candidate. Start with synthetic owned integer planes, then integrate an already-qualified decoded-frame extraction path while holding that extraction constant across variants.

Require exact histogram bins, selected thresholds, generated LUT values, and final integer samples against an independent CPU oracle. Begin with frame sizes whose counts and all integer intermediates are proven to fit their representations; other sizes require rejection or a qualified wider construction.

### Negative controls and rejection
Test constant pictures, alternating dark/bright pictures, sharp scene cuts, rank-boundary bins, extreme values, empty/invalid regions, resize, cancellation, and several frames in flight. Deliberately bind frame N to frame N-1 statistics as a negative control. Maintain per-frame resource ownership until all consuming commands are safe.

Use separate correctly ordered dispatches/passes for global dependencies. A workgroup barrier does not synchronize the whole grid; do not build a single-dispatch global barrier out of unsupported assumptions. [S7]

If temporal smoothing is later desired, qualify its source epoch, previous-state dependencies, and discontinuities separately. The first operation uses only current-frame information.

### Cost and decision
Include histogram construction, atomics/reductions, extra passes, resource storage, shader setup, optional telemetry, and complete presentation latency. Separate bytes read back from the cost of the synchronization itself. Reject if no relevant CPU round trip exists, the current GPU pipeline is equivalent, or small-frame workloads are cheaper on the CPU.

**Distinct contribution:** R337 answers many LUT-statistics queries over one histogram. R361 removes CPU participation from the feedback path between current-frame analysis and its immediate GPU consumer. It can retain multiple passes rather than trying to fuse a global analysis into an invalid single pass.

## R362 — Stop replaying alpha-animation history when its remaining contribution is bounded

### Hypothesis and source basis
APNG OVER blending depends on previous canvas content; NONE disposal retains it. PNG stores unassociated color/alpha, so convert explicitly into a chosen premultiplied working representation before applying the analysis. SOURCE replacement and other disposal modes have distinct semantics and are outside the first profile. [S8]

For a normalized premultiplied channel, OVER has the form C_out = c + (1-alpha) C_in. This follows the standard source-over formula. [S9]

After a suffix of frames at pixel p, write:

    C_target(p) = A(p) + T(p) U(p)
    T(p) = product_j(1 - alpha_j(p))

A is the suffix's accumulated contribution and U is the unprocessed older canvas. Uncovered pixels in a rectangular frame use alpha zero for this expression.

When normalized premultiplied U and its alpha lie in [0,1], replacing the unknown older canvas with transparent black changes each premultiplied component and alpha by at most T in exact arithmetic. For a normalized opaque background, the final composite error is also bounded by T; that separate bound uses U_color <= U_alpha, not arbitrary unrelated color/alpha ranges.

### Two separate contracts
- Exact-history elision: an explicit fully opaque overwrite in the supported OVER/NONE history makes the older contribution exactly zero at that pixel. Underflow of a computed product is not a proof of zero.
- Bounded preview: stop only when a conservative upper bound on every required pixel's T, plus numerical allowance, is below the user-declared tolerance at the stated working/output surface. This is an opt-in preview, never silently substituted for exact playback.

The bound does not automatically survive unpremultiplication, arbitrary HDR values, nonlinear color transforms, or amplification by downstream effects. Qualify the bound at the actual promised surface or retain earlier history.

### First scope and experiment
Begin with small full-canvas 8-bit RGBA frames, OVER blending, NONE disposal, fixed interpretation, and independently defined high-precision composition. Walk backward from a requested target, decode only as much suffix as is needed, and accumulate its color and transmittance. Do not assume PNG alpha can be obtained without decoding the rest of its frame.

Verify the algebra independently on tiny rational fixtures. Then compare the candidate against full replay and a strong decoded-state-checkpoint baseline using identical memory budgets. Check every component/pixel, exact-mode eligibility, claimed error bound, target timestamps, and behavior after seeking.

Start exact and preview variants as different tests. For preview continuation, either maintain a separately qualified continuing bound or restore an exact state before returning to exact playback. Do not cache an approximate canvas under an exact-state key.

### Negative controls and rejection
Test many nearly transparent frames, an uncovered pixel, explicit opaque overwrite, transparent colored pixels, changing rectangles, disposal changes, source/profile mismatch, floating-point underflow, and errors near the tolerance. Unsupported PREVIOUS/BACKGROUND disposal or changed color processing must fall back in the first profile.

Count all suffix decoding, image reconstruction, per-pixel transmittance work, storage, index reading, and any sidecar construction. Cold arbitrary sources may offer little savings; the method can still have a repeat-seek use case. Stop when transparency preserves most history or per-pixel planning costs more than replay.

**Distinct contribution:** R344 skips completely overwritten SOURCE history. R362 investigates attenuated contributions under OVER and keeps exact zero-contribution elimination separate from a declared bounded-error preview.

## Proposed investigation order

1. R360: instrument an existing exact-scrub path and test in-flight reuse against its tuned coalescing baseline.
2. R358: byte-identity fixture first, then one real browser destination, with existing FFmpeg support as the baseline.
3. R361: exact integer histogram/LUT oracle before any GPU scheduling comparison.
4. R362: rational composition/error-bound proof fixtures before full image decoding and seek scheduling.
5. R359: only after actual startup measurements identify a useful software/browser crossover; enforce a hard duplicate-work budget.

This ordering is engineering judgment, not measured ranking or forecast speedup.

## Primary-source register

Retrieved during authoring. Rolling standards and source branches identify primitives; tested environments must pin actual versions.

[S1] Matroska Element Specification — ContentEncodingOrder, ContentEncodingScope, ContentCompression, ContentCompAlgo, ContentCompSettings.
https://www.matroska.org/technical/elements.html

[S2] FFmpeg n7.1.1 Matroska demuxer — existing header restoration, zlib decoding, and codec-private normalization.
https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavformat/matroskadec.c

[S3] Compression Standard — zlib-wrapped deflate, checksums, dictionary restrictions, and stream error conditions.
https://compression.spec.whatwg.org/

[S4] WebCodecs — VideoDecoder reset/configure/output behavior, frame lifetime, and hardware-acceleration tradeoffs/hints.
https://www.w3.org/TR/webcodecs/

[S5] AVC WebCodecs registration — access units, parameter sets, and valid IDR key entries.
https://www.w3.org/TR/webcodecs-avc-codec-registration/

[S6] GPUWeb WebGPU specification source — content/device/queue timelines, compute/render resources, mapAsync synchronization, and resource usages.
https://raw.githubusercontent.com/gpuweb/gpuweb/main/spec/index.bs

[S7] GPUWeb WGSL specification source — workgroup-scoped barriers and storage/atomic semantics.
https://raw.githubusercontent.com/gpuweb/gpuweb/main/wgsl/index.bs

[S8] PNG Specification, Third Edition — APNG blend/disposal modes, initial canvas, frame image data, and unassociated alpha storage.
https://www.w3.org/TR/png-3/

[S9] Compositing and Blending Level 1 — source-over and premultiplied compositing equations.
https://www.w3.org/TR/compositing-1/
