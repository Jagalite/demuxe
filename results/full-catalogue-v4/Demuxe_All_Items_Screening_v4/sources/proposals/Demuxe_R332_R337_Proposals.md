# Demuxe — R332–R337 Research Proposals

**18 September 2026 · Original continuation cards · All PROPOSED / NOT TESTED**

Six additional hypotheses. This artifact records proposal scope, not experiment results. This pass reviewed primary documentation/source and authored cards; it did not run media tests, benchmark a player, change production code, or admit any route. R001–R331 and any separately maintained cards remain unchanged.

## Evidence and execution contract

Use each exact ID together with its title and proposal key below. The key hashes the ID, title, mechanism, initial scope, and acceptance contract in this artifact. It is a version fingerprint, not an authenticity signature. A successful nearby experiment must not replace the listed hypothesis. A material scope change needs a new revision or separately labeled follow-on.

Before implementation, audit the actual project path for equivalent behavior. Record ALREADY_HANDLED when appropriate. A missing browser API, fixture, codec profile, or matching build is BLOCKED, not a failed algorithm. Correctness comes before timing. Compare against optimized persistent implementations with equivalent output, latency, and resource budgets. Host results do not predict Wasm performance or qualify a browser matrix. No numeric runtime route scoring or automatic default changes are proposed.

For every executable result, retain the original card, source/build identifiers, fixture hashes, independent oracle, negative controls, raw measurements, and explicit output-fidelity contract. Keep research changes isolated from production until actual integration gates pass.

## Experiment index

| ID | Exact title | First gate / effort |
|---|---|---|
| R332 | Normalize VP9 superframes at the decoder boundary, not globally | Small parser/destination gate before a maintained adapter. |
| R333 | Keep soft telecine as progressive pictures plus timing | Small source/trace audit, then a controlled presenter integration. |
| R334 | Share one demux pass across independent playback and export timelines | Medium ownership and lifecycle integration after a small fan-out prototype. |
| R335 | Recover the GPU presenter without reopening healthy decoders | Medium failure-injection and ownership integration. |
| R336 | Reconstruct predictor-4 lossless JPEG with two-dimensional prefix sums | Small mathematical oracle; high effort for a fair integrated decoder/GPU evaluation. |
| R337 | Evaluate tone-curve statistics from an exact source histogram | Small exact numerical probe; medium integration into interactive analysis. |

## R332 — Normalize VP9 superframes at the decoder boundary, not globally

**Status:** PROPOSED / NOT TESTED

**Proposal key:** `705f6f20c6e66b736ec8ce6ccb8a57171d5c7c212e815ff0109356e70580b0a7`

**Mechanism:** Preserve the elementary VP9 frame bytes and decode order while adapting aggregate packet boundaries to a specifically qualified destination. Preserve invisible reference frames and independently map displayed-picture timestamps.

**Initial scope:** Unencrypted VP9 profile 0, stable configuration, one spatial layer, valid superframe indexes, a genuine cold-start keyframe, and a fixture containing invisible alternate-reference pictures.

**Acceptance contract:** Coded component-frame identity, displayed-picture identity and ordering, visible timestamps/durations, continuing reference behavior, correct seeks, and EOF. No invented display duration for an invisible picture.

**Relation to earlier work:** R110 (container lacing), R135 (hidden preroll), R239 (output-based decoder completion). This card changes input framing, not the coded pictures or their display flags.

### Hypothesis and evidence
The VP9 WebCodecs registration describes a chunk as a VP9 frame. FFmpeg supplies both a superframe splitter and a merger for invisible alternate-reference frames. Its pinned splitter preserves data through packet references and clears the PTS on invisible outputs. These establish a framing and timing boundary to investigate, not a proven missing Demuxe feature. [S1–S3]

### Smallest decisive probe
Use a synthetic sequence with a real keyframe and alternate-reference work. Inventory its component frames independently. Compare the normal container route, the existing WebCodecs bridge, and a candidate which supplies validated individual frames at the latter boundary. A positive support probe is insufficient: inspect actual displayed output and its continuation.

Internally preserve the difference between decode-only work and displayed pictures. WebCodecs still requires a timestamp argument; its finite API value must not be confused with an instruction to display a hidden picture. Do not copy FFmpeg's unset-timestamp sentinel directly into the browser API. [S10]

### Controls and rejection conditions
Exercise a bad superframe index, overlapping/out-of-bounds lengths, truncation, incorrect key classification, a hidden-picture dependency, repeated presentation timestamps, cancellation, and a seek into a dependent picture. Do not discard hidden pictures. Do not blindly split packets for MSE or other destinations that already want the aggregate construction.

Reject as an optimization when the existing path already performs the correct framing, when both qualified constructions behave equivalently without a measurable cost difference, or when the destination cannot consume the required decode-only work correctly. Missing destination support is BLOCKED, not proof against the format transformation.

### Cost accounting
Count parser work, packet objects, browser submissions, copies, retained backing allocations, configuration, and complete playback. Fewer or more decoder calls alone are not a win. No global normalization rule follows from one successful destination.

## R333 — Keep soft telecine as progressive pictures plus timing

**Status:** PROPOSED / NOT TESTED

**Proposal key:** `d5222d842b8d3e164997f8ba2022461693c6c13f82401dcea71fdb48ab67a80e`

**Mechanism:** For a validated progressive-picture source with repetition metadata, preserve one reconstructed picture and schedule its presentation holds instead of synthesizing fields and applying unnecessary deinterlacing.

**Initial scope:** A controlled MPEG-2 source with frame pictures, independently established progressive samples, truthful repeat/field metadata, a fixed progressive-display contract, and an explicit authority rule for timestamps versus repeat-derived duration.

**Acceptance contract:** Identical source picture samples and the same specified progressive presentation schedule, audio relationship, timed side data, seeking, and total duration. No implicit film-speed conversion or hard-telecine recovery.

**Relation to earlier work:** R169 (display scheduling), R228 (genuinely interlaced MJPEG), R328 (visibility). This preserves real repetition while avoiding a needless reconstruction stage.

### Hypothesis and evidence
FFmpeg parses progressive-picture and repeat-first-field flags separately and derives repeat_pict from their combination. Its AVFrame documentation notes that repeat metadata is generally a duration fallback when higher-layer timing is unavailable. This is existing behavior to preserve, not a new interpretation to impose over correct timestamps. [S4–S5]

### Smallest decisive probe
Generate identified progressive pictures carried with a known repetition pattern. Trace the existing decoder-to-presenter path. First determine whether it unnecessarily creates field images, materializes duplicate pictures, or activates a deinterlacer.

Compare a qualified cadence-aware reference with the candidate using the same decoded pictures and audio clock. Keep one texture per reconstructed picture where feasible and schedule the declared holds. Do not double-count repeats if source timestamps already incorporate them.

### Controls and rejection conditions
Include a genuinely interlaced moving sequence, hard-telecined mixed fields, a progressive/interlaced transition, inconsistent signaling, a cut through a repeat interval, timestamps that already contain repetition, and caption events occurring during a held picture. Unsupported or contradictory cases use the existing qualified path.

The acceptance target is the declared progressive-screen presentation, not physical interlaced scanout. Restoring uniform film cadence is a different requested transformation and is outside this card.

### Cost accounting
Count deinterlacing calls, duplicated picture allocation, uploads, presenter work, displayed timing, and full-session cost. The proper baseline is the current automatic behavior, not forced deinterlacing known to be unnecessary. Close as ALREADY_HANDLED when the existing path preserves this representation. This does not introduce general native MPEG-2 browser decoding.

## R334 — Share one demux pass across independent playback and export timelines

**Status:** PROPOSED / NOT TESTED

**Proposal key:** `592099497459d23ce3b043843fd88ea79bca6d59c9e77113caae2abfdedebe0e`

**Mechanism:** Publish immutable, source-timestamped packet records once; let each admitted output own its configuration, timestamp mapping, packet wrapper, muxer, cancellation, and buffering budget.

**Initial scope:** One authorized finite unencrypted source, stable H.264/AAC configuration, validated destinations, and consumers whose requests remain within a bounded shared source interval. Begin at one common qualified entry point; additional clip starts require separately qualified preroll and trimming.

**Acceptance contract:** Each completed output must match its independent qualified reference in selected coded payloads, configuration, timing, trimming, and requested playback. One output may not mutate another output’s packet metadata or silently discard its requested samples.

**Relation to earlier work:** R01 (shared source bytes), R118/R327 (shared decode), R296 (explicit fragment construction). This shares demuxed packets but not mutable mux state.

### Hypothesis and evidence
FFmpeg already supports multi-output writing through tee, and its documentation explicitly notes that a libavformat caller can feed the same packets to several muxers. AVPacket reference operations can share reference-counted payload buffers while copying packet properties and side data; non-reference-counted input may be copied. The new work is dynamic independent output lifetimes and timeline mappings, not inventing packet fan-out. [S6–S7]

### Smallest decisive probe
Feed a streaming playback output, a saved container, and a bounded excerpt/output interval from one demux producer. Initially use one common valid start so codec preroll does not confound the ownership experiment. Give consumers different legal time bases and end positions.

Compare each against a persistent independent implementation. Independently parse output packets and exercise playback, rather than requiring byte-identical container serialization. Clone packet wrappers before rescaling timestamps or allowing a muxer to consume them; never mutate the broker’s canonical packet.

### Controls and rejection conditions
Cancel an export, slow an output, finalize one output early, attempt a late subscriber outside retained coverage, seek playback elsewhere, and change one output’s time base. Preserve decoding timestamps, presentation timestamps, durations, configuration generations, and relevant side data.

A slow output cannot force unbounded retention. It must be paused, spilled through an explicitly qualified store, moved to an independent reader, or failed explicitly under a declared policy. It may not silently lose samples. A far-away seek can legitimately require another demux cursor. One output’s seek must not move the shared cursor behind other consumers.

### Cost accounting
Count reads, demux work, packet/property copies, mux work, retained unique payload allocations, spills, finalization, and playback deadlines. Compare against a well-implemented shared-packet/tee baseline and independent persistent contexts, not repeated process launches. No universal one-demux solution for unrelated seek positions is claimed.

## R335 — Recover the GPU presenter without reopening healthy decoders

**Status:** PROPOSED / NOT TESTED

**Proposal key:** `a246fb6ea7330c8dc6f9b8b354dc85a53e61eca8e83b71ad7b630aca72a435c0`

**Mechanism:** Treat presentation-device loss as its own recovery scope. Recreate device-bound presentation resources while retaining independently verified healthy audio and decoding state, within strict frame-retention limits.

**Initial scope:** One WebCodecs video path, a separately controlled audio clock, a WebGPU presenter, and test-injected presentation-device destruction. The initial contract permits a measured visible recovery gap and resumption at the current audio timeline.

**Acceptance contract:** No stale-device resources or stale-source frames are published; surviving audio is not unnecessarily restarted; recovery output has the correct frame/time/configuration. All missed presentation intervals are counted. Decoder survival is observed, never assumed.

**Relation to earlier work:** R67 (hibernation), R124/R323 (frame lifetimes), R221 (owned GPU resources). This narrows failure recovery rather than optimizing normal decoding.

### Hypothesis and evidence
WebGPU exposes GPUDevice.lost and requires resources created with a previous device to be recreated on the new one. The specification warns that after loss, many operations can appear to succeed without useful execution. A resolved queue operation is therefore not sufficient recovery evidence. [S8]

### Smallest decisive probe
Play identified frames and observable audio. In a test-only recovery mode, call device.destroy(), then request an appropriate fresh adapter/device, rebuild pipelines and textures, reconfigure the canvas, and reimport only still-valid frame resources.

Compare against a full player reopen with the same source and recovery policy. Retain at most a declared small number of VideoFrame references; continue enforcing the decoder-output budget. Check decoder progress, audio sample position, post-recovery picture identity, subtitle state, and presentation time.

Production shutdown is not a recovery request: test-only intentional destruction must not teach the product to respawn after ordinary teardown. A source seek or destroy during asynchronous recovery invalidates the old operation.

### Controls and rejection conditions
Exercise loss during upload, pipeline creation, readback, and a seek; a second loss during recovery; unavailable replacement device; independently failed decoder; and teardown while recovery is pending. A real GPU-process reset may invalidate more than the presenter, so the narrowly injected test cannot qualify every failure mode.

If decoder/resource health cannot be established, use the existing full recovery path. Do not deliberately induce driver crashes or memory exhaustion to demonstrate the idea.

### Cost accounting
Measure video-unavailable duration, audio discontinuity, extra source bytes and decode work, skipped displayed pictures, retained resources, and total recovery work. This is a resilience hypothesis, not a claim of seamless recovery or lower steady-state CPU. A frame-perfect mode would need a separate coordinated-pause contract.

## R336 — Reconstruct predictor-4 lossless JPEG with two-dimensional prefix sums

**Status:** PROPOSED / NOT TESTED

**Proposal key:** `403d6f6f34a0fdb8a14338d1074f726fea9abfe82cd1c31e0ef65834524eb543`

**Mechanism:** After independently parsing residuals from a qualified lossless-JPEG scan, reconstruct predictor-4 samples using modular row and column prefix sums, with the exact initial and boundary conditions.

**Initial scope:** Huffman-coded lossless JPEG (SOF3), one grayscale component, predictor selection 4, one scan, eight-bit precision initially, point transform zero, no restarts, no interlacing or reversible color transform. Higher precisions and restart layouts are separate extensions.

**Acceptance contract:** Exact residual values, exact reconstructed sample values and bit patterns after the same storage alignment, and correct malformed-input rejection within explicit resource bounds. No lossy approximation and no JPEG-LS claim.

**Relation to earlier work:** R164 (one-dimensional predictive scans), R218 (PNG filter scans), R232 (RAW development). This is a specific two-dimensional predictor identity.

### Hypothesis and evidence
For predictor selection 4, FFmpeg’s JPEG predictor macro uses left + above − upper-left. Its lossless-JPEG decoder separately handles the initial sample, first row/column, point transforms, and restarts. The pilot deliberately excludes the latter complications until the elementary identity is qualified. [S9a–S9b]

For an interior position, in the admitted sample modulus Q:

    r[i,j] = x[i,j] - x[i,j-1] - x[i-1,j] + x[i-1,j-1]  (mod Q)

With point transform zero, use Q = 2^b for b-bit sample values. Put the coded residuals into D and add the first-sample prediction seed 2^(b-1) to D[0,0]. In the no-restart, one-component pilot, the first-row/first-column rules give:

    x[i,j] = sum(D[a,c], a=0..i, c=0..j)  (mod Q)

Thus a row-wise inclusive prefix followed by a column-wise inclusive prefix is a candidate equivalent reconstruction. Integer masking and storage alignment must be explicit; saturation is not the same operation. Modular additions can be reduced at each step to keep intermediates bounded.

### Smallest decisive probe
Independently construct tiny images and legal predictor-4 residuals. Compare the direct sequential recurrence and two-pass reconstruction, first on the initial sample, first row, first column, and 2×2 boundaries; then on ramps, impulses, random samples, extreme differences, and non-power-of-two sizes.

Only after that oracle passes, parse actual SOF3 fixtures with a reference entropy decoder, then prototype CPU-parallel and GPU scans. Compare normalized sample planes and the reference decoder’s stored representation separately.

### Controls and rejection conditions
Reject other predictor selections, nonzero point transforms, unsupported component layouts, restarts, and color transforms at the first profile gate. Include malformed Huffman data, truncated residuals, invalid dimensions, excessive allocations, and scan-block boundaries. Do not reuse the two-pass proof for JPEG-LS.

### Cost accounting
Count Huffman parsing, residual-grid storage, CPU-to-GPU upload, both scans, any transposes/carry passes, final texture use or readback, and full image latency. The candidate does not remove entropy decoding. An optimized serial predictor can beat multiple memory passes, especially on small images. The source must actually use predictor 4; re-encoding inputs to create eligibility is a separately costed prepared-format experiment.

## R337 — Evaluate tone-curve statistics from an exact source histogram

**Status:** PROPOSED / NOT TESTED

**Proposal key:** `9b12cf0f5ee09f1916436e6a92ba10b0473e8d361d8942e9e654c589f284e0ee`

**Mechanism:** For an immutable sample plane and a declared pointwise integer lookup-table transform, compute candidate output histograms and aggregate statistics by mapping histogram counts instead of rendering and rescanning all samples.

**Initial scope:** One exactly represented 10-bit grayscale or luma-code plane, 1,024 source bins, one fixed ROI per histogram, and pointwise 10-bit integer output LUTs. No spatial filters, local tone mapping, cross-channel transforms, dithering, or temporal adaptation.

**Acceptance contract:** Exact output-bin counts, sample count, integer sums and squared sums where requested, and correctly defined threshold counts relative to a per-pixel application of the same LUT. Perceptual quality and full-color gamut are not inferred.

**Relation to earlier work:** R309/R316 (repeated analysis under changed settings), R310 (finite-domain processing). This keeps value multiplicities rather than mix relationships or processed pixels.

### Hypothesis and evidence
FFmpeg’s lut/lutyuv filters provide a concrete reference for a component-wise input-to-output lookup transformation. The proposal concerns statistics of many candidate transforms, not inventing LUT rendering or estimating a spatially dependent effect from a one-dimensional histogram. [S11]

Let H[v] count occurrences of source value v, and let L_theta(v) be one candidate’s fully specified integer output value. Then:

    H_theta[y] = sum(H[v] for v where L_theta(v) == y)
    sum_output = sum(H[v] * L_theta(v))

The same count weighting supplies squared sums and threshold counts. Pre-clamp clipping must be defined through the candidate’s pre-clamp rule; a final output value at the maximum alone does not prove the operation clipped an input.

### Smallest decisive probe
Build one exact histogram from an identified 10-bit plane, then evaluate many monotonic and nonmonotonic integer LUTs. Compare every output histogram against independently applying each LUT to every source sample. Check all source values, constant planes, unmapped bins, threshold ties, limited/full-range interpretation, changed ROIs, changed frame identities, and accumulator limits.

For quantitative queries, maintain sufficiently wide counters and products. Distinguish exact integer totals from the subsequent rounding of averages or percentiles. The initial 1,024-bin count array needs 8 KiB at eight bytes per counter, excluding object and metadata overhead; that is an arithmetic size calculation, not a measured allocation.

### Controls and rejection conditions
Use two spatially different planes with the same histogram as a deliberate limitation test. Their allowed statistics match, but the method cannot locate highlights, assess edge artifacts, or judge where clipping happened. It does not predict RGB gamut clipping from luma counts, nor simulate local tone mapping.

A newly decoded frame, different ROI, changed pre-LUT processing, or spatial/temporal effect invalidates reuse. The histogram is bound to the exact sample representation and source generation.

### Cost accounting
Count the initial full-plane scan, histogram readback/storage, LUT construction, candidate-bin evaluation, and actual repeated-query count. Compare against an optimized GPU histogram and per-pixel reference. The benefit requires enough queries over reused input to repay construction. Rendering the chosen picture is still required; this only avoids trial renders done solely for permitted aggregate statistics.

## Suggested investigation order

Start with R332's destination/framing gate, R333's existing-path trace, and R337's exact numerical comparison. Investigate R334 and R335 as ownership/lifecycle tasks, with failure tests before performance claims. R336 merits a tiny algebraic oracle first, but a fair integrated performance judgment requires the actual parsing, transfer, and reconstruction pipeline.

This ordering is an engineering judgment about cheap falsification and integration work, not a measured ranking of speedups. The six hypotheses are independent; none depends on another card being reported as successful.

## Primary source register

Reviewed on 18 September 2026. Pinned FFmpeg files are implementation references, not a claim that Demuxe uses that revision. Rolling specifications/documentation must be matched to the eventual tested build. No excerpts are reproduced as benchmark evidence.

- **S1 — VP9 WebCodecs registration.** Chunk framing, key-frame definition, and codec-description behavior. https://www.w3.org/TR/webcodecs-vp9-codec-registration/
- **S2 — FFmpeg bitstream-filter documentation.** `vp9_superframe` and `vp9_superframe_split`. https://ffmpeg.org/ffmpeg-bitstream-filters.html
- **S3 — FFmpeg n7.1.1 VP9 superframe splitter.** Validation, referenced payloads, and invisible-picture PTS handling. https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/bsf/vp9_superframe_split.c
- **S4 — FFmpeg n7.1.1 MPEG-1/2 decoder.** Progressive-picture, repeat-first-field, and derived repetition metadata. https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/mpeg12dec.c
- **S5 — FFmpeg n7.1.1 AVFrame.** `repeat_pict` meaning and timing-authority qualification. https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavutil/frame.h
- **S6 — FFmpeg formats documentation.** Tee, FIFO options, and direct multi-mux libavformat use. https://ffmpeg.org/ffmpeg-formats.html
- **S7 — FFmpeg n7.1.1 AVPacket.** Refcounted payload ownership, packet cloning, side data, and writable copies. https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/packet.h
- **S8 — WebGPU editor source.** `GPUDevice.lost`, resource recreation, and post-loss observability limits. https://raw.githubusercontent.com/gpuweb/gpuweb/main/spec/index.bs
- **S9a — FFmpeg n7.1.1 JPEG definitions.** SOF3 and predictor selection 4. https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/mjpeg.h
- **S9b — FFmpeg n7.1.1 JPEG decoder.** Initial/boundary prediction, point transform, restart handling, and stored sample alignment. https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/mjpegdec.c
- **S10 — WebCodecs.** Encoded chunks, decoded-frame lifetimes, and decoder/resource behavior. https://www.w3.org/TR/webcodecs/
- **S11 — FFmpeg filters documentation.** Component-wise `lut`, `lutrgb`, and `lutyuv` operations. https://ffmpeg.org/ffmpeg-filters.html
