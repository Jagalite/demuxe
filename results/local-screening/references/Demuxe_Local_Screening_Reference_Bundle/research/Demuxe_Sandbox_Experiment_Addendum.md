# Demuxe: Next Experiments for the Current Sandbox

**2026-09-17 · R31–R42 · research addendum**

**Scope.** Twelve additional experiments: four new route/session/component candidates and eight explicitly labeled follow-ons to R01–R30. These are new Demuxe hypotheses, not claims of industry novelty or unimplemented production behavior.

**Evidence.** Every new card is PROPOSED / NOT TESTED. The prior lab supports feasibility of the test tools, not success of these extensions. Some ideas will be rejected at their first tiny API/configuration probe.

**Environment.** Executable inventory rechecked here: Chromium 144.0.7559.96, native FFmpeg 7.1.5, Node 22.16.0, Python Playwright. The saved lab supplies working window-MSE, split-buffer and digital-audio observation harnesses. [L2]

**Boundary.** Do not bypass browser administration/origin restrictions. Feed local fixture bytes through the existing in-memory page harness. Any scripted delivery delay is a simulation; it is not evidence about HTTP, TLS, CORS, network bandwidth or service workers.

**Interpretation.** A host-FFmpeg/browser result is a feasibility and component-cost screen, not a strict lower bound or predicted Wasm speed. Same MediaSource identity does not prove the browser retained the identical internal decoder. Buffered ranges, decoded frames and observed A/V output are separate facts.

## Shortlist and ownership

| ID | Experiment | Type | Priority | First execution owner |
|---|---|---|---|---|
| R31 | Raw AAC/MP3 audio beside fragmented video | New route candidate | P1 | Sandbox prototype; local production integration |
| R32 | Use different output containers for different tracks | New route candidate | P1 | Sandbox prototype; local production integration |
| R33 | Interleave samples for earlier complete A/V output | Follow-on optimization | P1 | Sandbox prototype; local production integration |
| R34 | Small startup appends, larger steady-state batches | Follow-on optimization | P1 | Sandbox prototype; local production integration |
| R35 | Switch same-codec audio at a future boundary without pausing | Follow-on transition experiment | P1 | Sandbox prototype; local production integration |
| R36 | Reuse one MSE presentation across a queue or repeat loop | New session-plan candidate | P2 | Sandbox prototype; local production integration |
| R37 | Recover an interrupted partial append without replacing MSE | Follow-on recovery optimization | P1 | Sandbox prototype; local production integration |
| R38 | Recover from a full buffer by evicting and retrying in place | Follow-on resource optimization | P1 | Sandbox prototype; local production integration |
| R39 | Prioritize the track that limits usable playback | Follow-on scheduling optimization | P2 | Sandbox prototype; local production integration |
| R40 | Coalesce scrub requests and commit the final exact seek | Follow-on interaction optimization | P2 | Sandbox prototype; local production integration |
| R41 | Route simple SubRip captions to Native text tracks | New subtitle-component candidate | P1 | Sandbox prototype; local production integration |
| R42 | Recycle owned transfer buffers at the MSE boundary | Follow-on allocation optimization | P2 | Sandbox prototype; local production integration |

Recommended first pilots: **R31 → R33 → R35 → R37 → R41**. This is an engineering-priority judgment, not a performance prediction. Keep R32 as a quick destination probe alongside R31.

## R31 — Raw AAC/MP3 audio beside fragmented video

**New route candidate · P1 · extends R15 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** For a controlled MSE presentation, avoid wrapping an already usable compressed audio elementary stream in MP4. Keep H.264 video in its own fMP4 buffer and try raw ADTS AAC or MPEG audio in the audio buffer, with one video element owning A/V playback.

**New question versus prior work.** R15 changed audio codecs inside MP4 packaging. This asks whether the audio mux stage can be omitted entirely. It is not a replacement for original Native playback when that already works.

**Source primitive.** The MPEG-audio MSE note defines audio/aac and audio/mpeg. The registry marks these as generated-timestamp streams. [S1, S2]

**Why testable here.** Uses native FFmpeg packaging and ordinary window MSE. Tiny destination checks can run using injected bytes, without a secure-origin encoder or new Wasm.

**First experiment.** First compare the same AAC access units as ADTS and audio-only fMP4, alongside identical video. Test exact MIME acceptance, nonzero audio offset, startup, a distant seek and final audio. Add MP3 only after AAC succeeds. Reconstruct raw-audio placement explicitly from sample counts and the requested source interval.

**Comparison baseline.** Existing split fMP4 video + fMP4 AAC. Establish packet identity after removing only packaging; no audio re-encoding during the compared mux paths.

**Measurements.** Audio packaging time/bytes, first jointly playable A/V interval, append count, observed sync drift, seek recovery, browser CPU and tail samples where observable.

**Reject or stop.** The combined format is rejected, generated timestamps lose the source offset, or delay/preroll cannot be preserved. A nonzero tone alone is not evidence of correct synchronization.

**Local-agent boundary.** Map demuxed packets, decoder preroll and source time into a maintained raw-audio MSE adapter. Do not enable it from a MIME hint alone.

## R32 — Use different output containers for different tracks

**New route candidate · P1 · extends R15 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** Try one MediaSource with H.264 video in fMP4 and Opus or Vorbis audio in WebM. Select packaging per track rather than insisting on one common mux format for the entire presentation.

**New question versus prior work.** The prior audio-switch experiment used AAC/FLAC/Opus in MP4. This tests a mixed-container pair and whether that avoids unnecessary audio repackaging or an otherwise unavailable joint mux combination.

**Source primitive.** MSE has distinct MP4 and WebM byte-stream specifications. Their individual validity does not establish that this browser accepts both together. [S3–S5]

**Why testable here.** Only native FFmpeg muxing and window-owned MSE are required. Mixed-format support itself remains the first experiment.

**First experiment.** Generate one Opus packet sequence and package it once as MP4 and once as WebM. Pair each with the same fMP4 video. Verify actual output, codec delay, the source offset, seeks and near-EOF behavior. Screen Vorbis separately only if both its producer and browser destination are available.

**Comparison baseline.** All-MP4 split A/V where supported. Also keep the original-file Native control so a packaging experiment does not manufacture a need for remux.

**Measurements.** Candidate availability, mux bytes/CPU, usable startup, append behavior, track-switch recovery and meaningful output near boundaries.

**Reject or stop.** A second SourceBuffer is rejected, Opus delay/timestamps differ, or mixed parser overhead has no benefit. Never place H.264 inside WebM by just changing its MIME.

**Local-agent boundary.** Extend per-track packaging negotiation and finite-plan qualification, not arbitrary dynamic component assembly.

## R33 — Interleave samples for earlier complete A/V output

**Follow-on optimization · P1 · extends R04 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** Keep the proven fragment duration and GOP structure, but change where audio/video samples appear inside each fragment so partial delivery becomes useful for both tracks earlier.

**New question versus prior work.** R04 established early buffered video from partial bytes. It did not prove early complete audiovisual startup. This targets sample ordering, not shorter fragments or different codec output.

**Source primitive.** FFmpeg documents frag_interleave as an intra-fragment sample-grouping control with an overhead tradeoff. [S6]

**Why testable here.** Host FFmpeg exposes the mux controls; prebuilt and live-pipe output can be inspected without compiling Demuxe.

**First experiment.** Create small candidate values using packet-copy inputs. Compare audio/video payload hashes, DTS/PTS and timing first. Feed the resulting fragments with identical byte-release schedules, then observe when both tracks can actually play. Include a delayed-audio and B-frame source.

**Comparison baseline.** Current mux interleaving with the same selected tracks, fragment duration and output policy. Do not compare against a video-only control.

**Measurements.** Bytes needed for usable A/V, first frame and digital-audio onset in separate correctness runs, box overhead, host mux CPU and browser append work.

**Reject or stop.** Earlier video hides later audio, timing changes, overhead dominates, or the live muxer cannot release output earlier. A prebuilt drip-fed result is not proof of live FFmpeg flush behavior.

**Local-agent boundary.** Expose only a validated mux setting and verify availability in the pinned preparation build. Do not relax the previously failed fragment-timing gates.

## R34 — Small startup appends, larger steady-state batches

**Follow-on optimization · P1 · extends R04, R26 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** Use short bounded append batches until playable output exists, then aggregate transport chunks while a safe buffer remains. Return to smaller batches near starvation. Keep the encoded fragment bytes and timestamps unchanged.

**New question versus prior work.** R04 compared fixed chunk sizes. This tests one controller that balances initial latency against steady updateend/event/allocation overhead.

**Source primitive.** MSE supports incremental parsing and update-driven appends; the exact batch policy is a proposed algorithm, not a standardized optimization. [S3]

**Why testable here.** Reuses the saved R04 bytes and window MSE harness; delivery delay is simulated in page code, not claimed as a real network benchmark.

**First experiment.** Replay identical bytes with three controls: whole-fragment, fixed-small, and adaptive-small-to-large. Introduce deterministic delivery jitter and main-thread tasks. Sweep only a few byte/time caps, and ensure no overlapping append/remove operations.

**Comparison baseline.** The best correctness-passing fixed batch. Include the cost of concatenating batches; prefer views or pooled storage only when ownership is safe.

**Measurements.** Initial output delay, appends/events per media second, peak pending bytes, browser-process CPU, stall count and cancellation latency.

**Reject or stop.** The scheduler waits past a useful deadline, retains unbounded bytes, or merely shifts startup work outside the timing interval. Slow JavaScript callbacks are not themselves total CPU measurements.

**Local-agent boundary.** Attach the controller to actual emitted mux output. Verify that backpressure reaches the Wasm producer rather than accumulating in another queue.

## R35 — Switch same-codec audio at a future boundary without pausing

**Follow-on transition experiment · P1 · extends R15 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** Preserve the buffered old-audio prefix up to a future switch time T, replace only later audio with an equivalent-configuration selected track, and let the current video and playhead continue.

**New question versus prior work.** The saved R15 harness pauses, clears the audio buffer, changes type and resumes. This tests a non-pausing same-codec splice; the earlier result does not establish seamlessness.

**Source primitive.** MSE exposes append windows, timestamp offsets and range removal; audio gap/overlap behavior requires output-level validation. [S3, S7]

**Why testable here.** The same MSE and Web Audio observation tools used by R15 are available. Only generated same-codec media is needed initially.

**First experiment.** Start with two FLAC tracks generated from distinguishable stereo markers at the same sample rate and configuration. Prepare replacement audio, choose a future boundary outside current decode dependencies, replace only the future range, and observe the switch. Then test AAC with its real priming metadata. Add cancel-before-commit and failed-replacement cases.

**Comparison baseline.** Existing pause/clear/reappend R15 transaction. Do not add a second audio element or independent output clock.

**Measurements.** Video continuity, digital marker switch time, gap/repeat duration, kept buffer identity, peak overlapping bytes and rollback outcome.

**Reject or stop.** The browser requires an interruption, removal crosses the playhead dependencies, or output repeats/drops samples. Report a failed seamless hypothesis rather than broadening timing tolerances.

**Local-agent boundary.** Connect to real source-scoped track selection and encoder resets. Codec-changing switches, language roles, effects and subtitles remain separate qualification steps.

## R36 — Reuse one MSE presentation across a queue or repeat loop

**New session-plan candidate · P2 · extends R09, R18 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** Append the next compatible clip into a continuous browser timeline instead of opening a new player for every queue item. Reuse compressed media for an explicit loop while keeping only bounded current/next output.

**New question versus prior work.** R18 caches already-prepared intervals within a source. This targets the transition between explicitly queued items and repeat boundaries, with a logical source-to-presentation mapping.

**Source primitive.** MSE provides timestamp offsets and append windows. Chrome has an audio gapless-playback example; it is not proof of gapless A/V queue transitions. [S3, S7]

**Why testable here.** Compatible encoded clips, offset mapping and window MSE are sufficient for the first browser pilot.

**First experiment.** Use two short H.264/AAC clips with deliberately matching codec configurations and identifiable A/V boundaries. Compare reopen-per-item with a mapped single-MSE timeline. Check the last/first samples and frames, seeking across the join, pause at the boundary and a bounded repeated loop.

**Comparison baseline.** One media element reopening each clip with the same preloaded input availability. Count all next-item preparation in both cases.

**Measurements.** Boundary gap, source-time mapping, frame/sample continuity, setup CPU, object churn and retained bytes.

**Reject or stop.** Config incompatibility, priming, nonzero origins or clip selection changes cannot be represented accurately. Do not invent a sample-accurate arbitrary trim or keep an unbounded playlist buffered.

**Local-agent boundary.** Define public per-item events, source identities, cancellation, subtitle timelines and authorization before production. This is not an HLS/DASH implementation.

## R37 — Recover an interrupted partial append without replacing MSE

**Follow-on recovery optimization · P1 · extends R04, R15 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** On a same-source seek during partial media delivery, retire obsolete input, reset only the affected parser state, and start a valid segment near the new target while preserving unrelated accepted buffers.

**New question versus prior work.** This combines partial transport with seek recovery. It tests whether an incomplete mdat forces full presentation replacement, not whether a corrupted source should be ignored.

**Source primitive.** MSE defines abort/parser-reset behavior and a subsequent random-access requirement. Reset may process complete buffered frames before discarding remaining input bytes. [S3]

**Why testable here.** Existing fragments can be split at controlled byte offsets and delivered through ordinary MSE. No WebCodecs or worker-MSE attachment is required.

**First experiment.** Pause delivery at several boundaries: incomplete moof, incomplete sample, and after complete samples in an unfinished fragment. Issue a same-source seek, legally abort/reset, reapply necessary windows, and append valid target init/media. Release old delayed input as a stale-generation negative control.

**Comparison baseline.** Destroy/recreate MediaSource at the same barrier using the same target source bytes.

**Measurements.** Preserved ranges and object identities, target-frame recovery, duplicate output, reread/regeneration needs and cleanup.

**Reject or stop.** A real append/decode error has terminally invalidated the presentation, required state cannot be restored, or stale bytes enter the new sequence. Source replacement is out of scope: do not preserve old-source buffers.

**Local-agent boundary.** Map parser boundaries to Demuxe request/producer generations and restore all settings. Do not treat abort() as an all-purpose repair for codec, auth or integrity errors.

## R38 — Recover from a full buffer by evicting and retrying in place

**Follow-on resource optimization · P1 · extends R17, R26 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** Treat an append capacity shortage as a buffer-management event: remove a safe expendable interval, reduce forward production if appropriate, then retry the still-owned media once instead of rebuilding the player.

**New question versus prior work.** The prior lab encountered a SourceBuffer-count limit. This proposal targets append capacity and controller behavior, not adding/removing more SourceBuffers or promising a fixed browser quota.

**Source primitive.** Chrome documents QuotaExceededError recovery through removal and retry, with cautions about the current GOP. Its published quota sizes are historical and are not used here. [S8]

**Why testable here.** Controller tests and real range-removal behavior use window MSE. Actual browser-quota conclusions require a genuine safely observed quota event.

**First experiment.** First unit-test a deterministic one-shot injected quota refusal. Preserve pending bytes, remove only safe old ranges, and retry under a bounded attempt count. Then attempt a modest capped real-browser capacity screen; if no actual quota is reached, label browser quota recovery untested rather than exhausting memory.

**Comparison baseline.** Full presentation restart after the same injected event. Preserve identical frame/sample expectations and no quality reduction.

**Measurements.** Playback interruption, retained/regenerated bytes, retries, decode-dependency preservation, current range inspection and final ownership.

**Reject or stop.** Recovery loops, removes current/future needed dependencies, treats other errors as quota, or silently lowers quality. A simulated exception is controller evidence only.

**Local-agent boundary.** Coordinate app-retained and MSE-visible budgets with the real producer, whose browser-owned allocations remain partly opaque.

## R39 — Prioritize the track that limits usable playback

**Follow-on scheduling optimization · P2 · extends R15, R26 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** When video is buffered far ahead but audio is nearly empty, give production/delivery priority to audio rather than continuing to fill video. Base decisions on a contiguous jointly usable interval near the playhead, not total bytes or the farthest buffered endpoint.

**New question versus prior work.** R26 supplies generic credits and watermarks. This is a concrete per-track scheduling policy that tests whether those credits should be asymmetric.

**Source primitive.** MSE defines availability using active track buffers. The scheduling policy is our proposal and must handle holes and actual track-end state. [S3]

**Why testable here.** Deterministic delayed delivery can be modeled with prebuilt in-memory segments, so the scheduler hypothesis is testable despite normal-origin network restrictions.

**First experiment.** Use identical split-track bytes and a scripted producer with one delayed track. Compare equal-share filling with bottleneck-first scheduling under the same total byte cap. Include a large video keyframe, rate changes, pause, a middle gap and a true tail as separate cases.

**Comparison baseline.** Equal-priority independent per-track targets with the same available bytes and artificial delay trace.

**Measurements.** Joint-buffer minimum, stalls, startup, peak queue bytes, discarded work after seek and fairness once the delayed track recovers.

**Reject or stop.** Priority starves video, confuses a future interval with contiguous coverage, or assumes delayed media has ended. A simulated producer result is not an internet bandwidth claim.

**Local-agent boundary.** Production depends on whether input demuxing can obtain the needed packets independently. Avoid a second whole-file scan or violating source read ordering to satisfy a toy scheduler.

## R40 — Coalesce scrub requests and commit the final exact seek

**Follow-on interaction optimization · P2 · extends R03, R18 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** During an explicit UI drag, service at most one in-flight preview seek and replace its pending successor with the newest target. On release, perform the final precise seek and restore the captured play/pause intent.

**New question versus prior work.** The earlier work shortened one buffered seek. This reduces obsolete repeated seek work during a burst, without changing ordinary programmatic exact-seek behavior.

**Source primitive.** HTML defines media seeking and precise currentTime updates. The coalescer is an application policy and does not require fastSeek, which must not be assumed available. [S9]

**Why testable here.** Uses JavaScript event scheduling and the existing media element; no extra native decoder, secure-origin API or SIMD build is required.

**First experiment.** Replay the same dense drag gesture against a direct and an MSE source. Compare every-event seeking with an explicit coalescing adapter. Include reversing direction, release while a seek is pending, and destruction; resolve or cancel superseded promises deterministically.

**Comparison baseline.** The same gesture stream and final target, with all seeks submitted in order. Intermediate preview accuracy is separately declared.

**Measurements.** Seek invocations, browser work, latest-preview lag, final-target correctness, obsolete work and restore latency.

**Reject or stop.** The final request is lost, a stale callback controls playback, or approximate previews are silently substituted for exact API calls. Memory-only tests cannot establish reduced HTTP download cost.

**Local-agent boundary.** Expose scrub intent in the control component without changing public exact-seek promises; couple to source cancellation only after standalone behavior passes.

## R41 — Route simple SubRip captions to Native text tracks

**New subtitle-component candidate · P1 · extends R19 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** For a deliberately small supported subset of simple SubRip captions, convert timing/text to WebVTT or VTTCue objects and keep video/audio Native instead of loading a rich renderer or changing the playback engine.

**New question versus prior work.** R19 preserves embedded rich ASS through libass. This is a cheaper plain-text path, not an ASS-to-text approximation. External SubRip can be tested entirely in JavaScript; embedded extraction is a separate host-FFmpeg screen.

**Source primitive.** WebVTT defines timed cues and a restricted markup vocabulary; HTML provides native text-track integration. [S10, S9]

**Why testable here.** Native text cues and a small converter can be tested with injected content and existing media. Host extraction is feasible but not a Wasm route measurement.

**First experiment.** Start with authored plain external SRT, Unicode, multiline text, overlapping cues and basic supported markup. Convert to explicitly matched cues and test active-cue seeking, pause, visibility and resize. Reject unsupported placement/formatting. Optionally extract one embedded SubRip track with host FFmpeg, retaining source timestamps and recording extraction cost separately.

**Comparison baseline.** Equivalent hand-authored WebVTT on the same video. No unavailable libass/mpv reference is invented; current Demuxe end-to-end comparison belongs with the local agent.

**Measurements.** Accepted subset, text/timing/markup equality, cue output, script/memory footprint, asset loads and cleanup.

**Reject or stop.** Conversion drops intended styling, positioning, language metadata or encoding information. No generic caption semantic-equivalence claim. A completed extraction is not bounded progressive embedded-subtitle support.

**Local-agent boundary.** Wire into subtitle admission and source-scoped identities. Embedded random-access extraction needs the maintained demux/transport bridge.

## R42 — Recycle owned transfer buffers at the MSE boundary

**Follow-on allocation optimization · P2 · extends R04, R26 · PROPOSED — NOT TESTED IN THIS PASS**

**Hypothesis.** Use a bounded pool of owned ArrayBuffer slabs between a producer worker and the main-thread append controller. After a safe acknowledgment, return storage for reuse instead of allocating a fresh fragment buffer every time.

**New question versus prior work.** R26 limits messages and credits. This examines storage ownership and reuse under the append protocol; it is not another claim of zero-copy browser decoding.

**Source primitive.** HTML defines transferable ArrayBuffer ownership. MSE has an asynchronous append lifecycle; the safe reuse point must be verified for the actual implementation and protocol. [S11, S3]

**Why testable here.** Blob workers, transferable buffers and window MSE fit the saved harness. No shared memory or worker-owned MediaSource is needed.

**First experiment.** Compare fresh allocation with a small pool using the same fragment bytes. Transfer owned buffers only. Initially return them after updateend, test a stricter safe synchronous-copy hypothesis separately, and include late cancellation, worker death, tail fragments and intentional early-reuse negative controls.

**Comparison baseline.** The current allocate/transfer/release pattern at the same queue depth and append sizes.

**Measurements.** Allocated byte totals, message count, pool high-water mark, garbage-collection pauses when observable, process CPU and accepted output hashes.

**Reject or stop.** A producer mutates data still in use, buffers cross source/credential ownership, the pool grows indefinitely, or added copies/messages erase any benefit. Browser internal copies are not eliminated by this protocol.

**Local-agent boundary.** Connect pool acknowledgments to real FFmpeg output and generation retirement. Never detach or recycle the shared Wasm heap; compiled/runtime interfaces stay unchanged unless rebuilt.

## Shared experiment contract

**Preserve the baseline.** Reuse prior fixtures and harness code under a new directory. Do not overwrite R04/R09/R15/R17 evidence, modify an active checkout, commit or enable new default routing.

**Availability gate.** Use ordinary browser defaults for scored cases. Screen exact SourceBuffer combinations first. Mark absent interfaces BLOCKED; do not revive experimental AudioVideoTracks or containerless MSE as a shipping prerequisite.

**Correctness before cost.** Use distinct left/right and per-track audio markers, timestamped moving video and negative controls. Test source-time offsets, seek, EOF, pause and destroy. Never accept absent audio, dropped captions or stale frames as savings.

**Small reusable corpus.** Start from 8–15-second compatible clips, one B-frame/nonzero-start variant and one offset-audio variant. Longer timed fixtures are generated only for candidates passing their pilot. Cache at most a bounded current/next window.

**Account for useful work.** Record host mux/preparation CPU separately from browser-process CPU, then include both for a live host pipeline. Prebuilt-byte experiments only assess the browser/output side. Do not time fixture generation as adaptation or hide adaptation outside an alleged end-to-end interval.

**No artificial audio claims.** A native analyzer can identify a track, but nonzero audio or a dominant frequency does not prove sample-exact output or physical synchronization. Keep analyzers/readback out of scored CPU runs and explicitly state unavailable observations.

**Stop conditions.** Stop on the first decisive unsupported combination, fidelity violation or unsafe ownership outcome. Limit retries and bytes. Keep simulated faults distinct from genuine browser failures. Do not allocate to OOM merely to force a quota event.

**Result contract.** Save version/flags, source/output hashes, exact code, raw logs, intended and observed pipeline, controls, pending-resource counts and a verdict: PROMISING, INCONCLUSIVE, NOT WORTH COMPLEXITY, INCORRECT, or BLOCKED. Production integration and other browsers remain separate.

## Send to the local agent

**Local agent: existing engine/transport integration.** R01/R02 source broker and useful-startup promotion; R03 actual range/network coalescing; R06 non-pthread/JSPI build; R13 disabled-track work removal; R14 mpv audio batching/resampling; R18 maintained prepared-media cache; R27 real compiled-engine reuse.

**Local agent: unavailable browser/platform surfaces.** R05 worker-owned MSE on a permitted normal origin; R07 HEVC TS on a target with HEVC support; R12 AudioEncoder; R22 Document PiP; R25 generated-track presenter on a normal browser. The prior limitations are environment-specific, not universal browser verdicts. [L2]

**Local agent: renderer and native builds.** R19 embedded rich ASS extraction; R20 bitmap subtitles; R21 the actual libass tile renderer; R23/R24 GPU/YUV/Software integration; R26 complete Demuxe worker scheduling; R28 the real streaming controller. Source-only or toy results are not exact-runtime qualification.

**Local agent: after this sandbox pass.** Integrate any passing R31–R42 candidate into maintained APIs, profile/semantic admission, transport/security, source identities and runtime builds. Recheck current main first; do not duplicate functionality already implemented there.

**Remain parked.** R30 remains flagged experimental research. Do not restart the rejected authenticated proxy plan, speculative cross-engine handoff, or generalized client-side video re-encoding without a distinct mechanism and requirement.

## Source register

Primary references were consulted on 17 September 2026. They establish primitives, not success of the proposed combined plans. Rolling documentation must be checked against the tested browser/tool version.

### L1 — Prior Demuxe research backlog, R01–R30
Supplied file: `Demuxe_Routing_Optimization_Ideas.md`
Supplied document. Baseline 9abfd1b; hypotheses, not implementation guarantees.

### L2 — Saved standalone route lab: RESULTS.md
Supplied file: `demuxe-route-lab-2026-09-17/RESULTS.md`
Supplied results for Chromium 144, FFmpeg 7.1.5 and Python Playwright. Prior runs were not repeated for this addendum.

### S1 — W3C MPEG Audio Byte Stream Format
https://www.w3.org/TR/mse-byte-stream-format-mpeg-audio/
Raw ADTS AAC and MPEG audio bytestream definitions; implementation support is optional.

### S2 — W3C MSE Byte Stream Format Registry
https://www.w3.org/TR/mse-byte-stream-format-registry/
Raw audio uses generated timestamps; container formats have separate mappings.

### S3 — W3C Media Source Extensions, Working Draft 7 August 2026
https://www.w3.org/TR/media-source-2/
SourceBuffers, append windows, parser reset, active-buffer ranges and lifecycle. Draft semantics are not a browser qualification result.

### S4 — W3C WebM Byte Stream Format
https://www.w3.org/TR/mse-byte-stream-format-webm/
WebM initialization and media units; does not guarantee mixed-container SourceBuffer combinations.

### S5 — W3C ISO BMFF Byte Stream Format
https://www.w3.org/TR/mse-byte-stream-format-isobmff/
MP4 initialization, media units and random-access constraints.

### S6 — FFmpeg Formats Documentation
https://ffmpeg.org/ffmpeg-formats.html
frag_interleave, max_interleave_delta, flush_packets and fragment controls. Check the installed/pinned version before using a rolling-documentation option.

### S7 — Chrome: Media Source Extensions for Audio
https://web.dev/articles/mse-seamless-playback
Historical official example of append windows and timestamp offsets for gapless audio; not a cross-browser guarantee.

### S8 — Chrome: Exceeding the buffering quota
https://developer.chrome.com/blog/quotaexceedederror
Historical recovery guidance. Do not copy its old quota sizes or browser-version assumptions into a current policy.

### S9 — WHATWG HTML: media elements
https://html.spec.whatwg.org/multipage/media.html
Seeking, media timelines and text tracks. This plan does not require fastSeek support.

### S10 — W3C WebVTT
https://www.w3.org/TR/webvtt1/
Cue timing, supported text markup and rendering. Not an assertion that all SubRip/ASS can be converted faithfully.

### S11 — WHATWG HTML: structured data and transferable objects
https://html.spec.whatwg.org/multipage/structured-data.html
ArrayBuffer transfer and ownership. Transfer across a worker boundary is not zero-copy throughout MSE.

## Work log

Read existing backlog/results/harness and primary documentation; rechecked executable availability/version. No media generation, playback, performance trial or production edit.

No current-main modification or background job was started. No new playback or benchmark results are claimed.
