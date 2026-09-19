<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Follow-up backlog

48 first-pass candidates, not 48 proven speedups or qualified routes. This campaign did not execute confirmation. Order is the package ranked order; each next test remains bounded and must preserve its actual baseline and adverse control.

## 1. R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally

The retained bridge submits one EncodedVideoChunk per admitted packet and its VP9 helper only reads key-frame configuration; no explicit superframe splitter is visible at this boundary. Whether the demuxer already normalizes a particular fixture remains unmeasured. The actual VP9 configuration query succeeds, so an input-framing inventory is worthwhile.

Next test: Inventory one known VP9 alternate-reference superframe at the current bridge and compare component payload order plus visible output with the unsplit construction; include corrupted index lengths and hidden dependency retention.

Falsifier: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

Evidence: [work/root/audits/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md](work/root/audits/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 2. R138.one-sourcebuffer-different-codec-and-container.report-continuity

The recovered report records SourceBuffer parser acceptance across MP4/H264 to WebM/VP9, not full selected A/V output. Current worker packaging creates a new presentation per restart. The live API exposes changeType and both MIME families, so a tiny continuity/output component is a useful next test, not a qualified route.

Next test: Compare one retained SourceBuffer versus restart using exact two-configuration media; verify decoded pictures/audio continuation rather than buffered ranges, and reject dependent-picture initialization or changed unsupported audio.

Falsifier: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

Evidence: [work/root/audits/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md](work/root/audits/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 3. R005.move-mse-ownership-off-the-window-thread

Current MSE scheduling stays in the window while blocking Wasm and reads have separate workers. Dedicated-worker MediaSource is now available in the tested secure worker, clearing the old capability uncertainty. No reduction in UI jitter or main-thread CPU has been measured.

Next test: Transfer a MediaSourceHandle from a dedicated nonblocking worker and append an existing exact fMP4 under one bounded UI load; include detach/worker-death cleanup before considering a production ownership change.

Falsifier: A different failure, stale source/hash or malformed record must not count as the intended finding.

Evidence: [work/root/audits/R005.move-mse-ownership-off-the-window-thread.md](work/root/audits/R005.move-mse-ownership-off-the-window-thread.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 4. R057.probe-a-real-six-channel-native-flac-destination

Maintained FLAC adaptation explicitly rejects more than two channels; the separate Wasm output can request six channels but that does not prove Native FLAC preservation. A browser destination-only matrix is useful without relaxing admission.

Next test: Use an independently encoded short six-channel FLAC fixture and ChannelSplitter analysis for direct and MSE output; record six-by-six identification matrix.

Falsifier: Intentional stereo downmix must lose independent channel identity and fail the six-channel oracle.

Evidence: [work/batch_a/audits/R057.probe-a-real-six-channel-native-flac-destination.md](work/batch_a/audits/R057.probe-a-real-six-channel-native-flac-destination.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 5. R088.native-hls-playlist-views-over-compatible-existing-media

HLS selection exists for the application-owned streaming bridge, but no playlist-view authoring path over existing file byte ranges was found. Direct Native media ownership already exists, making an exact native-HLS gate cheaper than a new service.

Next test: Query native HLS on the intended browser; if accepted, serve one existing qualified fragmented file as a byte-range VOD playlist and observe native requests plus one seek/EOF.

Falsifier: Use a range that is not a legal segment boundary; rejection must not be silently repaired by re-encoding or an HLS library.

Evidence: [work/batch_a/audits/R088.native-hls-playlist-views-over-compatible-existing-media.md](work/batch_a/audits/R088.native-hls-playlist-views-over-compatible-existing-media.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 6. R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output

A native draw_yuv boundary already supplies planar pointers, strides, crop and color for qualified 8-bit 420; current WebGL presenter copies rows and uploads planes. A test-only VideoFrame constructor can be compared at that boundary without a new decoder.

Next test: At existing drawYUV boundary, test one stride/crop 420 frame through raw VideoFrame against YUV and RGB reference; only then short playback work counters.

Falsifier: Odd stride/crop plus unsupported 10-bit/PQ input must not be silently quantized or interpreted as 8-bit 420.

Evidence: [work/batch_a/audits/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md](work/batch_a/audits/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 7. R059.construct-a-selected-track-mp4-view-without-remuxing-samples

Direct local playback already consumes a File Blob, so an equal-size metadata view could avoid remux for explicit alternate audio. Existing cheap inspection rejects extra tracks and does not edit moov; this is a concrete bounded new capability.

Next test: Build one isolated equal-size trak-to-free view for the existing two-audio MP4; independently compare mdat/selected packet identity and tone after seek, with tref rejection.

Falsifier: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

Evidence: [work/batch_b/audits/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md](work/batch_b/audits/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## 8. R115.play-an-ongoing-fmp4-response-through-one-native-url

Uncontrolled permitted HTTP file URLs already reach the native element. That owner can exercise progressive finite fMP4 without a new playback backend; earlier complete-Blob runs do not test response-open output.

Next test: Reuse the server with one fMP4 response held open after its first fragment; require first frame and audio before EOF, then delayed-fragment resume and clean closure against identical MSE bytes.

Falsifier: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

Evidence: [work/batch_b/audits/R115.play-an-ongoing-fmp4-response-through-one-native-url.md](work/batch_b/audits/R115.play-an-ongoing-fmp4-response-through-one-native-url.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## 9. R003.coalesce-range-reads-around-useful-media-boundaries

Reads already use cached windows (64KiB in the actual native-remux source worker; the generic RangeReader default is 256KiB) anchored at requested offsets, avoiding one request per AVIO call. Adaptive metadata/keyframe-aware sizing is absent; value requires a controlled latency trace against this actual baseline, not a deliberately tiny reader.

Next test: Replay one tail-moov and distant-seek trace with current windows versus one bounded adaptive window policy; count abandoned and useful bytes and include ETag replacement.

Falsifier: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

Evidence: [work/batch_b/audits/R003.coalesce-range-reads-around-useful-media-boundaries.md](work/batch_b/audits/R003.coalesce-range-reads-around-useful-media-boundaries.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [work/batch_e/r003-baseline-correction.md](work/batch_e/r003-baseline-correction.md)

## 10. R021.cache-subtitle-tiles-and-schedule-only-useful-redraws

Unchanged libass responses already skip rasterization; changed responses allocate ImageData and OffscreenCanvas for every tile. Exact tile reuse is a narrower observable gap than inventing an ASS next-change parser.

Next test: Instrument existing tile updates for static text and karaoke; trial one bounded exact tile cache keyed by bytes/color/geometry and render revision, comparing pixels after paused resize.

Falsifier: Seek into an active cue, change fonts/layout/source, or omit a required style/control. No silent simplification or stale overlay.

Evidence: [work/batch_b/audits/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md](work/batch_b/audits/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## 11. R026.replace-polling-chains-with-bounded-credits-and-deadlines

Remux uses a 50ms pump interval despite message/update-driven work; decoder already has dequeue/wait wakeups. There is a concrete one-owner timer boundary to measure, not evidence for replacing all scheduling.

Next test: Count remux pump calls while paused/full and after delayed updateend; replace only redundant periodic wakeups with event plus deadline scheduling, then cancel a blocked read.

Falsifier: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

Evidence: [work/batch_b/audits/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md](work/batch_b/audits/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## 12. R027.share-immutable-compiled-code-not-live-playback-state

Reported maintained-reference startup suite saving 14.10%; 95% interval 9.89–18.39% straddles the 10% threshold. Functional prototype exists, but raw evidence and production ownership are not independently rechecked here. Actual local raw records and prior manifest identity were inspected in this v4 import.

Next test: Later cache/asset/memory/cancellation confirmation; do not automatically start a large confirmation campaign during breadth-first screening.

Falsifier: Original adverse controls retained; no new execution

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## 13. R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds

Producer lookahead uses fixed five media seconds and 12MiB, while playback rate is adjustable. Slow playback can therefore retain more wall-time work; historical source warns producer-limited fast playback may not improve.

Next test: Run one bounded 0.5x stop trace and one 4x rate jump with fixed versus rate-aware lookahead, keeping minimum reserve, 12MiB cap and output identical.

Falsifier: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

Evidence: [work/batch_b/audits/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md](work/batch_b/audits/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## 14. R066.communicate-the-requested-start-position-before-first-data-preparation

Direct load awaits loadeddata and candidate setup settles at zero before seeking a nonzero target. The desired target is available in caller scope but is not propagated to initial native load.

Next test: Pass a research target only to direct source initialization; compare earliest correct frame and actual range reads on one nonzero resume plus zero-start and immediate-replacement controls.

Falsifier: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

Evidence: [work/batch_b/audits/R066.communicate-the-requested-start-position-before-first-data-preparation.md](work/batch_b/audits/R066.communicate-the-requested-start-position-before-first-data-preparation.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## 15. R100.transfer-owned-packet-storage-into-webcodecs-chunks

Normal packet input aliases shared Wasm memory and cannot be transferred; fallback slices and prefixed key packets own standalone arrays. Those branches currently still construct chunks without transfer, leaving a narrow second-copy opportunity.

Next test: Feature-test constructor detachment then use transfer only for full owned buffers in a research worker; compare chunk bytes and decoded timestamps with shared-heap and oversized-subview rejection controls.

Falsifier: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

Evidence: [work/batch_b/audits/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md](work/batch_b/audits/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md), [sources/proposals/R88-R101-research-backlog.md](sources/proposals/R88-R101-research-backlog.md)

## 16. R124.copy-a-frame-once-to-free-the-decoder

The retained presenter keeps a held VideoFrame for redraw until replacement; that can hold a decoder surface. Bounded queue sizes alone do not establish surface pressure or justify copying every frame.

Next test: Count held-frame lifetime during pause and a long display interval; compare copying only that held output to owned storage against direct retention, including copy/conversion cost and redraw pixels.

Falsifier: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

Evidence: [work/batch_b/audits/R124.copy-a-frame-once-to-free-the-decoder.md](work/batch_b/audits/R124.copy-a-frame-once-to-free-the-decoder.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## 17. R131.global-mp4-sidx-materially-changes-remote-access.report-frontier

The recovered report removes the old source gate. Native direct delegates remote access to the media loader, so global sidx can affect actual transferred bytes; controlled-fetch remux is a separate route. Current RangeReader validates identities but cannot give a browser-native loader an index absent from the file.

Next test: Use the existing local HTTP harness for one same-payload indexed/nonindexed fMP4 pair and one seek; record metadata-ready and total seek bytes, first target picture, ETag change rejection on the controlled route separately.

Falsifier: Proposed only: Equal or larger cold-plus-seek bytes with correct target presentation on the indexed source defeats the claimed value for that response-cap profile.

Evidence: [work/batch_c/audits/R131.global-mp4-sidx-materially-changes-remote-access.report-frontier.md](work/batch_c/audits/R131.global-mp4-sidx-materially-changes-remote-access.report-frontier.md)

## 18. R169.make-custom-presentation-aware-of-display-cadence

Retained presentation uses engine-selected source PTS and deadlines but schedules via setTimeout; there is no observed display-opportunity feedback in that owner. A narrow cadence observer is possible without replacing the master clock.

Next test: Instrument one retained playback at mismatched source/display cadence, keeping engine deadlines; compare actual displayed frame identities with scheduled identities and pause/seek cancellation.

Falsifier: Proposed only: More callbacks without improved actual presentation, changed playback speed, or duplicate controller corrections rejects the scheduling change.

Evidence: [work/batch_c/audits/R169.make-custom-presentation-aware-of-display-cadence.md](work/batch_c/audits/R169.make-custom-presentation-aware-of-display-cadence.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## 19. R215.upload-operation-selected-by-existing-layout

YUV presenter packs every plane row into tight staging before GL upload. The report uses WebGPU operation constraints, whereas current owner is WebGL2; its 256-byte alignment example is not directly transferable. The broader layout-selected upload mechanism has a concrete copy boundary worth a GL-specific screen.

Next test: Test one WebGL2 UNPACK_ROW_LENGTH-compatible positive stride against current packed upload using an independent pixel capture; retain packing for negative or unrepresentable strides and reset pixel-store state.

Falsifier: Proposed only: Visible mismatch, stale row-length state on a second frame, or unsupported shared heap upload rejects the direct-stride branch.

Evidence: [work/batch_c/audits/R215.upload-operation-selected-by-existing-layout.md](work/batch_c/audits/R215.upload-operation-selected-by-existing-layout.md)

## 20. R222.independently-checkable-remux-construction-record

Existing test source already compares packet payload hashes and relative timing, but does not show a reusable construction record binding source offsets, output offsets, config and identities with all five report mutations. This is a bounded oracle extension, not a mux speedup or executed validation.

Next test: Extend one retained small capture with source/output packet positions and config hashes; independently reject wrong offset, swapped payload, timing, config and stale source identity records.

Falsifier: Proposed only: Any mutated record accepted, or a record verified only against its own producer metadata, defeats independent auditability.

Evidence: [work/batch_c/audits/R222.independently-checkable-remux-construction-record.md](work/batch_c/audits/R222.independently-checkable-remux-construction-record.md)

## 21. R267.deadline-slack-before-optimization

Current worker and append ownership boundaries are identifiable, but existing remuxMs and queue counters are not stage-specific deadline slack. The source proves only a model. A bounded observation experiment can distinguish scheduling constraints before pursuing more batching changes.

Next test: At one low-buffer refill inject a separately controlled small read, processing or append delay, preserving original bytes; record target-frame deadline and queue state, then stop at first classified miss.

Falsifier: Proposed only: Baseline misses, observer-induced load or delay leaking across stages makes the slack attribution inconclusive rather than proving append is tightest.

Evidence: [work/batch_c/audits/R267.deadline-slack-before-optimization.md](work/batch_c/audits/R267.deadline-slack-before-optimization.md)

## 22. R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier

Current packet mux preserves packets and initial padding but this source audit does not establish final positive DiscardPadding propagation. Nominal element duration is not a sample-trim oracle.

Next test: Inspect one current WebM output final BlockGroup/DiscardPadding and decode sample count; zero only that metadata as adverse control while retaining packet hashes.

Falsifier: Inspect one current WebM output final BlockGroup/DiscardPadding and decode sample count; zero only that metadata as adverse control while retaining packet hashes.

Evidence: [work/batch_d/audits/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md](work/batch_d/audits/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md)

## 23. R133.append-moof-and-mdat-separately.report-continuity

R47 already reuses sole owned buffers, but multi-piece batches still gather. Separate moof/mdat appends could remove residual gathering at the cost of extra updateend scheduling; current append interface assumes one buffer per lane.

Next test: Use a test-only per-lane two-piece queue for one moof/mdat fragment; compare payload/output and cleanup, with seek between pieces as stale-input control. Count saved copy bytes and extra appends, not just detachments.

Falsifier: Use a test-only per-lane two-piece queue for one moof/mdat fragment; compare payload/output and cleanup, with seek between pieces as stale-input control. Count saved copy bytes and extra appends, not just detachments.

Evidence: [work/batch_d/audits/R133.append-moof-and-mdat-separately.report-continuity.md](work/batch_d/audits/R133.append-moof-and-mdat-separately.report-continuity.md)

## 24. R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity

Current complete batches avoid arbitrary sample splits. The reported distinction is a useful prerequisite for any partial-delivery change, not a demonstrated existing playback bottleneck.

Next test: For one captured fragment compare exact first-sample cut against 37-byte-truncated cut, observing buffered ranges and independently presented frames; do not infer presentation from range alone.

Falsifier: For one captured fragment compare exact first-sample cut against 37-byte-truncated cut, observing buffered ranges and independently presented frames; do not infer presentation from range alone.

Evidence: [work/batch_d/audits/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md](work/batch_d/audits/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md)

## 25. R136.worker-owned-mse-with-mediasourcehandle.report-continuity

MSE lives in the window while demux is already a worker. Current secure-origin shared probe supports worker construction, superseding historical opaque-origin blockage; handle attachment/sourceopen and output remain untested.

Next test: Run one worker MediaSourceHandle attachment plus fragment/seek/EOF and cleanup; reject stale worker messages after destroy and report sourceopen failure separately from media failure.

Falsifier: Run one worker MediaSourceHandle attachment plus fragment/seek/EOF and cleanup; reject stale worker messages after destroy and report sourceopen failure separately from media failure.

Evidence: [work/batch_d/audits/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md](work/batch_d/audits/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 26. R137.transferable-compressed-buffers-into-worker-mse.report-continuity

Compressed buffers already transfer mux-worker to window; moving MSE would change final ownership, not eliminate FFmpeg-to-owned buffer copy. Worker attachment is the missing end-to-end primitive.

Next test: After valid worker-MSE attachment, transfer one owned compressed buffer, assert sender detachment and actual decoded output; cancel before append and prove release without publication.

Falsifier: After valid worker-MSE attachment, transfer one owned compressed buffer, assert sender detachment and actual decoded output; cancel before append and prove release without publication.

Evidence: [work/batch_d/audits/R137.transferable-compressed-buffers-into-worker-mse.report-continuity.md](work/batch_d/audits/R137.transferable-compressed-buffers-into-worker-mse.report-continuity.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 27. R014.avoid-duplicate-resampling-and-oversized-audio-work-batches

mpv output rate is set from the browser context, and fixed PCM ring batches already avoid per-packet worklet messages. Source/filter/device-rate conversion exposure is unknown; physical device conversion cannot be inferred from context rate.

Next test: Trace 44.1/48k source, filter and context rates plus ring occupancy; change only one batch size if duplicate conversion or oversized work is observed. Inject worker delay and reject underrun/latency regression.

Falsifier: Trace 44.1/48k source, filter and context rates plus ring occupancy; change only one batch size if duplicate conversion or oversized work is observed. Inject worker delay and reject underrun/latency regression.

Evidence: [work/batch_d/audits/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md](work/batch_d/audits/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md)

## 28. R037.recover-an-interrupted-partial-append-without-replacing-mse

Current same-source unbuffered seek always replaces MSE. SourceBuffer abort/reset may preserve unaffected ranges after deliberately partial input; a tiny parser-boundary pilot can decide before changing controller ownership.

Next test: Split one captured fragment at incomplete moof and incomplete sample, abort legally and append target RAP; delayed old bytes must be rejected and target frame must match full-source seek.

Falsifier: Split one captured fragment at incomplete moof and incomplete sample, abort legally and append target RAP; delayed old bytes must be rejected and target frame must match full-source seek.

Evidence: [work/batch_d/audits/R037.recover-an-interrupted-partial-append-without-replacing-mse.md](work/batch_d/audits/R037.recover-an-interrupted-partial-append-without-replacing-mse.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## 29. R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place

QuotaExceededError currently enters one full restart, while safe RAP-aligned eviction is already implemented. An injected one-shot quota branch is a localized controller opportunity; genuine quota remains separate.

Next test: Test preserving pending bytes, evicting a safe old RAP interval and retrying once; a second refusal must stop, and non-quota error must not be retried as capacity. No memory exhaustion test.

Falsifier: Test preserving pending bytes, evicting a safe old RAP interval and retrying once; a second refusal must stop, and non-quota error must not be retried as capacity. No memory exhaustion test.

Evidence: [work/batch_d/audits/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md](work/batch_d/audits/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## 30. R054.tune-webm-cluster-production-for-early-audio-availability

WebM currently uses 500ms audio-only clusters, huge video time limit and 8MiB size cap; rm_step avoids closing video clusters after first keyframe. This is an actual configurable producer boundary distinct from MSE drip feeding.

Next test: Compare one smaller supported cluster policy with live emitted-byte timestamps and PCM tail/packet oracle; reject earlier video-only availability or altered CodecDelay/DiscardPadding.

Falsifier: Compare one smaller supported cluster policy with live emitted-byte timestamps and PCM tail/packet oracle; reject earlier video-only availability or altered CodecDelay/DiscardPadding.

Evidence: [work/batch_d/audits/R054.tune-webm-cluster-production-for-early-audio-availability.md](work/batch_d/audits/R054.tune-webm-cluster-production-for-early-audio-availability.md), [sources/reports/RESULTS_R43_R57.md](sources/reports/RESULTS_R43_R57.md)

## 31. R112.supply-known-webm-durations-to-prevent-parser-holdback

Current WebM delegates duration metadata to pinned FFmpeg; no observed holdback has been attributed to missing duration. A metadata inspection and matched delayed-next-packet probe is cheaper than mux changes.

Next test: Inspect one actual output BlockDuration/DefaultDuration, then compare truthful duration signaling only if missing; use Opus as expected no-benefit and VFR last-frame timing as adverse control.

Falsifier: Inspect one actual output BlockDuration/DefaultDuration, then compare truthful duration signaling only if missing; use Opus as expected no-benefit and VFR last-frame timing as adverse control.

Evidence: [work/batch_d/audits/R112.supply-known-webm-durations-to-prevent-parser-holdback.md](work/batch_d/audits/R112.supply-known-webm-durations-to-prevent-parser-holdback.md), [sources/reports/R102-R115-report.md](sources/reports/R102-R115-report.md)

## 32. R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster

RangeReader already starts misses at requested offsets, avoiding unused prefix; whether FFmpeg requests cluster start versus cue-relative block is the remaining mechanism-specific exposure. No new byte provider is needed for attribution.

Next test: Trace one large-Cluster distant seek against validated CueRelativePosition; compare requested offsets and correct target frame, and corrupt relative offset must reject rather than skip required codec context.

Falsifier: Trace one large-Cluster distant seek against validated CueRelativePosition; compare requested offsets and correct target frame, and corrupt relative offset must reject rather than skip required codec context.

Evidence: [work/batch_d/audits/R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster.md](work/batch_d/audits/R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster.md)

## 33. R013.treat-intentionally-disabled-tracks-as-removable-work

Native audio no currently only sets muted=true, while rm_open treats negative selection as automatic. Explicit disabled-track intent is not encoded as absent audio; there is concrete potential to avoid preparation of intentionally unused audio.

Next test: Add test-only explicit no-audio selection sentinel without changing mute behavior; compare video identity and audio packet/decoder/encoder counters, then re-enable at legal source time; mute alone must not remove audio work.

Falsifier: Add test-only explicit no-audio selection sentinel without changing mute behavior; compare video identity and audio packet/decoder/encoder counters, then re-enable at legal source time; mute alone must not remove audio work.

Evidence: [work/batch_d/audits/R013.treat-intentionally-disabled-tracks-as-removable-work.md](work/batch_d/audits/R013.treat-intentionally-disabled-tracks-as-removable-work.md)

## 34. R192.identity-coded-witness-media

Existing adaptation tests independently hash ordered video packets and complete PCM; browser signal monitoring uses pulses and frame progress, not time-local video/channel identities. Identity-coded witnesses add a distinct observer safeguard.

Next test: Reuse one tiny fixture with per-epoch visual codes and left/right tones; prove that reordered pictures, swapped channels and shifted audio are rejected by browser observations.

Falsifier: A different failure, stale source/hash or malformed record must not count as the intended finding.

Evidence: [work/batch_e/audits/R192.identity-coded-witness-media.md](work/batch_e/audits/R192.identity-coded-witness-media.md), [sources/reports/R183-R192-report.md](sources/reports/R183-R192-report.md)

## 35. R141.no-index-fragmented-mp4-native-remote-seek.report-continuity

Direct remote sources delegate seeking to the browser; no-index fMP4 scanning may fetch the whole resource even when seek succeeds. Existing range transport supplies the controlled-request baseline, but historical six-second totals do not characterize large current sources.

Next test: Serve one existing fMP4 with/without its random-access trailer under identical capped ranges; seek late and record fetched versus useful bytes, preserving exact frames.

Falsifier: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

Evidence: [work/batch_e/audits/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md](work/batch_e/audits/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md), [sources/reports/R132-R145-report.md](sources/reports/R132-R145-report.md)

## 36. R240.vp9-webm-cluster-surgery.report-c

WebM output has explicit cluster policy, so packet-identical smaller clusters are a localized mux choice. The report proves same pictures but no startup or delivery benefit; splitting cannot invent RAPs.

Next test: Inspect current VP9 cluster release on one existing source, then lower only cluster boundary policy if it withholds useful bytes; compare packet hashes and first usable output with non-RAP seek control.

Falsifier: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

Evidence: [work/batch_e/audits/R240.vp9-webm-cluster-surgery.report-c.md](work/batch_e/audits/R240.vp9-webm-cluster-surgery.report-c.md), [sources/reports/R239-R245-rerun-report.md](sources/reports/R239-R245-rerun-report.md)

## 37. R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch

Shared secure-localhost evidence now exposes AudioEncoder, removing the old opaque-page API blocker. Current lossy path uses a Wasm Opus encoder, so exact codec/rate/channel support and PCM transfer overhead are the next bounded questions.

Next test: Query one 48kHz stereo Opus AudioEncoder profile and encode a tiny known PCM block; inspect delay/padding and decoded output before any comparison with matching Wasm settings.

Falsifier: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

Evidence: [work/batch_e/audits/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md](work/batch_e/audits/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## 38. R022.use-document-pip-to-keep-native-subtitles-and-controls

NativeASS explicitly disables video-only PiP and binds document fullscreen/listeners; player disconnection may trigger lifecycle cleanup. Document PiP is a concrete destination need but requires moving the owner without accidental destruction.

Next test: Query Document PiP under user activation in a normal desktop session, then move one paused ASS container and verify restore/resize/listener ownership before playback.

Falsifier: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

Evidence: [work/batch_e/audits/R022.use-document-pip-to-keep-native-subtitles-and-controls.md](work/batch_e/audits/R022.use-document-pip-to-keep-native-subtitles-and-controls.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## 39. R008.keep-display-only-transformations-out-of-cpu-video-filters

Metadata rotation/aspect already reaches presentation transforms, but every requested video-filter string still forces Software. A distinct display-operation API could reuse those owners without reinterpreting pixel-processing semantics.

Next test: Trace one explicitly display-only rotation/mirror request against software reference pixels and subtitle/pointer geometry; preserve pixel-filter APIs and source metadata separately.

Falsifier: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

Evidence: [work/batch_e/audits/R008.keep-display-only-transformations-out-of-cpu-video-filters.md](work/batch_e/audits/R008.keep-display-only-transformations-out-of-cpu-video-filters.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## 40. R053.coalesce-gain-gestures-into-audio-clock-automation

Current GainNode updates are immediate setValueAtTime calls; ordinary slider volume currently commits on change. A short ramp is an explicitly different transition contract and a localized quality probe, not established CPU optimization.

Next test: Compare step versus 5ms gain-ramp envelopes in OfflineAudioContext, with emergency zero immediate and one media-element graph lifecycle control.

Falsifier: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

Evidence: [work/batch_e/audits/R053.coalesce-gain-gestures-into-audio-clock-automation.md](work/batch_e/audits/R053.coalesce-gain-gestures-into-audio-clock-automation.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## 41. R095.fixed-opus-gain-through-codec-container-headers

Native gain currently creates one media-element Web Audio gain stage. Fixed Opus output-gain metadata is a narrower explicit static-asset request and could avoid that graph; the report has packet and amplitude controls, but container honor and existing gain combination are not established for the current served route.

Next test: Use one Opus asset with existing nonzero header gain; compare fixed -6 dB header preparation with the current gain node on one admitted container and one seek.

Falsifier: Proposed falsifier: A double-applied gain or container ignoring the field must fail the digital amplitude oracle.

Evidence: [work/batch_f/audits/R095.fixed-opus-gain-through-codec-container-headers.md](work/batch_f/audits/R095.fixed-opus-gain-through-codec-container-headers.md)

## 42. R158.structure-aware-failure-preserving-reduction

Current packaging negotiation and runtime capture provide a place for a differential destination predicate, but no structure-aware reducer is present. The historical laced/unlaced WebM predicate is concrete and can be reused as an oracle design, not presumed a current Chrome failure.

Next test: Reconfirm the original laced/unlaced destination distinction first; if reproduced, reduce one element while preserving EBML lengths and the positive control.

Falsifier: Proposed falsifier: A reduction that breaks both controls is a generic broken file and must be rejected.

Evidence: [work/batch_f/audits/R158.structure-aware-failure-preserving-reduction.md](work/batch_f/audits/R158.structure-aware-failure-preserving-reduction.md)

## 43. R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors

The historical seven-witness result used abstract routes. Current planAdmission is a finite executable decision function with explicit isolation, subtitle and lossless-policy guards; maintained tests already encode useful distinctions. A model-derived subset must be checked against this actual function.

Next test: Build a truth table from existing plan-admission fixtures, select a compact subset and hold out changed-policy cases without modifying admission.

Falsifier: Proposed falsifier: A held-out float-FLAC or discarded-subtitle fault missed by the subset rejects its completeness claim.

Evidence: [work/batch_f/audits/R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors.md](work/batch_f/audits/R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors.md)

## 44. R338.decode-into-the-layout-the-next-stage-already-needs

Historical missing-header blocker is not current: pinned avcodec.h exposes get_buffer2 and constraints. A real row repack exists in presenter. First compare stride-aware upload (R215) before adding custom decoder allocation; availability of headers alone is not a callback ownership pass.

Next test: Inventory one matching independent-picture decoder/artifact, compare default versus stride-aware upload, and only if needed scope a real get_buffer2 callback test.

Falsifier: Proposed falsifier: Live buffer reuse, odd-dimension padding mismatch or direct upload already removing the repack ends the allocation variant.

Evidence: [work/batch_f/audits/R338.decode-into-the-layout-the-next-stage-already-needs.md](work/batch_f/audits/R338.decode-into-the-layout-the-next-stage-already-needs.md)

## 45. R041.route-simple-subrip-captions-to-native-text-tracks

Current browser text-track owner accepts URL tracks and applies remux timeline bias; byte SubtitleAsset admission permits ASS/SSA but excludes SRT. A strict external SRT-to-VTT adapter is a concrete small missing component; embedded extraction is a separate larger feature.

Next test: Convert one external overlap/multiline SRT into owned WebVTT URL and compare with hand-authored VTT through existing addTextTrack and source cleanup.

Falsifier: Proposed falsifier: Font-color/placement syntax must reject, and cues must receive remux bias exactly once.

Evidence: [work/batch_f/audits/R041.route-simple-subrip-captions-to-native-text-tracks.md](work/batch_f/audits/R041.route-simple-subrip-captions-to-native-text-tracks.md)

## 46. R225.h-264-self-contained-idr-suffix.report-continuity

Current TS seek finds and verifies a preceding IDR with bounded backward reads; the report narrower Annex-B repeated-SPS/PPS suffix is a real opportunity only where configuration closure is independently known. It does not justify skipping the current verification loop blindly.

Next test: On one existing AVC sample inspect repeated parameters and compare suffix decode with continuous reference; log actual backward scan avoided separately.

Falsifier: Proposed falsifier: Missing parameter set or non-IDR start must reject, not appear as a faster seek.

Evidence: [work/batch_f/audits/R225.h-264-self-contained-idr-suffix.report-continuity.md](work/batch_f/audits/R225.h-264-self-contained-idr-suffix.report-continuity.md)

## 47. R061.keep-explicit-channel-processing-on-the-native-audio-graph

Native already owns one media-element gain graph, providing a bounded insertion point for an explicitly requested channel-index matrix. Current admission does not support remapping, and historical six-channel index result does not justify semantic speaker guesses or downmix permission.

Next test: In an isolated graph extension compare six-channel identity and one-index attenuation against OfflineAudioContext matrix reference, reusing the single media source.

Falsifier: Proposed falsifier: Unknown speaker order, hidden mix, clipping or stale graph after source replacement rejects.

Evidence: [work/batch_f/audits/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md](work/batch_f/audits/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md)

## 48. R202.guarded-narrow-arithmetic

Current IDCT uses its bit-depth template and arithmetic/storage contract; maintained custom SIMD initializes biweight/deblock, not a guarded IDCT path. The reported 2672 model bound cannot simply replace this implementation without proving identical bias/shifts/clipping.

Next test: First reconcile actual IDCT arithmetic with the 2672 bound and collect bounded admitted-block counts; then one kernel oracle at 2672/2673, negative extrema and high-bit-depth rejection. No whole-decoder promotion.

Falsifier: First reconcile actual IDCT arithmetic with the 2672 bound and collect bounded admitted-block counts; then one kernel oracle at 2672/2673, negative extrema and high-bit-depth rejection. No whole-decoder promotion.

Evidence: [work/batch_g/audits/R202.guarded-narrow-arithmetic.md](work/batch_g/audits/R202.guarded-narrow-arithmetic.md)

