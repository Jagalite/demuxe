<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Whole-player tier assessment and finite priority queue

The two prioritized route combinations **completed their whole-player lab benefit gates**: embedded plain SRT, then embedded ASS. The queue favors existing successful complete-player substitutions over new speculative adapters. Membership retains all 148 pursue records, but is not a commitment to benchmark all of them.

Tier arrows below are intended effects under stated eligibility. The existing [component isolation study](../../docs/HYBRID-COMPONENT-STUDY.md) demonstrates bounded lab combinations, not default production admission. Its historical three-pair CPU changes (SRT −50.2%, mov_text −48.7%, embedded ASS −36.8%, external ASS/PCM −35.7%, finite AV1 DASH −55.7%) are distinct combined-route observations, not additive R-item gains. Fresh five-pair observations are registered in [the whole-player run](../shared/runs/20260920T121637Z-prioritized-whole-player/analysis.md) and [raw summary](../../results/head-to-head/tier-priority-report-02/summary.json): SRT median steady Chrome CPU −49.84%, startup −28.17%, summed RSS −4.12%; ASS CPU −38.47%, startup −20.20%, summed RSS −3.04%. Every CPU pair improved. ASS main-thread task duration rose 35.69%; lower aggregate CPU does not mean every component improved. Both are explicit Hybrid-to-Native lab substitutions with production automatic admission still pending.

| Priority | Item | Intended effect | Queue state / next prerequisite |
| --- | --- | --- | --- |
| 1 | [R041](../items/R041.route-simple-subrip-captions-to-native-text-tracks/README.md) | Hybrid->Native candidate, Native->Native | completed_measured_lab_benefit: Completed five paired lab routes; next integrate bounded admission/extraction/source ownership and representative-profile validation. |
| 2 | [R019](../items/R019.extract-embedded-ass-while-leaving-video-native/README.md) | Hybrid->Native candidate | completed_measured_lab_benefit: Completed five paired lab routes; next integrate bounded admission/extraction/source ownership and representative-profile validation. |
| 3 | [R024](../items/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output/README.md) | within Software | environment_blocked: Recover/build a compatible YUV runtime with proven ABI, then correctness-qualify three complete player arms before timing. |
| 4 | [R008](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | Software->Hybrid candidate, within Hybrid/Software | deferred_integration: Locate actual CPU-filter-triggered fallback and implement explicit equivalent admission; compare current maintained rotation behavior. |
| 5 | [R023](../items/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass/README.md) | within Hybrid/Software | deferred_integration: Integrate narrow effect owner with actual retained player and independent color/alpha oracle before full-player comparison. |
| 6 | [R123](../items/R123.checkpoint-the-software-decoder-inside-a-gop/README.md) | within Software | deferred_integration: Integrate checkpoint creation/restore/invalidation with maintained decoder ABI, source replacement and seek cancellation. |

R041 establishes a strict external plain-caption component; embedded extraction is an additional mechanism. R019 is related to the embedded ASS route, but the authored drawing fixture does not establish general font/style/container support. These comparisons charge extraction, player preparation/startup, selected A/V and caption ownership, seeks and teardown. Browser process launch precedes the player-open measurement and is excluded; report browser launch separately when assessing cold application launch. Aggregate Chrome CPU excludes server and external system-service CPU; RSS may count shared pages repeatedly.

## Coverage and deferrals

- deferred_diagnostic: 5
- deferred_integration: 6
- deferred_multiple_blockers: 1
- deferred_unassessed: 125
- deferred_prerequisite: 1
- deferred_route_mapping: 2
- deferred_specialized: 5
- environment_blocked: 1
- completed_measured_lab_benefit: 2

R020 bitmap routes retain independent audio blockers; R051/R057/R086 need exact decoded-audio producer and complete synchronization integration. R008 metadata rotation is already maintained, so a useful follow-up must remove an actual CPU-filter admission rather than duplicate rotation. R024 is environment-blocked by a missing compatible YUV runtime, not a measured negative. R023/R123 need new maintained owner integration. Editing, reduced-frame-rate, texture-native and transparency tasks require an explicit applicable workload before competing with ordinary continuous-playback improvements. Diagnostic infrastructure is useful but is not a player speedup.

## Per-item coverage

Unmapped records are deliberately deferred instead of inventing exact tier ownership from titles. The [machine-readable assessment](whole-player-tier-classification.json) preserves each full definition excerpt, current performance gate, evidence and next measurement prerequisite.

| Item | Research performance | Intended classification | Queue |
| --- | --- | --- | --- |
| [R003.coalesce-range-reads-around-useful-media-boundaries](../items/R003.coalesce-range-reads-around-useful-media-boundaries/README.md) | passed | needs route mapping | deferred_unassessed |
| [R005.move-mse-ownership-off-the-window-thread](../items/R005.move-mse-ownership-off-the-window-thread/README.md) | passed | needs route mapping | deferred_unassessed |
| [R006.offer-a-non-pthread-remux-path-without-isolation](../items/R006.offer-a-non-pthread-remux-path-without-isolation/README.md) | passed | needs route mapping | deferred_unassessed |
| [R007.close-the-hevc-in-ts-browser-owned-construction-gap](../items/R007.close-the-hevc-in-ts-browser-owned-construction-gap/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R008.keep-display-only-transformations-out-of-cpu-video-filters](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | passed | Software->Hybrid candidate, within Hybrid/Software | deferred_integration |
| [R010.screen-float-preserving-destinations-before-writing-adapters](../items/R010.screen-float-preserving-destinations-before-writing-adapters/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R013.treat-intentionally-disabled-tracks-as-removable-work](../items/R013.treat-intentionally-disabled-tracks-as-removable-work/README.md) | passed | needs route mapping | deferred_unassessed |
| [R018.cache-prepared-media-by-timeline-and-transformation-recipe](../items/R018.cache-prepared-media-by-timeline-and-transformation-recipe/README.md) | passed | needs route mapping | deferred_unassessed |
| [R019.extract-embedded-ass-while-leaving-video-native](../items/R019.extract-embedded-ass-while-leaving-video-native/README.md) | passed | Hybrid->Native candidate | completed_measured_lab_benefit |
| [R020.render-bitmap-subtitles-without-burning-them-into-video](../items/R020.render-bitmap-subtitles-without-burning-them-into-video/README.md) | not_applicable | Hybrid->Native candidate | deferred_multiple_blockers |
| [R022.use-document-pip-to-keep-native-subtitles-and-controls](../items/R022.use-document-pip-to-keep-native-subtitles-and-controls/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass](../items/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass/README.md) | passed | within Hybrid/Software | deferred_integration |
| [R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output](../items/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output/README.md) | passed | within Software | environment_blocked |
| [R026.replace-polling-chains-with-bounded-credits-and-deadlines](../items/R026.replace-polling-chains-with-bounded-credits-and-deadlines/README.md) | passed | needs route mapping | deferred_unassessed |
| [R031.raw-aac-mp3-audio-beside-fragmented-video](../items/R031.raw-aac-mp3-audio-beside-fragmented-video/README.md) | passed | needs route mapping | deferred_unassessed |
| [R032.use-different-output-containers-for-different-tracks](../items/R032.use-different-output-containers-for-different-tracks/README.md) | passed | needs route mapping | deferred_unassessed |
| [R039.prioritize-the-track-that-limits-usable-playback](../items/R039.prioritize-the-track-that-limits-usable-playback/README.md) | passed | needs route mapping | deferred_unassessed |
| [R041.route-simple-subrip-captions-to-native-text-tracks](../items/R041.route-simple-subrip-captions-to-native-text-tracks/README.md) | passed | Hybrid->Native candidate, Native->Native | completed_measured_lab_benefit |
| [R048.keep-only-the-relevant-native-caption-cues-instantiated](../items/R048.keep-only-the-relevant-native-caption-cues-instantiated/README.md) | passed | needs route mapping | deferred_unassessed |
| [R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds](../items/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds/README.md) | passed | needs route mapping | deferred_unassessed |
| [R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders](../items/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders/README.md) | not_applicable | Hybrid->Native candidate | deferred_integration |
| [R053.coalesce-gain-gestures-into-audio-clock-automation](../items/R053.coalesce-gain-gestures-into-audio-clock-automation/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R054.tune-webm-cluster-production-for-early-audio-availability](../items/R054.tune-webm-cluster-production-for-early-audio-availability/README.md) | passed | needs route mapping | deferred_unassessed |
| [R055.cache-bounded-decoded-previews-for-scrub-revisits](../items/R055.cache-bounded-decoded-previews-for-scrub-revisits/README.md) | passed | needs route mapping | deferred_unassessed |
| [R057.probe-a-real-six-channel-native-flac-destination](../items/R057.probe-a-real-six-channel-native-flac-destination/README.md) | not_applicable | Hybrid->Native candidate | deferred_prerequisite |
| [R058.change-video-codec-while-retaining-the-audio-presentation](../items/R058.change-video-codec-while-retaining-the-audio-presentation/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R059.construct-a-selected-track-mp4-view-without-remuxing-samples](../items/R059.construct-a-selected-track-mp4-view-without-remuxing-samples/README.md) | passed | needs route mapping | deferred_unassessed |
| [R061.keep-explicit-channel-processing-on-the-native-audio-graph](../items/R061.keep-explicit-channel-processing-on-the-native-audio-graph/README.md) | passed | Native->Native | deferred_integration |
| [R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track](../items/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R072.decode-only-keyframes-for-coarse-previews](../items/R072.decode-only-keyframes-for-coarse-previews/README.md) | passed | needs route mapping | deferred_unassessed |
| [R073.decode-a-gop-once-for-a-pending-exact-preview-batch](../items/R073.decode-a-gop-once-for-a-pending-exact-preview-batch/README.md) | passed | needs route mapping | deferred_unassessed |
| [R075.compact-large-seek-maps-with-checkpoints](../items/R075.compact-large-seek-maps-with-checkpoints/README.md) | passed | needs route mapping | deferred_unassessed |
| [R076.definition-not-recovered](../items/R076.definition-not-recovered/README.md) | passed | within Hybrid/Software | deferred_specialized |
| [R077.definition-not-recovered](../items/R077.definition-not-recovered/README.md) | passed | specialized/noncontinuous workload | deferred_specialized |
| [R078.definition-not-recovered](../items/R078.definition-not-recovered/README.md) | passed | specialized/noncontinuous workload | deferred_specialized |
| [R080.definition-not-recovered](../items/R080.definition-not-recovered/README.md) | passed | specialized/noncontinuous workload | deferred_specialized |
| [R082.browser-side-video-normalization](../items/R082.browser-side-video-normalization/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R084.spatially-selective-video](../items/R084.spatially-selective-video/README.md) | passed | needs route mapping | deferred_unassessed |
| [R085.out-of-order-gop-decode-and-reverse-presentation](../items/R085.out-of-order-gop-decode-and-reverse-presentation/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R086.native-video-with-an-independent-generated-pcm-clock](../items/R086.native-video-with-an-independent-generated-pcm-clock/README.md) | passed | Hybrid->Native candidate | deferred_integration |
| [R088.native-hls-playlist-views-over-compatible-existing-media](../items/R088.native-hls-playlist-views-over-compatible-existing-media/README.md) | passed | Hybrid->Native candidate | deferred_route_mapping |
| [R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1](../items/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1/README.md) | passed | needs route mapping | deferred_unassessed |
| [R093.opus-repacketization-without-pcm-decoding](../items/R093.opus-repacketization-without-pcm-decoding/README.md) | passed | needs route mapping | deferred_unassessed |
| [R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata](../items/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R095.fixed-opus-gain-through-codec-container-headers](../items/R095.fixed-opus-gain-through-codec-container-headers/README.md) | passed | needs route mapping | deferred_unassessed |
| [R097.mux-color-and-alpha-into-native-transparent-webm](../items/R097.mux-color-and-alpha-into-native-transparent-webm/README.md) | failed | needs route mapping | deferred_unassessed |
| [R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding](../items/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R103.join-split-or-reorder-independent-flac-channel-subframes](../items/R103.join-split-or-reorder-independent-flac-channel-subframes/README.md) | passed | needs route mapping | deferred_unassessed |
| [R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams](../items/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R106.recall-stored-av1-pictures-with-coded-display-instructions](../items/R106.recall-stored-av1-pictures-with-coded-display-instructions/README.md) | passed | needs route mapping | deferred_unassessed |
| [R107.separate-av1-base-decoding-from-film-grain-reconstruction](../items/R107.separate-av1-base-decoding-from-film-grain-reconstruction/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R114.use-webrtc-native-media-reception-as-a-packet-copy-destination](../items/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R116.mse-sequence-mode-concatenation-report-paragraph-label.report-frontier](../items/R116.mse-sequence-mode-concatenation-report-paragraph-label.report-frontier/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier](../items/R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R117.play-iamf-through-native-component-decoders](../items/R117.play-iamf-through-native-component-decoders/README.md) | passed | needs route mapping | deferred_unassessed |
| [R120.entropy-only-transcoding](../items/R120.entropy-only-transcoding/README.md) | passed | specialized/noncontinuous workload | deferred_specialized |
| [R122.retime-existing-frames-without-creating-new-pictures.report-frontier](../items/R122.retime-existing-frames-without-creating-new-pictures.report-frontier/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R123.checkpoint-the-software-decoder-inside-a-gop](../items/R123.checkpoint-the-software-decoder-inside-a-gop/README.md) | passed | within Software | deferred_integration |
| [R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier](../items/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R126.find-where-hardware-decoding-loses-on-short-jobs](../items/R126.find-where-hardware-decoding-loses-on-short-jobs/README.md) | failed | needs route mapping | deferred_unassessed |
| [R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier](../items/R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R127.nonlinear-speed-curves-without-video-re-encoding](../items/R127.nonlinear-speed-curves-without-video-re-encoding/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R127.sequence-mode-cross-codec-concatenation-report-paragraph-label.report-frontier](../items/R127.sequence-mode-cross-codec-concatenation-report-paragraph-label.report-frontier/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier](../items/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier/README.md) | passed | needs route mapping | deferred_unassessed |
| [R132.incremental-mdat-sample-release.report-continuity](../items/R132.incremental-mdat-sample-release.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R133.append-moof-and-mdat-separately.report-continuity](../items/R133.append-moof-and-mdat-separately.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R136.worker-owned-mse-with-mediasourcehandle.report-continuity](../items/R136.worker-owned-mse-with-mediasourcehandle.report-continuity/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R137.transferable-compressed-buffers-into-worker-mse.report-continuity](../items/R137.transferable-compressed-buffers-into-worker-mse.report-continuity/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R138.one-sourcebuffer-different-codec-and-container.report-continuity](../items/R138.one-sourcebuffer-different-codec-and-container.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity](../items/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images](../items/R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes](../items/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes/README.md) | passed | needs route mapping | deferred_unassessed |
| [R143.compressed-fragment-rewind-cache.report-continuity](../items/R143.compressed-fragment-rewind-cache.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R144.evict-through-a-paused-current-position.report-continuity](../items/R144.evict-through-a-paused-current-position.report-continuity/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R145.native-frame-relay-without-js-pixel-readback.report-continuity](../items/R145.native-frame-relay-without-js-pixel-readback.report-continuity/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode](../items/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R153.shared-continuation-and-the-wrong-history-negative](../items/R153.shared-continuation-and-the-wrong-history-negative/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R158.structure-aware-failure-preserving-reduction](../items/R158.structure-aware-failure-preserving-reduction/README.md) | not_applicable | cross-tier infrastructure | deferred_diagnostic |
| [R159.remux-encrypted-media-without-decrypting-its-samples](../items/R159.remux-encrypted-media-without-decrypting-its-samples/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R161.roll-back-speculative-audio-when-a-late-packet-arrives](../items/R161.roll-back-speculative-audio-when-a-late-packet-arrives/README.md) | passed | needs route mapping | deferred_unassessed |
| [R162.compile-a-qualified-mux-configuration-into-a-small-patch-program](../items/R162.compile-a-qualified-mux-configuration-into-a-small-patch-program/README.md) | passed | needs route mapping | deferred_unassessed |
| [R165.reverse-predictive-audio-by-transforming-its-residuals](../items/R165.reverse-predictive-audio-by-transforming-its-residuals/README.md) | passed | needs route mapping | deferred_unassessed |
| [R166.prove-where-an-audio-edit-stops-affecting-subsequent-output](../items/R166.prove-where-an-audio-edit-stops-affecting-subsequent-output/README.md) | passed | needs route mapping | deferred_unassessed |
| [R170.separate-audio-clock-drift-from-an-audio-latency-jump](../items/R170.separate-audio-clock-drift-from-an-audio-latency-jump/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors](../items/R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors/README.md) | not_applicable | cross-tier infrastructure | deferred_diagnostic |
| [R174.flac-bit-depth-promotion-without-sample-reconstruction](../items/R174.flac-bit-depth-promotion-without-sample-reconstruction/README.md) | passed | needs route mapping | deferred_unassessed |
| [R175.tighten-verified-h-264-decoder-requirements](../items/R175.tighten-verified-h-264-decoder-requirements/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R176.jspi-backed-synchronous-wasm-i-o](../items/R176.jspi-backed-synchronous-wasm-i-o/README.md) | passed | needs route mapping | deferred_unassessed |
| [R178.selective-jpeg-2000-source-reads](../items/R178.selective-jpeg-2000-source-reads/README.md) | passed | needs route mapping | deferred_unassessed |
| [R180.residual-domain-flac-mixing](../items/R180.residual-domain-flac-mixing/README.md) | passed | needs route mapping | deferred_unassessed |
| [R181.dependency-aware-corruption-tracking](../items/R181.dependency-aware-corruption-tracking/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R182.jpeg-mosaic-from-restart-intervals](../items/R182.jpeg-mosaic-from-restart-intervals/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R183.native-color-with-separately-decoded-transparency](../items/R183.native-color-with-separately-decoded-transparency/README.md) | passed | needs route mapping | deferred_unassessed |
| [R186.reversible-xor-frame-cache](../items/R186.reversible-xor-frame-cache/README.md) | passed | needs route mapping | deferred_unassessed |
| [R188.schedule-verified-playable-data](../items/R188.schedule-verified-playable-data/README.md) | passed | needs route mapping | deferred_unassessed |
| [R191.seekable-fixed-linear-effects-via-block-state-transforms](../items/R191.seekable-fixed-linear-effects-via-block-state-transforms/README.md) | passed | needs route mapping | deferred_unassessed |
| [R192.identity-coded-witness-media](../items/R192.identity-coded-witness-media/README.md) | not_applicable | cross-tier infrastructure | deferred_diagnostic |
| [R200.content-addressed-reuse-across-different-files](../items/R200.content-addressed-reuse-across-different-files/README.md) | passed | needs route mapping | deferred_unassessed |
| [R201.periodic-steady-state-filter-initialization](../items/R201.periodic-steady-state-filter-initialization/README.md) | passed | needs route mapping | deferred_unassessed |
| [R203.regroup-existing-opus-frames-without-re-encoding](../items/R203.regroup-existing-opus-frames-without-re-encoding/README.md) | passed | needs route mapping | deferred_unassessed |
| [R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes](../items/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes/README.md) | passed | needs route mapping | deferred_unassessed |
| [R208.make-cancellation-follow-media-dependency-boundaries](../items/R208.make-cancellation-follow-media-dependency-boundaries/README.md) | passed | needs route mapping | deferred_unassessed |
| [R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness](../items/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness/README.md) | passed | cross-tier infrastructure | deferred_diagnostic |
| [R222.independently-checkable-remux-construction-record](../items/R222.independently-checkable-remux-construction-record/README.md) | not_applicable | cross-tier infrastructure | deferred_diagnostic |
| [R227.coded-sample-identity-across-containers.report-continuity](../items/R227.coded-sample-identity-across-containers.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline](../items/R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R233.make-independently-resampled-audio-chunks-join-exactly](../items/R233.make-independently-resampled-audio-chunks-join-exactly/README.md) | failed | needs route mapping | deferred_unassessed |
| [R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope](../items/R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope/README.md) | passed | needs route mapping | deferred_unassessed |
| [R239.extract-an-av1-operating-point-before-decoding.report-a](../items/R239.extract-an-av1-operating-point-before-decoding.report-a/README.md) | passed | needs route mapping | deferred_unassessed |
| [R240.extract-a-native-2d-view-from-multiview-hevc.report-a](../items/R240.extract-a-native-2d-view-from-multiview-hevc.report-a/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately](../items/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately/README.md) | passed | needs route mapping | deferred_unassessed |
| [R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a](../items/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c](../items/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R245.standalone-flac-from-original-frames.report-c](../items/R245.standalone-flac-from-original-frames.report-c/README.md) | passed | needs route mapping | deferred_unassessed |
| [R261.selective-verified-http-rescue](../items/R261.selective-verified-http-rescue/README.md) | passed | needs route mapping | deferred_unassessed |
| [R267.deadline-slack-before-optimization](../items/R267.deadline-slack-before-optimization/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R269.av1-pre-super-resolution-preview](../items/R269.av1-pre-super-resolution-preview/README.md) | passed | needs route mapping | deferred_unassessed |
| [R273.jpeg-xl-dc-preview](../items/R273.jpeg-xl-dc-preview/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R274.virtual-webm-cues](../items/R274.virtual-webm-cues/README.md) | passed | needs route mapping | deferred_unassessed |
| [R275.av1-large-scale-tile-viewport-decode](../items/R275.av1-large-scale-tile-viewport-decode/README.md) | passed | needs route mapping | deferred_unassessed |
| [R289.share-one-native-decoder-across-unrelated-independent-picture-jobs](../items/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs/README.md) | passed | needs route mapping | deferred_unassessed |
| [R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file](../items/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file/README.md) | passed | needs route mapping | deferred_unassessed |
| [R296.generate-seek-fragments-without-replaying-a-mux-session](../items/R296.generate-seek-fragments-without-replaying-a-mux-session/README.md) | passed | needs route mapping | deferred_unassessed |
| [R301.edit-displayed-frames-without-changing-the-prediction-history](../items/R301.edit-displayed-frames-without-changing-the-prediction-history/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R302.develop-ultra-hdr-gain-maps-after-native-image-decoding](../items/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification](../items/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification/README.md) | passed | needs route mapping | deferred_unassessed |
| [R315.carry-hidden-caption-state-across-packet-copy-cuts](../items/R315.carry-hidden-caption-state-across-packet-copy-cuts/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity](../items/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate](../items/R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate/README.md) | passed | needs route mapping | deferred_unassessed |
| [R321.exact-iir-seek-checkpoints.report-continuity](../items/R321.exact-iir-seek-checkpoints.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster](../items/R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster/README.md) | passed | needs route mapping | deferred_unassessed |
| [R322.animated-image-disposal-checkpoints.report-continuity](../items/R322.animated-image-disposal-checkpoints.report-continuity/README.md) | passed | needs route mapping | deferred_unassessed |
| [R322.invert-flac-polarity-directly-in-the-residual-domain](../items/R322.invert-flac-polarity-directly-in-the-residual-domain/README.md) | passed | needs route mapping | deferred_unassessed |
| [R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together](../items/R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together/README.md) | passed | needs route mapping | deferred_unassessed |
| [R335.recover-the-gpu-presenter-without-reopening-healthy-decoders](../items/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders/README.md) | passed | needs route mapping | deferred_unassessed |
| [R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples](../items/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples/README.md) | passed | needs route mapping | deferred_unassessed |
| [R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget](../items/R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget/README.md) | passed | needs route mapping | deferred_unassessed |
| [R343.unwrap-aac-latm-into-a-browser-decoded-audio-route](../items/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route/README.md) | failed | needs route mapping | deferred_unassessed |
| [R348.convert-packed-dsd-directly-to-the-requested-pcm-rate](../items/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate/README.md) | passed | needs route mapping | deferred_unassessed |
| [R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index](../items/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index/README.md) | passed | needs route mapping | deferred_unassessed |
| [R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding](../items/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding/README.md) | passed | needs route mapping | deferred_unassessed |
| [R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts](../items/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts/README.md) | not_applicable | needs route mapping | deferred_unassessed |
| [R354.replace-an-oversized-preparation-heap-while-native-playback-continues](../items/R354.replace-an-oversized-preparation-heap-while-native-playback-continues/README.md) | passed | needs route mapping | deferred_unassessed |
| [R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals](../items/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals/README.md) | passed | needs route mapping | deferred_unassessed |
| [R358.unwrap-matroska-track-compression-before-choosing-a-decoder](../items/R358.unwrap-matroska-track-compression-before-choosing-a-decoder/README.md) | passed | needs route mapping | deferred_unassessed |
| [R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up](../items/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up/README.md) | passed | needs route mapping | deferred_unassessed |
| [R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded](../items/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded/README.md) | passed | needs route mapping | deferred_unassessed |
| [R363.expose-prepared-fragments-as-a-native-hls-presentation](../items/R363.expose-prepared-fragments-as-a-native-hls-presentation/README.md) | passed | Hybrid->Native candidate | deferred_route_mapping |
