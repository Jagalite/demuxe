# Demuxe — R313–R317 research proposals

**Status: PROPOSED / NOT TESTED · 18 September 2026**

This batch is source review and experiment design. No media fixture generation, browser playback test, performance benchmark, production source change, commit, or background execution is claimed. Numbering continues from the R307–R312 cards supplied in this conversation. Earlier IDs and titles are not redefined.

The proposals concern application-controlled components. They do not imply that internal browser-decoder state or private GPU surfaces are accessible. Specification and source-code primitives are evidence for an experiment, not proof of a complete route.

## R313 — Sample B44-compressed HDR images without expanding the whole frame

**Type:** Existing-file rendering route and memory tradeoff.

**Mechanism.** Retain validated OpenEXR B44 blocks in a GPU storage buffer. Implement a sampling function that locates the relevant block, reconstructs the required half-float sample representation, and feeds the ordinary color/presentation operation. Compare this against separately expanding all or selected blocks into a half-float texture before sampling.

**Source basis.** OpenEXR documents B44 HALF data as 4×4 blocks packed into 14 bytes. B44A additionally permits three-byte flat blocks. Its implementation exposes the integer unpacking steps and optional pLinear conversion. B44 is lossy encoding; this proposal targets equality with decoding the existing file, not with pixels that preceded its encoding. [S1, S2]

**First scope.** Flat, single-part B44; HALF channels; no channel subsampling; pLinear disabled; first a single image, then a timed sequence. Reject unqualified raw-chunk fallback or handle it explicitly. Begin with nearest-neighbor sampling; qualify bilinear sampling separately by reconstructing each contributing sample before interpolation.

**First experiment.** Compare reconstructed 16-bit sample patterns against a pinned OpenEXR decoder before converting to GPU floating point. Then compare displayed output under the same declared color and sampling pipeline. Exercise blocks with negative values, edge blocks, nonzero data-window origins, channel-layout changes, truncation, and source cancellation. Use CPU full decode, GPU decode-then-sample, and demand sampling as separate baselines.

**Potential value.** Avoid an expanded full-frame intermediate and its write/read traffic; potentially retain more frames or images under a fixed memory budget. Useful workloads may include sparse inspection and bounded viewports. Ordinary full-frame playback remains a necessary adverse comparison.

**Reject/stop.** Repeated block reconstruction under filtering costs more than retaining an expanded texture; metadata or unsupported channel transforms cannot be preserved; initialization and addressing overhead erase the benefit. B44A offset indexing and pLinear tables are follow-ons, not implicitly covered.

**Measurements.** Complete parse/upload/render time, bytes uploaded, peak owned storage, sample-demand/reconstruction counts, sampling cost at several scales, and frame deadlines. No hardware-overlay or battery claim follows from these counts.

**Difference.** R172 used a GPU-supported texture format. R313 interprets a different existing compressed representation inside a controlled sampler; it does not require the driver to implement B44 natively.

## R314 — Send GIF dictionaries to the GPU instead of expanded index images

**Type:** Split decoder and reconstruction experiment.

**Mechanism.** Let a CPU/Wasm parser read GIF LZW codes and construct immutable dictionary nodes containing a parent, final palette index, phrase length, and first index. Emit bounded jobs specifying dictionary node, dictionary generation, output position, and length. Expand independent phrases on the GPU, then apply the palette and image composition. A first implementation may use one GPU invocation per phrase, writing the phrase in reverse while following its parent chain.

**Source basis.** GIF specifies variable-width LZW codes, clear codes, end codes, and deferred clearing of a full dictionary. FFmpeg's decoder explicitly stores prefix/suffix arrays and expands codes through a stack. Those are the existing stages being divided differently. [S3, S4]

**First scope.** A single complete non-interlaced GIF image, global palette, and no transparency. The CPU stage remains sequential initially. Dictionary creation must not expand whole phrases to find their first byte or length: maintain those quantities incrementally. Correctly handle the valid code that names the next dictionary entry.

**First experiment.** Compare decoded palette indices, image dimensions, output length, and final colors against independent reference decoding. Then add animation timing and disposal as separately tested presentation behavior. Compare optimized CPU decoding and actual native image decoding where available, not only an unoptimized interpreter.

**Negative controls.** Clears at unusual positions; dictionary exhaustion without immediate clearing; code-width transitions; long phrases; truncated image sub-blocks; invalid references; output exceeding declared dimensions; an old dictionary generation still used after a clear. Bound dictionary generations, phrase depth, descriptors, and total expanded bytes.

**Potential value.** Avoid constructing and transferring a complete CPU-side index image. The proposal does not eliminate LZW parsing or establish that the GPU path is faster.

**Ownership constraint.** A clear code cannot invalidate a dictionary still referenced by outstanding GPU work. Retain immutable generations or fence their retirement. Output storage writes must also have race-free ownership at the actual GPU storage granularity.

**Reject/stop.** Dictionary and job traffic exceed ordinary decoded-index traffic; long phrases create poor load balance; native decoding already wins; safety bounds force excessive fallback. Include the entire parsing, expansion, palette, and composition path in measurements.

**Difference.** R173 retained an already-decoded palette-index plane. R314 delays the LZW phrase expansion that produces that plane. It is not another palette lookup optimization.

## R315 — Carry hidden caption state across packet-copy cuts

**Type:** Caption-aware editing and seek capability; not a new video decoder.

**Mechanism.** At each selected clip boundary, compile the original stateful caption history into a versioned logical-state capsule. Attach that application sidecar to the fragment recipe. Restore the caption decoder before continuing the selected source's subsequent caption events, while the audio/video route retains its independently qualified packet-copy or native construction.

**Source basis.** FFmpeg's real-time CEA-608 path has displayed and non-displayed screen state. Pop-on writing can target the inactive screen and an end-of-caption command swaps screens. Cursor, style, mode, and repeated-command handling also affect subsequent output. A snapshot of only the visible text is insufficient. [S5]

**First scope.** One service of CEA-608 pop-on captions; a controlled real-time caption decoder; plain supported characters and styles; no roll-up, text mode, CEA-708, or unknown commands. Serialize logical data, not raw C structures or pointers. Preserve all state required for the admitted decoder's future behavior, including command suppression and relevant pending timing state.

**First experiment.** Cut after the source has loaded its next caption into non-displayed memory but before the display-swap command. Also retain a currently displayed caption. Restore at the cut and play the original suffix. Compare both immediately visible output and all later caption changes against the uninterrupted source mapped to the selected clip timeline. Then concatenate independently qualified clips from different sources.

**Negative controls.** Capsule containing only visible text; wrong hidden text; missing style/cursor/mode data; stale service identity; a repeated control pair crossing the boundary; source-version mismatch; restoration after suffix events have already started. Capsule sizes and all indices must be bounded.

**Potential value.** Correct caption-preserving cuts and repeatable seeking without replaying the entire caption history on every visit or burning captions into video.

**Fair baseline.** Existing caption-only history replay and any existing cue normalization—not needlessly decoding every preceding video frame. Include the initial history pass, capsule generation, retained metadata, and restoration.

**Boundary.** This qualifies an application-controlled sidecar and caption renderer. It does not prove a self-contained standard export or allow injection of private state into a browser's internal caption decoder. A portable caption-command primer would need its own legal framing, timing, command-bandwidth, and destination tests.

**Difference.** R60 extracted caption data. R315 preserves the state needed to interpret that data correctly after timeline edits. R229's authored timeline execution does not by itself supply this state.

## R316 — Cache the peak envelope of every fixed-gain mix

**Type:** Repeated mix analysis through computational geometry.

**Mechanism and derivation.** For synchronized stems, let z[n] be the vector of sample values across stems. For constant gain vector g, the sample peak is P(g) = max_n |g^T z[n]|. Form the symmetric set S = {z[n], -z[n]} and retain the vertices V of its convex hull. A linear functional achieves its maximum over that hull at a vertex, so P(g) = max_{v in V} g^T v. This derivation concerns exact arithmetic on the chosen sample vectors.

**First scope.** Two synchronized integer-PCM stems, fixed rational gains, exact orientation predicates, sufficiently wide arithmetic, no clipping or nonlinear processing, and sample-peak value only. Do not claim earliest peak location without additional tie metadata or a direct follow-up check.

**First experiment.** Construct a two-dimensional hull from original samples and their negatives. Query a grid of gain pairs and compare every peak value against an exhaustive exact scan of the same samples. Include identical stems, opposite-polarity stems, collinear points, duplicate extrema, near-collinear points, zero gains, negative gains, and unequal-duration rejection or an explicit padding contract.

**Potential value.** Fast fader previews, many candidate-mix evaluations, and a gain-feasibility region. For a ceiling T, requiring g^T v <= T for every retained symmetric-hull vertex defines the accepted gain region for this digital peak contract.

**Extensions.** Store hulls for bounded time regions; add a third stem; build sample vectors from an explicitly specified oversampling construction. Oversampled analysis needs its own filter, phase, endpoint, precision, and reference contract. It is not automatically analog or standards-certified true peak.

**Numerical gate.** Floating-point hull libraries may use perturbation, merging, or other precision policies. Their documented numerical behavior is not permission to discard a true peak candidate. Begin with exact low-dimensional arithmetic; retain uncertain points or fall back to direct scanning rather than silently simplifying. [S6]

**Reject/stop.** Most points remain vertices; dimensionality makes construction/storage excessive; gain automation or source edits invalidate too much prepared work; preparation does not amortize. Measure the full retained point set, build cost, query time, and break-even count against a vectorized exhaustive scan.

**Difference.** R309 caches quadratic cross-products for energy/loudness. R316 caches extremal sample combinations for a maximum. R312 prunes one peak query; R316 prepares for many gain vectors.

## R317 — Parallelize a true attack/release envelope with piecewise-affine maps

**Type:** Nonlinear stateful audio-processing research; mathematical equivalence first.

**Source basis.** FFmpeg's compand envelope updates volume toward the current input magnitude using one coefficient when the magnitude increases and another when it decreases. That is not the max-with-decay recurrence used in R294. [S7]

**Mechanism.** For magnitude p and retention factors 0 < a_attack, a_release < 1, define f_p(e) = a_attack*e + (1-a_attack)*p when e < p, and a_release*e + (1-a_release)*p otherwise. Both branches meet at p and have positive slope. The mapping is therefore continuous, strictly increasing, and piecewise affine. A block is a composition of these maps and has a piecewise-affine transfer curve from incoming to outgoing state.

**Structural observation.** In exact arithmetic, appending one update can add at most one new breakpoint: the unique preimage of its threshold under the previous strictly increasing block map. Thus an N-sample block has at most N breakpoints, rather than requiring enumeration of 2^N possible attack/release histories. This does not imply that constructing or composing the curves is cheap.

**Proposed pipeline.** Build bounded block-transfer curves independently; compose/evaluate them through a hierarchy to determine each block's actual incoming state; generate the ordinary per-sample envelope locally from that state. Avoid materializing a full transfer curve for every sample prefix. Curve storage, compositions, and the additional local pass all count.

**First experiment.** Small rational-valued fixtures checked against exact sequential arithmetic. Then a pinned floating-point implementation compared with a higher-precision reference and a declared tolerance. Test alternating magnitudes, long tails, equal magnitudes at branch boundaries, nonzero initial state, unequal attack/release factors, a short final block, and the equal-factor linear control.

**Potential value.** Parallel offline envelope generation or repeated processing of several long recordings while preserving a conventional two-coefficient detector rather than replacing it with a cheaper different effect.

**Critical qualification.** Reassociated floating-point operations can change state and subsequent branch choices. Instantaneous or frozen response factors, underflow, NaNs, and infinities require separate rules and are not covered by the initial strictly increasing proof. Do not merge nearly equal curve pieces without a separately approved approximation contract.

**Reject/stop.** Curves grow to nearly one breakpoint per sample; construction, storage, search, and synchronization exceed the cheap sequential recurrence; numerical uncertainty is unacceptable. Compare against optimized sequential and ordinary across-channel parallel processing at the same latency and output requirements.

**Difference.** R245 depends on linear-system correction. R294 uses a constant-size maximum/decay summary. R317 retains an actual attack/release branch by accepting a variable-size transfer curve; it is not a complete compressor implementation.

## Priority judgment

- Existing-image rendering investigation: R313.
- Decoder split with a clear byte-level oracle: R314.
- Most practical correctness/capability addition: R315.
- Strongest repeated-query mathematical opportunity: R316.
- Highest-risk parallel-processing research: R317.

These priorities reflect expected information value, not measured speed. Keep exact bytes/samples, numerical tolerance, semantic caption equivalence, and altered presentation features as separate acceptance contracts. Preserve each ID and title when later testing a nearby mechanism.

## Primary source register

Sources were reviewed for this proposal pass. Rolling documentation and main-branch source are not installed-version or browser-support claims. Pin exact revisions before executing any experiment.

[S1] OpenEXR, Technical Introduction, B44/B44A and channel/data-window semantics.
https://openexr.com/en/latest/TechnicalIntroduction.html

[S2] OpenEXRCore B44 implementation, integer unpacking and pLinear conversion.
https://raw.githubusercontent.com/AcademySoftwareFoundation/openexr/main/src/lib/OpenEXRCore/internal_b44.c

[S3] GIF89a specification, LZW code widths, clear/end codes, and deferred clear behavior.
https://www.w3.org/Graphics/GIF/spec-gif89a.txt

[S4] FFmpeg n7.1.1 LZW decoder, prefix/suffix state, special next-entry case, and output expansion.
https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/lzw.c

[S5] FFmpeg n7.1.1 CEA-608 decoder, real-time displayed/non-displayed screens and control handling.
https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/ccaption_dec.c

[S6] Qhull, Imprecision in Qhull, numerical and perturbation policies.
https://raw.githubusercontent.com/qhull/qhull/master/html/qh-impre.htm

[S7] FFmpeg n7.1.1 compand implementation, update_volume and attack/decay coefficient preparation.
https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavfilter/af_compand.c
