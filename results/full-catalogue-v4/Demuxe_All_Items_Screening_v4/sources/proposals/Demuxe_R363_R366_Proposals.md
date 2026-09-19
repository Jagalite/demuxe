# Demuxe — R363–R366 experiment proposals

**Status:** PROPOSED / NOT TESTED  
**Prepared:** 19 September 2026  
**Scope:** Four additional research cards. No media fixtures, codec prototypes, playback tests, performance benchmarks, or production changes were performed for this batch.

These are additional Demuxe hypotheses, not claims of industry invention. Existing primitives, proposed compositions, and qualification results must remain separate. This document fixes the IDs, titles, mechanisms, and initial output contracts for this batch. An implementation of a nearby idea must not be reported as execution of the original card.

## Catalogue

| ID | Exact title | Type | First decisive gate |
|---|---|---|---|
| R363 | Expose prepared fragments as a native HLS presentation | Native destination / delivery ownership | The identical qualified fragments actually play through native HLS, and the intended deployment can serve every required resource. |
| R364 | Reuse GPU command sequences across changing video frames | Presentation CPU overhead | Replayed render commands preserve output with genuinely changing per-frame data and resource lifetimes. |
| R365 | Compute GIF color statistics without expanding LZW strings | Compressed-domain exact analysis | Dictionary-use propagation reproduces every palette-index count without reconstructing the index image. |
| R366 | Evaluate time-varying audio fades from cached polynomial moments | Repeated automation analysis | Moment evaluation matches direct energy calculation for declared samplewise gain curves and fixed aligned sources. |

## R363 — Expose prepared fragments as a native HLS presentation

**Hypothesis.** A source already transformable into compatible fragmented MP4 may be delivered through a generated HLS presentation rather than through an application-managed MSE append queue. The experiment changes the destination and delivery ownership, not the codec or the selected media.

**Source basis.** Apple documents HLS for its platforms and Safari. RFC 8216 defines fragmented-MP4 segments, initialization references through EXT-X-MAP, explicit segment durations, and end-of-list semantics. These are existing mechanisms. Neither source qualifies arbitrary Demuxe output or promises lower energy use. [S1, S2]

**Proposed construction.** Source inspection and packet-copy preparation produce the same qualified initialization and media fragments used by a baseline route. A small manifest adapter publishes a truthful playlist and stable fragment resources. A browser with qualified native HLS support obtains those resources and owns the presentation. Demuxe retains source authorization, exact track intent, and resource-generation identity.

**Initial profile.** Finite unencrypted VOD, one video track and one audio track, stable H.264/AAC configuration, verified closed-GOP segment entry points, no midstream configuration changes, no private headers required by the client, and no adaptive bitrate logic. Begin with a same-origin controlled HTTP fixture endpoint. It must serve valid MIME types, truthful resource sizes where supplied, and any requested byte ranges correctly.

**First experiment.** Produce one set of fragments. Compare native HLS consumption against a tuned MSE route consuming the same fragments and an ordinary direct-file route where eligible. Check ordered coded payloads, initialization, first synchronized A/V, pictures, audio timing, duration, distant and near-boundary seeks, stalls/resumption, final samples, EOF, and cleanup. Delayed and repeated requests must remain bound to the same immutable source version.

**Separate deployment gate.** After destination qualification, test whether the actual intended browser-only resource provider can serve the playlist, initialization, segment requests, retries, and range requests. A service worker is a candidate only when its interception and lifetime behavior have been demonstrated on the target configuration. A working server-hosted fixture does not establish that native media requests traverse a service worker, that Blob playlist URLs work equivalently, or that the route is client-only. If the required delivery mechanism is absent, record that deployment as BLOCKED. Do not substitute an undeclared remote service or bypass origin policy.

**Adversarial controls.** Incorrect EXTINF, missing or mismatched initialization, unsupported codecs, a purported independent segment that starts at a dependent picture, a late response from an earlier source generation, premature resource eviction, missing final media, and failure during source change. Unsupported requested features remain explicit admission failures rather than silently disappearing.

**Measurements.** Separate fragment-preparation CPU from delivery and player CPU. Record source reads, bytes served, request pattern, application messages, retained fragment bytes, startup, seek response, stalls, and measured device energy where available. Include any additional server or service-worker cost. Server-prepared media alone cannot prove an end-to-end client improvement.

**Reject when.** HLS does not accept the required media, the deployment cannot deliver the resources, native fetching causes excess preparation, short jobs suffer startup regressions, or correct behavior costs more than the existing route. Missing native HLS support is a capability boundary, not a codec failure. Do not introduce adaptive representations or transcodes simply to make the experiment succeed.

**Relationship to previous cards.** R115 exposed a progressive direct response; R353 retained MSE and adapted application work to browser demand. R363 investigates a manifest-backed native streaming destination over the already-qualified prepared fragments. A finer-grained client scheduler is intentionally not claimed as a benefit; the question is whether less client-owned scheduling is useful.

## R364 — Reuse GPU command sequences across changing video frames

**Hypothesis.** In a renderer with a stable sequence of draw operations, repeatedly encoding equivalent commands may be avoidable even though texture contents and effect parameters change each frame.

**Source basis.** WebGPU render bundles are reusable recorded render-command sequences, unlike ordinary one-use command buffers. executeBundles does not inherit the surrounding pass's bindings and clears relevant pass state afterward. Video-backed external textures have their own identity and expiration rules; an imported frame is not a permanently live view that automatically follows future video frames. [S3]

**Proposed construction.** Record rendering portions that bind stable, Demuxe-owned texture slots, stable glyph atlases, geometry, and parameter buffers. Update the contents of the selected slot and parameter buffer, then execute the corresponding compatible render bundle. Keep a bounded bundle per relevant resource slot and layout generation. This caches commands, not completed images, subtitle semantics, or decoded video.

**Initial profile.** Fixed output format and sample count; owned texture slots that the baseline already uses; an explicitly supported subtitle or multi-panel draw layout; fixed pipelines and bind groups; dynamic content supplied through correctly scheduled resource writes. Compute passes and transient video imports remain ordinary per-frame work. Do not add a video copy merely to obtain persistent textures.

**First experiment.** Compare per-frame command encoding against bundles with identical shaders, draw counts, pass counts, buffers, textures, effect parameters, and presentation times. Include a renderer that already batches glyphs or tiles efficiently. Alternate unmistakably different pictures and parameter values to expose stale-frame replay. Verify exact owned-integer surfaces where available and a declared numerical comparison at the final color surface.

**Invalidation and ownership.** Treat replaced texture views, glyph-atlas replacement, changed bind groups, output-format/sample-count changes, pipeline changes, and device loss as explicit generation boundaries. Fixed render-bundle commands cannot be silently retargeted by changing outer-pass state. In-flight parameter data and texture contents must correspond to the correct frame. A cached bundle can retain resources, so cap cache size and release obsolete generations safely.

**External-texture gate.** Begin without putting ephemeral native-video bindings into persistent bundles. Test any later such use against the exact import object's lifetime; retaining a bundle does not make expired textures usable or advance their source frame. Keep the transient video draw outside the bundle when appropriate.

**Adversarial controls.** Atlas replacement while an older frame is outstanding, changed draw layout, seek and cancellation, resolution and format changes, source-generation changes, two frames attempting to reuse one parameter slot, device loss, expired external textures, and a mix of bundled and unbundled draws with missing state rebinding.

**Measurements.** CPU command-encoding time, command-related allocations, submission time, bundle creation/rebuild work, GPU execution, missed deadlines, and retained resources. Include full player cost and cold initialization. Reducing API calls is not enough if there is no meaningful complete-session reduction.

**Reject when.** The already-batched renderer has little command cost, churn invalidates bundles too frequently, cached resources increase memory excessively, or an extra copy is needed solely to support reuse. This must not force native video off an otherwise cheaper direct/overlay path.

**Relationship to previous cards.** R23 fuses pixel operations; R330 reuses shaped subtitle scenes; R221 manages temporary resource lifetimes. R364 keeps the same draw work but reuses its command description.

## R365 — Compute GIF color statistics without expanding LZW strings

**Hypothesis.** Exact palette-index histograms can be calculated from a GIF's LZW dictionary and emitted-code frequencies without constructing the expanded index image or walking every expanded phrase byte.

**Source basis.** GIF defines variable-width LZW codes and explicit clear/end behavior, including the case where the dictionary is full but no clear code has occurred. FFmpeg's pinned LZW decoder represents phrases using prefix/suffix arrays and expands them through a stack. These supply a concrete structural starting point. The occurrence-propagation algorithm below is a proposed composition, not a newly measured decoder feature. [S4, S5]

**Mechanism.** Within one dictionary generation, a composite entry e denotes phrase(parent(e)) followed by one literal suffix(e). Count how often each entry is emitted into the decoded sequence. After the generation is complete, process composite entries in reverse creation order. For accumulated multiplicity w[e], add w[e] to the histogram of suffix(e), and add w[e] to w[parent(e)]. Finally add each literal entry's accumulated multiplicity to its own histogram bin. Each composite entry's parent precedes it, so descendants have contributed their multiplicities before the parent is processed.

**Why it works.** Each appearance of a phrase contributes one appearance of its prefix and one occurrence of its last symbol. Repeatedly applying that identity partitions the complete expanded sequence into its literal counts, without needing those literals in spatial order. For example, two emissions of a phrase ABA yield four A values and two B values whether or not a six-element pixel array is written.

**Initial profile.** One complete non-interlaced GIF image, a fixed global color table, known dimensions, and no animation compositing. Implement ordinary code-width changes and special next-entry semantics correctly. Record phrase length and first literal as needed to build dictionary nodes without expanding phrases. Finalize and accumulate counts before reusing dictionary slots at each clear; a full dictionary is not an implicit clear.

**First experiment.** Compare every histogram bin, palette-index validity, expanded sample count, and mapped color counts with an independent ordinary decoder. Include a fused decode-and-histogram baseline that does not retain a complete image array. The candidate must demonstrate savings from avoiding expansion itself, not merely from omitting an allocation a baseline could also omit.

**Controls.** Literal-dominated data, long phrases, repeated phrases, multiple clears, a full dictionary without clear, next-entry codes, width transitions, duplicate palette colors, invalid references, truncated data, invalid palette indexes, counter overflow, and expansion beyond the declared dimensions. Bound emitted length and resources during parsing, not only after the histogram finishes. End-code and container validation remain required.

**Output contract.** Exact histogram of the decoded source image's palette indexes, with derived color counts under the selected palette. Transparent-index counts can be included under an explicitly supplied graphics-control interpretation. This is not the histogram of an already-composited animation canvas, a spatial crop, or a scaled/display-color-converted output. It loses positions by design. Identical histograms do not imply identical pictures. Delay and disposal semantics cannot be ignored just because an image uses only a transparent index.

**Potential payoff.** Compressed-domain palette summaries, source-level transparency coverage, or narrowly qualified whole-image classification without materializing every index. The expected work is tied to parsed codes plus created dictionary entries, rather than additionally expanding every phrase; actual cost still requires measurement.

**Measurements and rejection.** Parse work, propagation work, dictionary/weight storage, counters, source validation, and complete query time. Compare repetitive and adverse data under identical correctness contracts. Short phrases or frequent clears may leave no meaningful savings. Ordinary playback still needs spatial pixels, so count an extra parallel analysis pass rather than pretending it replaces display decoding.

**Relationship to previous cards.** R314 moves phrase expansion to the GPU. R365 asks whether expansion can be omitted entirely when the requested output is only aggregate counts. R337 computes a histogram after decoding; this supplies a different way to obtain one for a qualified compressed source.

## R366 — Evaluate time-varying audio fades from cached polynomial moments

**Hypothesis.** Repeated energy/RMS queries for fixed-alignment audio sources with piecewise-polynomial gain automation can reuse a small family of source cross-moments instead of rerendering every candidate waveform.

**Source basis.** Web Audio defines a precise linear-ramp interpolation rule, giving one familiar automation shape. The proposed moment representation and equations are algebraic constructions; they do not establish bit identity with a browser's floating-point audio engine or extend to every automation mode. [S6]

**Initial gain model.** On one query interval I, let source i have g_i[n] = a_i + b_i*n and y[n] = sum_i g_i[n]*x_i[n], with a declared absolute sample grid and fixed source alignment. Cache M_ij,r(I) = sum_(n in I) n^r*x_i[n]*x_j[n] for r in {0,1,2}.

Then the unnormalized output energy is:

    E(I) = sum_(i,j) [
        a_i*a_j*M_ij,0
        + (a_i*b_j + b_i*a_j)*M_ij,1
        + b_i*b_j*M_ij,2
    ].

The i,j expression includes both cross terms; a storage implementation using i<=j must apply the appropriate factor of two. Mean square is E divided by the interval's sample count; RMS adds a separately specified square root.

**Proposed workflow.** Decode aligned sources once, construct moments over bounded blocks, evaluate candidate fades over those summaries, then render only the selected waveform when playback/export requires it. For two sources and linear gains, symmetry leaves three source pairs and three orders: nine scalar moments per complete block, excluding metadata and storage of any hierarchy or boundary samples.

**First experiment.** Two short mono integer-PCM sources, rational linear gains, fixed alignment, no clipping/dither/filters, and interval and gain-break boundaries aligned with prepared blocks. Use exact rational or sufficiently wide integer arithmetic to compare moment results against independently calculating every mixed sample and squaring it. Define gain endpoints and sample inclusion explicitly. Build equal, opposite-polarity, delayed-looking-but-fixed, impulsive, silent, and boundary-value signals.

**Extensions.** Piecewise-linear automation is a sum of interval queries split at every gain breakpoint. Arbitrary boundaries require bounded direct edge scans or a finer index, with the required source/decoded data and work counted. Higher polynomial degree p requires moments through degree 2p; do not substitute a polynomial approximation for an explicitly requested equal-power, exponential, or arbitrary curve. Changing the relative offset of the source stems changes their pairwise products and requires new aligned data or another qualified index.

**Numerical plan.** Store/evaluate bounded blocks in local sample coordinates rather than enormous absolute powers where useful; translate gain coefficients to the same local origin. Bound accumulator ranges. For a floating-point implementation, use stable accumulation, high-precision references, error estimates, and direct fallback for cancellation-sensitive or threshold-sensitive cases. Do not silently clamp an unexplained negative energy and report equality. Per-sample quantization or clipping changes the algebraic signal; the initial target is the explicitly defined unquantized mix.

**Exclusions.** This computes digital sample energy and RMS, not waveform shape, clipping count, peak, true peak, integrated loudness, or perceptual quality. In particular, do not label it an extension of K-weighted loudness by moving a time-varying gain through a stateful weighting filter. Filtering g[n]*x[n] is generally different from multiplying a filtered x[n] by g[n]. A separate proof/construction would be needed.

**Measurements.** Initial decoding/analysis, moment construction, index bytes, interval decomposition, edge work, stable evaluation, fallbacks, and repeated-query break-even. Compare against a persistent fused mix-and-energy loop reading already-decoded samples, not separate process startup. The selected final mix still has to be rendered if the user requests sound or a file.

**Potential payoff and rejection.** Interactive fade comparisons or bounded parameter searches with many queries over reused source alignment. Reject when there are too few queries, too many breakpoints, excessive stem-pair storage, unstable arithmetic, or repeated alignment changes.

**Relationship to previous cards.** R309 uses cross-products for constant-gain mixes. R366 adds time moments to admit a specific kind of gain automation. It intentionally has a narrower measurement contract than general loudness analysis.

## Shared qualification gates

A small complete correctness pilot precedes timing. Availability, source validity, configuration changes, cancellation, seeks, final output, and cleanup are separate assertions. Browser acceptance is not proof of hardware acceleration. Resource counters are not direct physical-memory or battery measurements. A host or server fixture proves only the boundary actually exercised. Preserve existing Native / Hybrid / Software admission and requested fidelity; no new automatic defaults or universal route score is proposed.

## Primary-source register

Sources reviewed on 19 September 2026. Rolling specifications and documentation are evidence for API/format primitives, not a manifest of any particular installed browser.

- **S1 — Apple HTTP Live Streaming:** https://developer.apple.com/streaming/ . Native delivery context and links to platform authoring requirements.
- **S2 — RFC 8216:** https://www.rfc-editor.org/rfc/rfc8216.html . Sections 3.3 and 4.3: fMP4, EXT-X-MAP, playlist duration and termination. Initial test targets this stable subset; new HLS extensions are not assumed.
- **S3 — WebGPU specification source:** https://raw.githubusercontent.com/gpuweb/gpuweb/main/spec/index.bs . Bundles, executeBundles, resource-use validation, and external-texture lifetime. Rolling source; exact target browser behavior remains a gate.
- **S4 — GIF89a:** https://www.w3.org/Graphics/GIF/spec-gif89a.txt . LZW framing, code widths, clear behavior, palettes, and animation semantics.
- **S5 — FFmpeg n7.1.1 LZW decoder:** https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/lzw.c . Prefix/suffix dictionary representation and stack-based phrase expansion; versioned implementation reference.
- **S6 — Web Audio:** https://www.w3.org/TR/webaudio/ . linearRampToValueAtTime and parameter scheduling; reference for automation semantics, not a result for the proposed analysis index.

## Work log

Reviewed visible preceding proposals and searched Project/Library context for ID collisions; no proposal after R362 was established in this pass. Reviewed the primary sources above and derived the proposed count/energy identities. Authored this file. No media decoding, prototype execution, numerical test suite, benchmark, build, source edit, PR, commit, or background job was performed.
