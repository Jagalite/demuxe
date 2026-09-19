# Demuxe: New Routing and Optimization Ideas

**Research backlog · 17 September 2026 · 30 scoped hypotheses**

Source review and experiment design only. No new media testing, builds or benchmarks were performed for this document.

**Purpose.** A source-grounded backlog for agents to investigate, not a claim that 30 new routes already work. Each card states the mechanism, the evidence behind its primitive, the experiment that could disprove it, and the conditions under which it should be abandoned.

**Baseline.** Demuxe main was read at 9abfd1b22300cf273fc0bd1a8290261281c8f3f3. The finite Native/Hybrid/Software plan registry remains the starting point. This is a focused source review, not an exhaustive audit or a request to replace the player architecture. [D1]

**Evidence boundary.** Every candidate in this document is untested in this research pass. Existing chat-reported experiments are context, not newly reproduced results. In particular, earlier split-buffer and float-PCM progress statements are treated as leads, not as durable end-to-end qualification.

**What is new.** New means an additional Demuxe hypothesis or a sharper unresolved experiment, not an invention unique to the media industry. Follow-on cards extend prior ideas instead of relabeling ordinary Native playback, remux, gain, FLAC, or buffered seeking as new discoveries.

**No universal cost order.** An eligible Native path is often attractive, but a longer pipeline is not mathematically dominated solely by its stage count. Measure complete equivalent output. Source support, startup, memory, device resources and requested fidelity can change the tradeoff.

## Recommended first assignments

| Cards | Focus | Why start here |
|---|---|---|
| R01 + R02 | Reuse source and startup work | Reduce duplicated inspection, reads and candidate reconstruction; tackle observable startup overhead first. |
| R04 + R05 | Improve MSE delivery and ownership | Test transport chunking separately from mux fragment changes; isolate UI load from MSE scheduling. |
| R19 + R20 | Keep more subtitle types on Native | Embedded ASS and PGS are feature blockers that could be handled independently of video decoding. |
| R21 + R22 | Cheaper subtitles and a better destination | Tile reuse and Document PiP may improve rich-caption sessions without adding another codec path. |
| R15 + R17 | Retain valid video through audio changes | First prove per-track transactions; then investigate unequal-tail continuation and restoration. |
| R06 | Explore a broader deployment path | A non-pthread preparation worker could expand where remux works; it needs a real matching Wasm build. |

## Source findings that change the experiment plan

**Direct and MSE are different destinations.** The inspected direct-source path uses FFmpegDemuxer; MP4/MSE has its own parser and admitted audio sample entries. The inspected MP4 parser has no raw PCM entry. Do not infer float PCM MSE from direct-file playback. These are development-source observations, not a definitive inventory of Chrome 152. [C1, C2]

**Chunk delivery is different from fragmentation.** Chromium can emit parsed MP4 samples before every sample in a segment has arrived. R04 asks whether transport buffering can shrink without changing fragment timestamps. It cannot force FFmpeg to emit bytes before its muxer is ready. [C2]

**MSE-for-WebCodecs is a real source-level lead.** appendEncodedChunks is present in Chromium IDL, but its feature is experimental. R30 is therefore a frontier study, not a product-ready fast path. [C3, C4]

**Split buffers are not a free unequal-tail fix.** MSE computes buffered availability from active-buffer intersections. R17 must address track lifetime, backward restoration and the difference between an ended track and a temporarily missing segment. [M1]

**Bitmap subtitles have useful independent primitives.** FFmpeg emits PGS bitmap rectangles and palettes, with display/clear-event end semantics. R20 explores overlaying those without video burn-in or a full custom video path. [F3]

## Catalogue

P1 = investigate early; P2 = dependent/larger tradeoff; P3 = frontier or narrow policy option. These priorities are engineering judgments, not measured performance rankings.

| ID | Idea | Type | Priority | First usable environment |
|---|---|---|---|---|
| R01 | Share source reads and inspection across candidates | New architecture hypothesis | P1 | Demuxe source + browser |
| R02 | Promote useful startup work instead of reopening | Follow-on experiment | P1 | Demuxe source + browser |
| R03 | Coalesce range reads around useful media boundaries | New optimization hypothesis | P1 | Host fixture server + browser |
| R04 | Stream inside a fragment instead of making it smaller | New optimization hypothesis | P1 | Host FFmpeg + browser |
| R05 | Move MSE ownership off the window thread | New execution-plan hypothesis | P1 | Browser-only first; Demuxe integration later |
| R06 | Offer a non-pthread remux path without isolation | New execution-plan hypothesis | P2 | Matching Emscripten build + browser |
| R07 | Close the HEVC-in-TS browser-owned construction gap | Follow-on route expansion | P1 | Host FFmpeg + browser; Wasm later |
| R08 | Keep display-only transformations out of CPU video filters | New policy/implementation hypothesis | P1 | Browser + reference images |
| R09 | Pass already-valid fragmented media through unchanged | New fast-path hypothesis | P2 | Host fixture server + browser |
| R10 | Screen float-preserving destinations before writing adapters | Follow-on feasibility gate | P2 | Browser capability/source study first |
| R11 | Test an explicit quantized-FLAC policy using the normal decoder | New fidelity-option hypothesis | P2 | Host FFmpeg + browser; Wasm later |
| R12 | Use a browser audio encoder for the permitted lossy branch | New execution-plan hypothesis | P2 | Audio decode source + browser |
| R13 | Treat intentionally disabled tracks as removable work | New policy hypothesis | P1 | Demuxe source + browser |
| R14 | Avoid duplicate resampling and oversized audio work batches | New optimization hypothesis | P1 | Matching mpv audio path + browser |
| R15 | Make split-buffer audio switching transactional | Follow-on architecture experiment | P1 | Browser-only; adaptation integration later |
| R16 | Keep a stable audio output format through frequent switches | New tradeoff hypothesis | P2 | Host FFmpeg + browser; Wasm later |
| R17 | Model unequal tails as explicit track-lifetime phases | Follow-on architecture experiment | P2 | Browser-only first |
| R18 | Cache prepared media by timeline and transformation recipe | New optimization hypothesis | P2 | Demuxe source + browser |
| R19 | Extract embedded ASS while leaving video Native | New complete-plan hypothesis | P1 | Demux/libass builds + browser |
| R20 | Render bitmap subtitles without burning them into video | New complete-plan hypothesis | P2 | Subtitle decoder build + browser |
| R21 | Cache subtitle tiles and schedule only useful redraws | New optimization hypothesis | P1 | Existing NativeASS + browser |
| R22 | Use Document PiP to keep Native subtitles and controls | New destination-plan hypothesis | P1 | Browser-only |
| R23 | Fuse qualified video effects into one GPU presentation pass | Follow-on optimization experiment | P2 | WebGPU/WebGL browser + matching frames |
| R24 | Compare raw-YUV VideoFrame presentation with existing Software output | Follow-on alternative presenter | P2 | Matching Software build + browser |
| R25 | Try a generated video track as an alternative presenter | New experimental sink hypothesis | P3 | Feature-qualified browser; integration later |
| R26 | Replace polling chains with bounded credits and deadlines | New optimization hypothesis | P1 | Demuxe source + browser |
| R27 | Share immutable compiled code, not live playback state | New packaging/cache hypothesis | P1 | Browser first; build variants later |
| R28 | Make streaming representation choices aware of complete-plan feasibility | New integration hypothesis | P2 | Qualified streaming implementation required |
| R29 | Offer explicit compatible-core extraction before audio re-encoding | New fidelity-option hypothesis | P3 | Host FFmpeg + browser; Wasm later |
| R30 | Investigate containerless encoded-chunk MSE | New experimental API hypothesis | P3 | Experimental Chromium only |

## R01 — Share source reads and inspection across candidates

**Delivery · New architecture hypothesis · P1 · Risk: Medium**

**First environment:** Demuxe source + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Introduce one source-identity-scoped broker for inspection, controlled remux, subtitle extraction and mpv reads. Retire a failed candidate without discarding safe immutable byte ranges or reparsing the same headers. This shares source evidence and bytes, not mutable decoder state.

**Source basis.** Demuxe has a finite admission registry; its media-processing routes do not all have the same transport prerequisites. Streams supplies the backpressure/cancellation primitives, not a ready-made shared media cache. [D1, S1]

**First agent experiment.** Instrument duplicate byte ranges and repeated inspection on direct failure followed by remux/Hybrid, and on attaching embedded subtitles. Prototype a small shared read cache only in controlled-fetch routes. Direct <video> network reads remain browser-owned and are not magically observable or reusable.

**Pass condition.** Fewer duplicated application reads and lower open/retry cost, with identical source identity and authorization outcomes; one consumer cancel cannot abort another live consumer.

**Stop / reject.** Stop if credentials, mutable resources or memory cannot be isolated. Do not add a service worker solely to capture native requests. Never merge caches by URL alone.

**Likely code touchpoints (verify before editing):** source-probe.js; range-reader.js; file-reader.js; candidate cleanup.


## R02 — Promote useful startup work instead of reopening

**Startup · Follow-on experiment · P1 · Risk: Medium**

**First environment:** Demuxe source + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Let one candidate move from prepared to presented to accepted without rebuilding the same media element or repeating demux startup. Gather only the facts needed for the current request before opening; defer optional metadata and fonts until needed.

**Source basis.** Browser acceptance and Demuxe feature admission are distinct. Chromium direct demuxing constructs supported streams and can reject individual stream configurations, so a first video image alone cannot prove required audio. [C1, D1]

**First agent experiment.** Trace open-to-first-frame as source validation, inspection, runtime loading, candidate preparation, play request and acceptance. Compare the current path with retained-candidate promotion on ordinary MP4, unknown-audio MKV, paused open and missing-audio controls.

**Pass condition.** Reduce duplicated setup or avoidable startup waits without audible speculative playback. A paused-ready state remains different from actual output verification.

**Stop / reject.** Stop if faster startup requires accepting missing tracks, bypassing integrity checks, or labeling a timeout as codec incompatibility. Do not run two complete players as a routine probe.

**Likely code touchpoints (verify before editing):** unified-player.ts; native-player.ts; runtime capability evidence.


## R03 — Coalesce range reads around useful media boundaries

**Delivery · New optimization hypothesis · P1 · Risk: Medium**

**First environment:** Host fixture server + browser. **Dependencies:** R01. **Status:** Untested hypothesis.

**Proposed mechanism.** Use bounded adjacent-read coalescing and metadata/keyframe-aware prefetch rather than one network request per small AVIO read. Maintain separate budgets for startup metadata, active playback and speculative seek lookahead.

**Source basis.** FFmpeg exposes probe and I/O buffering controls; increasing probe coverage may increase startup work. Streams defines consumer-driven backpressure. These do not choose Demuxe’s network chunk size for it. [F1, S1]

**First agent experiment.** Compare fixed small chunks with adaptive coalescing on front-index MP4, tail-index MP4, MKV cues and interrupted seek scrubbing. Use the same range server with controlled latency; record received and abandoned bytes separately.

**Pass condition.** Fewer requests and lower seek/start delay without substantially more discarded download work or exceeding the total byte budget.

**Stop / reject.** Stop if optimizing request count increases useful-playback latency or downloads most of a movie a viewer skips. Preserve exact range validation and source identity.

**Likely code touchpoints (verify before editing):** range-reader.js; source worker; AVIO request bridge.


## R04 — Stream inside a fragment instead of making it smaller

**Delivery · New optimization hypothesis · P1 · Risk: Medium**

**First environment:** Host FFmpeg + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Keep already-correct fragment timing and deliver bytes to MSE incrementally, rather than waiting in JavaScript for the entire fragment response. Distinguish transport chunks, muxer flush boundaries and video random-access points.

**Source basis.** The inspected Chromium MP4 parser can send parsed samples with all_samples_in_segment_received=false. That supports investigating partial delivery; it does not prove a particular fragment will render before all interleaved dependencies arrive. [C2]

**First agent experiment.** Feed identical prebuilt fMP4 bytes as whole fragments versus bounded pieces crossing moof/mdat/sample boundaries. Then inspect when live FFmpeg actually releases those bytes. Preserve all packet timing and compare startup, append calls and CPU.

**Pass condition.** Earlier usable output under delayed delivery, with the same sample sequence, decoder preroll and steady fragment plan.

**Stop / reject.** If FFmpeg has not emitted a moof/required samples yet, transport chunking cannot remove that mux delay. Reject gains caused by timestamp changes or missing metadata. Tiny append calls may cost more.

**Likely code touchpoints (verify before editing):** native-remux-worker.js; append queue; MP4StreamParser::Parse.


## R05 — Move MSE ownership off the window thread

**Delivery · New execution-plan hypothesis · P1 · Risk: Medium**

**First environment:** Browser-only first; Demuxe integration later. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Create MediaSource and append/remove scheduling in a dedicated worker, passing a MediaSourceHandle to the visible video element. Keep blocking FFmpeg execution on a different worker unless its calls genuinely suspend.

**Source basis.** MSE defines worker construction and transferable handles. Support must be detected in the runtime; a handle is not a transferable MediaSource object. [M1]

**First agent experiment.** Compare window-owned and worker-owned MSE under identical UI layout/animation load. Use unchanged fMP4 output first; add remux only after the ownership test passes. Include worker death, source replacement and detach during append.

**Pass condition.** Less UI-induced append jitter or main-thread work, with stable seek/buffer reporting and no loss of authority on detach.

**Stop / reject.** Do not block the same event loop that must service reads or MSE callbacks. Stop if total overhead rises without a responsiveness benefit. Retain a window-MSE fallback.

**Likely code touchpoints (verify before editing):** native-remux-player.js; worker control protocol; source handle.


## R06 — Offer a non-pthread remux path without isolation

**Deployment · New execution-plan hypothesis · P2 · Risk: High**

**First environment:** Matching Emscripten build + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Build a small remux/preparation worker that suspends asynchronous AVIO through JSPI, with a separately assessed Asyncify alternative. This may make browser-native remux usable where the current shared-memory/pthread deployment is unavailable.

**Source basis.** Demuxe’s preparation admission currently requires isolation. Emscripten documents synchronous C suspension around async JavaScript using JSPI/Asyncify. That does not mean MSE itself inherently requires cross-origin isolation. [D1, E1]

**First agent experiment.** First build a minimal seek/read/mux worker using the pinned toolchain and test without COOP/COEP. Compare startup, binary size and end-to-end remux to the existing isolated build. Test reentrant calls and cancellation while suspended.

**Pass condition.** A qualified remux-only plan works without shared memory or main-thread blocking, within reasonable startup and memory cost.

**Stop / reject.** Do not just delete an isolation guard from a pthread build. Stop on unsupported SDK/API, unsafe reentrancy or a need to rewrite all of mpv. Full-player non-isolated porting is out of scope.

**Likely code touchpoints (verify before editing):** small build profile; AVIO imports/exports; deployment admission.


## R07 — Close the HEVC-in-TS browser-owned construction gap

**Packaging · Follow-on route expansion · P1 · Risk: High**

**First environment:** Host FFmpeg + browser; Wasm later. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Construct a qualified HEVC/AAC TS-to-fMP4 plan rather than falling to Hybrid solely because the maintained TS repair is AVC-specific. Preserve original video/audio and extend only the missing timestamp/configuration logic.

**Source basis.** FFmpeg supports codec configuration extraction and fragmented MP4 controls; the previous user-supplied comparison identified a working competitor MSE alternative. Neither establishes correctness of Demuxe’s HEVC adaptation. [F1, F2; prior qualification report]

**First agent experiment.** Use the exact prior TS case, then HEVC B-frame/reorder, timestamp-wrap and discontinuity variants. Audit packet payloads, VPS/SPS/PPS, decode/presentation order and first-frame preroll before comparing with Hybrid.

**Pass condition.** Complete browser-owned playback with original codecs and correct seek/end behavior; actual benefit measured on the same host.

**Stop / reject.** Do not relabel a stream hvc1 without satisfying its parameter-set contract. Reject unestablished timestamps instead of clamping them. A correct Hybrid fallback must remain.

**Likely code touchpoints (verify before editing):** native/remux/remux.c; remux-packaging.js; TS construction gate.


## R08 — Keep display-only transformations out of CPU video filters

**Presentation · New policy/implementation hypothesis · P1 · Risk: Medium**

**First environment:** Browser + reference images. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Compile a small explicit set of requested display operations into browser metadata or presentation transforms: rotation, mirror and display aspect. Use decoded-frame processing only when the requested operation truly modifies sample content.

**Source basis.** Chromium’s MP4 parser computes rotation from track/movie matrices. FFmpeg has metadata bitstream filters. These mechanisms can carry truthful geometry; they are not substitutes for arbitrary filtering. [C2, F2]

**First agent experiment.** Compare one rotation/mirror/aspect request through the current Software filter and a metadata/presentation path. Check screenshots, subtitle coordinates, pointer geometry, resize and destination behavior.

**Pass condition.** Preserve the exact requested visible transformation while keeping compressed video browser-decoded; avoid new pixels in Wasm.

**Stop / reject.** Do not fake color primaries, codec profile or frame rate to gain support. Crop can change visible content and exported semantics. Pixel-processing APIs must not silently become display-only APIs.

**Likely code touchpoints (verify before editing):** featureRejection; output geometry; subtitle layout; remux metadata.


## R09 — Pass already-valid fragmented media through unchanged

**Packaging · New fast-path hypothesis · P2 · Risk: Medium**

**First environment:** Host fixture server + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** For existing fMP4 presentations, recognize valid initialization/media units and append them unchanged instead of demuxing and remuxing every sample. Limit the first implementation to matching track selection, configuration and timeline.

**Source basis.** MSE consumes initialization and media segments; Chromium’s parser reads moov/moof/sample data. FFmpeg can produce self-relative fragmented layouts. [M1, C2, F1]

**First agent experiment.** Compare pass-through with maintained remux on the same fMP4 file/segments. Verify config, track IDs, offsets and payloads. Include nonzero starts, selected-track mismatch and encrypted input as rejection controls.

**Pass condition.** Less preparation/allocation with identical accepted presentation and no incidental video/audio decode.

**Stop / reject.** If extracting tracks, retiming, rebuilding sample tables or handling encryption is needed, fall back to the established muxer. Avoid a second general-purpose MP4 implementation. An already-existing streaming pass-through is not a new win.

**Likely code touchpoints (verify before editing):** fragment inspection; packaging negotiation; append scheduler.


## R10 — Screen float-preserving destinations before writing adapters

**Audio · Follow-on feasibility gate · P2 · Risk: High**

**First environment:** Browser capability/source study first. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Investigate ordinary float-decoder output only against explicitly viable destinations: raw float in a direct-play container, a supported streaming representation, or an experimental raw-audio sink. This is a destination feasibility study, not another fixed-to-FLAC benchmark.

**Source basis.** The inspected MP4/MSE audio-entry gate has no raw PCM entry. Chromium direct-source demuxing is separate. Therefore, a direct float-PCM success cannot establish float PCM in MSE. [C1, C2]

**First agent experiment.** Enumerate exact parser/sample-entry paths in the target build, then perform tiny destination probes. Continue to progressive transport, bounded output and seeking only if an unmodified browser actually accepts the intended representation.

**Pass condition.** Preserve finite Float32 samples including headroom without quantization, and demonstrate a viable complete audiovisual clock/output contract.

**Stop / reject.** Do not hide float bits in integer FLAC or call that native audio. Do not infer streaming from a completed WAV/Matroska file. If only direct materialized files work, classify an offline/cache route, not streaming playback.

**Likely code touchpoints (verify before editing):** Chromium parser/decoder boundaries; target muxer; source transport.


## R11 — Test an explicit quantized-FLAC policy using the normal decoder

**Audio · New fidelity-option hypothesis · P2 · Risk: Medium**

**First environment:** Host FFmpeg + browser; Wasm later. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Keep the normal float decoder and explicitly permit conversion to integer PCM before FLAC. This could provide a bounded-error middle option between a different fixed decoder and perceptual Opus/AAC encoding.

**Source basis.** FLAC specifies integer sample coding, while FFmpeg exposes sample-format conversion and dithering. Float-to-integer quantization is a distinct, potentially lossy stage even when FLAC round-trips its integer input exactly. [F4, F5]

**First agent experiment.** Compare float-to-24-bit and, only if the destination supports it, float-to-32-bit conversion against the same normal decoder reference. Measure RMS/peak error, clipping/headroom, sample counts, output size and complete playback cost.

**Pass condition.** A useful explicit tradeoff with fully reported signal changes; preserve rate and channel layout and show no hidden codec-lossy generation.

**Stop / reject.** Never label this sample-exact relative to arbitrary float output. Dither is not exactness. No automatic limiter, normalization or clipping policy; reject or require separate permission. No unmeasured perceptual-transparency claim.

**Likely code touchpoints (verify before editing):** adaptation PCM conversion; policy fields; fidelity diagnostics.


## R12 — Use a browser audio encoder for the permitted lossy branch

**Audio · New execution-plan hypothesis · P2 · Risk: Medium**

**First environment:** Audio decode source + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Feed normal decoded audio into WebCodecs AudioEncoder when the actual codec/rate/channel configuration is supported, then mux it with copied video. Compare this with the maintained Wasm audio encoder, not with a route that omitted conversion.

**Source basis.** WebCodecs defines AudioData, AudioEncoder and configuration queries, but does not promise a particular encoder or hardware acceleration. [W1]

**First agent experiment.** Use one supported AAC or Opus output profile and identical bitrate/channel requirements. Measure decode-to-AudioData copies, encoder startup, delay/padding, muxing and total browser cost. Compare decoder-equivalent input samples.

**Pass condition.** Lower complete cost or optional-runtime size without losing timestamps, selected audio, cancellation or output quality policy.

**Stop / reject.** Stop if required output support is absent or frame/copy overhead erases the benefit. Lossy encoding permission does not authorize downmixing or resampling. Do not presume browser audio encoding is hardware-assisted.

**Likely code touchpoints (verify before editing):** audio adaptation worker; AudioData ownership; output muxer.


## R13 — Treat intentionally disabled tracks as removable work

**Routing · New policy hypothesis · P1 · Risk: Medium**

**First environment:** Demuxe source + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** When the application explicitly disables audio or enters a declared audio-only mode, evaluate a plan that never decodes/transcodes the unused track. Retain source-scoped identities and a bounded resume strategy for re-enabling it.

**Source basis.** mpv exposes track selection, and MSE distinguishes active tracks. Neither ordinary volume zero nor merely hiding the video element proves that decode work stops. [V1, M1]

**First agent experiment.** Compare audio disabled versus merely muted on a Native-blocking audio source. Separately test declared audio-only playback and return to video at a random-access point. Trace actual packet/decoder/encoder activity.

**Pass condition.** Remove real unused work without changing the user’s requested semantics or causing a wrong track/time when restored.

**Stop / reject.** Do not infer permission from temporary mute, an obscured tab or CSS visibility. PiP and accessibility requirements override visual-off shortcuts. Re-enable may require a tested transition, not seamless claims.

**Likely code touchpoints (verify before editing):** track intent; admission; demux stream discard; resume transaction.


## R14 — Avoid duplicate resampling and oversized audio work batches

**Audio · New optimization hypothesis · P1 · Risk: Medium**

**First environment:** Matching mpv audio path + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Account for source, mpv-filter, AudioContext and device-side rates as separate stages. Compare output policies that eliminate redundant intermediate conversion and tune bounded PCM batches to playback rather than per-packet message timing.

**Source basis.** mpv documents insertion of swresample when its selected output rate differs from media. Web Audio has context-rate processing; Chrome’s worklet guidance separates compute workers from real-time output. [V1, A1, A2]

**First agent experiment.** Trace the actual rate/layout at every accessible stage for 44.1 and 48 kHz files. Compare existing buffering against a small set of PCM batch sizes under seek, rate change and simulated worker delay.

**Pass condition.** Less redundant conversion/message overhead while preserving underrun margin, intended effects and honest latency feedback.

**Stop / reject.** Do not assume source-matching AudioContext rate removes device resampling. Do not raise latency unnoticed or claim bit-exact speaker output. Rate changes, equalizers and fixed-decoder differences remain independent policies.

**Likely code touchpoints (verify before editing):** audio bridge; AudioWorklet ring; output latency feedback.


## R15 — Make split-buffer audio switching transactional

**Timeline · Follow-on architecture experiment · P1 · Risk: High**

**First environment:** Browser-only; adaptation integration later. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Keep one MediaSource/video element and a retained video SourceBuffer while replacing only the selected audio stream. Use prepare/validate/commit/retire around a defined switch time rather than treating successful appends as a seamless switch.

**Source basis.** MSE supplies changeType, timestamp offsets and append windows. It permits, but does not guarantee, a particular multiple-SourceBuffer combination or continuous codec switch. [M1]

**First agent experiment.** Exercise same-codec switching first, then AAC/FLAC/Opus transitions only where accepted. Test pause, seek-before-commit, encoder preroll and failed preparation. Compare video identity and digital audio markers around the boundary.

**Pass condition.** Less video teardown and shorter correct audio recovery, with one authoritative A/V presentation and no duplicate or stale samples.

**Stop / reject.** Stop if simultaneous configuration support is absent or rollback cannot restore the old track. Exact sample alignment is not proven by matching currentTime. No routine Native-to-Hybrid cross-engine handoff is implied.

**Likely code touchpoints (verify before editing):** native-remux-player.js; per-track mux outputs; track transaction.


## R16 — Keep a stable audio output format through frequent switches

**Timeline · New tradeoff hypothesis · P2 · Risk: High**

**First environment:** Host FFmpeg + browser; Wasm later. **Dependencies:** R15. **Status:** Untested hypothesis.

**Proposed mechanism.** For an explicitly requested multilingual/session use case, compare copying each selected track against converting compatible integer tracks to one stable FLAC rate/layout/configuration. The aim is fewer destination reconfigurations, not less encoding.

**Source basis.** FLAC has explicit stream properties, and MSE has reconfiguration boundaries. Stable output is a proposed policy; it is not proof that a browser keeps the same decoder instance. [F5, M1]

**First agent experiment.** Compare repeated switches with heterogeneous native codecs versus a common permitted output. Measure conversion cost, switch latency, gaps and retained video. Require equal language/role/track intent and compatible rates/layouts.

**Pass condition.** A meaningful switch-continuity improvement outweighs the extra preparation for that session type.

**Stop / reject.** Do not make gratuitous conversion the general default. Mixed rates/layouts require separate permission; float input is not silently exact FLAC. Lower CPU is not guaranteed, and source-role substitution is forbidden.

**Likely code touchpoints (verify before editing):** per-track adaptation producer; stable output profile; switch policy.


## R17 — Model unequal tails as explicit track-lifetime phases

**Timeline · Follow-on architecture experiment · P2 · Risk: High**

**First environment:** Browser-only first. **Dependencies:** R15. **Status:** Untested hypothesis.

**Proposed mechanism.** Explore AV → audio-only or AV → video-only phases by retiring an ended track’s buffer, then restoring it or rebuilding on a backward seek. Keep media-end, subtitle-end and seekable-end as different facts.

**Source basis.** MSE buffered ranges intersect active buffers, with different ended-state handling. Splitting SourceBuffers alone does not remove that intersection. Removal changes ownership and may constrain later restoration. [M1]

**First agent experiment.** Use both tail directions, a temporary midstream gap as a negative control, and seeks across each boundary. Compare explicit track retirement with the current bounded rejection. Validate the visible-frame policy when video ends first.

**Pass condition.** Correct continuation under bounded memory without forged timestamps, synthetic samples or premature global EOS; restoring a removed track is either verified or clearly rebuilds.

**Stop / reject.** Do not remove a track merely because its next segment is late. Stop if accurate finality cannot be known or the browser cannot restore the required presentation. Keep the supported fallback.

**Likely code touchpoints (verify before editing):** active SourceBuffer ownership; duration/seek contract; tail phases.


## R18 — Cache prepared media by timeline and transformation recipe

**Caching · New optimization hypothesis · P2 · Risk: Medium**

**First environment:** Demuxe source + browser. **Dependencies:** R01. **Status:** Untested hypothesis.

**Proposed mechanism.** Cache bounded already-generated fragments and initialization data for repeated seeks/replays. Key by immutable source identity, selected tracks, decoder/encoder profile, timeline origin and exact runtime recipe; do not reuse only by URL and time.

**Source basis.** FFmpeg exposes fragmented output, while MSE can reuse valid media segments in a reconstructed presentation. The cache policy and correctness key are proposed Demuxe work. [F1, M1]

**First agent experiment.** Replay a recently converted interval, switch away/back to the same audio, and replace a source at the same URL. Compare generated work, seek delay and total retained bytes against the uncached path.

**Pass condition.** Reduce repeated conversion for genuinely reused intervals and reject changed-source/profile data. Maintain a hard byte cap and owned eviction.

**Stop / reject.** Do not retain an entire movie by accident or share credential-sensitive output across owners. Cached decoder preroll/configuration must match. An output-cache hit is not evidence that live encoder state can be reused.

**Likely code touchpoints (verify before editing):** fragment cache; source identity; preparation recipe manifest.


## R19 — Extract embedded ASS while leaving video Native

**Subtitles · New complete-plan hypothesis · P1 · Risk: High**

**First environment:** Demux/libass builds + browser. **Dependencies:** R01. **Status:** Untested hypothesis.

**Proposed mechanism.** Use bounded demuxing to extract the selected embedded ASS/SSA stream, codec-private data and fonts, and feed the existing Native overlay. Prefer sharing reads with preparation rather than opening a second whole-file scanner.

**Source basis.** Demuxe’s registry distinguishes Native external ASS from mpv subtitle semantics. Its Native renderer already accepts subtitle assets and fonts; embedded extraction and timestamp mapping are additional responsibilities. [D1, D2]

**First agent experiment.** Start with one MKV track with embedded fonts and an active cue at a distant seek. Compare with matched mpv/libass output, including attachment selection, source replacement and long subtitle tails.

**Pass condition.** Avoid switching the video engine solely for embedded ASS, without scanning/converting the full source before play or changing authored rendering.

**Stop / reject.** Stop if required cues/fonts cannot be located within justified read budgets. Preserve codec-private headers, preroll and track identity; do not convert rich ASS to plain text. No extraction success means no Native admission.

**Likely code touchpoints (verify before editing):** demux selected subtitle stream; NativeASS asset bridge; shared source broker.


## R20 — Render bitmap subtitles without burning them into video

**Subtitles · New complete-plan hypothesis · P2 · Risk: High**

**First environment:** Subtitle decoder build + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Add a bounded PGS bitmap decoder/output adapter that overlays palette rectangles on Native video. Treat DVD/VobSub as a separate future profile rather than one universal bitmap-subtitle implementation.

**Source basis.** FFmpeg n7.1.1 PGS decoding outputs SUBTITLE_BITMAP rectangles, palettes and forced flags. Its code states that display/clear events define the end of a cue rather than an explicit duration. [F3]

**First agent experiment.** Use PGS overlap, forced flags, palette changes, clear events and a seek into an active display. Compare final composition and lifetime with native mpv while recording decoded video activity.

**Pass condition.** Correct selected bitmap subtitles without video burn-in, with bounded decoded bitmap memory and no stale cue after seek.

**Stop / reject.** Do not infer PGS durations from a constant timeout or apply a text renderer. Carry color, crop and destination geometry correctly. Stop on unbounded RLE/bitmap allocations or missing reconstruction state.

**Likely code touchpoints (verify before editing):** PGS decoder wrapper; bitmap overlay; subtitle seek checkpoint.


## R21 — Cache subtitle tiles and schedule only useful redraws

**Subtitles · New optimization hypothesis · P1 · Risk: Medium**

**First environment:** Existing NativeASS + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Cache unchanged alpha/color tiles and reuse surfaces instead of expanding and allocating every tile on each bitmap update. Add safe static-cue scheduling while retaining continuous rendering for unknown/animated ASS constructs.

**Source basis.** The current NativeASS source expands tile alpha to RGBA, creates OffscreenCanvas tiles and checks media time through requestAnimationFrame. It already handles an unchanged response; the proposal targets remaining allocation/composition work. [D2]

**First agent experiment.** Compare static dialogue, karaoke, transforms and paused resize. Record render RPCs, allocation/bitmap bytes and UI work, not only total CPU. Key invalidation by track, fonts, source geometry and render revision.

**Pass condition.** Fewer redundant allocations/redraws with pixel-equivalent accepted output and unchanged active-cue behavior.

**Stop / reject.** Do not invent a universal next-change parser that misses ASS transforms. Unknown animation falls back to existing cadence. GPU tile upload is an option, not a guaranteed zero-copy or CPU win.

**Likely code touchpoints (verify before editing):** NativeASS.tick; tile cache; render revisions; optional GPU atlas.


## R22 — Use Document PiP to keep Native subtitles and controls

**Presentation · New destination-plan hypothesis · P1 · Risk: Medium**

**First environment:** Browser-only. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Where supported, move the existing player container—video, overlay and controls—into a Document Picture-in-Picture window instead of burning subtitles into video or replacing the playback engine.

**Source basis.** Chrome documents Document PiP for arbitrary document content. Demuxe’s existing overlay disables video-only PiP because its separate canvas cannot accompany that destination. [P1, D2]

**First agent experiment.** Enter/exit with ASS, gain, paused state and worker MSE if available. Test user activation, close/restore, resize, focus, source replacement and destruction. Check cross-document event listeners and coordinate calculations.

**Pass condition.** Keep required subtitles and controls in PiP while retaining the accepted playback owner and avoiding duplicate decoding.

**Stop / reject.** Do not promise Safari/mobile, casting or video-only PiP parity. Document movement can invalidate window-bound listeners/geometry. Fall back to an explicit unavailable destination rather than silently losing captions.

**Likely code touchpoints (verify before editing):** player container ownership; NativeASS document listeners; destination capabilities.


## R23 — Fuse qualified video effects into one GPU presentation pass

**Presentation · Follow-on optimization experiment · P2 · Risk: High**

**First environment:** WebGPU/WebGL browser + matching frames. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** For supported retained-frame effects, combine scaling, rotation/mirror, a simple color operation and subtitle composition into one render graph rather than returning pixels to Wasm for each stage. Keep a strict supported-operation subset.

**Source basis.** WebGPU can sample external textures from VideoFrame or a video element; the official Chrome description calls zero-copy a possibility, not a promise. [G1]

**First agent experiment.** Compare existing copy-back/filter behavior with a single-pass implementation for one operation at a time, then a combined plan. Match reference pixels, color range, transfer and alpha behavior before timing.

**Pass condition.** Eliminate readback/multiple full-frame passes without substituting a merely similar effect. Measure total browser/GPU-process CPU and presentation quality.

**Stop / reject.** No arbitrary FFmpeg filter compatibility claim. HDR/tone mapping, temporal filters and 10-bit handling need separate profiles. Stop if GPU loss, subtitle blending or readback for verification changes the measured path.

**Likely code touchpoints (verify before editing):** retained presenter; effect registry; color pipeline; shader ownership.


## R24 — Compare raw-YUV VideoFrame presentation with existing Software output

**Presentation · Follow-on alternative presenter · P2 · Risk: Medium**

**First environment:** Matching Software build + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** After software video decode, construct a VideoFrame from its actual planar layout and let browser rendering handle presentation conversion. Compare against direct YUV texture upload and the existing RGB path; do not assume one is inherently superior.

**Source basis.** WebCodecs defines raw-frame construction and layouts. External-texture presentation is available through WebGPU primitives; construction may still copy CPU memory. [W1, G1]

**First agent experiment.** Use one software-required codec with stride, crop, color-range and nonzero-start variations. Record swscale activity, upload/copy bytes, queue size, first frame and sustained presentation.

**Pass condition.** Lower complete Software cost with equivalent pixels/timing and bounded frame ownership.

**Stop / reject.** This does not remove software decoding or guarantee zero-copy. Reject unsupported bit-depth/layout combinations rather than quantizing them. No improvement may be claimed from dropping required frames.

**Likely code touchpoints (verify before editing):** Software YUV build; render bridge; VideoFrame lifetime; RGB fallback.


## R25 — Try a generated video track as an alternative presenter

**Frontier · New experimental sink hypothesis · P3 · Risk: High**

**First environment:** Feature-qualified browser; integration later. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Feed already-decoded frames into a generated video MediaStreamTrack and display it through a media element. Initially use video-only output to isolate presentation behavior; later assess an mpv-timed A/V adapter only if justified.

**Source basis.** The insertable-media draft defines VideoTrackGenerator and automatic frame closure on write. It explicitly lacks consensus on an equivalent audio-generator API; browser interfaces/exposure can differ. [T1]

**First agent experiment.** Compare frame order, scheduling, latency and copies with the retained canvas presenter. Test pause/seek by controlling upstream delivery. Establish whether the sink follows timestamps or live arrival behavior.

**Pass condition.** A measurable presenter benefit without inventing a VOD timeline or losing frame ownership; any A/V extension has its own clock proof.

**Stop / reject.** Do not call MediaStream VOD-seekable or assume generated audio and video synchronize automatically. No re-encoding, WebRTC loopback or second independent audio clock to hide missing semantics.

**Likely code touchpoints (verify before editing):** alternative video sink; mpv target-time adapter; MediaStream lifecycle.


## R26 — Replace polling chains with bounded credits and deadlines

**Scheduling · New optimization hypothesis · P1 · Risk: Medium**

**First environment:** Demuxe source + browser. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Coordinate source, mux, decoder and presenter through bounded credits, high/low watermarks and deadline wakeups. Coalesce diagnostics separately. Distinguish intentional backpressure from an actually blocked decoder.

**Source basis.** Streams provides backpressure; WebCodecs exposes decode queues and output lifecycle. Chrome worklet guidance keeps heavy processing away from the audio callback. [S1, W1, A2]

**First agent experiment.** Count wakeups/messages while paused, buffered, playing and under delayed output. Replace one redundant timer boundary at a time. Verify cancellation always wakes waiters and codec reordering cannot be mistaken for a deadlock.

**Pass condition.** Less idle/wakeup overhead and smoother scheduling under UI load, without starving audio or reducing required frames.

**Stop / reject.** Do not remove health deadlines or accept unbounded queues. A constant frame cap is not a complete byte budget, especially at 4K. Optimize observable redundant work before redesigning all scheduling.

**Likely code touchpoints (verify before editing):** worker mailboxes; demux next requests; presenter queue; diagnostics.


## R27 — Share immutable compiled code, not live playback state

**Startup · New packaging/cache hypothesis · P1 · Risk: Medium**

**First environment:** Browser first; build variants later. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Use single-flight loading of hash-identified Wasm modules and optional shader/font assets. Create fresh mutable instances for each source. Consider a small decode-only/prepare-only module split only when measured startup justifies its packaging complexity.

**Source basis.** Official WebAssembly guidance discusses separating compilation from instantiation and worker reuse. Demuxe already has optional plan prerequisites; module availability should be explicit rather than an undocumented local-build dependency. [E2, D1]

**First agent experiment.** Compare first open, repeated open and two concurrent players with compiled-module reuse versus current loading. Include abandoned preparation and source/credential changes; account for work done before open.

**Pass condition.** Fewer duplicate downloads/compilations and a reproducible optional-runtime package, with no shared mutable media state.

**Stop / reject.** Do not pool decoder contexts before proving resets, or claim savings by moving startup outside the interval. Do not keep all engines resident or invalidate source-specific authorization through a shared cache.

**Likely code touchpoints (verify before editing):** asset manifest; runtime loader; module cache; fresh worker/instance ownership.


## R28 — Make streaming representation choices aware of complete-plan feasibility

**Streaming · New integration hypothesis · P2 · Risk: High**

**First environment:** Qualified streaming implementation required. **Dependencies:** R15. **Status:** Untested hypothesis.

**Proposed mechanism.** Let the existing adaptive controller consider whether a rendition preserves a qualified browser-owned plan and requested HDR/audio/subtitles, not bandwidth alone. Invalidate only affected track/configuration state rather than rebuilding unrelated video or audio.

**Source basis.** MSE supports configuration changes, while WebCodecs support is configuration-specific. These are primitives; neither supplies Demuxe’s adaptive policy. [M1, W1]

**First agent experiment.** After the streaming baseline is qualified, use equivalent-role renditions with different codec/configuration requirements. Compare existing adaptation policy with compatibility-aware selection and per-track invalidation.

**Pass condition.** Fewer unnecessary backend replacements or stalls while honoring the requested quality ceiling/floor, language, accessibility and fidelity policy.

**Stop / reject.** Do not automatically choose a lower-quality rendition merely to claim cheaper routing. Do not create a second manifest/timeline owner or switch engines on every ABR step. Keep DRM and representation availability outside guesses.

**Likely code touchpoints (verify before editing):** adaptive selection policy; config generations; complete-plan admission.


## R29 — Offer explicit compatible-core extraction before audio re-encoding

**Packaging · New fidelity-option hypothesis · P3 · Risk: High**

**First environment:** Host FFmpeg + browser; Wasm later. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** For streams with a real independently decodable compatibility core, test packet-level core extraction only when the target can play that core and the application permits discarding extensions. This avoids adding an encoder but is not full-fidelity preservation.

**Source basis.** FFmpeg documents dca_core as extracting DTS core while dropping extensions such as DTS-HD. It does not turn DTS into a codec that every browser supports. [F2]

**First agent experiment.** Use an actual core-plus-extension fixture, preserve video, identify what was discarded and probe the exact extracted codec/container. Compare complete output requirements and cost with decode/adapt or Hybrid.

**Pass condition.** An explicit compatible representation works without re-encoding where original playback did not; discarded spatial/extension information is visible in diagnostics.

**Stop / reject.** Skip if the extracted core is still unsupported. Never strip Atmos/DTS-HD/other extensions under a lossless label or apply a core filter to a stream without a valid core. No default enablement.

**Likely code touchpoints (verify before editing):** bitstream-filter plan; source profile inspection; fidelity permissions.


## R30 — Investigate containerless encoded-chunk MSE

**Frontier · New experimental API hypothesis · P3 · Risk: High**

**First environment:** Experimental Chromium only. **Dependencies:** None; verify prerequisites locally. **Status:** Untested hypothesis.

**Proposed mechanism.** Investigate feeding demuxed EncodedAudioChunk/EncodedVideoChunk objects into MSE so the browser owns A/V playback without an intermediate MP4/WebM mux step. This could sit between raw demux and normal Native presentation.

**Source basis.** Chromium SourceBuffer IDL contains appendEncodedChunks and configuration-based changeType behind MediaSourceExtensionsForWebCodecs. The inspected feature declaration marks it experimental. This is not evidence of a shipped portable API. [C3, C4]

**First agent experiment.** First establish actual exposure in a controlled experimental browser, explicitly recording flags. Start with AVC/AAC and test timestamp reordering, track reconfiguration, bounded queues and destruction. Compare with equivalent fMP4 MSE only after correctness.

**Pass condition.** A source-level prototype demonstrates that removal of the mux stage is useful while preserving browser-owned playback and full timestamps.

**Stop / reject.** If unavailable in stable targets, keep it as an upstream-watch experiment. Never enable it silently or make release claims from feature-flag trials. Decoder output success does not establish A/V timing.

**Likely code touchpoints (verify before editing):** frontier MSE adapter; demux packet config; browser feature detection.

## Shared experiment contract

**G0: availability before implementation.** Confirm the exact source revision, build flags, optional assets and destination API. A source symbol, supported MIME hint or generic FFmpeg capability does not establish an executable Demuxe route. Missing tooling is BLOCKED, not a playback failure.

**G1: compare the smallest complete alternatives.** Try original playback and existing packet-copy options before manufacturing an adaptation fixture. Keep selected tracks, language/role, subtitle content, display geometry and fidelity policy fixed. Separate default routing from best explicit configuration.

**G2: qualify before timing.** Verify real moving video, required audio and track identity, seek/EOF behavior, and subtitle composition. Use distinct channel/track markers. Pixel/sample exactness and physical output are different claims; matching counters is weaker evidence.

**G3: preserve the clock and authority contract.** Use one audiovisual playback owner. Give source, timeline and configuration changes explicit generations. Failed or cancelled work cannot append, display or become authoritative later. Each resource is released or transferred with an identified owner.

**G4: measure whole work, not just a promising kernel.** Include startup, conversion, copies, muxing, worker/main-thread coordination, refill, cleanup and preparation done before open. Do not use JS elapsed time as process CPU. Report opaque browser/OS/GPU work and unavailable audio-onset measurements.

**G5: interpret host FFmpeg carefully.** Host FFmpeg + Chromium is a feasibility/cost screen, not a strict lower bound or a prediction of the Wasm route. Native SIMD, buffering, processes and scheduling differ. A promising or poor host result warrants investigation, not an automatic Wasm verdict.

**G6: keep experiments small and independent.** Each agent should own one card or a stated dependency cluster in a separate directory. First inspect existing code to avoid rebuilding an implemented optimization. Produce a minimal pilot and stop on its decisive blocker before running a broad corpus.

**G7: performance never authorizes a fidelity downgrade.** Lossy encoding, quantization, fixed-decoder selection, core extraction, resampling, downmixing, HDR conversion and output destination changes are distinct permissions. No single allow-lossy switch silently grants them all.

## Suggested independent agent assignments

| Agent | Cards | Boundary |
|---|---|---|
| Agent A — startup and delivery | R01–R05, R27 | Browser-first. Shared immutable input, candidate promotion and small transport experiments; preserve source security. Coordinate with the I/O owner before any production change. |
| Agent B — codec packaging and audio options | R07–R12, R29 | Begin with destination and actual input-profile viability. Host FFmpeg experiments can screen media construction; matching Wasm artifacts are required for Demuxe performance claims. |
| Agent C — track and timeline transitions | R13, R15–R18 | Establish split-buffer transactions first. Use explicit cases for track-off, channel identity, true track end and delayed input. Treat restoration after removal as a separate gate. |
| Agent D — subtitles and destinations | R19–R22 | Embedded extraction and PGS need decoder/renderer assets. Tile caching and Document PiP can begin independently. Preserve authored output and destination limitations. |
| Agent E — presenter, audio output and scheduling | R14, R23–R26 | Use matching renderer/audio builds. Separate lower CPU from fewer frames or worse audio latency. Frontier generated-track sinks are isolated from shipping plans. |
| Agent F — deployment and future streaming/API work | R06, R28, R30 | Wasm toolchain, qualified streaming and experimental-browser gates respectively. No racing the HLS/DASH agent’s manifest/timeline ownership. |

## Reusable assignment prompt

```text
Research and prototype {ID} from the attached backlog in an isolated workspace. Start by checking the source anchor, current implementation and exact API/build prerequisites. Do not alter the active checkout or introduce automatic admission. Build only the smallest complete experiment needed to test the stated hypothesis, using the listed baseline and fidelity constraints. If a required API, artifact or input profile is unavailable, stop as BLOCKED. Otherwise verify output, timing, seeking, cancellation and ownership before timing equivalent playback. Save code, hashes, raw evidence, a minimal reproducer and a concise verdict: PROMISING, INCONCLUSIVE, NOT WORTH THE COMPLEXITY, INCORRECT, or BLOCKED. Keep interpretation within the tested browser/source/artifact. Explain which source/clock/track owner would change in production and which integration gates remain.
```

## Required saved result

A result should name the card and commit; requested/actual plan; input and runtime hashes; API flags; exact fidelity permissions; source/clock/track ownership; baseline; test cases; raw observations; startup/CPU/memory limits; code patch; reproducible failure; and the narrow verdict. Record NOT TESTED independently from FAIL. Include dependencies and remaining shipping gates.

## Parked ideas and interpretation safeguards

**Already investigated; do not rename as new.** Fixed-decoder AC-3/DTS → FLAC, ordinary Opus/AAC conversion, scalar gain, buffered-seek reuse and routine Native/remux discovery remain the existing baseline or incomplete qualification work.

**Do not revive without a new mechanism.** The earlier authenticated unchanged-byte service-worker route, routine Hybrid→Native background handoff and client video re-encoding for single-view playback are not default follow-up experiments.

**Avoid artificial benchmark wins.** A preconverted source excludes conversion work; tiny synthetic fixtures are not prevalence estimates; preserving pixels but dropping subtitles/audio is not equivalent playback; fewer reported frames is not an optimization.

**Do not force a lossless float fiction.** FLAC’s 32-bit format support does not prove exact representation of arbitrary Float32 output, preservation of >1 headroom, or browser support for that profile. Integer-format hints do not select a fixed decoder.

**Future specialization only.** Multiview/stereo video, DRM processing, complete renderer rewrites, real-time video re-encoding, AI enhancement and arbitrary GPU filters need their own requirements and evidence; they are not prerequisites to the backlog above.

## Source register

All external documents were read on 17 September 2026. Chromium development-source entries identify the observed blob where available; agents must map them to their tested browser build. Rolling upstream documentation may describe APIs or FFmpeg options newer than Demuxe’s pinned sources. Links identify evidence for primitives, not proof of the proposed complete routes.

### [D1] Demuxe finite playback-plan registry
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/src/internal/playback-plans.ts

Pinned project baseline; admission, deployment, fidelity and feature boundaries. Blob a8bc390d4554edbc47f34c6b18b107a8d31e30b5.

### [D2] Demuxe Native ASS controller
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/src/internal/native-ass.ts

Pinned source; tick(), render RPCs, tile expansion, revisions, presentation restrictions. Blob 05a268ffa9d190cadd6e0c626595b40b8ded4539.

### [D3] Demuxe maintained audio adaptation
https://github.com/Jagalite/demuxe/blob/9abfd1b22300cf273fc0bd1a8290261281c8f3f3/native/adaptation/flac.h

Source supplied/read in this conversation; profile gates, PCM FIFO, continuous encoding, timestamp and sample checks. Not proof that a matching optional binary is available.

### [C1] Chromium FFmpegDemuxer
https://chromium.googlesource.com/chromium/src/+/refs/heads/main/media/filters/ffmpeg_demuxer.cc

Development source read 2026-09-17; blob b82ff7e55087f7897f8c62a8121c08685976a607. Direct-source demuxing, stream configuration, timestamps and packet ownership. Not a Chrome 152 build manifest.

### [C2] Chromium MP4StreamParser
https://chromium.googlesource.com/chromium/src/+/main/media/formats/mp4/mp4_stream_parser.cc

Development source read 2026-09-17; blob 23dbea4b81f8f6dfd5010f59ff18f00e62bb9999. ParseMoov audio entries; incremental Parse/EnqueueSample/SendAndFlushSamples; CalculateRotation.

### [C3] Chromium SourceBuffer WebIDL
https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/mediasource/source_buffer.idl

Development source read 2026-09-17; blob 33c86eb3da2f132b2eb8190466eb262cfb05f884. appendEncodedChunks and configuration-based changeType are runtime-gated.

### [C4] Chromium runtime feature declarations
https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/runtime_enabled_features.json5

Development source read 2026-09-17; blob 17da1535d5a3a771db30da0c2f626e5855c4f712. MediaSourceExtensionsForWebCodecs is experimental; not evidence of default exposure.

### [F1] FFmpeg formats documentation
https://ffmpeg.org/ffmpeg-formats.html

Rolling official documentation, read 2026-09-17: probing, fragmented MP4, separate_moof, frag_custom, interleaving and signed composition offsets. Check availability in the project-pinned version.

### [F2] FFmpeg bitstream filters documentation
https://www.ffmpeg.org/ffmpeg-bitstream-filters.html

Rolling official documentation, read 2026-09-17: extract_extradata, codec packaging, dca_core and metadata filters. Some transformations intentionally discard information.

### [F3] FFmpeg PGS subtitle decoder, n7.1.1
https://github.com/FFmpeg/FFmpeg/blob/n7.1.1/libavcodec/pgssubdec.c

Pinned source, display_end_segment/decode: bitmap rectangles, palettes, forced flags and next-display/clear-based end semantics. Blob d93bcf1b6a30dd2857224e9f7c78f7dad20eeff7.

### [F4] FFmpeg resampler documentation
https://ffmpeg.org/ffmpeg-resampler.html

Official options for sample-format/rate/layout conversion and dithering; these are distinct operations and permissions.

### [F5] RFC 9639: Free Lossless Audio Codec
https://www.rfc-editor.org/rfc/rfc9639.html

Published December 2024. Integer PCM representation, 4–32-bit format range and container mappings. Format capability is not browser support or proof of exact float conversion.

### [M1] Media Source Extensions editor draft
https://w3c.github.io/media-source/

Draft dated 2026-08-07, read 2026-09-17. Worker handles, changeType, active buffers, intersection-based buffered ranges, removal and EOS. Draft/API presence does not prove a target implementation.

### [W1] WebCodecs specification
https://www.w3.org/TR/webcodecs/

Read 2026-09-17: VideoFrame/AudioData, codecs, configure/flush/reset, hardware and latency hints, queues and ownership. Hints do not prove hardware execution.

### [A1] Web Audio API
https://www.w3.org/TR/webaudio-1.0/

Recommendation: media-element sources, gain/processing, AudioContext sample-rate/latency and origin restrictions. No physical-output exactness guarantee is inferred.

### [A2] Audio worklet design pattern
https://developer.chrome.com/blog/audio-worklet-design-pattern/

Official Chrome guidance: worker/worklet separation, buffering and real-time audio constraints. Used as a primitive, not as a benchmark of Demuxe.

### [E1] Emscripten asynchronous code
https://emscripten.org/docs/porting/asyncify.html

Rolling official documentation: Asyncify/JSPI suspension of synchronous C around asynchronous JavaScript; overhead and reentrancy cautions. Validate the pinned SDK separately.

### [E2] WebAssembly performance patterns for web apps
https://web.dev/articles/webassembly-performance-patterns-for-web-apps

Official browser guidance on compilation, initialization and worker/module reuse; no universal startup savings assumed.

### [G1] Chrome WebGPU / WebCodecs integration
https://developer.chrome.com/blog/new-in-webgpu-116

Official explanation of VideoFrame/HTMLVideoElement external textures; potential zero-copy is implementation-dependent, not guaranteed.

### [P1] Document Picture-in-Picture
https://developer.chrome.com/docs/web-platform/document-picture-in-picture

Official Chrome documentation for a PiP window containing arbitrary document content. Check support, activation, document movement and lifecycle on the target.

### [T1] MediaStreamTrack insertable media processing
https://www.w3.org/TR/mediacapture-transform/

Draft read 2026-09-17: VideoTrackGenerator, VideoFrame ownership, tracks and constraints. Audio generation is not a uniformly standardized parallel API.

### [S1] WHATWG Streams Standard
https://streams.spec.whatwg.org/

Read 2026-09-17: queues, backpressure, byte readers, transfer and cancellation. Used to define bounded delivery, not claim zero-copy across all layers.

### [V1] mpv manual
https://mpv.io/manual/stable/

Rolling official manual, read 2026-09-17: track selection, output sample rate, filters, timing and caching. Check options against the pinned mpv version.

## Revision / evidence log

- v1.0: Source-grounded hypothesis catalogue and agent handoff. Baseline Demuxe main: `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`.
- No media fixture generation, playback, compiler build, benchmark, or production edit was performed in this pass.
- Previous chat-reported benchmarks retain their own sources, hardware, decoder profiles and limitations; no old CPU percentages are used as predictions here.
