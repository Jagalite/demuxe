# Demuxe: More Media Routing, Muxing and Browser Possibilities

**R102–R115 · 17 September 2026 · 14 proposals · NOT TESTED**

This pass reviewed prior research and primary specifications/source and designed experiments. It generated no media fixtures, ran no playback or benchmarks, and changed no production source or repository.

The unit of research is the media representation and browser execution path, not the current Demuxe architecture. A standard primitive can support a useful new experiment even when the complete pipeline is not yet known to work. New means additional to this research series, not industry novelty.

## Experiment map

| ID | Question | Type | First priority |
|---|---|---|---|
| R102 | Use verbatim FLAC as a lightweight integer-PCM carrier | New transport construction | P1 |
| R103 | Join, split or reorder independent FLAC channel subframes | Compressed-audio surgery | P1 |
| R104 | Select or assemble whole Opus elementary streams without PCM | Compressed-audio routing | P1 |
| R105 | Build a single HEVC mosaic from compatible compressed streams | Compressed-video composition | P1 |
| R106 | Recall stored AV1 pictures with coded display instructions | Prepared temporal representation | P2 |
| R107 | Separate AV1 base decoding from film-grain reconstruction | Video reconstruction component | P2 |
| R108 | Crop or transform MJPEG in the coefficient domain | Compressed-image/video transformation | P1 |
| R109 | Expose an edited MP4 as a virtual byte-range URL | New native-source construction | P1 |
| R110 | Choose a destination-aware lacing or unlacing representation | Container-specific routing | P2 |
| R111 | Factor repeated fMP4 sample metadata into defaults | Mux metadata optimization | P2 |
| R112 | Supply known WebM durations to prevent parser holdback | Chrome-specific mux/timing experiment | P1 |
| R113 | Carry full-resolution color planes through a 4:2:0 video decoder | Prepared representation experiment | P2 |
| R114 | Use WebRTC native media reception as a packet-copy destination | Alternative browser media route | P2 |
| R115 | Play an ongoing fMP4 response through one native URL | Progressive native-source experiment | P1 |

Recommended first probes: **R102 → R103 → R104 → R108 → R112**. These are information-value judgments, not measured rankings.

The larger route questions are R105, R109, R114 and R115. R106, R107 and R113 explore new prepared or reconstructed representations. R110 and R111 may resolve to narrow parser/metadata improvements rather than large speedups.

## Shared evidence boundary

- Distinguish source-preserving transforms from prepared/re-encoded representations and intentional output changes.
- Keep native file, MSE, WebCodecs, image, and WebRTC destinations separate; qualify the exact codec/configuration on the exact build.
- Use permitted origins and authorized clear media. Do not bypass browser administration, CORS or source authorization.
- Separate metadata/payload validity, decoded sample identity, observed browser output, and physical device behavior.
- Measure the entire changed pipeline against a strong equivalent baseline; include preparation, waiting, copying and reconstruction.
- Respect bounded allocations and lifetimes; malformed inputs must fail without oversized allocations or unbounded scans.
- Source inspection and unavailable APIs are not successful playback. Mark NOT_TESTED, BLOCKED and FAILED distinctly.

## Source findings that shape this batch

The current Chromium WebMClusterParser source rejects lacing, so R110 does not claim that laced MSE is supported. Its missing-duration holdback supplies the concrete hypothesis for R112. Opus timing is already parsed from its codec packets in that path, making Opus a useful no-benefit control. [S11]

The MP4 run iterator accepts inherited defaults but still expands per-sample metadata internally. R111 therefore distinguishes reduced wire bytes from browser memory savings. [S12]

AV1 reference-picture redisplay has showability, validity and special keyframe constraints. R106 must not be constructed by blindly replaying AVIF keyframes. [S5]

GPAC merging/splitting capabilities are not proof that an input was encoded with independent motion constraints. R105 requires a real decoded-region oracle. [S3, S4]

## R102 — Use verbatim FLAC as a lightweight integer-PCM carrier

**PROPOSED / NOT TESTED**

**Type:** New transport construction. **Priority:** P1.

**Question.** Can an integer-PCM producer reach the native FLAC destination with a much simpler formatter than a general compressor?

**What differs from earlier work.** R71 changed FLAC encoder effort and R74 removed a staging copy. This deliberately bypasses compression search, while still writing a standards-conforming FLAC stream.

**Mechanism.** PCM -> verbatim FLAC subframes + frame headers/checksums -> qualified FLAC container -> browser audio decoder. This is still encoding/framing, but no predictor search or Rice residual coding is needed for verbatim subframes.

**Initial source profile.** Start with 48 kHz mono/stereo S16. Add S24 only as a separately verified format; do not silently quantize float PCM.

**Source basis.** FLAC defines a subframe that carries uncompressed integer samples and specifies its frame structure. [S1]

**Smallest decisive experiment.**

1. Write a bounded formatter for controlled PCM blocks; validate each frame against an independent decoder.
2. Compare direct FLAC and an already-qualified FLAC-in-MP4 MSE destination separately.
3. Compare against FLAC levels 0 and 5 at matched block duration, and raw-PCM output where available.

**Comparison baseline.** Equal-sample, equal-latency ordinary FLAC encoding, plus the strongest available direct PCM route.

**Correctness checks.**

- Full decoded PCM hashes match the input, including extrema, silence, tail and channel order.
- Frame numbering, sample counts, CRCs and stream metadata remain valid after seek and truncation controls.
- Actual browser audio and EOF are observed; decoded-file equality is not a speaker-output guarantee.

**Measurements.**

- Formatter plus container CPU, first usable audio, output byte size, full browser decode CPU and memory.
- Cost of packing/interleaving and checksums; do not time only predictor search removal.

**Stop conditions and limits.**

- Expect a bandwidth/storage penalty against compressible audio.
- A smaller implementation is not necessarily a faster complete pipeline.
- Do not generalize this integer construction to float-preserving audio.

**First environment.** Native formatter/oracle; direct Chrome audio and window MSE pilot; normal-origin integration later.

**References:** [S1].

## R103 — Join, split or reorder independent FLAC channel subframes

**PROPOSED / NOT TESTED**

**Type:** Compressed-audio surgery. **Priority:** P1.

**Question.** Can a requested channel selection or synchronized channel assembly be produced without reconstructing all PCM samples?

**What differs from earlier work.** Unlike R61, no PCM channel matrix is executed. Unlike packet-copy remux, this operates on coded channel subframes inside each FLAC frame.

**Mechanism.** Parse the bit boundaries of independent channel subframes, preserve their coding bits, and rebuild the frame/channel metadata, alignment and checksums.

**Initial source profile.** Independent-channel FLAC only; matching sample rate, effective depth, block boundaries and source sample positions. Start with two mono inputs and a four-channel independently coded input.

**Source basis.** FLAC has per-channel subframes; stereo may instead use dependent mid/side forms, and subframes are not necessarily byte-aligned. [S1]

**Smallest decisive experiment.**

1. Assemble two synchronized mono streams into stereo, then extract/reorder whole independent channels from a multichannel stream.
2. Audit that copied subframe bits are unchanged.
3. Exercise a mid/side stereo file as a rejection control, not as another independent-channel success.

**Comparison baseline.** Decode all channels, select/interleave, and re-encode losslessly.

**Correctness checks.**

- Compare every requested output sample to the corresponding full-decode source channel.
- Repair frame/stream metadata and checksums; never retain the old whole-stream checksum after channel changes.
- Validate final short blocks and reject mismatched boundaries before publishing output.

**Measurements.**

- Parsing/reframing CPU, bytes touched, first output delay, output size and browser behavior.

**Stop conditions and limits.**

- Parsing variable-length residuals may still require scanning substantial coded data; no constant-time claim.
- No downmixing, source separation, resampling or arbitrary frame-boundary conversion.
- Speaker layout signaling must truthfully describe the requested output.

**First environment.** Host bitstream prototype and independent FLAC decoder, followed by exact Chrome destination probes.

**References:** [S1].

## R104 — Select or assemble whole Opus elementary streams without PCM

**PROPOSED / NOT TESTED**

**Type:** Compressed-audio routing. **Priority:** P1.

**Question.** Can a multistream Opus asset expose a selected independent stream, or can aligned streams be assembled into a supported multichannel presentation without re-encoding?

**What differs from earlier work.** R93 changed temporal packet grouping. This changes which independently coded mono/stereo streams are carried and how their channels are mapped.

**Mechanism.** Parse self-delimiting component packets, retain chosen whole elementary streams, and author the new multistream framing and channel mapping.

**Initial source profile.** Known channel mapping; complete mono streams or coupled stereo pairs; matching time origin, pre-skip, effective output gain and per-packet duration.

**Source basis.** The Ogg Opus mapping places equal-duration component Opus packets in one logical packet, with explicit stream/channel mapping. [S2]

**Smallest decisive experiment.**

1. Build an independently identifiable multistream fixture, extract one whole mono stream and one whole coupled pair.
2. Assemble a small aligned multichannel control with valid mapping.
3. Compare original component payloads and decoded selected samples before checking native Ogg/WebM/MP4 destinations separately.

**Comparison baseline.** Full multistream decode, channel selection, and new encoding; also original playback with a supported channel API.

**Correctness checks.**

- Component compressed frames remain intact after removing/adding self-delimiting framing.
- Trim, channel identities and gain match the original selected output.
- No loss of one half of a coupled pair under a purported no-decode operation.

**Measurements.**

- Container and coded payload bytes, CPU, decoder activity and start/seek behavior.

**Stop conditions and limits.**

- Selecting channels is not mixing them or recovering vocals from a stereo mix.
- Mismatched encoder delay or gain prevents simple assembly.
- Format-valid mapping does not guarantee browser support.

**First environment.** Host Opus parser/oracle first, then browser native destinations.

**References:** [S2].

## R105 — Build a single HEVC mosaic from compatible compressed streams

**PROPOSED / NOT TESTED**

**Type:** Compressed-video composition. **Priority:** P1.

**Question.** Can several synchronized, suitably constrained HEVC inputs become one coded mosaic?

**What differs from earlier work.** R98 prepared a new atlas encode. This asks whether suitable coded regions can be merged into one decoder input without pixel composition and re-encoding.

**Mechanism.** Combine compatible coded regions into a motion-constrained tiled HEVC stream by rebuilding parameter/slice geometry around retained coded tile data.

**Initial source profile.** Start with equal, coding-unit-aligned dimensions, matching timing/GOP/configuration, and proven motion constraints. Do not accept arbitrary unrelated HEVC files.

**Source basis.** GPAC supplies hevcmerge and tile split/aggregation tools. Strict configuration validation is optional in the merger and should be enabled; the splitter does not establish motion independence. [S3, S4]

**Smallest decisive experiment.**

1. Use two controlled synchronized inputs, merge with strict checks, and validate the resulting HEVC syntax and reference behavior.
2. Compare reconstructed tile planes with the separate input decodes.
3. Probe browser HEVC support first, then direct/MSE playback and seeks into later GOPs.

**Comparison baseline.** Separate decoder outputs composed at display time, plus pixel-compose-and-re-encode atlas preparation.

**Correctness checks.**

- No reference motion/filter contamination crosses newly introduced boundaries.
- Geometry, timestamps, per-region frame identity and final duration match.
- Negative controls include mismatched SPS/PPS, frame times and non-independent motion.

**Measurements.**

- Preparation CPU, retained coded payload, output size, browser decoder resources and full presentation cost.

**Stop conditions and limits.**

- A decoder accepting the stream does not prove seam correctness.
- Parameter/slice rewriting means whole packets need not be byte-identical.
- Host merging success is separate from Chrome HEVC and physical-hardware qualification.

**First environment.** GPAC/HEVC reference decoder and controlled input preparation; browser platform with admitted HEVC profile.

**References:** [S3], [S4].

## R106 — Recall stored AV1 pictures with coded display instructions

**PROPOSED / NOT TESTED**

**Type:** Prepared temporal representation. **Priority:** P2.

**Question.** Can a small repeating image sequence use little new coded picture data when revisiting earlier pictures?

**What differs from earlier work.** R96 held a picture for a long duration; R85 cached decoded frames in application memory. This explores nonconsecutive reuse through the codec reference-picture mechanism itself.

**Mechanism.** Prepare valid showable non-key reference pictures, preserve their slots, and author temporal units using show_existing_frame to display them later.

**Initial source profile.** Tiny fixed-geometry AV1 sequence with a bounded dictionary and explicit reset/random-access epochs; no film grain initially.

**Source basis.** AV1 defines stored-picture output, reference validity and showability. A stored KEY_FRAME has a specific one-use rule for this mechanism, so blindly reusing AVIF keyframes is not valid. [S5]

**Smallest decisive experiment.**

1. Create a reference-decoder-validated A/B/A/C/B/A sequence with explicit reference tracing.
2. Mux compliant temporal units and compare direct Chrome AV1 playback with the oracle.
3. Seek by rebuilding the required reference state from a valid random-access point.

**Comparison baseline.** A normal reference-aware AV1 encoding of the same sequence, not merely an artificially inefficient all-keyframe baseline.

**Correctness checks.**

- Every output picture and timestamp matches the requested schedule.
- No reference is overwritten before its last planned reuse; invalid/missing-slot cases are rejected.
- Restart and seek reproduce the dictionary state rather than displaying stale slots.

**Measurements.**

- Coded bytes, genuinely reconstructed pictures, decoder CPU and retained resource cost.

**Stop conditions and limits.**

- The codec has a bounded reference store, not an arbitrary asset cache.
- Display instructions still incur parsing, scheduling and presentation work.
- Existing encoders may already exploit similar references; no guaranteed improvement.

**First environment.** AV1 syntax/reference-decoder harness, followed by native Chrome or a permitted secure WebCodecs environment.

**References:** [S5].

## R107 — Separate AV1 base decoding from film-grain reconstruction

**PROPOSED / NOT TESTED**

**Type:** Video reconstruction component. **Priority:** P2.

**Question.** Can base decoding stay browser-owned while grain is omitted explicitly or reproduced by a separate verified component?

**What differs from earlier work.** Unlike the HDR gain-map proposal, this uses a reconstruction stage already represented in a real codec.

**Mechanism.** Parse original per-frame grain state, write a valid grain-disabled coded stream without changing tile image data, retain resolved grain parameters in a sidecar, then optionally synthesize grain on decoded output.

**Initial source profile.** Known AV1 grain-enabled fixtures with an independent pre-grain and post-grain reference. Begin with one simple 8-bit profile.

**Source basis.** AV1 separates reconstructed intermediate pictures from output grain synthesis and specifies both reference-exact and other allowed grain implementations. [S6]

**Smallest decisive experiment.**

1. First verify the rewritten stream yields the reference nongrain planes and unchanged subsequent reference-dependent pictures.
2. Treat grain-off as an explicitly changed presentation.
3. Add separately verified reconstruction and compare against one fixed reference grain algorithm before timing.

**Comparison baseline.** Ordinary native AV1 grain-enabled decode, plus a reference software decode with controlled grain behavior.

**Correctness checks.**

- Correct seeds, inherited parameters, timestamps, chroma/range rules and seek state.
- Rewriting uses actual syntax parsing; toggling one bit without rebuilding affected syntax is not accepted.
- Exactness is checked against the selected reference algorithm, not assumed across all conformant decoders.

**Measurements.**

- Parser/sidecar cost, decoder and reconstruction cost, memory traffic, quality and total frame latency.

**Stop conditions and limits.**

- Grain-off is not visually lossless.
- A platform may already synthesize grain efficiently; external synthesis can be worse.
- Do not turn a source rewrite into an unsupported claim that WebCodecs offers a grain-disable switch.

**First environment.** AV1 parser/reference oracle; permitted browser output and graphics API; physical GPU for efficiency claims.

**References:** [S6].

## R108 — Crop or transform MJPEG in the coefficient domain

**PROPOSED / NOT TESTED**

**Type:** Compressed-image/video transformation. **Priority:** P1.

**Question.** Can an existing MJPEG source expose only a requested aligned region without a full decode/re-encode round trip?

**What differs from earlier work.** R63 delegated JPEG image decoding and R64 decoded lower-resolution previews. This reduces or transforms the coded image before pixel reconstruction.

**Mechanism.** Operate on JPEG DCT coefficients with a jpegtran-style crop/rotation/flip, then use the browser image-decoder path for the resulting packets.

**Initial source profile.** Simple DCT-based JPEG/MJPEG frames with controlled geometry; crop origins aligned to the required iMCU grid. Start with grayscale or simple subsampling.

**Source basis.** libjpeg-turbo documents coefficient-domain transformations, perfect-transform checks and crop alignment. Entropy decode/recode remains work. [S7]

**Smallest decisive experiment.**

1. Produce an aligned smaller region from each frame and compare coefficient content with the original region.
2. Decode both via a fixed reference and the browser image path.
3. Compare crop-once/reuse and per-play cropping against full JPEG decode plus display crop.

**Comparison baseline.** Native/image decode plus CSS/shader crop for presentation-only tasks; full pixel decode/re-encode for a required transformed asset.

**Correctness checks.**

- Exact requested geometry; no silent upward/leftward crop expansion or trimmed edges.
- Preserved coefficients in retained blocks; evaluate RGB boundary differences from decoder upsampling separately.
- Clear or reconcile orientation metadata to avoid double transforms.

**Measurements.**

- Coefficient-transform plus decode CPU, output bytes, browser decoded surface size and repeated-use crossover.

**Stop conditions and limits.**

- A display-only rotation may already be cheaper without rewriting the asset.
- This is not arbitrary pixel filtering or free spatial extraction from predictive video.
- Reject a purported perfect transform when edge alignment prevents it.

**First environment.** libjpeg-turbo oracle and browser image decoder; a native MJPEG video container is a separate destination probe.

**References:** [S7].

## R109 — Expose an edited MP4 as a virtual byte-range URL

**PROPOSED / NOT TESTED**

**Type:** New native-source construction. **Priority:** P1.

**Question.** Can Chrome perform ordinary native range-based playback of a packet-copy edit that exists only as an address map?

**What differs from earlier work.** R59 built a local metadata-only selected-track Blob and R90 found no need to flatten an already playable finite fMP4. This instead exposes a new finite edited file without materializing all of its logical bytes.

**Mechanism.** Generate valid finite MP4 headers/sample tables and a virtual offset map. A permitted same-origin service worker or local server resolves requested output ranges to headers plus original source ranges.

**Initial source profile.** Finite, indexed, authorized clear sources; video-only closed-GOP edits first, fixed codec configuration, no multi-entry edit-list trick. Audio joins require separate priming/timeline qualification.

**Source basis.** Service Workers can provide Responses to intercepted requests, while HTTP defines byte ranges and validators. Neither supplies the MP4 transformation automatically. [S8, S9]

**Smallest decisive experiment.**

1. Create a keyframe-aligned A/B/A edit as a virtual MP4 and as a materialized packet-copy oracle.
2. Issue random range requests crossing header, sample and source-switch boundaries; compare exact returned bytes.
3. Run real native browser playback and seeks while recording source and virtual HTTP requests.

**Comparison baseline.** Materialized packet-copy edited file and a working MSE composition with the same timeline.

**Correctness checks.**

- Correct 206/Content-Range/length and invalid-range behavior; stable identity and validator handling.
- No stale source version is mixed into a presentation.
- Seek, cancellation, concurrent requests and worker restart preserve output bytes and timeline.

**Measurements.**

- Preparation reads, source bytes fetched, output materialization avoided, request fragmentation, latency and cache memory.

**Stop conditions and limits.**

- A permitted secure service-worker origin is required for the browser-local variant.
- It must not download the entire source to claim on-demand access.
- This is not zero copying and does not bypass CORS, authorization or origin restrictions.

**First environment.** Real permitted HTTP/HTTPS range service; injected Blob-only playback cannot qualify this route.

**References:** [S8], [S9].

## R110 — Choose a destination-aware lacing or unlacing representation

**PROPOSED / NOT TESTED**

**Type:** Container-specific routing. **Priority:** P2.

**Question.** Can the same coded audio use compact native-file packaging or a minimal MSE-compatible rewrite, depending on its parser?

**What differs from earlier work.** R93 repacketized codec frames inside Opus packets. Lacing groups already distinct codec packets only at the container level.

**Mechanism.** Compare bounded Matroska/WebM audio lacing for a direct-file route against an unlacer that emits separate blocks for an MSE route without changing codec packets.

**Initial source profile.** Small contiguous same-track audio packets with known durations. No lacing across discontinuities or configuration changes.

**Source basis.** Matroska defines lacing. The reviewed Chromium main WebMClusterParser explicitly rejects it, so MSE lacing is not proposed as a supported fast path. Direct-file behavior remains a runtime probe. [S10, S11]

**Smallest decisive experiment.**

1. Build no-lace, Xiph/EBML-laced and applicable fixed-size variants.
2. Probe direct native and MSE separately on the same installed build.
3. Unlace a valid input and verify an MSE destination without PCM decoding.

**Comparison baseline.** Ordinary no-lace WebM and a full demux/remux implementation that preserves the same packets.

**Correctness checks.**

- Every recovered codec packet, timestamp and trim property matches.
- Malformed lace sizes and noncontiguous-frame controls fail safely.
- Success through one native path is not assigned to another parser.

**Measurements.**

- Container overhead, mux/unlace CPU, release delay, browser acceptance and playback cost.

**Stop conditions and limits.**

- Grouping adds waiting time when future packets are not available.
- Existing muxers may already choose efficient lacing; the result may be only a compatibility adapter.
- Rolling source rejection does not substitute for identifying the tested browser version.

**First environment.** Host container builder and direct/MSE browser probes.

**References:** [S10], [S11].

## R111 — Factor repeated fMP4 sample metadata into defaults

**PROPOSED / NOT TESTED**

**Type:** Mux metadata optimization. **Priority:** P2.

**Question.** How much metadata can be removed from short fragments without changing sample semantics or availability?

**What differs from earlier work.** Different from append batching or fragment-size changes: preserve sample and fragment boundaries and change only redundant metadata representation.

**Mechanism.** Use valid trex/tfhd defaults for fields that really repeat, retaining trun entries for exceptions such as sizes, composition offsets, first-keyframe flags and final audio duration.

**Initial source profile.** Clear qualified fMP4, fixed-rate control first; variable-rate and B-frame fixtures as adversarial controls.

**Source basis.** Chromium PopulateSampleInfo implements trun/tfhd/trex fallback. Its run iterator still allocates a per-sample representation, so wire savings do not imply elimination of browser metadata objects. [S12, S13]

**Smallest decisive experiment.**

1. Rewrite metadata for an existing working fragmented stream while retaining payload and fragment cuts.
2. Compare expanded sample tables against an independent parser.
3. Append equivalent byte-delivery schedules in Chrome and test seeks/EOF.

**Comparison baseline.** The strongest existing muxer output, not an intentionally bloated per-field construction alone.

**Correctness checks.**

- Exact sample size, DTS, PTS, duration, key/dependency flags and data offsets.
- Explicit exceptions survive VFR, negative composition offsets, keyframes and short tails.
- Payload hashes remain unchanged.

**Measurements.**

- Bytes of headers per second, rewrite/mux cost and parse/startup cost.
- Report wire storage separately from browser resident metadata.

**Stop conditions and limits.**

- If the source muxer already emits equivalent defaults, close the opportunity for that profile.
- Never lie about durations or keyframe status to obtain a smaller header.
- The likely benefit is bounded metadata overhead, not faster video reconstruction.

**First environment.** Host/JavaScript box rewriter plus independent sample-table oracle and MSE browser test.

**References:** [S12], [S13].

## R112 — Supply known WebM durations to prevent parser holdback

**PROPOSED / NOT TESTED**

**Type:** Chrome-specific mux/timing experiment. **Priority:** P1.

**Question.** Can truthful duration metadata release an already received sample sooner?

**What differs from earlier work.** R54 varied when a muxer emitted clusters, principally for Opus. This holds delivery and cluster boundaries fixed and changes whether the receiver must wait to learn a frame duration.

**Mechanism.** Provide a valid BlockDuration or applicable track DefaultDuration when the source actually knows it, instead of making the receiver derive timing from a subsequent packet or cluster end.

**Initial source profile.** Video or another codec whose duration is not already extracted by the parser; known duration at emission time. Use Opus as an expected no-benefit control where its duration is already known.

**Source basis.** The reviewed Chromium Track::AddBuffer retains a missing-duration sample, and later resolves it from a following timestamp or a cluster-end estimate. The same source parses Opus duration directly. [S11]

**Smallest decisive experiment.**

1. Send identical coded samples under matched delayed-next-packet schedules, with and without truthful duration signaling.
2. Keep cluster cuts and producer flush behavior unchanged.
3. Measure parser buffer release and actual output separately; include VFR, last-frame and pause/resume controls.

**Comparison baseline.** Same coded payload and delivery schedule without added duration metadata; compare against normal already-sufficient Opus/default-duration packaging.

**Correctness checks.**

- Output duration and every sample time match the source.
- No guessed timing is used for genuinely unknown live durations.
- A sample arriving earlier at the decoder is not called an earlier displayed frame unless observed.

**Measurements.**

- Time from final sample byte to usable buffered data and actual presentation; added header bytes; parser/producer costs.

**Stop conditions and limits.**

- Decoder reordering or playback readiness may still determine latency.
- Computing a duration by waiting for the next sample simply moves the wait upstream.
- Source code suggests a mechanism, not a measured latency improvement.

**First environment.** Controlled byte-delivery browser MSE harness; live producer confirmation as a separate stage.

**References:** [S11].

## R113 — Carry full-resolution color planes through a 4:2:0 video decoder

**PROPOSED / NOT TESTED**

**Type:** Prepared representation experiment. **Priority:** P2.

**Question.** Can a commonly admitted decoder preserve fine color detail that a conventional 4:2:0 representation loses?

**What differs from earlier work.** R80 reconstructed alpha/HDR auxiliaries and R98 packed separate views. Here one image is represented as full-resolution component planes placed in the carrier luma image.

**Mechanism.** Extract source 4:4:4 Y/Cb/Cr planes, arrange them in separate regions of one grayscale luma atlas, encode a supported 4:2:0 carrier with neutral chroma, then reconstruct the original planes in a shader.

**Initial source profile.** Prepared small 8-bit 4:4:4 test charts and text first; explicit range/transfer definitions and no claim of direct reuse of an arbitrary existing bitstream.

**Source basis.** FFmpeg exposes component-plane extraction and stacking. These establish construction primitives; decoder-to-texture conversions and the proposed quality/cost tradeoff need an independent browser oracle. [S14]

**Smallest decisive experiment.**

1. Begin with lossless or controlled carrier construction and an all-byte-level/ramp test to detect clipping and range conversion.
2. Compare original 4:4:4, ordinary 4:2:0 and reconstructed carrier output on colored edges.
3. Then test lossy carriers and actual GPU resource behavior at matched visible quality.

**Comparison baseline.** A directly supported 4:4:4 route when available, software 4:4:4 decode, and ordinary 4:2:0 output.

**Correctness checks.**

- Plane identities, timestamps, sample ranges and transfers are correctly reconstructed.
- Report sample/RGB errors; do not infer bit-exactness from visual similarity.
- No filtered texture sampling blends neighboring atlas regions.

**Measurements.**

- Color-detail error, coded dimensions, bandwidth, total decoding plus shader cost and adapter limits.

**Stop conditions and limits.**

- Requires a new prepared encode, a larger carrier surface and custom rendering.
- Browser conversion/clipping can defeat exact recovery; physical hardware decoding is not guaranteed.
- Most ordinary content may be worse on this route.

**First environment.** Host carrier/oracle and permitted browser graphics path; actual GPU required for acceleration claims.

**References:** [S14].

## R114 — Use WebRTC native media reception as a packet-copy destination

**PROPOSED / NOT TESTED**

**Type:** Alternative browser media route. **Priority:** P2.

**Question.** Can compatible compressed file/live packets be presented by Chrome through its WebRTC media path without another media encode?

**What differs from earlier work.** R87 concerned data channels/dependency-aware delivery. This targets real received audio/video tracks and the browser media receiver, not an application decoder fed by a data channel.

**Mechanism.** Demux compatible H.264/Opus, packetize into negotiated RTP/RTCP with truthful timing, and deliver through an authorized sender to RTCPeerConnection and a media element.

**Initial source profile.** Controlled H.264/Opus profiles compatible with negotiated WebRTC parameters; regular usable keyframes; real permitted signaling and connectivity.

**Source basis.** libdatachannel ships an example streaming H.264/Opus samples to a browser. WebRTC defines received media-track operation and statistics. [S15, S16]

**Smallest decisive experiment.**

1. Prove source samples are packetized, not silently transcoded, and the native receiver presents the requested A/V.
2. Compare the same coded presentation with MSE under matched controlled network conditions.
3. Test join time, stalls, loss, new keyframe availability and an explicit sender-side seek transaction.

**Comparison baseline.** Packet-copy MSE and native HLS where both accept the same media.

**Correctness checks.**

- Payload-unit equivalence before/after packetization, correct RTP clock mapping, and actual A/V output.
- A keyframe request cannot be treated as fulfilled by a packet-copy sender unless a real usable keyframe is sent.
- A sender-side seek preserves a valid receiving timeline and discards stale packets.

**Measurements.**

- End-to-end latency, jitter buffering, sender plus browser cost, loss recovery and resource use.

**Stop conditions and limits.**

- This gives live-track semantics, not arbitrary HTMLMediaElement file seeking.
- DTLS/SRTP/ICE and packetization add costs even without media re-encoding.
- Missing usable ICE connectivity is BLOCKED for the experiment; WebSocket simulation is not a substitute.

**First environment.** Normal permitted browser origin and real WebRTC media sender/network.

**References:** [S15], [S16].

## R115 — Play an ongoing fMP4 response through one native URL

**PROPOSED / NOT TESTED**

**Type:** Progressive native-source experiment. **Priority:** P1.

**Question.** Will Chrome start and continue useful playback while a valid fragmented MP4 source is still arriving, with no manifest or application append loop?

**What differs from earlier work.** R90 used a complete local fragmented file; R88 used a playlist; R04 appended through MSE. This tests native playback before one progressively delivered HTTP media response has finished.

**Mechanism.** Serve initialization followed by valid moof/mdat fragments progressively from one HTTP response and let the media element own ingestion.

**Initial source profile.** A controlled finite-but-progressively-generated stream first; video-only then A/V; valid codec configuration and known fragments. Endless-live and reconnection semantics are separate.

**Source basis.** FFmpeg supports fragmented MP4 construction that need not depend on normal final-file metadata completion. That establishes mux feasibility, not Chrome native latency or buffering behavior. [S17]

**Smallest decisive experiment.**

1. Keep a real server response open after delivering the first usable fragments, then deliver later fragments on a controlled schedule.
2. Require visible playback and time advancement before response EOF.
3. Compare native progressive URL, native HLS and MSE on equivalent media and source-release schedules.

**Comparison baseline.** The same fragment sequence through a known working MSE path; completed-file playback is only a control.

**Correctness checks.**

- First frame and actual audio before EOF; no reliance on a prebuilt Blob.
- Correct later-fragment continuity and final EOF on closure; explicit handling of stalls.
- Do not fabricate full-file length or range support on an ongoing stream.

**Measurements.**

- Producer release, network/server buffering, first output, steady latency, read-ahead and browser/application work.

**Stop conditions and limits.**

- A native demuxer may read ahead or buffer too much, making this unsuitable for low latency.
- No seekability, ABR, DVR window or reconnect capability is implied.
- Fragmented-file format support alone cannot establish this route.

**First environment.** Real permitted HTTP streaming server and native Chrome media element; no injected-Blob substitute.

**References:** [S17].

## Combination experiments, only after the component gates

**R103/R104: compressed-domain channel routing.** Compare independent FLAC and Opus source structures as ways to select or assemble channels without a PCM graph. This is channel routing, not mixing or source separation.

**R105 versus R98: mosaics with and without pixel re-encoding.** Use the old re-encoded atlas as a baseline for the new bitstream-merged atlas. Input constraints and preparation costs remain part of the comparison.

**R109 plus a selected-track or compressed-audio transform.** A native range-addressable virtual source could expose a transformed asset lazily, provided its finite output layout is known and all range responses match a materialized oracle.

**R110–R112: a parser-aware packager.** Test the smallest representation change that makes a destination accept or release unchanged coded media. Do not introduce a general transcoder where a truthful container rewrite is sufficient.

## Primary source register

Accessed 17 September 2026. Rolling specifications and upstream main-branch source describe mechanisms at retrieval time, not the implementation provenance of previously tested browser binaries.

### [S1] RFC 9639 — FLAC

https://www.rfc-editor.org/rfc/rfc9639.html

Independent channel coding; per-channel subframes; verbatim storage; framing and checksum rules. Format mechanism, not Chrome qualification.

### [S2] RFC 7845 — Ogg Opus

https://www.rfc-editor.org/rfc/rfc7845.html

Multistream packet organization, self-delimiting component packets, equal-duration requirement, channel mapping, pre-skip and output gain.

### [S3] GPAC HEVC Tile merger

https://wiki.gpac.io/Filters/hevcmerge/

Merges synchronized HEVC inputs into motion-constrained tiled HEVC; strict configuration comparison and layout restrictions. Rolling documentation.

### [S4] GPAC HEVC Tile splitter

https://wiki.gpac.io/Filters/tilesplit/

Tile splitting; explicitly does not verify motion-constrained independence. A tool succeeding is not an independence oracle.

### [S5] AOM AV1 bitstream semantics

https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/07.bitstream.semantics.md

show_existing_frame, showable_frame, reference validity and special one-use restriction for redisplaying a KEY_FRAME. Rolling specification source.

### [S6] AOM AV1 decoding process

https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/08.decoding.process.md

Reference update and output processes; grain synthesis operates on output. Reference-exact and other conformant grain implementations are distinguished.

### [S7] libjpeg-turbo usage documentation

https://github.com/libjpeg-turbo/libjpeg-turbo/blob/main/doc/usage.txt

Coefficient-domain transforms, perfect/trim behavior, and iMCU-aligned cropping. Entropy decoding/encoding is not eliminated.

### [S8] W3C Service Workers

https://w3c.github.io/ServiceWorker/

Fetch interception and respondWith; lifetime and security restrictions still apply. Does not implement a media virtual file system.

### [S9] RFC 9110 — HTTP Semantics

https://www.rfc-editor.org/rfc/rfc9110.html

Byte-range requests, partial responses, range errors and representation validators.

### [S10] Matroska specification notes

https://www.matroska.org/technical/notes.html

Container lacing preserves multiple codec frames in a block; laced frames must be contiguous.

### [S11] Chromium WebMClusterParser

https://raw.githubusercontent.com/chromium/chromium/main/media/formats/webm/webm_cluster_parser.cc

Rolling main source: ParseBlock rejects lacing; Track::AddBuffer holds a sample missing duration; encoded Opus duration is parsed; BlockDuration/default duration may supply timing. Not the source provenance of the previously tested Chromium binary.

### [S12] Chromium MP4 TrackRunIterator

https://raw.githubusercontent.com/chromium/chromium/main/media/formats/mp4/track_run_iterator.cc

PopulateSampleInfo inherits sample fields through trun/tfhd/trex; Init still expands per-sample metadata. Rolling main source.

### [S13] W3C ISO BMFF byte-stream format for MSE

https://www.w3.org/TR/mse-byte-stream-format-isobmff/

Initialization, movie-fragment addressing, decode-time and media-segment requirements.

### [S14] FFmpeg filters documentation

https://www.ffmpeg.org/ffmpeg-filters.html

extractplanes and stacking primitives for building and verifying plane carriers. Does not claim the proposed carrier is efficient or lossless through Chrome.

### [S15] libdatachannel H.264/Opus streamer example

https://raw.githubusercontent.com/paullouisageneau/libdatachannel/master/examples/streamer/README.md

Existing compressed-sample-to-browser WebRTC media example; useful starting primitive, not proof of the proposed comparison.

### [S16] W3C WebRTC

https://www.w3.org/TR/webrtc/

Browser peer connections, received media tracks and statistics. File seeking is not supplied by a received live track.

### [S17] FFmpeg formats documentation

https://www.ffmpeg.org/ffmpeg-formats.html

Fragmented MP4 construction can be usable without normal final-file completion; actual native Chrome progressive buffering must be measured.

## Prior evidence used for overlap checking

Supplied R88–R101 research backlog and R88–R101 executed report; selected original R08 and R54 cards; conversation descriptions of the other prior batches. Prior numerical results were not rerun in this pass. No exhaustive claim is made about unrelated player code or all browser versions.