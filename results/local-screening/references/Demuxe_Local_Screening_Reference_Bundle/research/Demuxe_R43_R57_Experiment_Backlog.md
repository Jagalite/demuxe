# Demuxe: Additional Sandbox Experiments

**2026-09-17 · R43–R57 · 15 proposals · no new playback tests**

**Purpose.** Fifteen additional experiments for the existing native-FFmpeg + window-MSE lab. These are source-grounded hypotheses and bounded follow-ons, not newly measured improvements or claims of industry novelty.

**Status.** Every R43–R57 card is PROPOSED / NOT TESTED. This pass reviewed the supplied R01–R42 backlog/results and primary references, and inventoried tools. It generated no media, ran no playback benchmark and changed no Demuxe source.

**Environment.** Chromium 144.0.7559.96 on Debian 13, native FFmpeg 7.1.5 and Node 22.16.0 were rechecked. Python Playwright is recorded in environment-inventory.json. The previous in-memory/Blob/window-MSE harness is the starting point, not a normal-origin web deployment.

**Limits.** Do not bypass administration or origin restrictions. No new Emscripten build, browser AudioEncoder, worker-MSE attachment, Document PiP, HEVC destination or physical surround device is required for an initial pilot. Availability of a particular new configuration remains a first gate.

**Evidence discipline.** Prior buffering, append-count and tone-change results remain their original narrow observations. A host-FFmpeg result is neither a strict lower bound nor a forecast of Wasm cost. Same browser objects do not prove internal decoder identity.

## Experiment map

Priority is an engineering judgment, not a measured ranking. “New” describes the additional question relative to R01–R42, not novelty across the media industry.

| ID | Experiment | Priority | Extends |
|---|---|---|---|
| R43 | Change video configuration while keeping audio running | P1 | R15, R28, R35 |
| R44 | Play an exact requested excerpt without re-encoding its edge GOP | P2 | R09, R37, R40 |
| R45 | Use a source-bound seek map rather than repeated fragment scanning | P2 | R03, R09, R18 |
| R46 | A small JavaScript ordinary-MP4-to-MSE adapter | P1 | R06, R09 |
| R47 | Assemble output as headers plus original payload views | P1 | R34, R42, R46 |
| R48 | Keep only the relevant native caption cues instantiated | P1 | R41 |
| R49 | Size lookahead in wall-clock time, not fixed media seconds | P1 | R26, R34, R39 |
| R50 | Evict on actual GOP boundaries to preserve useful rewind media | P2 | R38, R45 |
| R51 | Try integer-lossless source codecs before changing lossy decoders | P1 | R10, R11 |
| R52 | Keep source sample rates across audio-track changes | P2 | R15, R16, R35 |
| R53 | Coalesce gain gestures into audio-clock automation | P2 | R26, R35 |
| R54 | Tune WebM cluster production for early audio availability | P2 | R04, R32, R34 |
| R55 | Cache bounded decoded previews for scrub revisits | P2 | R40, R45 |
| R56 | Map repeated clip boundaries in integer media ticks | P2 | R36, R45 |
| R57 | Probe a real six-channel Native FLAC destination | P1 | R15, R51 |

**Start with:** R43, R47, R48, R49, R51, R57. R46 is the higher-complexity option; do not block simpler pilots on it.

## R43 — Change video configuration while keeping audio running

**New transition experiment · P1 · PROPOSED / NOT TESTED**

**Extends:** R15, R28, R35. **Reference primitives:** S1, S2, L3.

**Question.** Can a user-requested resolution change replace only future video, instead of restarting audio and the complete player?

**Mechanism.** Retain one media element, MediaSource and audio SourceBuffer. Supply the real new video initialization/configuration and start its media at an established random-access boundary. Begin with H.264-to-H.264 size changes; codec changes are a later, separately probed extension.

**Smallest useful experiment.** Create synchronized 360p and 720p encodings of the same numbered frames, with aligned closed GOPs and one unchanged AAC track. Switch 360→720→360 at future boundaries; repeat while paused, during a seek and after deliberately failed preparation. Use a new init segment and changeType only where required by the actual configuration.

**Comparison.** Reopen the presentation at the same requested source time, with equal replacement-data availability. The test does not decide when to lower quality.

**Correctness gate.** Confirm decoded dimensions, covering-frame identities and continuous selected audio. Same browser objects do not establish reuse of the same internal decoder. Preserve the old plan when replacement preparation fails.

**Measure.** Frame gap, audio marker continuity, setup work, retained bytes, resize events and objects recreated.

**Stop / reject.** Stop on unsupported configuration, wrong-timeline frames or an unqualified track-count change. Never relabel codec data or silently lower quality to obtain a win.

**Local-agent boundary.** Wire the proven video transaction into Demuxe generations, subtitles and existing streaming ownership; this standalone switch is not ABR/HLS/DASH qualification.

## R44 — Play an exact requested excerpt without re-encoding its edge GOP

**New bounded-clip session candidate · P2 · PROPOSED / NOT TESTED**

**Extends:** R09, R37, R40. **Reference primitives:** S1, S4, S9.

**Question.** Can an excerpt beginning between keyframes start correctly using only nearby original media, instead of re-encoding its first frames or preparing the whole source?

**Mechanism.** Separate decoder preroll from the public visible interval. Supply the preceding random-access data, map source time explicitly, and seek the candidate to the requested start before presentation. Keep one A/V owner.

**Smallest useful experiment.** Use an H.264 B-frame clip with two-second GOPs, AAC or FLAC audio and burned frame IDs. Request [3.35, 7.65) seconds. Compare full-source seek with a bounded indexed input window. Verify pause, replay, final-frame coverage and cancellation. Include a deliberately broken control that filters away needed preroll with appendWindowStart.

**Comparison.** Full valid source opened and sought to the same interval. A re-encoded clip is not an equivalent no-transformation control.

**Correctness gate.** No leaked preroll picture or sound; correct first covering frame and documented end policy. Track compressed payload identity. Do not confuse a playback-range feature with frame/sample-exact exported trimming.

**Measure.** Media bytes admitted, preroll decoded, startup/replay delay, extra preparation and observed boundary error.

**Stop / reject.** Reject arbitrary-frame exactness if the destination cannot enforce it. Append windows can discard required dependencies; do not forge timestamps or drop those frames to satisfy a test.

**Local-agent boundary.** Implement the public range contract and audio-end semantics only after the pilot; host-indexed byte availability is not a remote-read benchmark.

## R45 — Use a source-bound seek map rather than repeated fragment scanning

**New metadata/index optimization · P2 · PROPOSED / NOT TESTED**

**Extends:** R03, R09, R18. **Reference primitives:** S2, S9, S10.

**Question.** Can a small reusable index bootstrap a distant seek without scanning or appending every preceding fragment?

**Mechanism.** Index validated fragment byte spans, decode/presentation intervals, codec generations and random-access boundaries. Bind the map to source identity. Reuse an existing index where available, or build one incrementally during useful reads; this is metadata caching, not cached transcoded media.

**Smallest useful experiment.** Start with the archived fMP4 fixture. Build a ground-truth map offline, then a bounded parser that builds/uses its own map. Compare repeated seeks against sequential discovery. Test an altered source with the same name, out-of-range offsets and a corrupted index entry.

**Comparison.** The same valid source and seek sequence without reusable metadata. Charge first-pass index construction, including any full-file reads.

**Correctness gate.** Confirm each target covering frame and required audio preroll. Treat the map as an accelerator, never proof of media integrity. If a required index entry is unknown, fall back rather than guess.

**Measure.** Bytes inspected, boxes parsed, index memory, repeated-seek work, invalidation cost and target recovery.

**Stop / reject.** Drop the optimization if it requires scanning the entire movie before normal playback or saves no work beyond the existing source index. No claimed network savings from in-memory delivery.

**Local-agent boundary.** Compare with current Demuxe/mpv indices before adding another one; share the result through the maintained source-identity broker.

## R46 — A small JavaScript ordinary-MP4-to-MSE adapter

**New deployment/packaging candidate · P1 · PROPOSED / NOT TESTED**

**Extends:** R06, R09. **Reference primitives:** S2, S3, S10.

**Question.** Can a tightly scoped MP4 preparation route avoid downloading or compiling a Wasm muxer when controlled MSE playback is needed?

**Mechanism.** Parse the selected ordinary-MP4 sample tables in JavaScript and construct small fMP4 headers around the unchanged compressed samples. This differs from R09, which only forwards media that is already fragmented.

**Smallest useful experiment.** Start with unencrypted, fixed-configuration H.264/AAC MP4: one video and one selected audio track. Support the fixture’s actual timing/priming or reject it. Compare output with host-FFmpeg packet-copy fragmentation, then add B-frame composition offsets, a tail moov and malformed-size controls. Do not expand into a general demuxer.

**Comparison.** Host-generated fMP4 establishes correctness; unchanged Native is the preferred control where allowed. Any Wasm-startup saving stays unmeasured until an equivalent maintained runtime is available.

**Correctness gate.** Prove sample payloads, DTS/PTS, durations, offsets and selected tracks. Bound sample-table counts and allocations; reject encryption, unsupported edits or external data references.

**Measure.** JavaScript parse/header time, bytes copied, module footprint, output startup, memory and error containment.

**Stop / reject.** Stop if the narrow profile grows into a second general MP4 framework, needs external metadata to succeed, or cannot preserve AAC priming. Do not route ordinary direct-compatible playback through this gratuitously.

**Local-agent boundary.** Production admission, authenticating source reads, package size and comparison with the existing optional muxer require the local agent. No isolation guard is removed from any threaded build.

## R47 — Assemble output as headers plus original payload views

**New copy-elimination experiment · P1 · PROPOSED / NOT TESTED**

**Extends:** R34, R42, R46. **Reference primitives:** S1, S10, L3.

**Question.** Can new fragment headers and existing compressed spans reach MSE without first flattening the whole fragment into another JavaScript buffer?

**Mechanism.** Represent output as a bounded ordered list of header bytes and views onto owned immutable source spans. Feed those bytes in precisely the same logical order; batch adjacent spans so eliminating copies does not create one append per packet.

**Smallest useful experiment.** Take known-good fMP4 output and split it into headers and payload views. Compare concatenation, pooled concatenation and bounded scatter/gather delivery. Verify reconstructed byte equality before playback; then test cancellation, partial output, reused storage and a large backing-buffer retention case.

**Comparison.** R34 adaptive batching with R42’s safe buffer pool, not the original allocate-everything path.

**Correctness gate.** Payload/order identity, same final ranges and output, no mutation before consumption, and explicit lifetime accounting. MSE may still copy internally; this is not a zero-copy decoder claim.

**Measure.** Application bytes copied, allocations, append/event counts, backing bytes pinned, browser CPU when measurable and startup.

**Stop / reject.** Reject if extra appends erase savings or a tiny view pins an excessive whole-file allocation. Never transfer/detach the original source or shared Wasm heap to simulate zero-copy.

**Local-agent boundary.** The real FFmpeg AVIO writer may already produce flat output; assess that boundary separately. A browser assembly win does not prove elimination of a Wasm-side mux copy.

## R48 — Keep only the relevant native caption cues instantiated

**New subtitle memory/startup optimization · P1 · PROPOSED / NOT TESTED**

**Extends:** R41. **Reference primitives:** S4, L3.

**Question.** Can large simple-caption tracks remain Native without creating every browser cue object before playback?

**Mechanism.** Keep a bounded logical text/interval index and instantiate VTTCue objects only for the current window, including every cue overlapping its edges. Evict unneeded native objects, not the underlying subtitle text or transcript semantics.

**Smallest useful experiment.** Generate 10,000 simple cues with overlaps, Unicode and several long cues. Compare eager insertion with an indexed moving window. Exercise distant/backward seeks, pause on a boundary, rate changes, hide/show and source replacement. Ensure the required cues are present before the new presentation becomes visible.

**Comparison.** The same R41-supported captions inserted eagerly. A full logical transcript/search index must remain available when required by the application.

**Correctness gate.** Equivalent active cues, markup, ordering and visible output at sampled boundaries. A start-time-only lookup is insufficient for long overlapping cues.

**Measure.** Open-time insertion work, live cue objects, logical-index memory, seek cue-preparation delay and browser allocation observations.

**Stop / reject.** Reject missing/late cues, visible flashes or a public contract that requires TextTrack.cues to contain the complete file. No generic ASS virtualization claim and no silent caption truncation.

**Local-agent boundary.** Integrate source-scoped subtitle identities and transcript APIs; embedded extraction and remote subtitle fetching are separate work.

## R49 — Size lookahead in wall-clock time, not fixed media seconds

**New buffer-policy experiment · P1 · PROPOSED / NOT TESTED**

**Extends:** R26, R34, R39. **Reference primitives:** S1, S4, L3.

**Question.** Can rate-aware buffer targets reduce starvation at fast playback and wasted preparation at slow playback?

**Mechanism.** Set a positive-rate media target from a bounded wall-time reserve: media seconds ≈ playbackRate × desired wall seconds. Apply hard byte caps and hysteresis, and use the shortest contiguous usable track horizon. Keep the initial-play threshold separate.

**Smallest useful experiment.** Replay deterministic byte-release traces at 0.5×, 1×, 2× and 4×, including abrupt changes and pause/resume. Compare a fixed-media target with the new controller using identical source availability and memory caps. Charge any extra production after the viewer stops.

**Comparison.** The best current bounded scheduler, including R39’s track-bottleneck priority; do not use a deliberately poor round-robin control.

**Correctness gate.** Same requested speed, frames, tracks and fidelity; no stale production after seek. Faster requested playback is not permission to lower resolution or omit audio.

**Measure.** Usable progress, stalls, contiguous buffer minimum, generated/discarded bytes, wakeups and stop latency.

**Stop / reject.** Stop on oscillation, growth beyond byte limits or unsupported assumptions about independently obtainable tracks. Simulated delivery does not establish internet robustness.

**Local-agent boundary.** Connect real producer timing, byte budgets and source topology. This is a buffer controller, not a multi-route numerical cost predictor.

## R50 — Evict on actual GOP boundaries to preserve useful rewind media

**New retention-policy experiment · P2 · PROPOSED / NOT TESTED**

**Extends:** R38, R45. **Reference primitives:** S1, S9, L3.

**Question.** Can keyframe-aware eviction retain more useful rewind coverage under the same buffer budget than arbitrary time cutoffs?

**Mechanism.** Use the actual random-access map to choose eviction boundaries outside current decoding dependencies. Preserve a small useful rewind region and inspect the browser’s resulting ranges, since removal may discard more than the requested interval.

**Smallest useful experiment.** Create short and long closed-GOP variants with the same content. Under a modest explicit budget, alternate forward playback and short backward seeks. Compare a safe time-based cutoff with a GOP-aware cutoff; include a boundary just before the playhead and an evicted-reference negative control.

**Comparison.** R38’s safe in-place recovery. Do not force another near-OOM quota run merely to obtain a result.

**Correctness gate.** No missing dependencies, stale frames or false buffered-seek acceptance. The budget must include retained application data, not only submitted MSE bytes.

**Measure.** Actual ranges removed, useful rewind coverage, reappended bytes, seeks requiring regeneration and eviction frequency.

**Stop / reject.** Drop if existing browser eviction already gives equivalent coverage or index cost exceeds saved work. An unchanged requested removal range is not proof of unchanged browser retention.

**Local-agent boundary.** Integrate the maintained keyframe/index source and quota handler. Browser-owned allocations remain partly opaque.

## R51 — Try integer-lossless source codecs before changing lossy decoders

**New input-profile feasibility study · P1 · PROPOSED / NOT TESTED**

**Extends:** R10, R11. **Reference primitives:** S7, S3, E1.

**Question.** Do ALAC or ordinary TrueHD stereo provide a genuinely necessary, sample-preserving FLAC adaptation case without selecting a different fixed decoder?

**Mechanism.** Use the normal decoder of an integer-lossless source, encode its established integer output as FLAC, and packet-copy compatible video. Start with ALAC; generated TrueHD is a separate second profile, not an Atmos/DTS-HD claim.

**Smallest useful experiment.** Inventory confirms host encoders exist. Generate 16/24-bit stereo 48 kHz references with distinct channels and low-level bit patterns. First test original Native and packet-copy alternatives. Only if those cannot meet the request, validate reference PCM → source codec → decoded PCM → FLAC → decoded PCM, then test host-progressive MSE playback.

**Comparison.** Original playback when it works; otherwise normal-decoder output and an independently verified preconverted output control. Do not invent an unavailable Hybrid benchmark.

**Correctness gate.** Exact sample values/counts, bit alignment, rate/layout and video payloads; test drain, seeks and bounded production. A silent or downmixed browser result is not success.

**Measure.** Destination eligibility first; then conversion cost, generated bytes, startup, bounded lookahead and sample differences.

**Stop / reject.** Stop when unchanged Native works, precision is uncertain or a supported subset cannot be generated. Do not strip objects/extensions, change decoders or quantize to force exactness.

**Local-agent boundary.** Maintained ALAC/TrueHD decoder profiles and matching Wasm are new local implementation work. Host success does not silently qualify or enable those inputs in Demuxe.

## R52 — Keep source sample rates across audio-track changes

**New format-transition experiment · P2 · PROPOSED / NOT TESTED**

**Extends:** R15, R16, R35. **Reference primitives:** S1, S5, S8.

**Question.** Can switching between 44.1 and 48 kHz audio preserve video and original audio packets, rather than normalizing all tracks into one encoded format?

**Mechanism.** Reconfigure only the audio initialization/configuration at an explicit switch boundary. Begin with the same AAC profile and stereo layout at different sample rates, preserving each track’s own source clock and priming.

**Smallest useful experiment.** Generate distinct 44.1/48 kHz tracks and hold one video buffer. Test both directions with new initialization data, then compare the supported same-SourceBuffer procedure against a full reopen. Include nonzero offsets, pause, backward restoration and failed replacement.

**Comparison.** Reopen with the selected original audio at its original rate. Any common-rate re-encoding comparison is a separately permitted fidelity tradeoff, not the default control.

**Correctness gate.** Expected track/tones, duration and speed, correct delays and no dropped tail. Browser/device resampling may still occur; compressed packet preservation is not physical sample-exact output.

**Measure.** Interruption, video identity, initialization work, native audio configuration, queue memory and audible-marker timing where observable.

**Stop / reject.** Reject unsupported reconfiguration, speed/pitch errors or hidden application resampling. Do not extend this result to channel-count or arbitrary codec switches.

**Local-agent boundary.** Connect actual track selection, configuration generations and source-time mapping; match both FFmpeg and browser timestamp units.

## R53 — Coalesce gain gestures into audio-clock automation

**New audio-control quality experiment · P2 · PROPOSED / NOT TESTED**

**Extends:** R26, R35. **Reference primitives:** S5, L3.

**Question.** Can rapid volume/gain gestures avoid abrupt sample discontinuities and excessive main-thread updates while keeping the Native audio route?

**Mechanism.** Use the existing single GainNode with a short explicitly specified ramp for ordinary gain gestures. Schedule in AudioContext time and replace pending ramps coherently. This changes the gain-transition contract, not the underlying audio codec.

**Smallest useful experiment.** Compare direct steps and 3–10 ms ramps on a deterministic tone during a dense gesture burst and simulated main-thread delay. Use an OfflineAudioContext for a reference waveform if available, then validate the existing media-element graph separately. Test cancellation, zero/unity and pause/resume.

**Comparison.** Immediate gain changes on the same graph; keep the requested target amplitudes and count all automation work.

**Correctness gate.** Expected envelope/target error and transient energy, with bounded pending events. Digital measurements do not prove perceptual transparency or physical speaker behavior.

**Measure.** Scheduled events, sample discontinuities, control latency and total update work; CPU savings remain a question.

**Stop / reject.** Never delay an urgent mute, weaken gain=0, or use a fade to conceal a broken codec splice. Stop if an unavailable API would require a new audio engine.

**Local-agent boundary.** Define ramp-versus-immediate semantics in the existing public controls; preserve mpv filters and maintain one authoritative gain stage.

## R54 — Tune WebM cluster production for early audio availability

**New container-specific delivery experiment · P2 · PROPOSED / NOT TESTED**

**Extends:** R04, R32, R34. **Reference primitives:** S3, S6, L3, E1.

**Question.** Does the working mixed-container route become more useful when Opus WebM bytes are emitted incrementally by the actual producer?

**Mechanism.** Vary only a few supported WebM cluster-time/size and flush choices, keeping the same Opus packets and source timeline. Distinguish bytes FFmpeg has emitted from a prebuilt file artificially dripped into MSE.

**Smallest useful experiment.** Feed existing Opus packets through a native FFmpeg pipe with default and bounded cluster policies. Record actual byte-release times, then append alongside identical fMP4 video. Test startup, delayed delivery, cancellation and EOF. First prove packet count, delay and tail equivalence for every candidate.

**Comparison.** R32’s working MP4-video/WebM-audio path and an all-MP4 equivalent, when both preserve the same Opus sequence.

**Correctness gate.** Same audio samples/packet timing after declared codec delay, unchanged video, and earlier joint A/V rather than merely earlier video buffering.

**Measure.** Producer release delay, host mux work, bytes/boxes, first usable A/V, appends and memory.

**Stop / reject.** Reject a changed tail, timestamp drift or gains that vanish once live mux release is included. Do not revive the failed MP4 frag_interleave settings from R33.

**Local-agent boundary.** Check controls in the pinned Wasm build and connect real output backpressure. A pipe/simulated-delivery result is not live-stream protocol qualification.

## R55 — Cache bounded decoded previews for scrub revisits

**New preview-only route candidate · P2 · PROPOSED / NOT TESTED**

**Extends:** R40, R45. **Reference primitives:** S4, S10, L3.

**Question.** Can reverse scrubbing and repeated hover previews reuse recently decoded preview images instead of repeatedly seeking a decoder?

**Mechanism.** Maintain a small explicitly approximate preview cache keyed by source, video selection, presentation geometry and source time. Capture only requested preview frames; do not read back every normal playback frame.

**Smallest useful experiment.** Use a separate muted preview element on a compatible source or captures already produced for requested previews. Replay one-way and back-and-forth gesture traces with and without an eight-image/byte cap. Test source replacement and a late capture from a canceled preview.

**Comparison.** The same preview requests without caching. Final commit always uses the existing exact seek; playback quality does not change.

**Correctness gate.** Preview labels match their captured frames, main playback stays authoritative, and old-source images never reappear. Preview approximation must be explicit.

**Measure.** Preview decoder seeks, hit rate, latest-preview delay, canvas readback cost, retained image bytes and main-playback disturbance.

**Stop / reject.** Drop if one-way use pays mostly capture/memory overhead or a second decoder harms playback. No general zero-copy, bandwidth or exact-seek claim.

**Local-agent boundary.** Add preview intent to UI controls and coordinate cache release. A Native-compatible preview source does not qualify previews for every Hybrid/Software format.

## R56 — Map repeated clip boundaries in integer media ticks

**New timeline precision experiment · P2 · PROPOSED / NOT TESTED**

**Extends:** R36, R45. **Reference primitives:** S1, S8, S9, L3.

**Question.** Can queue/loop mapping avoid cumulative rounding gaps without changing any encoded sample or the intended duration of an item?

**Mechanism.** Derive boundaries from rational track timestamps and exact sample counts. Keep integer/rational arithmetic until converting once at the browser API boundary, rather than accumulating rounded display-time durations.

**Smallest useful experiment.** First inspect the current R36 mapping. If it already preserves rational timing, do not duplicate it. Otherwise use short 30000/1001-fps clips with 44.1 kHz audio, non-integer item lengths and known priming. Compare many mapped boundaries and seek directly to late joins instead of playing hours.

**Comparison.** Current mapping and an independently calculated exact-timestamp reference. Preserve genuine source offsets/gaps and the declared item-end policy.

**Correctness gate.** Frame/sample accounting and cumulative endpoint error. A browser’s timestamp resolution is not fixed by JavaScript arithmetic; record unavoidable rounding separately.

**Measure.** Expected versus admitted offsets, gap/overlap around joins, cumulative error, conversion overhead and boundary recovery.

**Stop / reject.** Reject any solution that stretches timestamps, trims samples, pads silence or silently chooses a different item duration. Do not manufacture a poor float algorithm if current code already avoids the problem.

**Local-agent boundary.** Apply to queue/source-time mapping only after the public duration and subtitle policies are settled; this is not an arbitrary splice guarantee.

## R57 — Probe a real six-channel Native FLAC destination

**New output-profile feasibility study · P1 · PROPOSED / NOT TESTED**

**Extends:** R15, R51. **Reference primitives:** S5, E1.

**Question.** Can the browser preserve six distinct audio channels internally, providing evidence for a future multichannel lossless-adaptation destination?

**Mechanism.** Package known 5.1 integer PCM as FLAC beside copied H.264. Inspect the media-element audio output before the final device mix using six channel-analysis paths. This is a destination gate, not a claim about physical surround speakers.

**Smallest useful experiment.** Generate a finite 48 kHz 16/24-bit 5.1 fixture with a different signal per declared channel, including a separate LFE marker. Verify host FLAC decode-back, then test direct and MSE playback, seeking and EOF. Compare against an intentional stereo-downmix negative control.

**Comparison.** Known six-channel PCM/FLAC and an explicitly labeled stereo control. Ensure the analysis graph does not upmix or downmix before the observation point.

**Correctness gate.** Recover a six-by-six channel identification matrix, correct timing/rate and unambiguous mapping. Six tones mixed into two channels are not six-channel preservation.

**Measure.** Channel separation, exposed graph layout, decode/output availability, startup and browser-owned memory where observable.

**Stop / reject.** If the graph exposes only stereo, report that boundary instead of assuming original channels survive. No object-audio or DTS-HD-extension preservation claim, no speaker/DAC exactness, and no automatic 5.1 admission from this test.

**Local-agent boundary.** Qualify the actual output device, browser platform and maintained adaptation layout handling locally before making a surround-playback promise.

## Shared experiment contract

**1. Reuse and isolate.** Create a new directory per card; preserve earlier archives and fixtures. Read the current maintained code before integrating. No source changes, automatic admission, commits or publication are authorized by this research document.

**2. Establish availability.** Use default browser features and injected local bytes. Stop at a decisive missing API or incompatible output. Record unsupported configuration separately from tool/harness failure. No silent use of experimental flags.

**3. Use a small discriminating corpus.** Begin with 8–15-second timestamped moving video, distinct left/right and per-track markers, a B-frame/nonzero-start variant and an awkward tail. Generate extra rates/layouts only for the relevant card. Encoders run during fixture preparation unless the experiment explicitly measures conversion.

**4. Hold requirements fixed.** Original Native and packet-copy alternatives come first. Match tracks, language, presentation size, rate, captions and fidelity permissions. Preview approximation and selected resolution changes are explicit features, never hidden quality reductions.

**5. Preserve source and timeline authority.** Every async completion belongs to a source and operation/configuration generation. A canceled candidate must not append, display or control playback later. Test pause, seek, source replacement and destruction at relevant boundaries.

**6. Prove the claimed output.** Packet bytes, PCM equality, native cue state, actual presented frames and physical speaker/display behavior are different evidence. Use decoded-frame/tone/screenshot observations where possible; do not promote a TimeRanges or metadata result to full A/V correctness.

**7. Measure the work that changed.** Compare against the strongest already-passing baseline, including R34/R42 where relevant. Keep analyzers/readback outside CPU runs. Count first-use indexing, preloading, concatenation, muxing and teardown. Report simulated delivery, opaque allocations and system-service exclusions.

**8. Bound every experiment.** Set explicit byte/object/queue caps and deadlines. Do not fill memory to OOM or run an exhaustive codec product. Stop failed configurations before performance work; preserve unfavorable results and minimal reproducers.

**9. Keep native and Wasm evidence separate.** Prebuilt output can establish destination behavior; a live host FFmpeg pipeline can measure host-plus-browser work. Neither qualifies the missing maintained decoder profile, source security path or pinned browser/Wasm build.

**10. Deliver an actionable verdict.** Save code, commands, hashes, actual pipeline, raw evidence, baseline, gaps and a verdict: PROMISING, INCONCLUSIVE, INCORRECT, NOT WORTH COMPLEXITY or BLOCKED. State exactly which local integration gates remain.

## Source register

External references were read on 17 September 2026. Source references justify primitives, not the proposed complete routes. Rolling documentation is not evidence of behavior in Chromium 144 or Demuxe’s pinned runtimes.

### L1 — Existing R01–R30 research backlog
demuxe-research-2026-09-17/Demuxe_Routing_Optimization_Ideas.md

Supplied hypothesis catalogue. Used to avoid presenting old ideas as new.

### L2 — Existing R31–R42 experiment design
demuxe-next-experiments-2026-09-17/Demuxe_Sandbox_Experiment_Addendum.md

Supplied cards, scope, environment boundaries and controls.

### L3 — Completed R31–R42 standalone results
demuxe-r31-r42-lab/RESULTS_R31_R42.md

Supplied lab evidence, not rerun here. Some passes establish buffered ranges or tone changes, not sample-perfect output.

### S1 — W3C Media Source Extensions, 7 August 2026 Working Draft
https://www.w3.org/TR/2026/WD-media-source-2-20260807/

Initialization, coded-frame processing/removal, append windows and changeType. Specification primitives do not prove a tested browser combination.

### S2 — W3C ISO BMFF Byte Stream Format
https://www.w3.org/TR/mse-byte-stream-format-isobmff/

MP4 initialization and media-segment requirements. Not a complete ordinary-MP4 sample-table implementation guide.

### S3 — FFmpeg formats documentation
https://ffmpeg.org/ffmpeg-formats.html

Fragmented MP4 and WebM/Matroska cluster controls. Rolling documentation; installed options were inventoried separately.

### S4 — WHATWG HTML: media and text tracks
https://html.spec.whatwg.org/multipage/media.html

Seeking, playback rate, cue insertion/removal and media state. Used as interface evidence, not a timing guarantee.

### S5 — W3C Web Audio API
https://www.w3.org/TR/webaudio-1.0/

AudioParam automation, media-element sources, channel splitters and output graph behavior. Internal channel evidence is not speaker qualification.

### S6 — W3C WebM Byte Stream Format
https://www.w3.org/TR/mse-byte-stream-format-webm/

Initialization and cluster-based media segmentation. Actual incremental FFmpeg emission remains to be tested.

### S7 — FFmpeg 7.1 ALAC decoder source
https://ffmpeg.org/doxygen/7.1/alac_8c_source.html

ALAC sample-size handling and integer-output implementation. Exact files and profiles still need round-trip validation.

### S8 — FFmpeg 7.1 timestamp mathematics
https://ffmpeg.org/doxygen/7.1/group__lavu__math.html

Rational rescaling and duration-preserving helpers. Inspiration for exact index arithmetic, not an instruction to call C helpers from JavaScript.

### S9 — ffprobe documentation
https://ffmpeg.org/ffprobe.html

Packet/frame metadata for fixture ground truth. Offline full-file scanning must not be hidden as a free runtime index.

### S10 — W3C File API
https://www.w3.org/TR/FileAPI/

Blob slices and byte access. No claim that a Blob slice or MSE append is physically zero-copy.

### E1 — Local executable inventory, this research pass
environment-inventory.json

Version/help commands only: Chromium, FFmpeg, Node, Playwright; ALAC/TrueHD/FLAC encoders and WebM mux controls. No fixture generation or playback.

## Work log

Read the existing backlog and completed R31–R42 reports, reviewed primary specifications/FFmpeg references, and ran version/help inventories. No fixture generation, browser playback, performance test or repository modification occurred in this pass.
