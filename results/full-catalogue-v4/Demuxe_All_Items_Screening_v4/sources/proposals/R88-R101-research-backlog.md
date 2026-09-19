# Demuxe: Routing, Muxing and Chrome Media Possibilities

**R88–R101 · 17 September 2026 · 14 proposals · NOT TESTED**

Reviewed prior catalogue and primary format/browser documentation; authored experiment proposals. No fixture generation, playback test, benchmark, production edit or repository mutation in this pass.

New means an additional or explicitly differentiated Demuxe experiment, not an industry invention. Feasibility and performance are separate questions.

## Experiment map

| ID | Experiment | Scope |
|---|---|---|
| R88 | Native HLS playlist views over compatible existing media | Existing-media routing |
| R89 | AVIF image payloads as timed AV1 video, and eligible AV1 frames as AVIF | Compressed representation crossover |
| R90 | Convert finite fMP4 fragments into a metadata-indexed native MP4 view | Metadata-only packaging |
| R91 | In-band video configuration changes with avc3, and qualified hev1 | Codec-configuration packaging |
| R92 | Normalize VP9 codec units for the actual destination | Bitstream framing |
| R93 | Opus repacketization without PCM decoding | Compressed audio framing |
| R94 | Sample-accurate audio boundaries using mux trim and preroll metadata | Container-level audio editing |
| R95 | Fixed Opus gain through codec/container headers | Header-directed audio processing |
| R96 | Sparse native video with explicit long frame holds | Prepared timing representation |
| R97 | Mux color and alpha into native transparent WebM | Auxiliary-stream muxing |
| R98 | One atlas video for many synchronized visible clips | Prepared decoder aggregation |
| R99 | Expose an HDR10-compatible Dolby Vision base without video re-encoding | Explicit fidelity fallback |
| R100 | Transfer owned packet storage into WebCodecs chunks | Final input-boundary ownership |
| R101 | Keep decoded video on the native overlay/display path | Chrome presentation-path exploration |


## Shared evidence boundary

- Record exact browser/build/platform and configuration; a specification or support-list entry is not execution evidence.

- Keep original, packet-transformed and prepared/re-encoded source classes distinct. Account for preparation cost.

- Use authorized clear fixtures and respect source, origin and administration policy. Missing APIs mean BLOCKED for that environment.

- Do not substitute a nearby API demonstration or a host benchmark for the exact browser claim.

- Verify compressed payloads, timestamps and actual decoded/presented output separately. Match fidelity and total visible workload.

- Separate application copying from opaque browser/GPU copying; no unmeasured zero-copy, hardware or power claims.

- Bound bytes, decoder objects, retained frames and deadlines; test source replacement, cancellation, seek and EOF as applicable.


## R88 — Native HLS playlist views over compatible existing media

**PROPOSED / NOT TESTED**

**Question.** Can browser-owned manifest fetching and scheduling remove application demux/append work for this source?

**What differs from earlier work.** New direct-source construction; not another application-owned MSE controller or a claim that all Chrome builds expose native HLS.

**Input scope.** Finite, clear, already HLS-compatible fragmented MP4 or TS; valid segment boundaries and configuration.

**Mechanism to test.** Create a byte-range HLS VOD playlist over existing segments and initialization data, then assign the playlist directly to a media element.

**Smallest experiment.** 1. Probe native HLS with extensions and JavaScript HLS libraries absent. Record exact Chrome version and platform. 2. Serve one qualified H.264/AAC presentation first as separate segments, then as byte ranges over the same resource. 3. Compare native-HLS, direct-file where available, and application-MSE playback under the same delivery conditions.

**Baseline.** The same media bytes through a known-working MSE implementation; direct original file when appropriate.

**Correctness.** Correct selected A/V content and duration; Seek across range boundaries and final EOF; Request log proves native path, not an extension wrapper; Source authorization and origin policy preserved.

**Measure.** Application CPU/messages; Time to correct frame and audio; Requested byte ranges and duplicate reads; Total browser CPU/memory, not just main-thread activity.

**Stop conditions and limits.** Unsupported native HLS is BLOCKED for that build, not failure of HLS generally. A filename or playlist cannot make arbitrary nonfragmented MP4 ranges valid HLS segments. No inference about internal browser MSE ownership or decoder reuse.

**First environment.** Permitted normal HTTP/HTTPS source delivery; exact native HLS availability is the first gate.

**Primary references.** [S1], [S2]. References establish component mechanisms, not a successful complete pipeline.


## R89 — AVIF image payloads as timed AV1 video, and eligible AV1 frames as AVIF

**PROPOSED / NOT TESTED**

**Question.** Can images become a native timed presentation, and keyframes become images, without a pixel decode/re-encode step?

**What differs from earlier work.** Distinct from MJPEG image decoding and texture video: reuse AV1 coded image data across still-image and timed-media containers.

**Input scope.** Start with simple single-item AVIFs with matching dimensions, profile, bit depth, color and compatible identical sequence configuration; no grids or auxiliary images.

**Mechanism to test.** Extract the AV1 image payload and configuration, author timed AV1 video samples, and preserve the compressed image data. Test the reverse direction for independently decodable AV1 frames.

**Smallest experiment.** 1. Generate a small compatible AVIF set and audit sequence-header/still-picture flags. 2. Mux the extracted payloads into an ordinary MP4 video track and then an MSE profile separately. 3. Extract eligible independent AV1 video frames into AVIF and compare image decoding against the video reference.

**Baseline.** Image decode plus video re-encode for the forward direction; video decode plus image re-encode for the reverse.

**Correctness.** Coded payload identity; Decoded image/plane identity where comparable; Color/aspect/crop correctness; Exact timestamps, seek and EOF; Truthful sample entries and handler type.

**Measure.** Preparation CPU and bytes copied; Time to first image/frame; Storage overhead; Browser decode and presentation cost.

**Stop conditions and limits.** No claim that renaming an AVIF file creates a movie. Arbitrary keyframes or unrelated still-picture sequence headers may need normalization beyond the narrow profile. Hardware decoding and bit-exact RGB conversion are not assumed.

**First environment.** Host packaging plus direct Chrome playback/MSE; normal secure origin for an optional WebCodecs comparison.

**Primary references.** [S3]. References establish component mechanisms, not a successful complete pipeline.


## R90 — Convert finite fMP4 fragments into a metadata-indexed native MP4 view

**PROPOSED / NOT TESTED**

**Question.** Can a native file view replace application append scheduling without rebuilding or copying the compressed payload?

**What differs from earlier work.** Inverse of R46: consolidate fragmented timing/offset metadata rather than create MSE fragments from ordinary MP4.

**Input scope.** Finite local clear fragments, one stable track/configuration set, known complete segment list.

**Mechanism to test.** Build ordinary MP4 sample tables from fragment timing and sample descriptions; compose new headers with slices of the original media payload.

**Smallest experiment.** 1. Try direct playback of the original complete fMP4 first. 2. Build a flat indexed view and compare with a trusted packet-copy unfragmenting muxer. 3. Exercise B-frame timestamps, a tail fragment and offsets above 32 bits using bounded fixtures.

**Baseline.** Direct original fragmented file when it works, then trusted packet-copy flat MP4 and normal MSE.

**Correctness.** Ordered sample payload hashes; DTS/PTS/duration and edit/priming audit; 64-bit chunk offsets; Exact seek and EOF output.

**Measure.** Metadata scan and index build CPU; Metadata size and peak retained bytes; Startup and seek latency; Browser resident memory.

**Stop conditions and limits.** No advantage is established if direct original fMP4 already performs as well. Blob composition is not proof of zero physical copies. Do not download an entire remote movie merely to enable this view.

**First environment.** Host structural oracle and Chrome Blob/File playback.

**Primary references.** [S4], [S5]. References establish component mechanisms, not a successful complete pipeline.


## R91 — In-band video configuration changes with avc3, and qualified hev1

**PROPOSED / NOT TESTED**

**Question.** Can the same destination accept configuration epochs through media samples rather than a new initialization segment each time?

**What differs from earlier work.** Extends R43/R58 but changes the configuration carriage: test whether an in-band epoch removes extra initialization-segment work.

**Input scope.** Initially H.264 with one profile/bit depth and independently decodable resolution-change boundaries; declared level must remain truthful.

**Mechanism to test.** Use legal avc3 parameter-set carriage at random-access boundaries, preserving coded pictures while varying SPS/PPS configuration.

**Smallest experiment.** 1. Compare a known-working avc1/new-init sequence against the properly authored avc3 form. 2. Change dimensions within the admitted profile and seek to both sides. 3. Probe HEVC hev1 separately only on a supported destination.

**Baseline.** Explicit initialization-segment replacement at each configuration epoch.

**Correctness.** Visible frame identity and dimensions; Audio continuity; Configuration correct after backward seek; Container and in-band parameter-set agreement.

**Measure.** Header bytes and application operations; Boundary output delay; Browser errors and reinitialization evidence if observable.

**Stop conditions and limits.** Changing only the codec tag is not a valid transformation. In-band storage is not a promise of no internal decoder reset. Reject unsupported profile/depth or stale-configuration output.

**First environment.** Host bitstream audit and Chrome direct/MSE destination probes.

**Primary references.** [S6]. References establish component mechanisms, not a successful complete pipeline.


## R92 — Normalize VP9 codec units for the actual destination

**PROPOSED / NOT TESTED**

**Question.** Are some rejected or inefficient pipelines a framing mismatch rather than an unsupported codec?

**What differs from earlier work.** Distinct from temporal-layer removal: preserve every coded dependency while changing packet grouping or superframe framing.

**Input scope.** VP9 streams containing hidden reference frames and superframes; fixed codec profile first.

**Mechanism to test.** Inspect codec frame boundaries and use lossless superframe split/merge operations where the target container or codec API requires them.

**Smallest experiment.** 1. Prepare equivalent VP9 single-frame and superframe representations using a pinned bitstream filter. 2. Feed each destination only its defined chunk/sample format; test muxed media and WebCodecs separately. 3. Compare against full ordered decode, including hidden-frame dependencies and seeking.

**Baseline.** Known-correct original container playback and reference software decode.

**Correctness.** Every constituent coded frame retained; Shown frame order and timestamp equality; Hidden references not miscounted as displayed frames; Key-chunk classification and recovery.

**Measure.** Accepted configurations; Submission/packet counts where legal; Repacking CPU and bytes copied; Decode output latency.

**Stop conditions and limits.** WebCodecs VP9 registration expects a frame; a muxer superframe is not universally the right API chunk. No dropping alt-ref dependencies. Do not concatenate arbitrary packets as a throughput trick.

**First environment.** Host bitstream tooling; secure origin required for the WebCodecs branch.

**Primary references.** [S7], [S8]. References establish component mechanisms, not a successful complete pipeline.


## R93 — Opus repacketization without PCM decoding

**PROPOSED / NOT TESTED**

**Question.** Can packet overhead and submission frequency be traded against availability latency without re-encoding audio?

**What differs from earlier work.** Not MSE append batching: changes the codec packet grouping itself while preserving the constituent encoded frames.

**Input scope.** Elementary Opus with compatible mode, bandwidth, frame size and channels; no generalized multistream claim.

**Mechanism to test.** Group existing compatible frames into fewer packets or split a previously grouped packet back into its existing constituent frames.

**Smallest experiment.** 1. Compare existing 20 ms frames in 20/40/60 ms packet groupings. 2. Split a valid multi-frame packet back to the original frame granularity. 3. Mux each form and compare browser and reference-decoder outputs, startup and seek behavior.

**Baseline.** Original valid packetization at the same encoded frame granularity.

**Correctness.** Constituent compressed frame hashes; Same decoder PCM equality after identical trimming; Sample counts/timestamps; Configuration changes break groups correctly; Maximum legal packet duration.

**Measure.** Framing/container overhead; Codec submissions and CPU; Time to first available audio; Latency and buffering.

**Stop conditions and limits.** Cannot divide a single encoded 20 ms frame into newly created 5 ms frames. Respect compatible configuration and 120 ms packet limit. No claim of reducing codec algorithmic lookahead.

**First environment.** Host libopus/mux oracle and Chrome direct/MSE; secure optional AudioDecoder branch.

**Primary references.** [S9]. References establish component mechanisms, not a successful complete pipeline.


## R94 — Sample-accurate audio boundaries using mux trim and preroll metadata

**PROPOSED / NOT TESTED**

**Question.** Can a compressed audio excerpt have exact audible boundaries without decoding and re-encoding its edge?

**What differs from earlier work.** Deepens excerpt/queue work: the new target is sample-domain trim semantics rather than packet alignment or visible clock continuity.

**Input scope.** Start with Ogg Opus direct playback, whose pre-skip and end-trim semantics explicitly support encoded-stream cropping; WebM and MP4 are separately qualified mappings.

**Mechanism to test.** Keep the encoded frames needed for decoder state, then describe which leading/trailing decoded samples should be omitted through appropriate container metadata.

**Smallest experiment.** 1. Start with Ogg Opus whole-stream priming/end-trimming and arbitrary sample-accurate crops, then test equivalent WebM/MP4 constructions separately. 2. Cut a deterministic impulse/tone source inside a codec frame with explicit preroll. 3. Compare decoded and captured browser output lengths and boundary markers, then concatenate short excerpts.

**Baseline.** Full decode of the existing encoded source, cropped at the requested sample indices; packet-only cut is a negative control.

**Correctness.** Exact requested sample interval; Preroll state converges to the reference within the declared contract; No duplicate priming or final padding; Per-container edit/trim fields inspected; Seek-back and repeated boundaries.

**Measure.** Boundary errors in samples; Preparation CPU; Extra preroll bytes/work; Latency and encoded payload reuse.

**Stop conditions and limits.** Do not infer sample-perfect behavior from currentTime, buffered ranges or successful append. Do not copy WebM trim semantics blindly into MP4 dOps. If a random-access decoder cannot reproduce the reference exactly, narrow the claim or retain more state.

**First environment.** Host PCM oracle plus Chrome digital-output observation; direct and MSE independently tested.

**Primary references.** [S10], [S11], [S12]. References establish component mechanisms, not a successful complete pipeline.


## R95 — Fixed Opus gain through codec/container headers

**PROPOSED / NOT TESTED**

**Question.** Can fixed per-asset gain be expressed without an application-created audio-processing graph?

**What differs from earlier work.** Distinct from R53 audio-clock gain automation and R61 channel graphs: changes a static decode instruction, not the application PCM graph.

**Input scope.** Clear Opus source with known existing gain metadata; test Ogg/WebM/MP4 independently.

**Mechanism to test.** Adjust the encoded stream output-gain metadata while retaining the original audio packets, and let the normal decode/output path apply the requested fixed attenuation.

**Smallest experiment.** 1. Create 0, -6 and -12 dB variants of the same packets. 2. Measure the resulting internal digital signal against a controlled gain reference. 3. Verify gain persistence across seek and reconcile existing output gain and loudness tags.

**Baseline.** Unmodified media with an explicit fixed application gain stage at equivalent output.

**Correctness.** Packet hashes unchanged; Requested amplitude and clipping behavior; No accidental double gain; Gain metadata survives remux and seek; No unrequested resampling or channel mapping.

**Measure.** Preparation work; Browser audio path/CPU; Output latency and graph resources; Amplitude error.

**Stop conditions and limits.** This moves scaling into the existing decode path; it does not eliminate scaling. Static header gain is not a seamless live slider. Do not assume every Chrome container path honors the field.

**First environment.** Host mux/decoder validation and Chrome tone/digital-output tests.

**Primary references.** [S11], [S12]. References establish component mechanisms, not a successful complete pipeline.


## R96 — Sparse native video with explicit long frame holds

**PROPOSED / NOT TESTED**

**Question.** How little coded video and scheduling work can represent a long static audiovisual presentation?

**What differs from earlier work.** Distinct from R72 keyframe preview extraction: a complete continuous media timeline with intentionally sparse picture changes.

**Input scope.** Prepared slides, screen changes or other intentionally static intervals, plus optional continuous audio.

**Mechanism to test.** Encode only actual visual changes and assign explicit sample durations for each hold instead of representing the hold as repeated decoded pictures.

**Smallest experiment.** 1. Create a one-minute presentation with a few clearly labeled picture changes. 2. Compare long-duration video samples against a conventional repeated-frame encode and a JS image-timeline reference. 3. Seek within a hold, across changes, and into the final hold with and without continuous audio.

**Baseline.** Same visual/audio timeline encoded conventionally; preparation and fidelity held explicit.

**Correctness.** No black flashes or unintended gaps; Correct picture for every held interval; Exact change times and final duration; MSE availability intersection checked if used; Caption/audio alignment.

**Measure.** Coded sample count and bytes; Decoder output/wakeup counts; Total browser CPU/power; Seek and EOF behavior.

**Stop conditions and limits.** Do not delete dependent pictures from arbitrary existing video. A long sample duration is not equivalent to an empty buffered gap. Holding a picture does not guarantee zero compositor or display work.

**First environment.** Host muxing and Chrome direct/MSE probes; hardware needed for power conclusions.

**Primary references.** [S10]. References establish component mechanisms, not a successful complete pipeline.


## R97 — Mux color and alpha into native transparent WebM

**PROPOSED / NOT TESTED**

**Question.** Can an existing pair of suitable compressed visual streams become native transparent video without custom per-frame reconstruction?

**What differs from earlier work.** Extends R80 but delegates synchronization/reconstruction to the native container path instead of two independent video elements and a custom shader.

**Input scope.** Initially compatible aligned VP8 color and alpha-plane streams; dimensions, timestamps and dependency boundaries validated.

**Mechanism to test.** Package coded color in Block and the aligned coded alpha plane in BlockAdditional, then present through a native video element.

**Smallest experiment.** 1. Prepare a color/mask pair with sharp edges and smooth alpha gradients. 2. Mux without re-encoding the already compatible streams. 3. Compare native transparency against a two-stream shader reference; probe VP9 as a separate profile.

**Baseline.** The same color and mask reconstructed through an explicit shader, plus a known-good alpha-WebM encode.

**Correctness.** Compressed stream payload identity; Alpha-edge and matte correctness; Color/premultiplication handling; Seek, source replacement and EOF; Mask frame/keyframe alignment.

**Measure.** Application callbacks and resources; Total browser decode/compose cost; Synchronization error; Memory and output quality.

**Stop conditions and limits.** One media element does not imply one internal decoder. Do not infer hardware alpha decode. Arbitrary grayscale video is not automatically a valid alpha auxiliary stream. Preparation re-encoding costs remain visible when sources are not already suitable.

**First environment.** Host mux oracle and Chrome native alpha playback; MSE separately.

**Primary references.** [S13], [S14]. References establish component mechanisms, not a successful complete pipeline.


## R98 — One atlas video for many synchronized visible clips

**PROPOSED / NOT TESTED**

**Question.** Does one aggregate decode use fewer resources than many simultaneous small decodes at the same total pixel rate?

**What differs from earlier work.** Opposite tradeoff to R84 spatial selection: aggregate when many regions are visible instead of avoiding unneeded regions.

**Input scope.** Prepared synchronized clips or views sharing a presentation timeline; first 4 or 9 equal-sized views.

**Mechanism to test.** Encode a mosaic into one video stream, decode once and sample the corresponding regions for independent visual placements.

**Smallest experiment.** 1. Prepare 4-view and 9-view atlas variants with recorded encoding cost. 2. Compare independent videos versus one atlas at equal aggregate pixels, frame rate and measured visible quality. 3. Test edge guards, all-visible and mostly-hidden cases on the same physical adapter.

**Baseline.** Independent clips with matching visible content and quality; not a larger-resolution strawman.

**Correctness.** Synchronized frame identities; No cross-region chroma/filter bleeding; Per-region quality; Cancellation and atlas resource release; Truthful shared-time limitation.

**Measure.** Decoder instances/resources where observable; CPU/GPU work and power; Memory and bytes; Preparation cost amortization; Cost when only one region is visible.

**Stop conditions and limits.** No claim that arbitrary compressed clips can be concatenated into an atlas without re-encoding. Hidden regions still decode. Independent arbitrary seeking is not supplied by a single shared atlas timeline.

**First environment.** Prepared media plus Chrome native/WebCodecs and WebGL/WebGPU region sampling; genuine GPU for performance.

**Primary references.** [S15]. References establish component mechanisms, not a successful complete pipeline.


## R99 — Expose an HDR10-compatible Dolby Vision base without video re-encoding

**PROPOSED / NOT TESTED**

**Question.** Can a browser play a supported compatible base when full Dolby Vision signaling blocks or complicates the route?

**What differs from earlier work.** Video counterpart to compatible-core exploration, not software tone mapping or full Dolby Vision preservation.

**Input scope.** Verified clear Dolby Vision profile 8.1 first; retained base must actually be HDR10-compatible.

**Mechanism to test.** Preserve the coded base picture data, selectively remove Dolby-specific signaling when appropriate, and author a truthful HDR10 destination description and required metadata.

**Smallest experiment.** 1. Verify a profile 8.1 fixture and establish a trusted HDR10-base reference. 2. Apply a version-checked metadata/bitstream transformation and preserve base picture hashes. 3. Test native Chrome HEVC/HDR behavior on a capable display; reject profile 5 as a compatibility negative control.

**Baseline.** Trusted HDR10 base decode, not the full Dolby Vision rendering; original direct browser playback is also tested first.

**Correctness.** Correct profile and compatible-base semantics; Base coded picture preservation; Required color/static HDR metadata retained; Captions and unrelated SEI retained; No falsely advertised Dolby capability.

**Measure.** Compatibility difference; Preparation CPU and bytes changed; Native output path; Color comparison to the HDR10 base reference.

**Stop conditions and limits.** Requires explicit acceptance of losing Dolby-specific dynamic presentation. Profile 5 is not transformed into HDR10 merely by stripping a tag. Do not remove every SEI message indiscriminately. Actual Chrome HEVC/HDR configuration is a first gate.

**First environment.** Host profile/bitstream oracle plus supported Chrome, GPU and HDR display; software-only runs do not qualify HDR presentation.

**Primary references.** [S16], [S7]. References establish component mechanisms, not a successful complete pipeline.


## R100 — Transfer owned packet storage into WebCodecs chunks

**PROPOSED / NOT TESTED**

**Question.** Can the browser retain already-owned encoded storage rather than allocating another packet copy?

**What differs from earlier work.** Beyond R42 worker buffer recycling: target the chunk-constructor data copy rather than only postMessage ownership.

**Input scope.** Standalone owned transferable ArrayBuffers containing complete valid codec units.

**Mechanism to test.** Construct EncodedVideoChunk or EncodedAudioChunk with its data ArrayBuffer in the constructor transfer list, then decode normally.

**Smallest experiment.** 1. Feature-test actual detachment and chunk contents on the target Chrome. 2. Compare copied construction and transferred construction with identical small and large packets. 3. Include subviews over oversized backing buffers to expose retained-memory tradeoffs.

**Baseline.** Normal chunk construction with identical packet bytes and decoder workload.

**Correctness.** Byte equality; Ownership detached exactly once; No use-after-detach; Timestamps and decode output unchanged; Cancellation releases resources.

**Measure.** Constructor cost; Application allocated/copied bytes; Total decode CPU; Peak/retained memory and backing-buffer lifetime.

**Stop conditions and limits.** The specification permits, but does not require, avoiding a copy. Never transfer SharedArrayBuffer or the live Wasm heap. Avoid retaining a huge backing buffer for a tiny packet. A fast constructor alone does not prove lower end-to-end cost.

**First environment.** Permitted secure-origin Chrome WebCodecs; source/parser storage ownership audited.

**Primary references.** [S17]. References establish component mechanisms, not a successful complete pipeline.


## R101 — Keep decoded video on the native overlay/display path

**PROPOSED / NOT TESTED**

**Question.** Which practical display compositions preserve the least expensive native surface path?

**What differs from earlier work.** Distinct from R08 CPU filter avoidance: investigate postdecode surfaces, compositor copies and hardware overlay eligibility.

**Input scope.** Identical supported video and equivalent visible UI layouts on a recorded physical Chrome/GPU/display setup.

**Mechanism to test.** Compare direct video presentation with equivalent composition arrangements, looking for decoder-surface-to-display routes that avoid unnecessary intermediate rendering.

**Smallest experiment.** 1. Compare simple direct video, equivalent DOM overlays, transformed/occluded layouts and a canvas-routed control. 2. Use available browser traces and platform counters to establish actual paths rather than infer from CSS. 3. Repeat fullscreen/windowed and one multi-video case at equivalent visible content.

**Baseline.** Direct native presentation with identical content; rendered output quality and frame delivery held fixed.

**Correctness.** Same visible video/UI semantics; No extra drops or hidden quality changes; Measured path evidence; No reliance on unsupported flags or administrator bypass.

**Measure.** Compositor/GPU copies and bandwidth when observable; CPU/GPU time; Power on real hardware; Presented-frame latency and dropped output.

**Stop conditions and limits.** No universal CSS recipe across platforms. SwiftShader cannot qualify hardware overlay efficiency. Old VideoNG power numbers are not predictions for this experiment. Absence of application readback is not proof of zero internal copying.

**First environment.** Physical GPU/display, normal permitted Chrome and platform tracing.

**Primary references.** [S18]. References establish component mechanisms, not a successful complete pipeline.


## Untested combinations

**R89 + R96** — Native timed slideshows from compatible AVIF payloads and long-duration samples, without image-to-video re-encoding. The composition is itself untested.

**R93 + R94 + R95** — A compressed-domain Opus preparation chain for packet grouping, exact trim instructions and fixed gain; compare against an application-PCM processing chain.

**R84 + R98** — Compare opposite spatial strategies: independently selected regions versus one aggregated atlas, across varying visible-region fractions.


## Source register

Primary references accessed on 17 September 2026. Rolling pages, historical implementation accounts and versioned specifications have different evidentiary scopes.

### [S1] Chromium Audio/Video overview

https://www.chromium.org/audio-video/

Rolling project overview; a container listing is not a platform, profile, or combined-pipeline guarantee.

### [S2] RFC 8216 — HTTP Live Streaming

https://www.rfc-editor.org/rfc/rfc8216.html

HLS byte ranges, initialization maps and segment requirements; not a Chrome implementation test.

### [S3] AV1 Image File Format v1.2.0

https://aomediacodec.github.io/av1-avif/v1.2.0.html

Versioned AOM format specification; AV1 image-item and sample relationship, configurations and image sequences.

### [S4] FFmpeg formats documentation

https://ffmpeg.org/ffmpeg-formats.html

Rolling format/muxer documentation; installed build options need separate verification.

### [S5] File API

https://www.w3.org/TR/FileAPI/

Blob slicing and composition; no guarantee of physical zero-copy behavior.

### [S6] MSE ISO BMFF Byte Stream Format

https://www.w3.org/TR/mse-byte-stream-format-isobmff/

Initialization, in-band configuration and fragment requirements; not all ISO BMFF features are mandated.

### [S7] FFmpeg bitstream filters documentation

https://ffmpeg.org/ffmpeg-bitstream-filters.html

Rolling VP9 repacking and Dolby Vision bitstream-filter primitives; do not assume the older lab build exposes them.

### [S8] WebCodecs VP9 codec registration

https://www.w3.org/TR/webcodecs-vp9-codec-registration/

VP9 chunk representation; do not substitute arbitrary mux packet grouping for the defined input unit.

### [S9] libopus 1.5 repacketizer API

https://opus-codec.org/docs/opus_api-1.5/group__opus__repacketizer.html

Elementary-stream framing, compatible configuration constraints and maximum packet duration.

### [S10] Matroska Element Specification

https://www.matroska.org/technical/elements.html

CodecDelay, SeekPreRoll, DiscardPadding and BlockDuration semantics; browser handling must be measured.

### [S11] RFC 7845 — Ogg Encapsulation for Opus

https://www.rfc-editor.org/rfc/rfc7845.html

Output-gain, trimming and encapsulation semantics; no universal browser/container behavior claim.

### [S12] Encapsulation of Opus in ISO Base Media File Format

https://opus-codec.org/docs/opus_in_isobmff.html

Published mapping draft v0.6.8, marked incomplete; dOps, edit and preroll reference, not an implementation guarantee.

### [S13] WebM alpha-channel design

https://wiki.webmproject.org/alpha-channel

VP8 Block/BlockAdditional color/alpha construction. Alternative designs on the page are not assumed implemented.

### [S14] Chrome alpha-transparency implementation account

https://developer.chrome.com/blog/alpha-transparency-in-chrome-video

Historical Chrome implementation evidence, not current hardware-acceleration or platform coverage proof.

### [S15] WebGPU Chrome 116 implementation account

https://developer.chrome.com/blog/new-in-webgpu-116

VideoFrame external-texture import primitive; does not establish atlas performance.

### [S16] Dolby Vision encoding of mezzanine assets

https://professionalsupport.dolby.com/s/article/Dolby-Vision-Encoding-of-mezzanine-assets

Profile 8.1 HDR10 compatibility and profile 5 incompatibility; no browser playback guarantee.

### [S17] WebCodecs editor draft

https://w3c.github.io/webcodecs/

Retrieved draft dated 14 September 2026; chunk-constructor transfer permits, but does not mandate, avoiding a data copy.

### [S18] Chrome VideoNG deep dive

https://developer.chrome.com/docs/chromium/videong

Platform decoder/compositor/overlay architecture; historical gains are not predictions for these proposals.


## Status for later agents

No row in this catalogue is a PASS. Begin with the stated prerequisite and smallest decisive experiment. Record separate mechanism, correctness and performance outcomes; preserve negative findings. A replacement API or simulation must be labeled as a different experiment.

The selected batch crosses image/video representations, codec-unit framing, audio trim/gain metadata, auxiliary tracks, decoder aggregation and native presentation. Its purpose is exploration of media execution, not a proposal to replace the current Demuxe architecture.