# Demuxe — R343–R347 research proposals

**Status: PROPOSED / NOT TESTED. Prepared 19 September 2026.**

This pass reviewed public specifications and implementation sources and developed experiment designs. It did not run media tests, browser probes, benchmarks, or production builds, and did not edit the Demuxe repository. Source support for a primitive does not qualify a complete route. References establish building blocks, not measured improvements or industry novelty.

These cards continue the visible R338–R342 batch. Preserve each ID together with its title, source profile, output contract, and test assertions. Distinguish a component proof, a functioning browser destination, a matching Wasm implementation, and complete-player qualification.

## R343 — Unwrap AAC-LATM into a browser-decoded audio route

### Hypothesis and mechanism
A source classified as AAC-LATM may contain ordinary AAC access units whose transport framing, rather than their audio coding, prevents the desired destination from accepting them. Parse LOAS/LATM, recover AudioSpecificConfig and the selected payload units, and send a qualified raw-AAC representation to WebCodecs or a separately qualified MP4/MSE construction.

FFmpeg's pinned LATM implementation separates stream configuration and payload-length parsing from AAC reconstruction. The AAC WebCodecs registration expects ADTS or raw AAC; supplying AudioSpecificConfig selects the raw-AAC representation. [S1, S2]

The first candidate is a small transport adapter, not a different AAC decoder. Repack unaligned payload bits correctly; this is not necessarily a fixed header removal or a zero-copy slice. Account for source-specific padding and preserve meaningful AAC syntax.

### Initial profile
Finite, clear LOAS/LATM; audioMuxVersion 0; one program, one layer, one payload subframe per element; supported variable-length payload framing; AAC-LC with fixed sample rate and standard channel configuration. Begin without extension tools, additional programs/layers, ancillary data, or configuration CRCs. The parser must explicitly reject out-of-profile syntax rather than copy a reference implementation's unsupported-field shortcuts.

### First decisive experiment
Start from known AAC access units, package them into the admitted LATM profile, then extract them with an independently checked adapter. Compare payloads/configuration against the known input, then compare continuous decoded PCM through the same reference AAC implementation. Finally test actual WebCodecs and MP4/MSE output independently, with truthful timing, trimming, sample counts, and EOF handling.

Keep the native video path unchanged in a subsequent A/V integration pilot. First establish a real destination difference: the actual existing bridge fails or performs avoidable software reconstruction, while the adapted route produces the complete requested output. Audit existing normalization before adding a new component.

### Negative controls and boundaries
Test reuse of a prior mux configuration, missing initial configuration, length overflow, payloads crossing input-buffer boundaries, non-byte-aligned payloads, truncation, midstream configuration changes, and unsupported programs/layers. Unknown configuration cannot be inferred from a plausible first audio frame.

Recovering initialization information does not recreate a lossy decoder's history. The AAC registration expressly distinguishes accepted packet entry from expected audio output. Arbitrary sample-exact midstream cuts are not covered. [S2]

### Cost and rejection
Include configuration parsing, payload repacking, muxing, browser dispatch, startup, seeks, and A/V synchronization. Compare against a persistent optimized software or existing packet-copy path, not repeated FFmpeg process launches. Reject if normalization already exists, the browser rejects the actual AAC configuration, or adaptation costs more without adding capability.

**Distinct from R31/R332:** codec-payload extraction from stateful LATM transport, not merely choosing a container or splitting VP9 aggregate packets.

## R344 — Seek through APNG by resolving the last writer of each region

### Hypothesis and mechanism
A requested animation frame need not require reconstructing every earlier frame when later operations completely replace their contributions. Walk a validated animation-operation index backward, identify which source rectangles supply the target canvas, and decode only the contributing images.

APNG distinguishes region replacement (SOURCE), alpha compositing (OVER), and disposal operations. Its frame payloads form per-frame compressed image datastreams with inherited image properties. [S3]

Start with SOURCE plus NONE disposal. Maintain an unresolved-region set, initially the complete requested canvas. Walking backward, a frame contributes only where its rectangle intersects the unresolved set; those intersections are assigned to that frame and removed from the set. Remaining regions at the beginning are transparent black. A transparent SOURCE pixel still replaces earlier contents; opacity is not required for this initial rule.

### Initial profile
Non-interlaced eight-bit RGBA APNG; SOURCE blending; NONE disposal; supported shared color metadata; validated frame dimensions, positions, sequence numbers, and durations. Target the completed canvas before the target frame's disposal. Do not initially include OVER, BACKGROUND, or PREVIOUS disposal.

### First decisive experiment
Author an animation with repeated overwrites of different rectangles. Compare full replay, a bounded checkpoint implementation, and backward dependency resolution under the same retained-memory budget. Require sample-exact target canvases and identical subsequent playback when continuing from a complete recovered canvas.

Create standalone PNG views for selected frame payloads only through a validated reconstruction of dimensions and inherited properties. Decoder capability and pixel access are separate gates. Resolving a small contributing region does not prove the selected image decoder reconstructs only that region; initially count every selected frame image as fully decoded.

### Negative controls and boundaries
Exercise overlapping rectangles, transparent SOURCE pixels, a default image not belonging to the animation, tiny rectangles producing fragmented region sets, zero-delay policy, seeks at boundaries, and loop restart. Introduce OVER and PREVIOUS operations as rejection cases before separate extensions exist.

Indexing may still require substantial input reading and structural validation. Do not report source-I/O savings merely because fewer image reconstructions occur. Missing or malformed metadata cannot be skipped on the assumption that its pixels are invisible.

### Cost and rejection
Count index preparation, geometric work, selected-image construction, decoding, composition, retained metadata, and continuation. Cap region fragmentation and fall back to replay/checkpoints when the plan becomes expensive. Reject when almost all prior images contribute, or the existing decoder/checkpoint path already matches the result more cheaply.

**Distinct from R156/R132:** eliminate overwritten history at the animation-composition layer; do not prune video-codec reference pictures or merely preserve sparse updates during normal forward playback.

## R345 — Stack PNG images by joining their compressed scanline streams

### Hypothesis and mechanism
For eligible equal-width PNGs, build a vertically stacked image without a conventional pixel decode–compose–encode pipeline. Preserve each source's filtered scanline sequence and form one legal compressed datastream representing their concatenation.

DEFLATE supplies independently described blocks with a last-block marker and dictionary-referenced payloads. Zlib's gzjoin demonstrates joining compressed streams without recompression, but its implementation still decompresses input to locate splice boundaries. That distinction is central: no recompression and no decompression are separate hypotheses. [S4, S5]

### Initial profile
Non-interlaced eight-bit grayscale PNGs, equal width, matching color/interpretation metadata, standard zlib compression without preset dictionaries. Every image after the first must have a verified first scanline using None or Sub filtering, so that its reconstruction does not depend on the final row of the preceding image. Other source rows may use admitted normal filters. Start with small images and fixed-Huffman blocks, then extend to mixed/stored/dynamic blocks separately. [S3]

### First decisive experiment
First implement a reference splice that avoids image unfiltering, composition, and re-encoding, even if it uses normal inflation to discover block boundaries. Independently compare both its inflated filtered bytes and decoded image samples with the expected concatenation.

Then investigate a token-walking construction that reads Huffman symbols and lengths/distances but does not expand every dictionary copy. It must preserve the original compressed tokens, modify termination/framing correctly, and align the next stream legally. Empty alignment blocks can avoid arbitrarily shifting an entire following stream, but their exact serialization must be validated.

Select a truthful zlib header/window size, combine Adler-32 checksums using correct uncompressed lengths, and generate new PNG chunk CRCs and dimensions. The zlib API exposes Adler checksum combination. It does not validate the inputs merely because a combined checksum can be calculated. [S6]

### Negative controls and boundaries
Reject a lower image whose first row depends on an above row; do not repair that by changing only its filter byte. Test incorrect source lengths, corrupted payloads, bad code trees, unsupported dictionaries, mixed block types, byte-boundary cases, incompatible metadata, and oversized combined dimensions.

Validate backward distances relative to each original stream's own output history. An invalid reference at the beginning of a source must not become accidentally accepted merely because the combined stream has preceding data available.

Maintain the same source-integrity policy as the baseline. A no-expansion parser cannot claim it independently verified a supplied decoded-data checksum without doing the required work. Use verified fixture inputs first, and account separately for reusable prior integrity evidence versus fresh validation.

### Cost and rejection
Compare against ordinary separate browser image decodes and an optimized decode–stack–encode implementation, including splice parsing, checksum work, extra output bytes, final decoding, extraction of individual views, and peak memory. This is prepared-preview batching, not a new universal PNG playback default. Avoid cross-image sampling bleed when presenting cropped views.

A browser still reconstructs all pixels in the final atlas. Fewer image-decoder calls alone are not a win. Reject if token walking approximates the cost of ordinary inflation, if the tall atlas exceeds useful limits, or if assembly/latency outweighs saved work.

**Distinct from R182:** compressed-stream concatenation plus PNG predictor-boundary eligibility, not JPEG restart-interval permutation.

## R346 — Turn Paeth prediction into composable byte-state maps

### Hypothesis and mechanism
Paeth reconstruction is nonlinear, but for a known previous row and known filtered bytes its unknown horizontal state is only one byte per byte-position chain. Represent a row chunk by its exact mapping from incoming reconstructed byte to outgoing reconstructed byte.

Libpng provides the reference Paeth tie-breaking and byte reconstruction implementation. Preserve its exact predictor arithmetic and modulo-256 output, not a saturated or approximate variant. [S7]

For fixed above byte b_i, above-left byte c_i, and filtered byte r_i:

    f_i(l) = (Paeth(l, b_i, c_i) + r_i) mod 256

A chunk transition T is the composition of its f_i functions and can be represented by 256 output values, one for each possible input state. For consecutive chunks A and B:

    T_AB[l] = T_B[T_A[l]]

Function composition is associative, including when the maps contain wraparound and discontinuities. The dense mapping is exact; it does not depend on monotonicity or floating-point approximations.

### Initial profile
Non-interlaced eight-bit grayscale PNG, one Paeth-filtered row, known correct previous row and row-entry boundary. Leave decompression unchanged. Later extend to multiple rows, preserving their dependencies; ordinary image boundaries retain the reference rule.

### First decisive experiment
Construct each chunk's transition map, prefix-compose maps to find actual incoming states, then reconstruct chunks independently from those states. First test all 256 incoming states for short chunks and compare every produced output and terminal state against an independent sequential implementation.

Use predictor ties, byte wraparound, extreme above-row values, awkward chunk lengths, and an incorrect previous row as controls. Then compare complete PNG output. An exact compact representation of maps can be investigated only after the dense reference is established; never merge nearly equal mappings.

### Cost and rejection
The large risk is total work. Constructing maps for every possible state can perform far more predictor evaluations than normal decoding. Include map generation, map storage, composition, local reconstruction, previous-row readiness, dispatches, and transfers. A 256-entry byte map has 256 bytes of logical payload, but GPU alignment/representation may use more.

Do not allocate a full map per image byte by default. Bound chunking and temporary storage. Reject early if even a favorable cost model cannot beat optimized libpng/SIMD or a strong GPU wavefront baseline. Multiple rows remain dependent; a row-level scan is not permission to decode every row concurrently.

**Distinct from R218/R317:** exact finite-domain composition for the Paeth filter, without assuming linearity or a compact real-valued piecewise curve. It extends the PNG filter coverage intentionally excluded from R218.

## R347 — Morph convolution effects using reusable basis outputs

### Hypothesis and mechanism
A declared family of time-varying convolution filters can be generated from a small number of fixed basis filters. Reuse their continuously processed or cached outputs, then apply output-time weights instead of repeatedly rebuilding filter kernels and their histories.

For fixed impulse responses h_i and declared output-time weights w_i[n]:

    h_n[k] = sum_i w_i[n] h_i[k]
    z_i[n] = sum_k h_i[k] x[n-k]
    y[n] = sum_i w_i[n] z_i[n]

Expanding the sums gives the same output as direct time-varying convolution with h_n in exact arithmetic. This defines one specific automation contract, not all possible notions of changing a room or filter over time.

Web Audio's ConvolverNode is a linear-convolution primitive; its specification warns that replacing an impulse-response buffer can glitch and discusses crossfading separate nodes. A persistent, correctly initialized convolver bank is therefore a mandatory baseline, not a newly invented crossfade technique. [S8]

### Initial profile
One finite mono source; two fixed equal-rate impulse responses with known delay conventions; normalization disabled or explicitly fixed; no nonlinear stage between basis filtering and combination. Arbitrary finite weight sequences are allowed under the output-time contract. Begin with precomputed basis outputs and then evaluate bounded streaming/caching as a separate extension.

### First decisive experiment
Compare direct evaluation of h_n, a persistent optimized dual-convolver construction, and cached basis outputs over repeated automation edits. Require identical sample counts, timing, complete tails, and a declared numerical tolerance to a higher-precision reference.

Place an impulse before a weight change and compare its continuing tail afterward. Moving weights to the input side would use w_i[n-k] rather than w_i[n] and generally gives a different result; include that incorrect construction as a negative control.

### Boundaries and cost
This does not represent arbitrary impulse responses outside the chosen basis. Do not silently approximate them or alter the requested effect to fit the optimization. Normalizing each newly mixed impulse response is not generally equivalent to separately normalizing the basis responses; hold that policy fixed.

A basis branch with zero current weight may still need its historical state if it later becomes audible. It cannot be restarted cold without the required warm-up, checkpoint, or precomputed history. Tie caches to the source, complete processing recipe, sample coordinate system, and numeric implementation.

Count initial basis filtering, retained output bytes, additional active convolvers, automation evaluation, cache misses, and seeks. A single fixed-filter session may do extra work with no benefit. The strongest initial use is repeated effect-preview or automation editing over the same bounded material. Compare against an existing optimized morphing implementation; if it already performs the same work, close as already handled.

**Distinct from R304/R219:** preserve time-varying coefficient semantics and pre-existing tails while reusing complete basis outputs across automation changes, rather than just factoring a fixed multichannel bank or sharing a forward transform.

## Suggested first gates

| ID | Initial qualification effort | First inexpensive decision | Larger integration risk |
| --- | --- | --- | --- |
| R343 | Small transport/parser pilot | Does a real LATM-to-raw-AAC destination gap exist? | Bit alignment, initialization changes, exact A/V timing |
| R344 | Moderate metadata/planner pilot | Does backward overwrite analysis discard many prior images? | Region fragmentation, compositing/disposal correctness |
| R345 | Substantial compressed-format work | Do admitted fixtures splice correctly with a reference inflater? | No-expansion parsing, seam rules, checksum/integrity handling |
| R346 | Small mathematical oracle; substantial acceleration work | Are exact state maps affordable enough to pursue? | Extra work, row dependencies, GPU synchronization |
| R347 | Moderate DSP/reference pilot | Do repeated automation queries repay basis preparation? | Tail history, cache storage, numeric and normalization semantics |

These are engineering judgments, not measured speed or success rankings. Prefer R343 and R344 for initial practical qualification. Keep R345 and R346 behind their cheap structural/algebraic gates before building accelerated implementations.

## Source register

[S1] FFmpeg n7.1.1 AAC LATM implementation. Stream configuration parsing, payload-length handling, configuration reuse, and entry to AAC reconstruction.
`https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/aac/aacdec_latm.h`

[S2] AAC WebCodecs Registration. ADTS versus raw AAC, AudioSpecificConfig, and the distinction between decodable input entry and expected audio output.
`https://www.w3.org/TR/webcodecs-aac-codec-registration/`

[S3] W3C PNG Specification, Third Edition. APNG frame structure, blend/disposal rules, frame-data streams, row filtering, compression, and metadata inheritance.
`https://www.w3.org/TR/png-3/`

[S4] RFC 1951: DEFLATE. Last-block flag, stored/fixed/dynamic blocks, bit packing, and length/distance history.
`https://www.rfc-editor.org/rfc/rfc1951.html`

[S5] zlib gzjoin example. Explicitly demonstrates no-recompression joining while still decompressing input to discover boundaries; not a ready-made no-expansion PNG merger.
`https://raw.githubusercontent.com/madler/zlib/master/examples/gzjoin.c`

[S6] zlib manual: adler32_combine. Combines checksums from their values and the appended sequence length; does not itself authenticate or validate inputs.
`https://zlib.net/manual.html`

[S7] libpng pngrutil.c. Paeth row reconstruction, tie-breaking, byte arithmetic, and existing optimization hooks.
`https://raw.githubusercontent.com/pnggroup/libpng/libpng16/pngrutil.c`

[S8] Web Audio API: ConvolverNode. Linear convolution, effect tails, normalization, buffer replacement, and crossfade guidance.
`https://www.w3.org/TR/webaudio/`

Rolling specifications and moving source branches are leads; pin versions and record actual runtime configurations before execution. No claim is made that any target browser exposes all required APIs or accepts the proposed media profiles.
