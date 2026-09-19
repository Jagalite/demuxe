<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Top 100 ranks 31–65: archived acceptance reconciliation

Reviewed 30 imported-ledger items. Already normalized items skipped. Read actual output measurements, controls and limitations; verified cited hashes. No media experiments rerun. Scoped historical acceptance is not current-runtime requalification.

## Rank 32: R082.browser-side-video-normalization

Correctness: **passed**. Performance: **pending**.

All 72 VP9→AVC frames retain PTS; every visible RGB comparison exceeds the predeclared 32 dB lossy threshold (observed samples exceed 56 dB). Wrong timestamp order rejects; codecs close without errors. Accepted only for bounded lossy frame normalization, not mux/audio/route.

Next: Measure complete decode/encode/mux cost only for an explicit lossy-use workload; add source cancellation before integration.

## Rank 33: R173.preserve-flic-indices-plus-palette

Correctness: **pending**. Performance: **pending**.

Two actual FLC frames including palette-only update render exact independent RGBA on GPU and clean up. No executed malformed FLIC control or seek/checkpoint reconstruction is recorded; GPU recovery belongs to another case and cannot substitute.

Next: Execute a malformed chunk and backward checkpoint reconstruction for COLOR256/COPY scope before correctness acceptance.

## Rank 34: R194.browser-zlib-zmbv-reconstruction

Correctness: **passed**. Performance: **pending**.

Eight actual browser persistent-zlib ZMBV32 frames equal independent host BGR0, cold delta input rejects, inflater lifetime/cleanup recorded. Accepted bounded CPU reconstruction only; other bit depths and presentation absent.

Next: Profile complete inflation/reconstruction on representative content after declaring workload; add route seek/cancel when integrating.

## Rank 35: R117.play-iamf-through-native-component-decoders

Correctness: **passed**. Performance: **pending**.

Strict flat stereo IAMF presentation validates one element/layer and zero gain. Native extracted FLAC returns all 96000 frames, maximum host sample error 3.055e-6; unsupported gain and truncated input reject. Accepted flat whole-file component, not general IAMF renderer.

Next: Specify browser parsing/parameter ownership and complete cost before broad IAMF support or performance claims.

## Rank 36: R172.keep-hap-bc1-compressed-to-presentation

Correctness: **pending**. Performance: **pending**.

Actual Hap BC1 payload renders exact host RGBA with resource cleanup; 16 compressed versus 128 expanded bytes is representation accounting. No executed malformed Hap control, Snappy path or seek/source lifecycle acceptance is present.

Next: Run malformed packet and replacement/replay controls for restricted uncompressed Hap before completing correctness.

## Rank 39: R205.multicore-ffv1-without-shared-address-space-state

Correctness: **passed**. Performance: **pending**.

Four separate host FFV1 process outputs reconstruct all 12 full frames exactly; swapped quadrant control fails. Prepared compressed size increases 24351→28965 bytes. Accepted independently prepared quadrant component, not original-stream slice extraction or browser threads.

Next: Establish target browser/process transport and account preparation plus decode/assembly costs before claiming multicore value.

## Rank 40: R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately

Correctness: **passed**. Performance: **pending**.

Mapping-family-2 Opus produces 96000 four-channel frames with max host PCM error 3.725e-8; truncated input rejects. Four ACN/SN3D directions match scalar reference within 7.451e-9, while wrong ordering differs about 0.2. Cleanup recorded; physical spatial output excluded.

Next: Define spatial renderer and head-tracking/device contract separately; no acoustic or energy claim from this component.

## Rank 43: R019.extract-embedded-ass-while-leaving-video-native

Correctness: **passed**. Performance: **pending**.

Restricted Matroska extraction returns three cues and exact font, bounded 764367/7873050 bytes. Actual libass agrees with independent demux at seven times including long active cue and rewind; stale output rejects and worker closes. 8372 tiny reads remain a cost issue, not a failed output gate.

Next: Coalesce remote reads under unchanged cue/font budget and measure end-to-end extraction; preserve muxed timeline oracle.

## Rank 44: R020.render-bitmap-subtitles-without-burning-them-into-video

Correctness: **pending**. Performance: **pending**.

Eight off-boundary PGS samples match independent FFmpeg overlay; truncated segment rejects. Recorded exactTransitionBoundaryUnqualified remains unresolved, and general RLE/fragmented objects/overlay ownership are excluded.

Next: Resolve exact display/clear boundary oracle and ownership cleanup for the declared PGS profile before correctness acceptance.

## Rank 45: R031.raw-aac-mp3-audio-beside-fragmented-video

Correctness: **pending**. Performance: **pending**.

Raw AAC lane alongside fragmented AVC renders both 160x96 and 320x180 intervals with 880 Hz signal and EOF, original audio SourceBuffer retained and cleanup passes. This is not an independent exact priming/offset/gap or adverse lifecycle oracle; MP3 untested.

Next: Compare required audio samples/timestamps at transitions and run canceled append/seek control; keep MP3 outside accepted scope.

## Rank 46: R032.use-different-output-containers-for-different-tracks

Correctness: **pending**. Performance: **pending**.

Separate MP4 AVC and WebM Opus lanes produce marked output in both geometry intervals to EOF with cleanup. Exact cross-container timeline/sample alignment and adverse source/seek transitions are not recorded.

Next: Add independent A/V timeline and wrong-offset/cancel controls before whole split-lane correctness acceptance.

## Rank 47: R046.a-small-javascript-ordinary-mp4-to-mse-adapter

Correctness: **passed**. Performance: **pending**.

Bounded ordinary MP4 adapter preserves 72 video and 142 audio packet payloads/timing, full decoded pixels/PCM exact; malformed input rejects. Actual generated MSE output has marked audio/video to EOF and cleanup. Accepted only tested sample-table profile.

Next: Extend explicit profile with edit-list/B-frame/tail-moov fixtures before comparing complete JS adapter cost.

## Rank 48: R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders

Correctness: **passed**. Performance: **pending**.

Native ALAC rejection is separately recorded. Isolated pinned FFmpeg ALAC Wasm returns exact 384000 PCM bytes/96000 stereo frames; missing extradata and truncated packets reject, cleanup passes. TrueHD and complete route excluded.

Next: Integrate only declared ALAC adaptation owner with seek/cancel, then measure full startup and output costs.

## Rank 49: R058.change-video-codec-while-retaining-the-audio-presentation

Correctness: **pending**. Performance: **pending**.

Video geometry changes 160x96→320x180 while original audio lane remains and tone continues to EOF. Same-codec case does not establish video codec change, sample gaplessness or independent transition timeline fidelity.

Next: Qualify actual codec transition, continuous sample timing, wrong-config control and affected seek/cancel ownership.

## Rank 50: R059.construct-a-selected-track-mp4-view-without-remuxing-samples

Correctness: **passed**. Performance: **pending**.

Front/tail moov views preserve selected packets, mdat and size; edit only 5368 metadata bytes. Default 440 Hz control and selected 880 Hz reference/view outputs distinguish track selection before/after seek to EOF; two structural negatives and cleanup recorded. Unselected bytes remain; not redacted export.

Next: Add remote/admission profiles only when needed; benchmark metadata view construction versus equivalent selected-track baseline.

## Rank 51: R060.extract-in-band-closed-captions-from-compressed-video-headers

Correctness: **passed**. Performance: **pending**.

Authored H.264 registered A53 SEI yields restricted pop-on HI matching independent FFmpeg SRT; existing NAL bytes and all video pixels unchanged. Wrong parity rejects. Accepted extraction component, not CEA608/708 renderer or seek state restoration.

Next: Define caption state/seek restoration before integration; preserve original compressed video without mutation.

## Rank 52: R065.isolate-a-selected-program-from-multi-program-transport-streams

Correctness: **passed**. Performance: **pending**.

Selected program 202 packets and timing exact for normal/reversed PAT, valid selected PID set and missing program rejection. Real RemuxPlayer plays and seeks both outputs with host decoded A/V exact and zero surviving workers. Dynamic PSI/scrambling excluded.

Next: Measure selection opportunity only on actual multi-program workload; add dynamic tables before widening admission.

## Rank 53: R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1

Correctness: **pending**. Performance: **pending**.

Fresh-init avc3 geometry transition and retained audio work to EOF. No arbitrary in-band no-init transition, hev1 execution, independent full output identity or incompatible-config negative; shared lane experiment is capability evidence.

Next: Add exact transition oracle and incompatible-header/seek cases for bounded avc3; qualify hev1 independently.

## Rank 54: R092.normalize-vp9-codec-units-for-the-actual-destination

Correctness: **passed**. Performance: **pending**.

Actual worker compares aggregate versus split VP9 units: 78 components including six hidden frames yield 72 exact visible pictures/PTS; key24 seek yields 48 exact pictures. Missing hidden frame corrupts oracle, cold dependent start rejects; all frames close and workers terminate.

Next: Retain destination-specific framing predicate; investigate benefit only against current aggregate baseline, not generic splitting.

## Rank 55: R110.choose-a-destination-aware-lacing-or-unlacing-representation

Correctness: **passed**. Performance: **pending**.

Chrome rejects paired and single Xiph laces while unlaced baseline plays. Actual maintained Wasm remux preserves 101 packet payloads and 648-sample final discard padding; seek and cleanup pass. Accepted existing normalization profile, no new subsystem.

Next: Keep lacing and final-trim regression coverage; extend other lacing modes only with separate destination/output evidence.

## Rank 56: R115.play-an-ongoing-fmp4-response-through-one-native-url

Correctness: **pending**. Performance: **pending**.

With four-second initial fragment, native known/unknown-length URL produces marked A/V before response EOF; original one-second-first-fragment variant waited. MSE control output early. No exact full output or source cancellation/seek fidelity is established by delivery observation.

Next: Declare buffering/latency and cancellation/seek contract, then compare independent full output and adverse truncated response.

## Rank 57: R001.share-source-reads-and-inspection-across-candidates

Correctness: **not_applicable**. Performance: **not_applicable**.

Recorded sequential startup reads bound removable duplication at 277304 bytes and about 1.455–3.185 ms. No broker candidate was justified, so correctness and comparative performance gates do not apply to this scoped opportunity stop.

Next: Reopen for materially larger repeated-read cost after charging storage, copies, authority and cancellation.

## Rank 58: R002.promote-useful-startup-work-instead-of-reopening

Correctness: **passed**. Performance: **not_applicable**.

Direct-local lifecycle retains both exact prepared backend and surface, presents frames, seeks to 6 and EOF, then zero workers. Missing-video control rejects despite audio counters. Accepted existing prepared-session promotion only, not cross-backend sharing or PCM fidelity.

Next: Retain lifecycle regression; reopen only for a distinct startup owner that actually discards useful accepted preparation.

## Rank 59: R003.coalesce-range-reads-around-useful-media-boundaries

Correctness: **pending**. Performance: **pending**.

Adaptive read window reduces requests 73→24 while fetched bytes rise 4784128→5701632; real output progress, distant seek, source identity rejection and cleanup recorded. No full independent decoded-output comparison or abandoned-byte performance protocol.

Next: Verify output equivalence under cancellation/seek, then predeclare latency versus fetched/abandoned-byte tradeoff workload.

## Rank 60: R018.cache-prepared-media-by-timeline-and-transformation-recipe

Correctness: **passed**. Performance: **pending**.

Prepared fragment artifact cache hit returns exact bytes; five independent source/track/interval/recipe/runtime identity changes miss; corrupt entry rejects and entry limit is 1 MiB. Accepted immutable artifact cache component, no production concurrent cache lifecycle.

Next: Add cache owner concurrency/lifetime if integrated; measure hashing, retention and hit opportunity before benefit claim.

## Rank 61: R021.cache-subtitle-tiles-and-schedule-only-useful-redraws

Correctness: **passed**. Performance: **pending**.

Real libass static/karaoke tiles compare cached versus uncached raster exactly through repeat times, rewind and 320→640 resize with track/layout epoch invalidation. 28 hits/20 misses and 145496 retained bytes below 1 MiB; worker terminates. No next-change prediction claim.

Next: Measure complete render/raster/retention workload and invalidation costs; avoid equating tile hits with CPU savings.

## Rank 62: R026.replace-polling-chains-with-bounded-credits-and-deadlines

Correctness: **pending**. Performance: **pending**.

Pause tick count drops 24→1 in equal 1.2-second observation; play/seek wake, source identity rejection and cleanup pass. Complete independent presentation output and delayed-wake/deadline stress are not recorded; work count is not CPU qualification.

Next: Check exact presentation with delayed event/deadline and cancel controls; then declare full scheduler cost sampling.

## Rank 63: R027.share-immutable-compiled-code-not-live-playback-state

Correctness: **pending**. Performance: **failed**.

Maintained startup pairs execute cold/repeat/concurrent sessions with frame progress; authority diagnostic separately exercises abandoned preparation and source replacement. Complete fidelity/cache ownership qualification remains pending. Original performance gate is not met: 14.10% point saving, 95% interval 9.887–18.391% crosses minimum worthwhile 10%.

Next: Keep existing inconclusive value result; complete output/cache authority lifecycle before any integration. Do not rerun merely for catalogue closure.

## Rank 64: R040.coalesce-scrub-requests-and-commit-the-final-exact-seek

Correctness: **not_applicable**. Performance: **not_applicable**.

Maintained slider trace has no backend seek before commit and exactly one call/final position 7.3. Existing final-only behavior removes proposed repeated-preview opportunity; no candidate correctness or performance experiment warranted in this UI profile.

Next: Reopen only if a real UI begins issuing multiple expensive backend preview seeks before commit.

## Rank 65: R047.assemble-output-as-headers-plus-original-payload-views

Correctness: **passed**. Performance: **failed**.

Captured remux output hashes and append sizes identical for owned-buffer candidate and baseline on both fixtures; historical 100-cycle/1801.927-second run passes with 142 restarts. Narrow ownership slice only. Gather bytes improve 96.20% small fixture but 8.96% movie, below declared 25% gate; representative value gate fails, not correctness.

Next: Keep already adopted owned-buffer slice and regression; reopen general scatter/gather only for a workload meeting its value gate. No CPU or production qualification inference.
