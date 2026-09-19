<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Worth further pursuit

34 ideas or tooling/quality variants merit another bounded investment. These are recommendations, not measured speedups or release approvals. Full stable keys distinguish reused IDs.

## R138.one-sourcebuffer-different-codec-and-container.report-continuity

Rendered pictures and selected audio survive a codec/container transition through one SourceBuffer; useful explicit continuity capability, without claiming gapless or application integration.

Evidence: [result.json](continuity/result.json)

## R005.move-mse-ownership-off-the-window-thread

Worker-owned MediaSourceHandle produces actual A/V through EOF with malformed-input rejection and teardown; localized scheduler integration merits testing, not proven UI/CPU improvement.

Evidence: [worker-result.json](continuity/worker-result.json)

## R057.probe-a-real-six-channel-native-flac-destination

Direct and MSE FLAC preserve six independently identified channels at the Web Audio boundary; intentional stereo downmix fails the same matrix oracle. Native adaptation work is worth pursuing without assuming physical speaker support.

Evidence: [result.json](r57/result.json)

## R088.native-hls-playlist-views-over-compatible-existing-media

Native HLS byte-range view reaches marked audio/video, seeks and EOF; deliberately misaligned segment ranges fail. Local unchanged fMP4 payload supports the proposed destination primitive.

Evidence: [native-delivery.json](continuity/native-delivery.json)

## R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output

Raw I420 VideoFrame preserves padded strides/crop and black/white oracle exactly at the current display boundary. A scoped SDR performance comparison is now feasible; general color/HDR/rotation remain unqualified.

Evidence: [result.json](presentation/result.json)

## R059.construct-a-selected-track-mp4-view-without-remuxing-samples

Both front- and tail-moov Blob views play the requested second AAC tone through seek/EOF with5368 metadata bytes edited and unchanged214 selected packet payloads/timestamps/durations. Must enable the selected tkhd track; hiding the old track alone produced silent browser audio despite valid ffprobe output.

Evidence: [result.json](r59/result.json)

## R115.play-an-ongoing-fmp4-response-through-one-native-url

Native URL produces marked audio/video before response EOF with a four-second initial fragment; one-second initial fragment waited for EOF with either known or unknown total length, whereas MSE produced output early. Pursue only for an explicit buffering/latency contract, not assumed low-latency equivalence.

Evidence: [native-delivery-long.json](continuity/native-delivery-long.json)

## R003.coalesce-range-reads-around-useful-media-boundaries

Actual remux read-window candidate reduced requests 73 to 24 while fetched bytes changed 4784128 to 5701632. Source identity replacement rejects, decoded-frame progress and distant seek pass, workers close. Worth a latency/abandoned-byte tradeoff study; this is not boundary-indexed coalescing or a CPU benchmark.

Evidence: [result.json](remux-policies/result.json)

## R026.replace-polling-chains-with-bounded-credits-and-deadlines

Paused pump callbacks changed from 24 to 1 over the same 1.2s observation. Event wakes resume playback/seek, changed source rejects, and cleanup passes. Worth integrating this one-owner timer policy behind lifecycle checks, not replacing every scheduler.

Evidence: [result.json](remux-policies/result.json)

## R027.share-immutable-compiled-code-not-live-playback-state

Verified local initial startup comparison remains sufficient to justify follow-up: reported 14.10% saving, 95% interval 9.89-18.39% crosses the original 10% gate. Do not repeat this benchmark merely for catalogue closure; cache identity/cancellation and production ownership remain later qualification.

Evidence: [summary.json](../local-screening/runs/module-maintained-pairs-01/summary.json), [identity-check.json](../full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json)

## R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds

At 0.5x startup, peak buffered media changed 5.503999s to 3.007999s, fetched bytes 2359296 to 1572864. Actual 4x after seek is explicitly asserted; frame progress, source replacement rejection and worker cleanup pass. Worth a bounded rate-aware preparation policy; no generalized high-speed improvement claimed.

Evidence: [result.json](remux-policies/result.json)

## R100.transfer-owned-packet-storage-into-webcodecs-chunks

Whole-owned packet transfer detaches input, preserves chunk bytes and matches independent decoded I420. Shared heaps and oversized subviews reject at the candidate ownership guard. Normal maintained VP9 path already has zero owned packet bytes, so pursue only measured fallback/prefix branches, not global copying changes.

Evidence: [result.json](frame-boundaries/result.json), [result.json](r332/result.json)

## R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier

Truthful 100ms VP8 DefaultDuration yields one early frame and [0,0.1] range from the first block. Replacing only this metadata with same-size Void yields neither until remaining bytes arrive. Worth retaining as parser-availability regression coverage; does not justify inventing VFR durations or claim a missing maintained mux feature.

Evidence: [result.json](webm-boundaries/result.json)

## R131.global-mp4-sidx-materially-changes-remote-access.report-frontier

Same-size same-packet indexed and unindexed variants reach identical target pixel hashes at 20s. Global index reduces this bounded native request trace from 6656858 to 6296410 bytes. Benefit is modest on this 26-second local fixture; pursue asset-side metadata only with real remote byte/latency exposure.

Evidence: [result.json](remote-index/result.json), [identity.json](remote-index/identity.json)

## R215.upload-operation-selected-by-existing-layout

A direct stride-aware heap upload produces byte-identical GL pixels, removes120 JavaScript row-copy bytes for the tested frame, restores row state and rejects short stride. Driver copies and CPU benefit remain unmeasured.

Evidence: [result.json](presentation/result.json)

## R222.independently-checkable-remux-construction-record

Independent source/output byte ranges, packet timestamps and config hashes validate214 packets and reject wrong offset, swapped range, timing, configuration and stale source. Useful reproducible remux audit artifact, not performance gain.

Evidence: [result.json](r222/result.json)

## R267.deadline-slack-before-optimization

Policy probes separate fetched bytes, request counts, paused wakeups and buffer depth, preventing a request-count reduction from masquerading as a CPU/latency win. Stage-specific deadline slack is still absent. Worth adding bounded observation before further batching optimization; no injected stage-delay experiment or proven missed deadline claimed.

Evidence: [result.json](remux-policies/result.json), [R267.deadline-slack-before-optimization.md](../full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R267.deadline-slack-before-optimization.md)

## R133.append-moof-and-mdat-separately.report-continuity

Separate moof/mdat append reaches identical marked A/V through EOF; increases append count3to4 in this fixture. API feasibility supports localized copy-versus-event-overhead comparison, not measured CPU savings.

Evidence: [result.json](fragments/result.json)

## R136.worker-owned-mse-with-mediasourcehandle.report-continuity

Actual worker-owned MediaSourceHandle plays marked A/V, seeks, reaches EOF and terminates cleanly; malformed input rejects. Shared run withR005, independently applicable to this report identity.

Evidence: [worker-result.json](continuity/worker-result.json)

## R137.transferable-compressed-buffers-into-worker-mse.report-continuity

Each full owned compressed buffer detaches from sender on transfer and reaches actual A/V output at worker MSE; selected seek/EOF and malformed-input controls pass. Shared run withR005/R136, not separate executions.

Evidence: [worker-result.json](continuity/worker-result.json)

## R037.recover-an-interrupted-partial-append-without-replacing-mse

Actual SourceBuffer abort after incomplete moof or sample allows complete target-RAP append and marked A/V through EOF without replacing MSE. Generation flag in harness is only a model, not validation of maintained stale-message ownership.

Evidence: [result.json](fragments/result.json)

## R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place

After an injected one-shot quota refusal, real buffered removal plus one retry reaches marked A/V/EOF; second quota fails afterone retry and InvalidStateError is not retried. No genuine memory-pressure or production controller qualification claimed.

Evidence: [result.json](fragments/result.json)

## R013.treat-intentionally-disabled-tracks-as-removable-work

Explicit disabled-track intent has a concrete owner gap: current Native audio=no only mutes, while negative remux selection means automatic. Selected-track metadata experiment establishes packet-preserving exclusion is feasible, but no no-audio remux sentinel was implemented. Worth a separate explicit disable/re-enable contract; ordinary mute must keep audio prepared.

Evidence: [R013.treat-intentionally-disabled-tracks-as-removable-work.md](../full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R013.treat-intentionally-disabled-tracks-as-removable-work.md), [result.json](r59/result.json), [identity.json](r59/identity.json)

## R192.identity-coded-witness-media

Current campaign oracles reject missing hidden picture dependencies, deliberate channel loss and doubled gain, and check cue timing. These concrete failures justify identity-bearing witnesses as test infrastructure. A single unified per-epoch video/channel/audio-shift witness is still future implementation, not claimed executed here.

Evidence: [result.json](r332/result.json), [result.json](r57/result.json), [result.json](r95/result.json), [result.json](r41/result.json)

## R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch

Browser Opus encodes/decodes marked stereo PCM with independently correct tones and51 packets.48648 decoded samples for48000 input exposes648-sample padding that adapter must trim. Capability warrants scoped cost comparison against existing Wasm Opus; no speedup claimed.

Evidence: [result.json](audio-components/result.json)

## R008.keep-display-only-transformations-out-of-cpu-video-filters

Existing retained presenter produces exact independently indexed 90-degree pixel rotation; unchanged orientation fails the pixel oracle. Pursue a distinct explicitly display-only operation API. Software filter semantics, subtitle/pointer geometry, HDR and arbitrary transforms are not qualified.

Evidence: [result.json](frame-boundaries/result.json)

## R053.coalesce-gain-gestures-into-audio-clock-automation

A requested10ms gain ramp reaches identical final gain and reduces abrupt sample step from0.25 to0.00052084 in the real Web Audio renderer. Pursue as optional transition quality, not CPU optimization or unchanged instantaneous semantics.

Evidence: [result.json](audio-components/result.json)

## R095.fixed-opus-gain-through-codec-container-headers

Requested-6dB combines with existing+3dB Opus header gain. Browser header-only output RMS matches original header plus gain node within0.02%; doubled attenuation differs by50%. Seek/EOF pass. Worth static explicit asset gain, not dynamic volume or quantified CPU claim.

Evidence: [result.json](r95/result.json)

## R158.structure-aware-failure-preserving-reduction

Reducing 49 Xiph lace groups to one retains the identical Chrome CHUNK_DEMUXER_ERROR_APPEND_FAILED / Lacing 1 unsupported predicate; unlaced control plays to EOF with 880Hz audio. Independent packet hashes and PTS match across variants. Worth a structure-aware failure reducer; this controlled fixture reduction is not a generic reducer implementation.

Evidence: [lacing-result.json](webm-boundaries/lacing-result.json), [lace-identity.json](webm-boundaries/lace-identity.json), [one-lace-identity.json](webm-boundaries/one-lace-identity.json)

## R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors

Actual2592-case planAdmission pool reduces to13 route-distinguishing witnesses, but subset misses discarded-text-track and unauthorized-lossy mutants that full pool catches. Useful supplement; reject completeness/replacement claim.

Evidence: [result.json](r171/result.json)

## R041.route-simple-subrip-captions-to-native-text-tracks

Strict external plain SRT adapter matches hand-authored VTT overlap/multiline cues through five seeks on actual Native direct and remux paths. Remux1s bias applies exactly once; markup/bad time/reversed interval reject and worker cleanup passes.

Evidence: [result.json](r41/result.json)

## R225.h-264-self-contained-idr-suffix.report-continuity

Generated Annex-B SPS/PPS/IDR suffix decoded by host FFmpeg 8.1.2 yields the exact 48-picture suffix of the 72-frame reference. Missing configuration and dependent start fail. This host oracle is not execution of pinned FFmpeg 7.1.1; browser/TS scanning cost remains unmeasured.

Evidence: [result.json](r225/result.json)

## R061.keep-explicit-channel-processing-on-the-native-audio-graph

Explicit six-index channel permutation produces exact Float32 samples in browser audio graph; deliberately wrong index wiring fails oracle. Combined with six-channel decoded destination evidence, an explicitly requested matrix is viable without speaker guessing.

Evidence: [result.json](audio-components/result.json)

## R202.guarded-narrow-arithmetic

Actual pinned8-bit IDCT bias/shifts/storage/clipping match int16 intermediate candidate for65536 threshold-corner blocks plus20000 random blocks under UBSan;2673,-2673,-32768 rejected. Arithmetic feasibility established; actual coefficient admission rates and SIMD cost still needed.

Evidence: [result.json](r202/result.json)

