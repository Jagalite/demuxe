# Demuxe: Additional Routing and Optimization Research

**R58–R69 · 17 September 2026 · 12 proposed experiments**

**Scope.** Twelve additional Demuxe research hypotheses, R58–R69. This is source review and experiment design only: no fixtures were generated, no playback or benchmarks were run, and no production source was changed in this pass.

**Baseline.** Connected GitHub main resolved to 9abfd1b22300cf273fc0bd1a8290261281c8f3f3. The existing finite plan registry and semantic/fidelity gates remain authoritative. This is a focused review, not an exhaustive audit of every route or caller. [D1]

**Evidence.** Saved lab reports are prior standalone observations, not newly reproduced findings. Their environment was Chromium 144.0.7559.96 headless on Debian 13 with host FFmpeg 7.1.5. Browser-source snapshots and rolling specifications do not establish that a proposed API combination works in that binary. [L1–L3]

**Novelty.** New means an additional Demuxe mechanism or a distinct follow-on question, not a claim of industry invention. Do not relabel the existing FLAC, split-buffer, cue virtualization, remux or allocation tests as new wins.

**Environment boundary.** Most first pilots use injected Blob/file bytes, window MSE, Web Audio and host FFmpeg. Respect the previously recorded origin/network restrictions; do not bypass administrator policy. Missing APIs, encoders, source fixtures or matching runtime builds mean BLOCKED, not a playback failure.

## Recommended sequence

Start with **R59 → R61 → R62 → R66**. These are priority judgments, not performance predictions. Run R58 as an independent configuration probe. R63/R64 are specialized decoder experiments, not general Native routes.

| ID | Idea | Priority | First test boundary |
|---|---|---|---|
| R58 | Change video codec while retaining the audio presentation | P2 | Sandbox MSE pilot; exact codecs and container pair must pass availability checks. |
| R59 | Construct a selected-track MP4 view without remuxing samples | P1 | Sandbox Blob/File and direct-video pilot; local, finite, unencrypted MP4 only. |
| R60 | Extract in-band closed captions from compressed video headers | P1 | Sandbox packet-parser/caption pilot if a trustworthy caption fixture or pinned reference parser is available; renderer integration remains local. |
| R61 | Keep explicit channel processing on the Native audio graph | P1 | Sandbox Web Audio graph and digital-output pilot, building on the saved six-channel fixture. |
| R62 | Apply an explicit audio-sync offset by remapping one track | P1 | Sandbox split-MSE pilot; static offset first, paused update second. |
| R63 | Use the browser image decoder for qualified MJPEG video | P2 | Sandbox compressed-image decode/presentation pilot; complete mpv-timed A/V integration is local-only. |
| R64 | Decode directly at reduced resolution for explicit previews | P2 | Host FFmpeg decoder experiment plus sandbox presentation; verify actual installed lowres support first. |
| R65 | Isolate a selected program from multi-program transport streams | P2 | Host FFmpeg construction plus sandbox MSE destination pilot; no live/network qualification. |
| R66 | Communicate the requested start position before first-data preparation | P1 | Sandbox direct Blob-video pilot; real HTTP-byte impact requires the local environment. |
| R67 | Hibernate long-paused presentations under an explicit memory policy | P2 | Sandbox pause/release/restore pilot with capped resources and a scripted idle trigger. |
| R68 | Process only the audio region that an explicitly requested crossfade changes | P3 | Host audio construction + sandbox MSE pilot; maintained Wasm cost and integration are local-only. |
| R69 | Separate decoder compatibility from per-source initialization identity | P2 | Sandbox decision/sequence checks; a meaningful production saving requires local reconfiguration instrumentation. |

## Research findings that constrain the plan

### Metadata can sometimes be the only thing that needs changing

R59 deliberately starts with fixed-size metadata replacement, not relocation or sample-table reconstruction. If browser track selection is the blocker for a local MP4, a valid execution view may be cheaper than a full remux. This is a proposed parser/construction experiment; it has not been demonstrated. [S2, S3, F8]

### Six channel indices are not yet six speaker identities

R57 demonstrated six separately observable browser-internal channels. R61 still needs a verified mapping from the source layout to those indices. A splitter does not attach semantic left/right/centre names to its outputs. [L1, S5]

### R46 needs a stronger first-frame oracle before more optimization

Keep its current NOT QUALIFIED verdict. The saved first-callback difference is a real observation, but requestVideoFrameCallback is best effort and may miss frames; a first observed mediaTime alone cannot isolate sample/edit corruption from observation timing. Use a paused target, independent packet/edit audit and frame identity comparison. This is a qualification repair, not another numbered optimization or a claim that R46 is correct. [L1, S7]

### Source evidence favors bounded specializations

MJPEG can use an image decoder; some decoders have lowres reconstruction; captions can live in compressed packet headers. None implies arbitrary image/video interchange, arbitrary lowres decode or universal caption fidelity. Each needs a deliberately narrow profile. [F1–F5, S6]

### Runtime performance remains empirical

No new route ordering or numeric scoring is proposed. A source-level primitive, fewer stages, less application copying or retained objects is not sufficient evidence of lower whole-session cost. Host FFmpeg is a component feasibility screen, not a guaranteed lower bound on a Wasm implementation.

## R58 — Change video codec while retaining the audio presentation

**Follow-on transition hypothesis · P2 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Sandbox MSE pilot; exact codecs and container pair must pass availability checks. **Related cards:** R43, R32.

**Proposed mechanism.** Extend the successful resolution-only switch to a genuine codec change, initially H.264 in fMP4 to VP9 in WebM and back. Keep one media element, the same MediaSource and the same audio SourceBuffer. This tests whether a codec boundary really requires replacing the whole playback owner.

**What is new.** R43 changed dimensions inside H.264. R32 mixed video and audio containers concurrently. Neither establishes that a single video SourceBuffer can cross codec/container boundaries correctly while audio remains active.

**Source basis.** MSE explicitly provides changeType for codec/bytestream changes; successful new initialization and random-access decoding remain required. The saved R43 test demonstrated the importance of actual access-point timestamps. [S1, L1]

**Smallest decisive experiment.** Generate two short, independently correct clips with matching content timeline and distinct burned-in labels. Screen both video MIMEs and the simultaneous audio combination. Retain continuous FLAC or AAC audio; prepare a valid replacement initialization segment and first keyframe, then switch only video at an established boundary. Reverse direction and seek to each side using the correct epoch configuration.

**Comparison baseline.** Full presentation replacement at the same boundary, with the same amount of new media preloaded. Reuse the R43 resolution-only test as a negative-complexity control.

**Correctness and ownership.** Record actual codec/configuration epoch, frame identity, dimensions, preserved audio markers and SourceBuffer identities. Test pause, cancellation before commit, failed destination configuration and source replacement. Do not call successful append or stable currentTime proof of a gapless switch.

**Measurements.** Boundary frame gap, audio continuity, startup/recovery, peak overlap bytes and object recreation. Report browser decoder reinitialization as unknown unless directly observed; retaining MSE does not prove retaining the decoder.

**Stop / reject.** Stop if the exact mix is rejected or safe rollback is unavailable. Do not downgrade HDR, bit depth or requested quality to force the transition; no HEVC assumption in the sandbox and no ABR/live qualification claim.

**Local-agent integration.** Local integration must coordinate configuration epochs, stream identity, subtitle geometry and the existing adaptive controller. Reuse a supported same-owner transition before considering cross-engine handoff.

## R59 — Construct a selected-track MP4 view without remuxing samples

**New local-file packaging route · P1 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Sandbox Blob/File and direct-video pilot; local, finite, unencrypted MP4 only. **Related cards:** R46.

**Proposed mechanism.** For a local MP4 whose requested audio cannot be selected through the browser track API, expose a virtual file containing only the desired track declarations while reusing the original media bytes. Begin by replacing unselected trak boxes with equally sized free boxes in a bounded copy of moov, retaining its size and position. Compose prefix + edited moov + suffix from Blob slices.

**What is new.** R46 constructed new fragmented MP4 sample tables for MSE. This route preserves the ordinary MP4 sample layout and uses direct playback; it is a targeted metadata view, not an alternative general demuxer or a remote authenticated proxy.

**Source basis.** File API supplies immutable byte slices and Blob composition, and the MP4 registry defines free-space boxes. FFmpeg qt-faststart shows why relocating metadata normally requires offset repair; the first experiment deliberately avoids relocation. None of these sources proves the proposed nested-box substitution works. [S2, S3, F8]

**Smallest decisive experiment.** Use an equal-duration MP4 with one H.264 track and two independently marked AAC tracks. Validate all box sizes and limits, retain the selected audio/video declarations, and test the edited view in Chromium plus host ffprobe. Compare moov-before-mdat and moov-after-mdat layouts without moving bytes. Reject track references or structures outside the narrow profile.

**Comparison baseline.** Original file with a working track-selection API when available, otherwise an FFmpeg packet-copy selection remux. Compare the same requested track and source time, not default-track playback.

**Correctness and ownership.** Prove retained packet payloads, DTS/PTS, edits, priming and offsets are unchanged. Detect selected-channel tones, seek/EOF and replacement behavior. Retain all logical source tracks in application metadata even though the execution view exposes a subset.

**Measurements.** Metadata bytes read/copied, Blob assembly cost, actual browser retained memory, open-to-correct-track/frame, and source bytes touched. Blob composition does not guarantee zero physical copying.

**Stop / reject.** Reject encryption, compressed moov, unsupported tref/auxiliary relationships, malformed counts, dependent tracks and unqualified duration differences. Never download a remote movie merely to build this view. Unselected payload remains in mdat: this is NOT redaction, sanitization or a safe export.

**Local-agent integration.** Integrate with source-scoped track IDs and transactional reopen. Test actual ISO box legality and both browser parsers before adding admission. No seamless mid-play switch or source-file modification is implied.

## R60 — Extract in-band closed captions from compressed video headers

**New subtitle-component route · P1 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Sandbox packet-parser/caption pilot if a trustworthy caption fixture or pinned reference parser is available; renderer integration remains local. **Related cards:** R19, R41, R48.

**Proposed mechanism.** Extract A/53 caption payloads from H.264 SEI as compressed video passes through the demux path. Feed a bounded, explicit CEA-608 decoder and suitable cue/overlay renderer, while the unchanged video is played by the browser. Captions alone should not force software video decoding.

**What is new.** Earlier cards covered separate ASS, PGS and simple SRT tracks. These captions are carried inside compressed video metadata and require a stateful caption decoder, not merely reading another subtitle track.

**Source basis.** FFmpeg n7.1.1 dispatches registered GA94 SEI data to its A/53 parser. Video.js describes fMP4 caption extraction through mux.js. These establish header-level extraction as a real technique; Demuxe integration and full rendering equivalence are new hypotheses, not industry novelty. [F1, X1]

**Smallest decisive experiment.** Start with one caption channel and a fixture with known commands, PTS and visible output. Parse length-prefixed and Annex-B NAL framing safely, remove emulation prevention only in the parsed view, retain the original packet bytes, and recover caption events on presentation time. Exercise pop-on, clear, repeated control codes and a seek into an active caption.

**Comparison baseline.** Known reference caption decoder/render plus identical original video. Use saved fixtures or a licensed pinned reference; synthetic bytes that have not been independently validated cannot be the sole oracle.

**Correctness and ownership.** Check caption parity/field/channel selection, order across B-frames, positioning and clear events. Restore caption memory via a bounded checkpoint/preroll on seek. Roll-up/paint-on need distinct visual validation; do not flatten them into static lines and call them equivalent.

**Measurements.** Extra compressed-header reads/parsing, cue/decoder state size, startup and seek reconstruction work, and whether any video decoder was loaded solely for extraction.

**Stop / reject.** CEA-708 is a separate profile, not automatically supported by parsing A/53. Stop when rendering semantics or active-state reconstruction are unproven. Do not strip unrelated SEI, HDR or accessibility data from video.

**Local-agent integration.** Share input with existing demuxing and preserve source/auth generations. Prefer a maintained caption component when its licensing/API and output fit; do not reimplement a broad caption standard for a small claimed speed win.

## R61 — Keep explicit channel processing on the Native audio graph

**New audio-effect candidate · P1 · Risk: Medium · PROPOSED / NOT TESTED**

**First environment:** Sandbox Web Audio graph and digital-output pilot, building on the saved six-channel fixture. **Related cards:** R57, R53.

**Proposed mechanism.** For supported Native A/V, implement explicitly requested channel attenuation, solo/mute, channel swapping or a defined stereo mix with ChannelSplitterNode, per-channel gain and ChannelMergerNode. Keep browser video presentation and avoid an audio re-encode or a move to the mpv video path solely for these operations.

**What is new.** R57 observed six separate channels and R53 smoothed a scalar gain. Neither tested a semantic channel-processing request or proved that a complete channel matrix can preserve the intended output.

**Source basis.** Web Audio defines splitter/merger nodes and per-channel matrix mixing. Splitters expose indices rather than semantic speaker names. The prior lab recovered six distinct signals despite a misleading node channelCount property. [S5, L1]

**Smallest decisive experiment.** Use six independent channel identifiers with a verified source layout. First test an identity matrix and one-channel attenuation, then a finite stereo-mix profile only with explicit permission. Compare OfflineAudioContext output against a mathematically specified matrix; separately check Native direct and split-MSE integration.

**Comparison baseline.** The same browser playback with no added effect for identity, and a reference application of exactly the requested matrix for processing. A downmixed output is never compared as fidelity-equivalent to untouched surround.

**Correctness and ownership.** Preserve sample rate at the application boundary, channel names/order and pause/seek/source replacement. Detect hidden browser up/downmix with an adversarial matrix and silent-channel controls. Bound coefficient headroom; reject clipping or an unspecified layout rather than inserting a limiter.

**Measurements.** Graph nodes and updates, input/output channel matrix, additional processing latency where observable, startup and total browser cost. Physical speaker routing and bit-exact DAC output remain unqualified.

**Stop / reject.** No automatic centre-channel guessing or dialogue-enhancement claim. Scalar lossy-encoding permission does not authorize downmix. Respect CORS, context activation, device limitations and existing gain/mute semantics.

**Local-agent integration.** Map only explicitly supported effect requests to the graph and leave arbitrary FFmpeg filters on their existing route. Reuse one owned audio graph instead of adding another media element or independent clock.

## R62 — Apply an explicit audio-sync offset by remapping one track

**New timeline-feature path · P1 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Sandbox split-MSE pilot; static offset first, paused update second. **Related cards:** R15, R35, R52.

**Proposed mechanism.** When the user requests an audio-delay adjustment, retime copied audio in its own SourceBuffer rather than decoding and filtering the entire presentation. Keep video timestamps and the playback owner unchanged. This changes intended timing, not the encoded samples.

**What is new.** R52 preserved an existing source rate and earlier tests preserved source offsets. This card adds an explicitly requested timing effect and its reversible update contract.

**Source basis.** MSE provides timestampOffset and append-window controls for subsequent coded frames; changing the property does not retime audio already buffered. The successful prior split-buffer work supplies a starting harness, not proof of this effect. [S1, L3]

**Smallest decisive experiment.** Create synchronous video flashes and audio impulses with a known nonzero origin. At initial construction apply positive and negative sample-aligned offsets, then seek to interior points. Next, while paused, replace only the affected buffered audio around the current region and restore intent. Compare with a host reference having exactly the same time mapping.

**Comparison baseline.** Existing remux/Hybrid reference carrying the same requested delay. Leave all untouched source packets and video timing identical; account for legal preroll and both source/presentation clocks.

**Correctness and ownership.** Measure impulse/frame alignment digitally. Negative offsets may need earlier input; positive offsets may expose a leading gap. Reject an unrepresentable beginning/end or define a separately authorized boundary policy rather than adding silence, dropping audio or clamping time invisibly.

**Measurements.** Audio regenerated/reappended bytes, video/MSE identity, recovery latency and sample-boundary behavior. Separately report whether requested delay is represented exactly or limited by coded-frame granularity.

**Stop / reject.** Do not claim that setting timestampOffset edits existing buffers. No independent audio element or ad hoc dual-clock synchronization. Keep streaming discontinuities, arbitrary live updates and exact sub-frame trimming out of the first profile.

**Local-agent integration.** The local agent must connect the operation to source-scoped timeline generations, explicit user intent, cancellation and source-time diagnostics. Live playing updates require their own transition qualification.

## R63 — Use the browser image decoder for qualified MJPEG video

**New video-decoder adapter hypothesis · P2 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Sandbox compressed-image decode/presentation pilot; complete mpv-timed A/V integration is local-only. **Related cards:** R24.

**Proposed mechanism.** For a supported Motion-JPEG subset, forward each compressed frame to createImageBitmap and present it with bounded ownership, instead of decoding JPEG in FFmpeg/Wasm. Apply only a necessary, verified MJPEG-to-JPEG header adapter. The potential gain is a different decoder implementation, not fewer decoded frames.

**What is new.** Earlier alternative presenters started with already decoded pixels. This changes which decoder consumes the compressed video, using the image API rather than pretending WebCodecs or MSE supports the input.

**Source basis.** FFmpeg has a mjpeg2jpeg bitstream filter that constructs JFIF headers and required Huffman tables for an AVI1 subset. HTML accepts Blob input to createImageBitmap and provides explicit release. Those primitives do not guarantee faster JPEG decoding or an audiovisual clock. [F2, S6]

**Smallest decisive experiment.** Start with self-contained baseline JPEG frames with known colors and timestamps, then one genuine default-table AVI1 case. Compare browser image output against a defined full-resolution reference. Run a bounded sequence at the original frame cadence with at most a small number of pending decodes and release obsolete results after seek.

**Comparison baseline.** Host FFmpeg decode plus an equivalent presentation/copy path as a component control; include browser frame wrapping and drawing costs. Do not compare this native browser result to an unavailable Wasm implementation and call it a Demuxe speed win.

**Correctness and ownership.** Preserve entropy-coded image data, dimensions, field/progressive status, color/range/orientation and every required frame. Do not blindly insert default Huffman tables into arbitrary JPEGs. Measure stale promise results and ImageBitmap.close ownership under cancellation.

**Measurements.** Decode-to-present cost, retained decoded bytes, late/dropped frames, bitmap/object churn and optional header-copy work. Browser image decode is still decoding; hardware acceleration is not assumed.

**Stop / reject.** Stop on unsupported MJPEG variants, color/field differences or no meaningful component benefit. A video-only sandbox proof cannot qualify a new A/V player; do not bolt on a separate unsynchronized audio clock.

**Local-agent integration.** If promising, implement as a narrow decoder adapter feeding the existing authoritative mpv timing/presenter contract, not as another public playback mode. Preserve the FFmpeg decoder fallback.

## R64 — Decode directly at reduced resolution for explicit previews

**New preview/economy decoder policy · P2 · Risk: Medium · PROPOSED / NOT TESTED**

**First environment:** Host FFmpeg decoder experiment plus sandbox presentation; verify actual installed lowres support first. **Related cards:** R55.

**Proposed mechanism.** For preview thumbnails or an explicitly requested reduced-detail mode, use a decoder’s supported lowres path instead of reconstructing a full frame and then scaling it down. Never infer permission merely from a small CSS video element.

**What is new.** R55 cached completed previews; this reduces work on a cache miss. It is also distinct from a cheaper presenter, because reconstruction resolution changes inside the decoder.

**Source basis.** FFmpeg exposes decoder-specific max_lowres, and its versioned MJPEG and MPEG-2 decoder declarations advertise support. This is not a general H.264, HEVC or AV1 facility, nor proof of equal-quality results. [F3, F4, F5]

**Smallest decisive experiment.** Use one progressive MJPEG and one supported MPEG-2 fixture. Compare full decode plus scaling with lowres reconstruction at the same final thumbnail dimensions, retaining timestamps and source frame choice. Test a direction-reversing preview trace and restoration to full-resolution playback.

**Comparison baseline.** The existing uncached full-resolution preview path with the same final display size and output cadence. Keep cache policy, frame selection and file-read availability fixed.

**Correctness and ownership.** Record actual reconstruction dimensions and pixel differences against full decode plus the declared scaler. Reduced-resolution reconstruction may not match that reference exactly. Label the intentional quality change and fail any promise requiring original pixels or frame-accurate exported imagery.

**Measurements.** Decoder CPU, output bytes, scaling/upload cost, thumbnail latency and restoration cost. Include producer work even if browser display is prebuilt; do not claim end-to-end Wasm savings.

**Stop / reject.** Skip decoders without lowres support. Do not substitute skip_loop_filter, dropped reference frames or reduced frame rate. If visual quality or the cost of restoring full decoding defeats the use case, park it.

**Local-agent integration.** Local admission must require explicit preview/economy intent and identify the exact compiled decoder capability. Keep normal playback full-quality and route this beneath the public API rather than silently changing media semantics.

## R65 — Isolate a selected program from multi-program transport streams

**New source-selection/remux profile · P2 · Risk: Medium · PROPOSED / NOT TESTED**

**First environment:** Host FFmpeg construction plus sandbox MSE destination pilot; no live/network qualification. **Related cards:** R07.

**Proposed mechanism.** Treat a requested TS program as the playback unit. If that program contains browser-compatible H.264/AAC, select and packet-copy only its streams to the known MSE packaging path instead of letting unrelated programs influence compatibility or loading extra decoders.

**What is new.** Earlier TS cases contained one presentation, and alternate-audio cases addressed tracks within it. A program has its own stream group and identity; treating every stream in the transport as part of one requested presentation is the new problem to test.

**Source basis.** FFmpeg provides program-scoped p:program_id selectors and compressed stream copy. This supplies a construction primitive, not an assurance that Demuxe currently mishandles programs or that arbitrary program transitions work. [F6]

**Smallest decisive experiment.** Generate a two-program TS with different video labels and left/right audio markers. Make the chosen program H.264/AAC; include an unrelated unsupported-audio program as a negative control. Select the requested PIDs, copy into fMP4 and verify playback. Repeat after reordering program declarations without changing program identities.

**Comparison baseline.** Plain direct source when it can satisfy the exact requested program, otherwise explicit host selection/remux and the existing compatibility route where runnable. Do not compare one correct program against a player that happened to choose another.

**Correctness and ownership.** Verify program/PID-to-source-track mapping, packet payloads, DTS/PTS origins, caption/data requirements, seek and EOF. A PMT change, PID reuse or a missing requested stream is not permission to substitute a different program.

**Measurements.** Which streams are parsed versus actually decoded/muxed, output bytes, unnecessary engine loads and selected-program startup. Filtering programs does not necessarily reduce source network bytes because TS packets remain interleaved.

**Stop / reject.** Do not assume all other streams are irrelevant without an explicit program request. Keep PCR/timestamp repair within the maintained qualified construction. Abort unknown dynamic programs rather than building another streaming controller.

**Local-agent integration.** Local work should expose coherent program/track identity and preserve transport/security policy, using existing FFmpeg program metadata. First check for an equivalent current feature; if present, contribute regression coverage rather than another implementation.

## R66 — Communicate the requested start position before first-data preparation

**Focused startup optimization · P1 · Risk: Medium · PROPOSED / NOT TESTED**

**First environment:** Sandbox direct Blob-video pilot; real HTTP-byte impact requires the local environment. **Related cards:** R02, R44.

**Proposed mechanism.** For resume/chapter playback, let the Native candidate know the desired position before preparing initial data at time zero. Compare assigning currentTime while HAVE_NOTHING against waiting for loadeddata and then seeking. Retain one candidate rather than a throwaway player.

**What is new.** R44 restricted the media supplied to MSE; this uses the direct media element’s own early-start mechanism. It may avoid a redundant initial presentation and callback cycle without inspecting or repackaging every packet.

**Source basis.** HTML defines a default playback start position when currentTime is set before metadata. The inspected Demuxe Native load(url) sets the source, calls load and awaits loadeddata; audit its caller before asserting redundant time-zero work. [S4, D2]

**Smallest decisive experiment.** Use a long-GOP MP4 and a nonzero-start variant, requesting an interior chapter before play. Compare three exact sequences: loadeddata then seek, early currentTime after source/load initiation, and a temporal media-fragment URL only if actually honored. Keep initialization, metadata and source validation costs inside the measured interval.

**Comparison baseline.** Current late-seek behavior with identical source bytes, readiness requirements and user gesture. Include a start-at-zero control so complexity is not added to the common case without benefit.

**Correctness and ownership.** Confirm the first visible/audible requested content, not only open-promise completion. Repeated load calls can reset state; test ordering, paused open, out-of-range requests, source replacement and cancellation. Inspect actual readiness and source origin rather than hard-coding browser behavior.

**Measurements.** Open-to-correct-frame/audio observation, extra preparation/seek events and retained objects. Blob tests cannot establish fewer HTTP range requests or saved network bandwidth.

**Stop / reject.** No preload-only timing trick, forced autoplay or weakened audio/track verification. If the browser already performs the same work or the existing caller supplies the early target, keep only the regression and do not add a parallel mechanism.

**Local-agent integration.** Pass target intent through the maintained candidate interface and validate output at that target. Re-qualify Firefox’s prepared-versus-presented distinction; do not wait for a paused compositor callback to establish readiness.

## R67 — Hibernate long-paused presentations under an explicit memory policy

**New lifecycle/memory tradeoff · P2 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Sandbox pause/release/restore pilot with capped resources and a scripted idle trigger. **Related cards:** R18, R27.

**Proposed mechanism.** For a user-paused VOD player or many idle embedded players, keep a compact source/position/settings snapshot and a bounded still image, then retire expensive presentation resources after an explicitly configured idle policy. Recreate the same accepted plan on resume rather than keeping every decoder and MSE buffer alive indefinitely.

**What is new.** Earlier caches retained prepared bytes or compiled code, and disabled-track work followed explicit track intent. This deliberately trades resume cost for lower idle resource retention; it is not a claim that pause or CSS hiding automatically frees decoders.

**Source basis.** HTML recommends releasing finished media resources and notes limited simultaneous decoder resources. It does not promise a particular amount of memory reclaimed or an instant restart from a saved position. [S4]

**Smallest decisive experiment.** Compare keep-paused versus controlled release/restore on one player, then a small capped set of idle players. Save position, source identity, track intent, gain/rate and caption state. Retire pending work and media resources, retain only a declared metadata/image/encoded-byte budget, and restore on an actual resume request.

**Comparison baseline.** Normal pause with the same elapsed observation and no artificial cache flushing. Include frequent short pauses to demonstrate when the policy should NOT trigger.

**Correctness and ownership.** No hibernation during audible playback, PiP, active casting or an unqualified live source. Restore exact requested tracks and intent without late old callbacks. Destroy a hibernated instance and cancel during restore. Preserve accessibility and document what public buffered ranges mean after release.

**Measurements.** Owned-resource counts, process RSS with caveats, retained cache bytes, resume-to-correct-output and cumulative work over pause/resume traces. If the browser already reclaims comparable resources, there may be no useful gain.

**Stop / reject.** Do not treat page visibility alone as permission to stop media or clear authorization. Avoid repeated release/recreate loops and never force machine memory exhaustion to demonstrate a benefit.

**Local-agent integration.** Needs a deliberate lifecycle/API policy plus source authorization refresh and bounded caches. Use existing teardown and candidate construction, not a second dormant decoder-pool subsystem.

## R68 — Process only the audio region that an explicitly requested crossfade changes

**New selective-processing route · P3 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Host audio construction + sandbox MSE pilot; maintained Wasm cost and integration are local-only. **Related cards:** R35, R36, R53.

**Proposed mechanism.** For a requested transition between compatible queue items, packet-copy the unchanged audio before and after the seam, decode/mix/encode only a bounded seam region, and preserve original video packets. Start with equal-rate integer PCM/FLAC so codec-lossy re-encoding is not required outside the intentional effect.

**What is new.** R35 switched tracks without a requested mix, R36 concatenated items, and R53 ramped gain on one signal. This creates a small processed audio bridge for a real crossfade rather than processing every sample in both clips.

**Source basis.** FFmpeg acrossfade provides a reference signal operation. Existing MSE timestamp/initialization mechanisms and prior queue pilots motivate the splice test, but neither guarantees that copied FLAC frames and a new bridge can form the required valid stream. [F7, S1, L3]

**Smallest decisive experiment.** Specify the source-to-presentation mapping first: overlap duration, video cut and caption mapping. Make a full-render reference using a declared integer rounding/mix rule. Build a bridge covering the fade plus required whole-frame boundaries; copy unaffected packets, attach valid initialization as needed and compare decoded output inside and outside the seam.

**Comparison baseline.** The same requested effect rendered over the complete source intervals, including all conversion work. Comparing against plain no-crossfade playback would be invalid.

**Correctness and ownership.** Outside the declared processing interval, decoded samples and video payloads must match. Inside it, match the declared reference and headroom policy; the crossfade intentionally changes samples and can require rounding. Verify FLAC numbering/configuration, timestamp continuity, EOF and seeking on both sides.

**Measurements.** Seconds decoded/encoded versus source duration, packet-copy share, bridge preparation/startup, generated bytes and whole host/browser cost. An already-generated bridge is only a destination test, not a live cost result.

**Stop / reject.** Do not call the overall route lossless or silently shorten the queue. Reject unknown mixed rates/layouts and codec priming, and do not rewrite general FLAC/MP4 logic if safe frame-boundary copying is impractical. No general video transcoding.

**Local-agent integration.** Integrate only as an explicit queue effect with a qualified source/timeline profile. The application must authorize mixing and any overlap; a generic allow-lossy flag is not sufficient semantics.

## R69 — Separate decoder compatibility from per-source initialization identity

**Reconfiguration-avoidance hypothesis · P2 · Risk: High · PROPOSED / NOT TESTED**

**First environment:** Sandbox decision/sequence checks; a meaningful production saving requires local reconfiguration instrumentation. **Related cards:** R36, R43, R27.

**Proposed mechanism.** Use a strict decoder-configuration fingerprint to recognize when a new wrapper or initialization segment does not require replacing an entire playback backend. Maintain a DIFFERENT source/track/timeline identity and still append required initialization data. Begin with exact codec-extra-data equality, not speculative semantic rewriting of parameter sets.

**What is new.** R27 shared immutable compiled code, while R43 crossed a real video configuration change. This asks whether harmless wrapper-level differences or object identity cause avoidable application reconfiguration when the complete codec contract is unchanged.

**Source basis.** Chromium’s inspected VideoDecoderConfig::Matches includes codec/profile, dimensions, crop/display geometry, extra data, color/HDR, encryption and other fields. Demuxe already constructs codec descriptions and prefixes. These are reasons to audit precision, not evidence that Demuxe currently restarts unnecessarily. [C1, D3]

**Smallest decisive experiment.** First instrument the existing local implementation: skip the project if no redundant reconfiguration occurs. In the sandbox, test initialization variants with identical decoder payloads but different container timing/track identities, all with explicit mappings. Use exact extra-data bytes plus packet format, codec string and all required presentation fields in the key.

**Comparison baseline.** The existing observed configure/changeType/backend-replace policy, not an invented always-restart implementation. Count browser-owned versus application-owned reconfiguration separately.

**Correctness and ownership.** Changes to SPS/PPS contents under the same ID, NAL-length width, packet framing, bit depth, color/range, crop, alpha and encryption must invalidate the key. Source or credential changes always retire obsolete ownership even when the codec fingerprint matches. Required new init segments are never skipped.

**Measurements.** Avoided application configure/replacement operations, continuity and key-construction cost. Test whether Chromium already coalesces equivalent configurations; identical MSE identity alone proves no decoder reuse.

**Stop / reject.** Do not compare only codec name/resolution or sort/remove opaque extra data blindly. Unknown fields force conservative reconfiguration. If the browser and current app already avoid this work, contribute tests rather than adding another cache.

**Local-agent integration.** Local-agent audit first, then integrate only a demonstrated redundant boundary. Keep this independent of capability-success caches, shared mutable decoders and automatic cross-engine switching.

## Shared experiment contract

**Start with actual availability.** Record browser/version/flags, source revision, input hashes, available codecs and optional runtimes. Use unmodified browser defaults for qualified candidates; keep flag-only results separate. No hidden network or secure-origin workaround.

**Compare the same requested presentation.** Try original playback and existing packet-copy paths first. Hold requested tracks, channel layout, subtitle rendering, source-time mapping, quality and permitted effects fixed. New downmix, reduced detail, delay or crossfade require separate explicit consent.

**Use useful controls.** Include a negative control that can reveal the proposed failure: wrong-track tones, malformed box size, unrecognized caption state, changed config under the same ID, reset during pending decode, or source replacement. Do not use missing output as a performance win.

**Keep one audiovisual owner.** MSE experiments keep a single media element. Video-only image/preview pilots remain video-only evidence until integrated with an authoritative clock. Every request/result is scoped to source, timeline and configuration generations.

**Measure honest work.** First prove complete usable output; then separate source preparation, media construction, browser presentation, memory retention and teardown. Prebuilt byte tests measure the destination, not live adaptation. Include all required preload/conversion work in claimed end-to-end cost.

**Bound the experiment.** Use one small fixture per hypothesis, plus its decisive edge/negative control. Reuse saved harnesses without overwriting them. Stop at the first structural blocker; only passing cases receive a second counterbalanced screen.

**Preserve uncertainty.** Use PROPOSED, BLOCKED, INCORRECT, INCONCLUSIVE, PROMISING or NOT WORTH COMPLEXITY. Do not infer physical speakers, hardware acceleration, sample-perfect splices, network savings or end-to-end Demuxe qualification from counters alone.

**Create an integration handoff.** Save code, source/runtime/fixture hashes, raw observations, exact commands and the smallest reproduction. State what is host-only, browser-only, mocked or real; no automatic admission or production-default change from one pilot.

## Assignment and local-agent boundaries

**First sandbox pilots.** R59 selected-track MP4 view; R61 channel graph; R62 audio delay; R66 early start-position intent. These use existing browser primitives and may remove work or preserve features without a new decoder build.

**Sandbox, conditional source/API availability.** R58 cross-codec switch; R60 in-band captions; R63 image decoder; R64 lowres preview; R65 selected TS program; R67 hibernation; R68 seam processing. Screen fixture/codec availability before writing a general adapter.

**Local evidence first.** R69 must first demonstrate redundant reconfiguration in the real application. A synthetic always-restart baseline would not establish a Demuxe opportunity.

**Local integration for all passing cards.** Use current Demuxe, matching Wasm/glue, source authorization, exact track IDs, public effects and real worker generations. Preserve the existing HLS/DASH ownership model rather than creating a second controller.

**Still local/platform-specific.** Stock Chrome/Firefox/Safari and hardware testing, physical surround, real HTTP ranges/CORS/auth, secure-origin-only APIs, pinned decoder builds and actual Hybrid/Software timing. The sandbox does not acquire these merely because source code is readable.

**Continue existing high-value work.** Keep R51/R57 true integer-lossless adaptation and multichannel qualification moving locally. Repair the R46 edit/preroll/observation uncertainty before promotion. Do not revive R33, R50 or R56 without a genuinely different mechanism.

## Source register

External sources were accessed on 17 September 2026. Versioned source and rolling documentation are distinguished below. References establish mechanisms, not success of the proposed complete plans.

### [L1] Saved R43–R57 standalone results
demuxe-r43-r57-lab/RESULTS_R43_R57.md
Supplied lab report; not rerun. R43 video configuration changes; R46 first-frame uncertainty; R51 integer-lossless inputs; R57 internal six-channel observations. Applies only to the recorded Chromium 144 / host FFmpeg 7.1.5 environment.

### [L2] Saved R43–R57 local integration handoff
demuxe-r43-r57-lab/LOCAL_AGENT_HANDOFF_R43_R57.md
Supplied handoff; not rerun. Preserves source/clock/track ownership, exact-artifact and cross-browser gates.

### [L3] Saved R31–R42 standalone results
demuxe-r31-r42-lab/RESULTS_R31_R42.md
Supplied lab report; not rerun. R35/R36 audio and queue transitions, R37/R38 recovery, R41 simple cues and R42 ownership. Moving clocks and marker observations are not sample-perfect splice proof.

### [D1] Demuxe main branch metadata
https://api.github.com/repos/Jagalite/demuxe/branches/main
Connected GitHub read. Main resolved to 9abfd1b22300cf273fc0bd1a8290261281c8f3f3 during this research pass. No repository mutation.

### [D2] Demuxe NativePlayer
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/src/internal/native-player.ts
Pinned project source. Read source lines 1–190: source assignment/load, scalar gain, readiness/output evidence and resource ownership. Blob 564d52d2cfb97999841f6593b8d1a208fb020f1a.

### [D3] Demuxe video-codec configuration bridge
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/web/video-codec-config.js
Pinned project source. Codec descriptions, prefixes, dimensional bounds and configuration construction. Blob 11122d8708338645559cb97193dd2f17b8f60378. Not an exhaustive audit of every caller.

### [C1] Chromium VideoDecoderConfig::Matches
https://github.com/chromium/chromium/blob/main/media/base/video_decoder_config.cc
Chromium development-source observation. Observed blob 45f6448687fcd1e864590ed5a3a534381bf5e926. Compares codec/profile, geometry, extra data, encryption, color/HDR and other presentation fields. Rolling main is not proof of the installed browser implementation.

### [S1] Media Source Extensions, 7 August 2026 draft
https://www.w3.org/TR/2026/WD-media-source-2-20260807/
Primary specification. changeType, initialization/configuration requirements, timestamp offsets, removal, random-access points and decoder ownership. A specification primitive does not establish success of a proposed combination.

### [S2] File API
https://www.w3.org/TR/FileAPI/
Primary specification; retrieved 17 September 2026. Blob/File byte sequences, Blob parts, slices, object-URL lifetime. No blanket zero-copy or browser-memory guarantee.

### [S3] MP4 Registration Authority: boxes
https://mp4ra.org/registered-types/boxes
Primary format registry. Registers trak, moov, mdat, free/skip and related boxes. The proposed use of equal-sized free space inside a selected-track view still requires format/parser validation.

### [S4] HTML media elements
https://html.spec.whatwg.org/multipage/media.html
Primary living standard. Default playback start position when currentTime is assigned before metadata; resource selection/load and resource-release guidance. Does not promise physical output or a fast resume.

### [S5] Web Audio API
https://www.w3.org/TR/webaudio-1.0/
Primary specification. MediaElementAudioSourceNode, ChannelSplitterNode, ChannelMergerNode and GainNode. Splitters expose channel order, not semantic channel names; CORS, context rate and final device mixing remain relevant.

### [S6] HTML ImageBitmap and animation APIs
https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html
Primary living standard. createImageBitmap from Blob, orientation/color options, transfer and close. No hardware JPEG acceleration or audiovisual clock is implied.

### [S7] requestVideoFrameCallback specification
https://wicg.github.io/video-rvfc/
Primary API draft. Callbacks are best effort, may arrive a vsync late, and need not observe every presented frame. Relevant to validating R46 rather than overturning its saved verdict.

### [F1] FFmpeg H.264/HEVC SEI parsing, n7.1.1
https://github.com/FFmpeg/FFmpeg/blob/n7.1.1/libavcodec/h2645_sei.c
Pinned upstream source. Read lines 1–245. Registered GA94 data delegates to ff_parse_a53_cc. Blob 62369dd37f0fca1991495d5c269e22f5d25999da. Header parsing is not itself a complete caption decoder.

### [F2] FFmpeg mjpeg2jpeg bitstream filter, n7.1.1
https://github.com/FFmpeg/FFmpeg/blob/n7.1.1/libavcodec/bsf/mjpeg2jpeg.c
Pinned upstream source. JPEG/JFIF header and Huffman-table insertion for an admitted MJPEG/AVI1 subset without video decoding. Blob f545e9438df856230dbca47d8d13c19827ef04c8.

### [F3] FFmpeg 7.1 AVCodec capabilities
https://ffmpeg.org/doxygen/7.1/structAVCodec.html
Versioned official API reference. max_lowres describes decoder-specific support; query/check the actual build.

### [F4] FFmpeg 7.1 MJPEG decoder source
https://ffmpeg.org/doxygen/7.1/mjpegdec_8c_source.html
Versioned official source reference. ff_mjpeg_decoder advertises max_lowres = 3. This does not make low-resolution reconstruction equivalent to full reconstruction followed by scaling.

### [F5] FFmpeg 7.1 MPEG-1/2 decoder source
https://ffmpeg.org/doxygen/7.1/mpeg12dec_8c_source.html
Versioned official source reference. Software MPEG decoder declarations advertise max_lowres = 3. No equivalent general H.264/HEVC/AV1 claim.

### [F6] FFmpeg command-line stream selection
https://ffmpeg.org/ffmpeg.html#Stream-specifiers
Official rolling documentation. Program-scoped p:program_id and stream selectors allow selecting a program; copy selects compressed forwarding. Transport timestamp correctness must be checked independently.

### [F7] FFmpeg acrossfade filter
https://ffmpeg.org/ffmpeg-filters.html#acrossfade
Official rolling documentation. Reference for a requested two-input crossfade; a filter is not a packet-copy splice implementation. Use only options present in the tested/pinned version.

### [F8] FFmpeg qt-faststart, n7.1.1
https://github.com/FFmpeg/FFmpeg/blob/n7.1.1/tools/qt-faststart.c
Pinned upstream source. Read lines 1–125. Relocation requires patching chunk offsets and has a narrow source profile. Blob 46950a5cf44cfce99d812f74582fe00491165078. R59 starts with no relocation.

### [X1] Video.js: in-band captions in fMP4
https://videojs.org/blog/inband-captions-support-with-vhs
Primary project implementation account; historical. Describes mux.js CaptionParser extracting CEA-608 from fMP4. Establishes this is an existing industry technique, not a Demuxe-exclusive invention; verify current APIs before reuse.

## Work log

Read the supplied R43–R57 results and handoff; reviewed prior R01–R57 scope; fetched current Demuxe branch metadata and focused source files; read primary FFmpeg, Chromium and web-platform references; authored this backlog and agent catalogue. No playback, fixture generation, benchmark, production edit, commit or background job was performed.
