<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# All-item first-pass decisions

Latest ledger view; full stable keys distinguish conflicting R-number definitions. Original audits are immutable; current ledger reasons and attached reconciliation notes supersede their earlier drafts. None of the setup or source holds is an executed failure.

| Key | Decision | Evidence tier |
|---|---|---|
| R001.share-source-reads-and-inspection-across-candidates | DEFER_SETUP | IMPORTED_LOCAL_EVIDENCE |
| R002.promote-useful-startup-work-instead-of-reopening | ALREADY_IMPLEMENTED | IMPORTED_LOCAL_EVIDENCE |
| R003.coalesce-range-reads-around-useful-media-boundaries | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R004.stream-inside-a-fragment-instead-of-making-it-smaller | STOP_PROFILE | IMPORTED_LOCAL_EVIDENCE |
| R005.move-mse-ownership-off-the-window-thread | ADVANCE_CONFIRMATION | PREREQUISITE_PROBE |
| R006.offer-a-non-pthread-remux-path-without-isolation | DEFER_SETUP | SOURCE_REVIEW |
| R007.close-the-hevc-in-ts-browser-owned-construction-gap | DEFER_SETUP | SOURCE_REVIEW |
| R008.keep-display-only-transformations-out-of-cpu-video-filters | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R009.pass-already-valid-fragmented-media-through-unchanged | STOP_PROFILE | IMPORTED_LOCAL_EVIDENCE |
| R010.screen-float-preserving-destinations-before-writing-adapters | INCONCLUSIVE | SOURCE_REVIEW |
| R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder | DEFER_SETUP | SOURCE_REVIEW |
| R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R013.treat-intentionally-disabled-tracks-as-removable-work | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R014.avoid-duplicate-resampling-and-oversized-audio-work-batches | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R015.make-split-buffer-audio-switching-transactional | DEFER_SETUP | SOURCE_REVIEW |
| R016.keep-a-stable-audio-output-format-through-frequent-switches | DEFER_SETUP | SOURCE_REVIEW |
| R017.model-unequal-tails-as-explicit-track-lifetime-phases | DEFER_SETUP | SOURCE_REVIEW |
| R018.cache-prepared-media-by-timeline-and-transformation-recipe | DEFER_SETUP | SOURCE_REVIEW |
| R019.extract-embedded-ass-while-leaving-video-native | DEFER_SETUP | SOURCE_REVIEW |
| R020.render-bitmap-subtitles-without-burning-them-into-video | DEFER_SETUP | SOURCE_REVIEW |
| R021.cache-subtitle-tiles-and-schedule-only-useful-redraws | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R022.use-document-pip-to-keep-native-subtitles-and-controls | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass | DEFER_SETUP | SOURCE_REVIEW |
| R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output | ADVANCE_CONFIRMATION | PREREQUISITE_PROBE |
| R025.try-a-generated-video-track-as-an-alternative-presenter | INCONCLUSIVE | PREREQUISITE_PROBE |
| R026.replace-polling-chains-with-bounded-credits-and-deadlines | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R027.share-immutable-compiled-code-not-live-playback-state | ADVANCE_CONFIRMATION | IMPORTED_LOCAL_EVIDENCE |
| R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility | DEFER_SETUP | SOURCE_REVIEW |
| R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding | DEFER_SETUP | SOURCE_REVIEW |
| R030.investigate-containerless-encoded-chunk-mse | HOLD_ENV | PREREQUISITE_PROBE |
| R031.raw-aac-mp3-audio-beside-fragmented-video | DEFER_SETUP | SOURCE_REVIEW |
| R032.use-different-output-containers-for-different-tracks | DEFER_SETUP | SOURCE_REVIEW |
| R033.interleave-samples-for-earlier-complete-a-v-output | STOP_PROFILE | SOURCE_REVIEW |
| R034.small-startup-appends-larger-steady-state-batches | STOP_PROFILE | IMPORTED_LOCAL_EVIDENCE |
| R035.switch-same-codec-audio-at-a-future-boundary-without-pausing | DEFER_SETUP | SOURCE_REVIEW |
| R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop | DEFER_SETUP | SOURCE_REVIEW |
| R037.recover-an-interrupted-partial-append-without-replacing-mse | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R039.prioritize-the-track-that-limits-usable-playback | DEFER_SETUP | SOURCE_REVIEW |
| R040.coalesce-scrub-requests-and-commit-the-final-exact-seek | STOP_PROFILE | IMPORTED_LOCAL_EVIDENCE |
| R041.route-simple-subrip-captions-to-native-text-tracks | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R042.recycle-owned-transfer-buffers-at-the-mse-boundary | DEFER_SETUP | IMPORTED_LOCAL_EVIDENCE |
| R043.change-video-configuration-while-keeping-audio-running | DEFER_SETUP | SOURCE_REVIEW |
| R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop | DEFER_SETUP | SOURCE_REVIEW |
| R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning | DEFER_SETUP | SOURCE_REVIEW |
| R046.a-small-javascript-ordinary-mp4-to-mse-adapter | DEFER_SETUP | SOURCE_REVIEW |
| R047.assemble-output-as-headers-plus-original-payload-views | ALREADY_IMPLEMENTED | IMPORTED_LOCAL_EVIDENCE |
| R048.keep-only-the-relevant-native-caption-cues-instantiated | DEFER_SETUP | IMPORTED_LOCAL_EVIDENCE |
| R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders | DEFER_SETUP | SOURCE_REVIEW |
| R052.keep-source-sample-rates-across-audio-track-changes | DEFER_SETUP | SOURCE_REVIEW |
| R053.coalesce-gain-gestures-into-audio-clock-automation | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R054.tune-webm-cluster-production-for-early-audio-availability | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R055.cache-bounded-decoded-previews-for-scrub-revisits | DEFER_SETUP | SOURCE_REVIEW |
| R056.map-repeated-clip-boundaries-in-integer-media-ticks | STOP_PROFILE | SOURCE_REVIEW |
| R057.probe-a-real-six-channel-native-flac-destination | ADVANCE_CONFIRMATION | PREREQUISITE_PROBE |
| R058.change-video-codec-while-retaining-the-audio-presentation | DEFER_SETUP | SOURCE_REVIEW |
| R059.construct-a-selected-track-mp4-view-without-remuxing-samples | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R060.extract-in-band-closed-captions-from-compressed-video-headers | DEFER_SETUP | SOURCE_REVIEW |
| R061.keep-explicit-channel-processing-on-the-native-audio-graph | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track | DEFER_SETUP | SOURCE_REVIEW |
| R063.use-the-browser-image-decoder-for-qualified-mjpeg-video | DEFER_SETUP | SOURCE_REVIEW |
| R064.decode-directly-at-reduced-resolution-for-explicit-previews | DEFER_SETUP | SOURCE_REVIEW |
| R065.isolate-a-selected-program-from-multi-program-transport-streams | DEFER_SETUP | SOURCE_REVIEW |
| R066.communicate-the-requested-start-position-before-first-data-preparation | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy | DEFER_SETUP | SOURCE_REVIEW |
| R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes | DEFER_SETUP | SOURCE_REVIEW |
| R069.separate-decoder-compatibility-from-per-source-initialization-identity | STOP_PROFILE | SOURCE_REVIEW |
| R070.remove-the-intermediate-host-remux | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R071.tune-flac-effort-without-changing-frame-duration | INCONCLUSIVE | SOURCE_REVIEW |
| R072.decode-only-keyframes-for-coarse-previews | DEFER_SETUP | SOURCE_REVIEW |
| R073.decode-a-gop-once-for-a-pending-exact-preview-batch | DEFER_SETUP | SOURCE_REVIEW |
| R074.skip-redundant-packed-pcm-staging | STOP_PROFILE | IMPORTED_LOCAL_EVIDENCE |
| R075.compact-large-seek-maps-with-checkpoints | DEFER_SETUP | SOURCE_REVIEW |
| R076.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R077.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R078.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R079.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R080.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R081.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R082.browser-side-video-normalization | DEFER_SETUP | PREREQUISITE_PROBE |
| R083.decode-graphics-processing-encode | DEFER_SETUP | SOURCE_REVIEW |
| R084.spatially-selective-video | DEFER_SETUP | SOURCE_REVIEW |
| R085.out-of-order-gop-decode-and-reverse-presentation | DEFER_SETUP | SOURCE_REVIEW |
| R086.native-video-with-an-independent-generated-pcm-clock | DEFER_SETUP | SOURCE_REVIEW |
| R087.dependency-aware-transport | STOP_PROFILE | SOURCE_REVIEW |
| R088.native-hls-playlist-views-over-compatible-existing-media | ADVANCE_CONFIRMATION | PREREQUISITE_PROBE |
| R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif | DEFER_SETUP | SOURCE_REVIEW |
| R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view | STOP_PROFILE | IMPORTED_LOCAL_EVIDENCE |
| R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1 | DEFER_SETUP | SOURCE_REVIEW |
| R092.normalize-vp9-codec-units-for-the-actual-destination | DEFER_SETUP | SOURCE_REVIEW |
| R093.opus-repacketization-without-pcm-decoding | DEFER_SETUP | SOURCE_REVIEW |
| R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata | DEFER_SETUP | SOURCE_REVIEW |
| R095.fixed-opus-gain-through-codec-container-headers | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R096.sparse-native-video-with-explicit-long-frame-holds | STOP_PROFILE | SOURCE_REVIEW |
| R097.mux-color-and-alpha-into-native-transparent-webm | DEFER_SETUP | SOURCE_REVIEW |
| R098.one-atlas-video-for-many-synchronized-visible-clips | STOP_PROFILE | SOURCE_REVIEW |
| R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding | DEFER_SETUP | PREREQUISITE_PROBE |
| R100.transfer-owned-packet-storage-into-webcodecs-chunks | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R101.keep-decoded-video-on-the-native-overlay-display-path | DEFER_SETUP | SOURCE_REVIEW |
| R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier | DEFER_SETUP | SOURCE_REVIEW |
| R103.join-split-or-reorder-independent-flac-channel-subframes | DEFER_SETUP | SOURCE_REVIEW |
| R104.select-or-assemble-whole-opus-elementary-streams-without-pcm | DEFER_SETUP | SOURCE_REVIEW |
| R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams | DEFER_SETUP | SOURCE_REVIEW |
| R106.recall-stored-av1-pictures-with-coded-display-instructions | DEFER_SETUP | SOURCE_REVIEW |
| R107.separate-av1-base-decoding-from-film-grain-reconstruction | DEFER_SETUP | SOURCE_REVIEW |
| R108.crop-or-transform-mjpeg-in-the-coefficient-domain | DEFER_SETUP | SOURCE_REVIEW |
| R109.expose-an-edited-mp4-as-a-virtual-byte-range-url | DEFER_SETUP | SOURCE_REVIEW |
| R110.choose-a-destination-aware-lacing-or-unlacing-representation | INCONCLUSIVE | SOURCE_REVIEW |
| R111.factor-repeated-fmp4-sample-metadata-into-defaults | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R112.supply-known-webm-durations-to-prevent-parser-holdback | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder | DEFER_SETUP | SOURCE_REVIEW |
| R114.use-webrtc-native-media-reception-as-a-packet-copy-destination | DEFER_SETUP | SOURCE_REVIEW |
| R115.play-an-ongoing-fmp4-response-through-one-native-url | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R116.compatibility-islands-use-software-only-for-the-troublesome-section | DEFER_SETUP | SOURCE_REVIEW |
| R116.mse-sequence-mode-concatenation-report-paragraph-label.report-frontier | DEFER_SETUP | SOURCE_REVIEW |
| R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier | DEFER_SETUP | SOURCE_REVIEW |
| R117.play-iamf-through-native-component-decoders | DEFER_SETUP | SOURCE_REVIEW |
| R118.mse-append-window-clipping-report-paragraph-label.report-frontier | STOP_PROFILE | SOURCE_REVIEW |
| R118.one-decode-many-views | DEFER_SETUP | SOURCE_REVIEW |
| R119.canonicalize-equivalent-decoder-configurations | DEFER_SETUP | SOURCE_REVIEW |
| R119.mse-future-range-replacement-report-paragraph-label.report-frontier | DEFER_SETUP | SOURCE_REVIEW |
| R120.entropy-only-transcoding | DEFER_SETUP | SOURCE_REVIEW |
| R120.repeat-media-without-repeating-mdat.report-frontier | STOP_PROFILE | SOURCE_REVIEW |
| R121.insert-a-freeze-with-an-empty-edit.report-frontier | DEFER_SETUP | SOURCE_REVIEW |
| R121.native-reference-state-capsules-for-fast-seeking | DEFER_SETUP | SOURCE_REVIEW |
| R122.reservoir-aware-mp3-repacketization | DEFER_SETUP | SOURCE_REVIEW |
| R122.retime-existing-frames-without-creating-new-pictures.report-frontier | STOP_PROFILE | SOURCE_REVIEW |
| R123.checkpoint-the-software-decoder-inside-a-gop | DEFER_SETUP | SOURCE_REVIEW |
| R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R124.copy-a-frame-once-to-free-the-decoder | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier | STOP_PROFILE | SOURCE_REVIEW |
| R125.buffer-according-to-predicted-decode-work | DEFER_SETUP | SOURCE_REVIEW |
| R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier | INCONCLUSIVE | SOURCE_REVIEW |
| R126.find-where-hardware-decoding-loses-on-short-jobs | DEFER_SETUP | SOURCE_REVIEW |
| R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier | DEFER_SETUP | SOURCE_REVIEW |
| R127.nonlinear-speed-curves-without-video-re-encoding | DEFER_SETUP | SOURCE_REVIEW |
| R127.sequence-mode-cross-codec-concatenation-report-paragraph-label.report-frontier | DEFER_SETUP | PREREQUISITE_PROBE |
| R128.compile-screen-operations-directly-into-video-prediction-commands | DEFER_SETUP | SOURCE_REVIEW |
| R128.fast-playback-does-not-imply-cheap-decoding.report-frontier | STOP_PROFILE | SOURCE_REVIEW |
| R129.extend-gpu-reconstruction-from-still-pictures-to-predictive-video | DEFER_SETUP | SOURCE_REVIEW |
| R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier | STOP_PROFILE | SOURCE_REVIEW |
| R130.protect-reference-critical-bytes-more-heavily-than-disposable-bytes | DEFER_SETUP | SOURCE_REVIEW |
| R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier | DEFER_SETUP | SOURCE_REVIEW |
| R131.automatically-search-equivalent-representations | DEFER_SETUP | SOURCE_REVIEW |
| R131.global-mp4-sidx-materially-changes-remote-access.report-frontier | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R132.exact-frame-dependency-slicing | DEFER_SETUP | SOURCE_REVIEW |
| R132.incremental-mdat-sample-release.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R133.append-moof-and-mdat-separately.report-continuity | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R133.exact-cropped-playback-from-video-that-was-never-tiled | DEFER_SETUP | SOURCE_REVIEW |
| R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice | DEFER_SETUP | SOURCE_REVIEW |
| R135.decode-seek-preroll-without-producing-unwanted-presentation-frames | DEFER_SETUP | SOURCE_REVIEW |
| R135.microfragment-size-versus-startup-bytes.report-continuity | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R136.give-two-independent-videos-separate-reference-banks-inside-one-decoder | DEFER_SETUP | SOURCE_REVIEW |
| R136.worker-owned-mse-with-mediasourcehandle.report-continuity | ADVANCE_CONFIRMATION | PREREQUISITE_PROBE |
| R137.prepared-non-keyframe-representation-switches-using-av1-s-frames | DEFER_SETUP | SOURCE_REVIEW |
| R137.transferable-compressed-buffers-into-worker-mse.report-continuity | ADVANCE_CONFIRMATION | PREREQUISITE_PROBE |
| R138.decode-the-he-aac-core-natively-reconstruct-the-extension-separately | DEFER_SETUP | SOURCE_REVIEW |
| R138.one-sourcebuffer-different-codec-and-container.report-continuity | ADVANCE_CONFIRMATION | PREREQUISITE_PROBE |
| R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity | DEFER_SETUP | PREREQUISITE_PROBE |
| R139.mix-channels-before-performing-all-their-output-transforms | STOP_PROFILE | SOURCE_REVIEW |
| R140.cue-less-webm-native-seek.report-continuity | STOP_PROFILE | SOURCE_REVIEW |
| R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images | DEFER_SETUP | SOURCE_REVIEW |
| R141.no-index-fragmented-mp4-native-remote-seek.report-continuity | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R141.split-flac-frames-in-time-while-reusing-their-prediction-work | DEFER_SETUP | SOURCE_REVIEW |
| R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes | DEFER_SETUP | SOURCE_REVIEW |
| R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R143.compressed-fragment-rewind-cache.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R143.native-base-video-plus-an-exact-correction-stream | DEFER_SETUP | SOURCE_REVIEW |
| R144.compile-simple-ass-animations-into-reusable-timeline-programs | DEFER_SETUP | SOURCE_REVIEW |
| R144.evict-through-a-paused-current-position.report-continuity | STOP_PROFILE | SOURCE_REVIEW |
| R145.guarded-format-specialized-wasm-decoder-variants | DEFER_SETUP | SOURCE_REVIEW |
| R145.native-frame-relay-without-js-pixel-readback.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode | DEFER_SETUP | SOURCE_REVIEW |
| R147.random-access-inside-an-ordinary-zip-deflate-entry | DEFER_SETUP | SOURCE_REVIEW |
| R148.actual-mpeg-2-coefficient-data-reused-by-jpeg | STOP_PROFILE | SOURCE_REVIEW |
| R149.image-data-through-a-lossless-audio-decoder | STOP_PROFILE | SOURCE_REVIEW |
| R150.recovery-windows-rather-than-immediate-clean-access-assumptions | DEFER_SETUP | SOURCE_REVIEW |
| R151.parsed-coefficients-as-a-cache-tier | STOP_PROFILE | SOURCE_REVIEW |
| R152.copy-on-write-tiled-retained-pictures | DEFER_SETUP | SOURCE_REVIEW |
| R153.shared-continuation-and-the-wrong-history-negative | DEFER_SETUP | SOURCE_REVIEW |
| R154.silence-certification-mathematical-boundary-only | STOP_PROFILE | SOURCE_REVIEW |
| R155.fused-synthesis-and-resampling-mathematical-boundary-only | STOP_PROFILE | SOURCE_REVIEW |
| R156.sparse-translucent-layers-with-correct-disposal | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R157.interpolation-guided-by-real-codec-motion-vectors | STOP_PROFILE | SOURCE_REVIEW |
| R158.structure-aware-failure-preserving-reduction | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R159.remux-encrypted-media-without-decrypting-its-samples | DEFER_SETUP | SOURCE_REVIEW |
| R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component | DEFER_SETUP | SOURCE_REVIEW |
| R161.roll-back-speculative-audio-when-a-late-packet-arrives | DEFER_SETUP | SOURCE_REVIEW |
| R162.compile-a-qualified-mux-configuration-into-a-small-patch-program | DEFER_SETUP | SOURCE_REVIEW |
| R163.recover-an-interrupted-recording-from-a-committed-sample-journal | STOP_PROFILE | SOURCE_REVIEW |
| R164.reconstruct-fixed-predictor-lossless-audio-with-parallel-scans | DEFER_SETUP | SOURCE_REVIEW |
| R165.reverse-predictive-audio-by-transforming-its-residuals | DEFER_SETUP | SOURCE_REVIEW |
| R166.prove-where-an-audio-edit-stops-affecting-subsequent-output | DEFER_SETUP | SOURCE_REVIEW |
| R167.produce-a-requested-dissolve-directly-in-transform-space | STOP_PROFILE | SOURCE_REVIEW |
| R168.compress-cold-reference-tiles-not-just-whole-cached-frames | STOP_PROFILE | SOURCE_REVIEW |
| R169.make-custom-presentation-aware-of-display-cadence | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R170.separate-audio-clock-drift-from-an-audio-latency-jump | DEFER_SETUP | SOURCE_REVIEW |
| R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R172.keep-hap-bc1-compressed-to-presentation | DEFER_SETUP | PREREQUISITE_PROBE |
| R173.preserve-flic-indices-plus-palette | DEFER_SETUP | SOURCE_REVIEW |
| R174.flac-bit-depth-promotion-without-sample-reconstruction | DEFER_SETUP | SOURCE_REVIEW |
| R175.tighten-verified-h-264-decoder-requirements | DEFER_SETUP | SOURCE_REVIEW |
| R176.jspi-backed-synchronous-wasm-i-o | DEFER_SETUP | SOURCE_REVIEW |
| R177.gpu-jpeg-entropy-decoding | DEFER_SETUP | SOURCE_REVIEW |
| R178.selective-jpeg-2000-source-reads | DEFER_SETUP | SOURCE_REVIEW |
| R179.exact-subtitle-font-subsetting | STOP_PROFILE | SOURCE_REVIEW |
| R180.residual-domain-flac-mixing | DEFER_SETUP | SOURCE_REVIEW |
| R181.dependency-aware-corruption-tracking | DEFER_SETUP | SOURCE_REVIEW |
| R182.jpeg-mosaic-from-restart-intervals | DEFER_SETUP | SOURCE_REVIEW |
| R183.native-color-with-separately-decoded-transparency | DEFER_SETUP | SOURCE_REVIEW |
| R184.browser-hevc-base-separate-dolby-vision-reshaping | DEFER_SETUP | PREREQUISITE_PROBE |
| R185.progressively-refine-one-preview | DEFER_SETUP | SOURCE_REVIEW |
| R186.reversible-xor-frame-cache | DEFER_SETUP | SOURCE_REVIEW |
| R187.recover-encoder-decisions-from-the-source | DEFER_SETUP | SOURCE_REVIEW |
| R188.schedule-verified-playable-data | DEFER_SETUP | SOURCE_REVIEW |
| R189.sparse-track-future-time-bounds | STOP_PROFILE | SOURCE_REVIEW |
| R190.restricted-ima-adpcm-through-two-clipped-scans | DEFER_SETUP | SOURCE_REVIEW |
| R191.seekable-fixed-linear-effects-via-block-state-transforms | DEFER_SETUP | SOURCE_REVIEW |
| R192.identity-coded-witness-media | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R193.tiled-heic-through-browser-video-decoding | DEFER_SETUP | PREREQUISITE_PROBE |
| R194.browser-zlib-zmbv-reconstruction | DEFER_SETUP | COMPONENT_TEST |
| R195.prepared-texture-video-to-several-gpu-destinations | DEFER_SETUP | PREREQUISITE_PROBE |
| R196.independent-aac-channel-assembly | DEFER_SETUP | SOURCE_REVIEW |
| R197.common-jpeg-quantization-basis-without-requantization-loss | STOP_PROFILE | SOURCE_REVIEW |
| R198.bitmap-subtitles-directly-from-rle-runs | DEFER_SETUP | SOURCE_REVIEW |
| R199.certified-error-preview-reconstruction | DEFER_SETUP | SOURCE_REVIEW |
| R200.content-addressed-reuse-across-different-files | DEFER_SETUP | SOURCE_REVIEW |
| R201.periodic-steady-state-filter-initialization | DEFER_SETUP | SOURCE_REVIEW |
| R202.guarded-narrow-arithmetic | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R203.regroup-existing-opus-frames-without-re-encoding | DEFER_SETUP | SOURCE_REVIEW |
| R204.edit-mp3-coded-gain-without-changing-spectral-payload | STOP_PROFILE | SOURCE_REVIEW |
| R205.multicore-ffv1-without-shared-address-space-state | DEFER_SETUP | SOURCE_REVIEW |
| R206.incremental-mjpeg-stripe-decode-upload | DEFER_SETUP | SOURCE_REVIEW |
| R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes | DEFER_SETUP | SOURCE_REVIEW |
| R208.make-cancellation-follow-media-dependency-boundaries | DEFER_SETUP | SOURCE_REVIEW |
| R209.fetch-wavpack-correction-data-only-when-exact-output-is-required | DEFER_SETUP | SOURCE_REVIEW |
| R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed | DEFER_SETUP | SOURCE_REVIEW |
| R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles | DEFER_SETUP | SOURCE_REVIEW |
| R212.vectorize-across-independent-streams-rather-than-time | STOP_PROFILE | SOURCE_REVIEW |
| R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness | STOP_PROFILE | SOURCE_REVIEW |
| R214.packed-v210-without-cpu-planarization | DEFER_SETUP | SOURCE_REVIEW |
| R215.upload-operation-selected-by-existing-layout | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R216.one-request-for-distant-byte-ranges | DEFER_SETUP | SOURCE_REVIEW |
| R217.exact-waveform-summaries-from-first-order-flac | DEFER_SETUP | SOURCE_REVIEW |
| R218.exact-restricted-png-scans | DEFER_SETUP | SOURCE_REVIEW |
| R219.shared-spectral-analysis | STOP_PROFILE | SOURCE_REVIEW |
| R220.scoped-transport-clock-normalization | DEFER_SETUP | SOURCE_REVIEW |
| R221.gpu-intermediate-lifetime-planning | STOP_PROFILE | SOURCE_REVIEW |
| R222.independently-checkable-remux-construction-record | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries | DEFER_SETUP | SOURCE_REVIEW |
| R223.flac-frame-range-microstream.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac | DEFER_SETUP | SOURCE_REVIEW |
| R224.opus-exact-state-pre-roll.report-continuity | STOP_PROFILE | SOURCE_REVIEW |
| R225.h-264-self-contained-idr-suffix.report-continuity | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata | DEFER_SETUP | SOURCE_REVIEW |
| R226.compact-exact-packet-index.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size | DEFER_SETUP | SOURCE_REVIEW |
| R227.coded-sample-identity-across-containers.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R227.rotate-and-rearrange-texture-video-while-keeping-its-blocks-compressed | DEFER_SETUP | SOURCE_REVIEW |
| R228.decode-interlaced-mjpeg-as-native-field-images | DEFER_SETUP | SOURCE_REVIEW |
| R228.naive-aac-splice-is-rejected.report-continuity | STOP_PROFILE | SOURCE_REVIEW |
| R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline | DEFER_SETUP | SOURCE_REVIEW |
| R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R230.exact-mp3-seek-closure.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R230.mux-media-to-reduce-the-extra-bytes-required-for-integrity-verification | DEFER_SETUP | SOURCE_REVIEW |
| R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity | STOP_PROFILE | SOURCE_REVIEW |
| R231.parallelize-rice-parsing-through-composable-finite-state-transitions | DEFER_SETUP | SOURCE_REVIEW |
| R232.decode-raw-sensor-data-once-develop-the-picture-during-playback | DEFER_SETUP | SOURCE_REVIEW |
| R233.make-independently-resampled-audio-chunks-join-exactly | DEFER_SETUP | SOURCE_REVIEW |
| R234.replace-general-flac-predictors-with-equivalent-fixed-predictors | DEFER_SETUP | SOURCE_REVIEW |
| R235.cache-fractional-pixel-reference-predictions | DEFER_SETUP | SOURCE_REVIEW |
| R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope | DEFER_SETUP | SOURCE_REVIEW |
| R237.propagate-the-visible-region-backward-through-the-effects-pipeline | DEFER_SETUP | SOURCE_REVIEW |
| R238.let-channel-reduction-cross-the-resampler-boundary | STOP_PROFILE | SOURCE_REVIEW |
| R239.extract-an-av1-operating-point-before-decoding.report-a | DEFER_SETUP | SOURCE_REVIEW |
| R239.packet-granular-ogg-opus-repagination.report-c | DEFER_SETUP | SOURCE_REVIEW |
| R239.wait-for-the-required-pictures-without-draining-the-decoder | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R240.add-useful-jpeg-restart-boundaries-without-another-image-generation-loss | DEFER_SETUP | SOURCE_REVIEW |
| R240.extract-a-native-2d-view-from-multiview-hevc.report-a | DEFER_SETUP | SOURCE_REVIEW |
| R240.vp9-webm-cluster-surgery.report-c | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately | DEFER_SETUP | SOURCE_REVIEW |
| R241.jpeg-90-dct-domain-rotation.report-c | STOP_PROFILE | SOURCE_REVIEW |
| R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a | DEFER_SETUP | SOURCE_REVIEW |
| R242.decompress-haps-texture-data-directly-into-gpu-owned-storage | DEFER_SETUP | PREREQUISITE_PROBE |
| R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c | DEFER_SETUP | SOURCE_REVIEW |
| R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a | ALREADY_IMPLEMENTED | SOURCE_REVIEW |
| R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a | STOP_PROFILE | SOURCE_REVIEW |
| R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples | DEFER_SETUP | SOURCE_REVIEW |
| R243.remove-nonessential-h-264-sei.report-c | STOP_PROFILE | SOURCE_REVIEW |
| R244.make-dithering-reproducible-at-any-sample-position | STOP_PROFILE | SOURCE_REVIEW |
| R244.recompute-video-effects-only-where-the-input-actually-changed.report-a | STOP_PROFILE | SOURCE_REVIEW |
| R244.reservoir-independent-prepared-mp3.report-c | STOP_PROFILE | SOURCE_REVIEW |
| R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a | STOP_PROFILE | SOURCE_REVIEW |
| R245.parallelize-recursive-audio-effects-by-correcting-each-chunks-initial-state | DEFER_SETUP | SOURCE_REVIEW |
| R245.standalone-flac-from-original-frames.report-c | DEFER_SETUP | SOURCE_REVIEW |
| R246.make-parallel-audio-quantization-deterministic-without-shared-random-state | STOP_PROFILE | SOURCE_REVIEW |
| R247.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R248.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R249.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R250.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R251.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R252.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R253.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R254.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R255.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R256.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R257.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R258.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R259.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R260.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R261.selective-verified-http-rescue | DEFER_SETUP | SOURCE_REVIEW |
| R262.configuration-interval-seek | DEFER_SETUP | SOURCE_REVIEW |
| R263.retained-deep-samples-deferred-composition | DEFER_SETUP | PREREQUISITE_PROBE |
| R264.exact-incremental-image-statistics | STOP_PROFILE | SOURCE_REVIEW |
| R265.sparse-correction-for-cached-linear-audio-filtering | STOP_PROFILE | SOURCE_REVIEW |
| R266.snappy-dependency-graph | STOP_PROFILE | SOURCE_REVIEW |
| R267.deadline-slack-before-optimization | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R268.aac-selective-channel-element-reconstruction | DEFER_SETUP | SOURCE_REVIEW |
| R269.av1-pre-super-resolution-preview | DEFER_SETUP | SOURCE_REVIEW |
| R270.exact-flac-smart-cut-concat | DEFER_SETUP | SOURCE_REVIEW |
| R271.opus-fec-aware-scheduling | STOP_PROFILE | SOURCE_REVIEW |
| R272.roi-videoframe-copyto | STOP_PROFILE | SOURCE_REVIEW |
| R273.jpeg-xl-dc-preview | DEFER_SETUP | SOURCE_REVIEW |
| R274.virtual-webm-cues | DEFER_SETUP | SOURCE_REVIEW |
| R275.av1-large-scale-tile-viewport-decode | DEFER_SETUP | SOURCE_REVIEW |
| R276.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R277.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R278.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R279.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R280.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R281.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R282.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R283.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R284.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R285.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R286.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R287.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R288.definition-not-recovered | HOLD_SOURCE | SOURCE_REVIEW |
| R289.share-one-native-decoder-across-unrelated-independent-picture-jobs | DEFER_SETUP | PREREQUISITE_PROBE |
| R290.compose-exact-motion-copy-chains-before-reconstructing-pixels | DEFER_SETUP | SOURCE_REVIEW |
| R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op | STOP_PROFILE | SOURCE_REVIEW |
| R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook | DEFER_SETUP | SOURCE_REVIEW |
| R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file | DEFER_SETUP | SOURCE_REVIEW |
| R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries | STOP_PROFILE | SOURCE_REVIEW |
| R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition | HOLD_ENV | SOURCE_REVIEW |
| R296.generate-seek-fragments-without-replaying-a-mux-session | DEFER_SETUP | SOURCE_REVIEW |
| R297.query-mp4-timing-tables-without-expanding-every-sample-record | DEFER_SETUP | SOURCE_REVIEW |
| R298.copy-surviving-packets-to-release-oversized-backing-buffers | STOP_PROFILE | SOURCE_REVIEW |
| R299.change-flac-predictor-order-directly-in-the-residual-domain | STOP_PROFILE | SOURCE_REVIEW |
| R300.reuse-repeated-inverse-transform-results-across-different-video-blocks | DEFER_SETUP | SOURCE_REVIEW |
| R301.edit-displayed-frames-without-changing-the-prediction-history | DEFER_SETUP | SOURCE_REVIEW |
| R302.develop-ultra-hdr-gain-maps-after-native-image-decoding | DEFER_SETUP | SOURCE_REVIEW |
| R303.schedule-h-264-deblocking-as-a-dependency-graph | DEFER_SETUP | PREREQUISITE_PROBE |
| R304.factor-a-multichannel-effect-into-fewer-independent-filters | STOP_PROFILE | SOURCE_REVIEW |
| R305.compose-ogg-checksums-from-reusable-byte-range-summaries | STOP_PROFILE | SOURCE_REVIEW |
| R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap | STOP_PROFILE | SOURCE_REVIEW |
| R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback | DEFER_SETUP | SOURCE_REVIEW |
| R308.move-already-filtered-pixels-instead-of-filtering-them-again | DEFER_SETUP | SOURCE_REVIEW |
| R309.recalculate-mix-loudness-from-cached-cross-products | STOP_PROFILE | SOURCE_REVIEW |
| R310.compile-g-711-processing-chains-into-exact-lookup-tables | STOP_PROFILE | SOURCE_REVIEW |
| R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification | DEFER_SETUP | SOURCE_REVIEW |
| R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them | STOP_PROFILE | SOURCE_REVIEW |
| R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame | DEFER_SETUP | PREREQUISITE_PROBE |
| R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images | STOP_PROFILE | SOURCE_REVIEW |
| R315.carry-hidden-caption-state-across-packet-copy-cuts | DEFER_SETUP | SOURCE_REVIEW |
| R316.cache-the-peak-envelope-of-every-fixed-gain-mix | STOP_PROFILE | SOURCE_REVIEW |
| R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps | STOP_PROFILE | SOURCE_REVIEW |
| R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate | DEFER_SETUP | SOURCE_REVIEW |
| R319.checkpoint-png-paeth-row-state.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs | STOP_PROFILE | SOURCE_REVIEW |
| R320.gram-cache-after-a-fixed-fir-effect.report-continuity | STOP_PROFILE | SOURCE_REVIEW |
| R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming | DEFER_SETUP | SOURCE_REVIEW |
| R321.exact-iir-seek-checkpoints.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R322.animated-image-disposal-checkpoints.report-continuity | DEFER_SETUP | SOURCE_REVIEW |
| R322.invert-flac-polarity-directly-in-the-residual-domain | DEFER_SETUP | SOURCE_REVIEW |
| R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front | DEFER_SETUP | SOURCE_REVIEW |
| R323.merkle-proof-cached-range-verification.report-continuity | STOP_PROFILE | SOURCE_REVIEW |
| R324.reuse-av1-show-existing-frame-for-repeated-ui-states | STOP_PROFILE | SOURCE_REVIEW |
| R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached | STOP_PROFILE | SOURCE_REVIEW |
| R326.smart-cut-predictive-video-by-synthesizing-only-the-missing-reference-boundary | DEFER_SETUP | SOURCE_REVIEW |
| R327.share-one-decoded-audio-source-across-many-sample-rate-consumers | DEFER_SETUP | SOURCE_REVIEW |
| R328.skip-decoding-video-frames-whose-entire-visible-contribution-is-provably-occluded | DEFER_SETUP | SOURCE_REVIEW |
| R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together | DEFER_SETUP | SOURCE_REVIEW |
| R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects | DEFER_SETUP | SOURCE_REVIEW |
| R331.decode-sparse-flac-channels-only-when-the-selected-output-matrix-actually-needs-them | STOP_PROFILE | SOURCE_REVIEW |
| R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R333.keep-soft-telecine-as-progressive-pictures-plus-timing | STOP_PROFILE | SOURCE_REVIEW |
| R334.share-one-demux-pass-across-independent-playback-and-export-timelines | DEFER_SETUP | SOURCE_REVIEW |
| R335.recover-the-gpu-presenter-without-reopening-healthy-decoders | DEFER_SETUP | PREREQUISITE_PROBE |
| R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums | DEFER_SETUP | SOURCE_REVIEW |
| R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram | STOP_PROFILE | SOURCE_REVIEW |
| R338.decode-into-the-layout-the-next-stage-already-needs | ADVANCE_CONFIRMATION | SOURCE_REVIEW |
| R339.collapse-chroma-expansion-and-final-resizing-into-one-filter | STOP_PROFILE | SOURCE_REVIEW |
| R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples | DEFER_SETUP | SOURCE_REVIEW |
| R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget | DEFER_SETUP | SOURCE_REVIEW |
| R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it | STOP_PROFILE | SOURCE_REVIEW |
| R343.unwrap-aac-latm-into-a-browser-decoded-audio-route | DEFER_SETUP | SOURCE_REVIEW |
| R344.seek-through-apng-by-resolving-the-last-writer-of-each-region | DEFER_SETUP | SOURCE_REVIEW |
| R345.stack-png-images-by-joining-their-compressed-scanline-streams | STOP_PROFILE | SOURCE_REVIEW |
| R346.turn-paeth-prediction-into-composable-byte-state-maps | STOP_PROFILE | SOURCE_REVIEW |
| R347.morph-convolution-effects-using-reusable-basis-outputs | STOP_PROFILE | SOURCE_REVIEW |
| R348.convert-packed-dsd-directly-to-the-requested-pcm-rate | DEFER_SETUP | SOURCE_REVIEW |
| R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index | DEFER_SETUP | SOURCE_REVIEW |
| R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding | DEFER_SETUP | SOURCE_REVIEW |
| R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries | DEFER_SETUP | SOURCE_REVIEW |
| R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts | DEFER_SETUP | SOURCE_REVIEW |
| R353.let-browser-managed-streaming-windows-control-remux-production | HOLD_ENV | PREREQUISITE_PROBE |
| R354.replace-an-oversized-preparation-heap-while-native-playback-continues | DEFER_SETUP | SOURCE_REVIEW |
| R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier | DEFER_SETUP | SOURCE_REVIEW |
| R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals | DEFER_SETUP | SOURCE_REVIEW |
| R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index | STOP_PROFILE | SOURCE_REVIEW |
| R358.unwrap-matroska-track-compression-before-choosing-a-decoder | DEFER_SETUP | COMPONENT_TEST |
| R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up | DEFER_SETUP | SOURCE_REVIEW |
| R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub | DEFER_SETUP | SOURCE_REVIEW |
| R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline | STOP_PROFILE | SOURCE_REVIEW |
| R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded | DEFER_SETUP | SOURCE_REVIEW |
| R363.expose-prepared-fragments-as-a-native-hls-presentation | DEFER_SETUP | PREREQUISITE_PROBE |
| R364.reuse-gpu-command-sequences-across-changing-video-frames | DEFER_SETUP | SOURCE_REVIEW |
| R365.compute-gif-color-statistics-without-expanding-lzw-strings | STOP_PROFILE | SOURCE_REVIEW |
| R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments | STOP_PROFILE | SOURCE_REVIEW |

## R007.close-the-hevc-in-ts-browser-owned-construction-gap

**DEFER_SETUP — SOURCE_REVIEW**

HEVC configuration transport exists, but native TS admission explicitly requires AVC with optional AAC. Positive HEVC WebCodecs configuration does not establish TS timestamps or MSE packaging. Extending codec-specific timestamp/preroll repair exceeds a one-switch first screen.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Audit one existing HEVC TS fixture packet/configuration timeline against current AVC repair, then scope only the missing timestamp construction; reject an unproven parameter-set or discontinuity transition.

Evidence: [work/root/audits/R007.close-the-hevc-in-ts-browser-owned-construction-gap.md](work/root/audits/R007.close-the-hevc-in-ts-browser-owned-construction-gap.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R262.configuration-interval-seek

**DEFER_SETUP — SOURCE_REVIEW**

Current remux rejects changed parameter sets/new extradata; no source-bound configuration-interval seek index is consumed by this path. The report proves host authored-interval bytes, not production container timestamps or an index. A configuration/index owner would be new setup.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Use a two-configuration source to describe one exact RAP/configuration interval and test independent pixel identity before designing a container-bound index; use a non-RAP entry as rejection control.

Evidence: [work/root/audits/R262.configuration-interval-seek.md](work/root/audits/R262.configuration-interval-seek.md)

## R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

The retained bridge submits one EncodedVideoChunk per admitted packet and its VP9 helper only reads key-frame configuration; no explicit superframe splitter is visible at this boundary. Whether the demuxer already normalizes a particular fixture remains unmeasured. The actual VP9 configuration query succeeds, so an input-framing inventory is worthwhile.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Inventory one known VP9 alternate-reference superframe at the current bridge and compare component payload order plus visible output with the unsplit construction; include corrupted index lengths and hidden dependency retention.

Evidence: [work/root/audits/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md](work/root/audits/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R343.unwrap-aac-latm-into-a-browser-decoded-audio-route

**DEFER_SETUP — SOURCE_REVIEW**

The current native audio admission accepts AV_CODEC_ID_AAC, not AAC_LATM, and TS admission is AVC/AAC. Browser AAC config support is present, but there is no maintained bounded LATM transport extractor with bit-aligned payload/configuration authority. A stateful parser would be new setup, not a routing flag.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Extract a single version-0/program-0/layer-0 LATM unit using a bounded component and compare known AAC bytes and ASC; reject absent initial configuration and non-byte-aligned truncation before any browser pilot.

Evidence: [work/root/audits/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route.md](work/root/audits/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier

**DEFER_SETUP — SOURCE_REVIEW**

avformat_open_input receives no options, while the pinned FFmpeg demuxer offers merge_pmt_versions and heuristic identity matching. A default switch would not prove logical-track continuity. No descriptor-authoritative PID-transition fixture/observer is currently established; authoring that transition is the next setup slice.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Construct one continuous AVC/AAC PMT PID reassignment with unique component descriptors and compare demux payloads with merge disabled/enabled; ambiguous reordered duplicate descriptors must not be accepted as identity proof.

Evidence: [work/root/audits/R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier.md](work/root/audits/R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier.md)

## R358.unwrap-matroska-track-compression-before-choosing-a-decoder

**DEFER_SETUP — COMPONENT_TEST**

Pinned Matroska demux already restores header-stripping prefixes. The current verified Wasm build has CONFIG_ZLIB=0, so per-frame zlib is a distinct unresolved profile. Browser deflate component recovered exact 850 bytes and rejected a bad checksum, but does not bind output to Matroska scope/order or packet authority. A lightweight Matroska parser/bridge is new setup.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Reuse the existing demux route for header stripping; for zlib first attach bounded whole-unit decompression to one known scope-1 block with exact payload oracle and corrupted-checksum no-publication control, without adding general stacked/laced/encrypted support.

Evidence: [work/root/audits/R358.unwrap-matroska-track-compression-before-choosing-a-decoder.md](work/root/audits/R358.unwrap-matroska-track-compression-before-choosing-a-decoder.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R363.expose-prepared-fragments-as-a-native-hls-presentation

**DEFER_SETUP — PREREQUISITE_PROBE**

Native HLS canPlayType returns maybe on the current browser, which is not playback proof. Existing native HLS consumes a source URL; emitted local fragments lack a maintained source-bound playlist/resource lifetime provider. Building that delivery service exceeds first-pass scope and cannot be inferred from ordinary HLS support.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Serve one finite authorized same-origin playlist over already-verified closed-GOP fragments, compare direct/MSE/native HLS output, and separately test actual intended browser-only resource delivery before proposing integration.

Evidence: [work/root/audits/R363.expose-prepared-fragments-as-a-native-hls-presentation.md](work/root/audits/R363.expose-prepared-fragments-as-a-native-hls-presentation.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R009.pass-already-valid-fragmented-media-through-unchanged

**STOP_PROFILE — IMPORTED_LOCAL_EVIDENCE**

Existing local fMP4 opens and seeks as native-direct in the preserved opportunities-02 result. This is a cheaper correct route for the tested file profile than a new MSE parser. It does not implement or reject controlled-fetch/track-selective pass-through.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Reopen only on an authorized controlled-fetch fMP4 workload that cannot use native-direct; preserve track/configuration/timeline identity and reject selection mismatch or encrypted input.

Evidence: [work/root/audits/R009.pass-already-valid-fragmented-media-through-unchanged.md](work/root/audits/R009.pass-already-valid-fragmented-media-through-unchanged.md), [evidence/imports/opportunities-02.json](evidence/imports/opportunities-02.json)

## R138.one-sourcebuffer-different-codec-and-container.report-continuity

**ADVANCE_CONFIRMATION — PREREQUISITE_PROBE**

The recovered report records SourceBuffer parser acceptance across MP4/H264 to WebM/VP9, not full selected A/V output. Current worker packaging creates a new presentation per restart. The live API exposes changeType and both MIME families, so a tiny continuity/output component is a useful next test, not a qualified route.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Compare one retained SourceBuffer versus restart using exact two-configuration media; verify decoded pictures/audio continuation rather than buffered ranges, and reject dependent-picture initialization or changed unsupported audio.

Evidence: [work/root/audits/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md](work/root/audits/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R005.move-mse-ownership-off-the-window-thread

**ADVANCE_CONFIRMATION — PREREQUISITE_PROBE**

Current MSE scheduling stays in the window while blocking Wasm and reads have separate workers. Dedicated-worker MediaSource is now available in the tested secure worker, clearing the old capability uncertainty. No reduction in UI jitter or main-thread CPU has been measured.

Contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Next bounded test / reopening condition: Transfer a MediaSourceHandle from a dedicated nonblocking worker and append an existing exact fMP4 under one bounded UI load; include detach/worker-death cleanup before considering a production ownership change.

Evidence: [work/root/audits/R005.move-mse-ownership-off-the-window-thread.md](work/root/audits/R005.move-mse-ownership-off-the-window-thread.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

The recovered report was blocked by an opaque insecure origin. The present secure environment has VideoDecoder. More decisively, current decoder bridge calls operation 3 only for a null-packet drain, and workers flush only for that operation; ordinary packet batches keep the decoder session. No unconditional transport-batch flush opportunity is present in these owners.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Reopen if a trace shows an unintended reset/flush on ordinary packet or fragment delivery; keep actual seek/configuration/drain resets and output-based completion semantics.

Evidence: [work/root/audits/R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a.md](work/root/audits/R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition

**HOLD_ENV — SOURCE_REVIEW**

The current evidence path is headless Chrome. A nonfallback Metal adapter query cannot reveal physical video-overlay decisions, display composition, or energy. The UI separates video and overlays, but the required compositor/display/energy observation is not available in this profile; no CSS performance verdict is supportable.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Use a headed fixed-display browser with actual compositor overlay diagnostics and matched caption/control appearance; verify overlay-path evidence before comparing energy or altering layer construction.

Evidence: [work/root/audits/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition.md](work/root/audits/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition.md)

## R335.recover-the-gpu-presenter-without-reopening-healthy-decoders

**DEFER_SETUP — PREREQUISITE_PROBE**

Current retained frames render through Canvas2D; the experimental YUV presenter uses WebGL2 loss callbacks. Neither is the proposal's independently recoverable WebGPU presenter. Building that presenter merely to induce loss exceeds this screen.

Contract: Retain healthy decoder/audio state only if verified; resume current-time identified pictures with bounded retained frames and no stale-device publication.

Next bounded test / reopening condition: First establish an existing WebGPU presenter owner and health observations; then inject one device.destroy during playback and compare with full reopen.

Evidence: [work/batch_a/audits/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders.md](work/batch_a/audits/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R353.let-browser-managed-streaming-windows-control-remux-production

**HOLD_ENV — PREREQUISITE_PROBE**

The coordinator shared raw secure-localhost Chrome 152 gate was inspected: ManagedMediaSource is undefined in both window and worker. Ordinary MediaSource is present. This specifically blocks real managed demand/eviction signals on this browser; it does not reject the scheduling idea or other browsers.

Contract: Identical H264/AAC samples, selected tracks, seeks and EOS; distinguish prepared intervals from actual buffer residency.

Next bounded test / reopening condition: Use a browser/device with ManagedMediaSource, then a short actual demand/eviction trace on fixed H264/AAC; no simulated event can qualify real browser eviction.

Evidence: [work/batch_a/audits/R353.let-browser-managed-streaming-windows-control-remux-production.md](work/batch_a/audits/R353.let-browser-managed-streaming-windows-control-remux-production.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R057.probe-a-real-six-channel-native-flac-destination

**ADVANCE_CONFIRMATION — PREREQUISITE_PROBE**

Maintained FLAC adaptation explicitly rejects more than two channels; the separate Wasm output can request six channels but that does not prove Native FLAC preservation. A browser destination-only matrix is useful without relaxing admission.

Contract: Six separately recoverable channel identities at the pre-device graph, correct sample rate/timing; no physical surround claim.

Next bounded test / reopening condition: Use an independently encoded short six-channel FLAC fixture and ChannelSplitter analysis for direct and MSE output; record six-by-six identification matrix.

Evidence: [work/batch_a/audits/R057.probe-a-real-six-channel-native-flac-destination.md](work/batch_a/audits/R057.probe-a-real-six-channel-native-flac-destination.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R088.native-hls-playlist-views-over-compatible-existing-media

**ADVANCE_CONFIRMATION — PREREQUISITE_PROBE**

HLS selection exists for the application-owned streaming bridge, but no playlist-view authoring path over existing file byte ranges was found. Direct Native media ownership already exists, making an exact native-HLS gate cheaper than a new service.

Contract: Same finite clear H264/AAC media, authorized ranges and selected tracks; direct native requests rather than hidden JavaScript HLS.

Next bounded test / reopening condition: Query native HLS on the intended browser; if accepted, serve one existing qualified fragmented file as a byte-range VOD playlist and observe native requests plus one seek/EOF.

Evidence: [work/batch_a/audits/R088.native-hls-playlist-views-over-compatible-existing-media.md](work/batch_a/audits/R088.native-hls-playlist-views-over-compatible-existing-media.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R183.native-color-with-separately-decoded-transparency

**DEFER_SETUP — SOURCE_REVIEW**

Current presentation consumes one frame and the YUV shader writes opaque alpha. No paired color/alpha timeline owner exists. Historical two-pixel SwiftShader equality does not establish a current paired-stream route.

Contract: Combine color and alpha from the same source time/configuration, with correct premultiplication and no stale pair.

Next bounded test / reopening condition: Define a bounded two-stream frame pairing adapter; use one three-frame identified mask/color input against full RGBA reference before integration.

Evidence: [work/batch_a/audits/R183.native-color-with-separately-decoded-transparency.md](work/batch_a/audits/R183.native-color-with-separately-decoded-transparency.md)

## R114.use-webrtc-native-media-reception-as-a-packet-copy-destination

**DEFER_SETUP — SOURCE_REVIEW**

Native currently owns a media URL/MSE element and remux emits container bytes; no RTP packetizer, sender/signaling or media receiver owner exists in these paths. Real WebRTC requires a separate delivery component, not a SourceBuffer option.

Contract: Packet-copy H264/Opus payloads, truthful RTP clocks, real ICE/DTLS/SRTP receiver output, explicitly live-track seek semantics.

Next bounded test / reopening condition: Provide an authorized minimal sender and one H264/Opus packet-copy trace; compare payload units and first received A/V with the existing MSE control.

Evidence: [work/batch_a/audits/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination.md](work/batch_a/audits/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination.md)

## R176.jspi-backed-synchronous-wasm-i-o

**DEFER_SETUP — SOURCE_REVIEW**

Current synchronous AVIO blocks on a shared mailbox and Atomics.wait; the reported tiny JSPI function is not this reader. A real JSPI import/export and toolchain variant is needed.

Contract: Same bounded reads/seeks, cancellation and one live Wasm call owner while promises suspend/resume.

Next bounded test / reopening condition: Prepare one isolated remux JSPI build replacing only source_read, reuse current File reader, and compare one seek/output against current mailbox build.

Evidence: [work/batch_a/audits/R176.jspi-backed-synchronous-wasm-i-o.md](work/batch_a/audits/R176.jspi-backed-synchronous-wasm-i-o.md)

## R006.offer-a-non-pthread-remux-path-without-isolation

**DEFER_SETUP — SOURCE_REVIEW**

Isolation is required by the actual SharedArrayBuffer/Atomics implementation, not merely a redundant policy check. Non-pthread suspension is a new build profile; deleting the guard is incorrect.

Contract: Remux without COOP/COEP, no shared memory or main-thread blocking, equivalent selected packets and bounded cancellation.

Next bounded test / reopening condition: Create a remux-only JSPI build and serve without isolation, starting with one File seek/read/mux case and current isolated control.

Evidence: [work/batch_a/audits/R006.offer-a-non-pthread-remux-path-without-isolation.md](work/batch_a/audits/R006.offer-a-non-pthread-remux-path-without-isolation.md)

## R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output

**ADVANCE_CONFIRMATION — PREREQUISITE_PROBE**

A native draw_yuv boundary already supplies planar pointers, strides, crop and color for qualified 8-bit 420; current WebGL presenter copies rows and uploads planes. A test-only VideoFrame constructor can be compared at that boundary without a new decoder.

Contract: Equivalent pictures, crop, range, matrix and timing with bounded closed VideoFrames; preserve unsupported-format fallback.

Next bounded test / reopening condition: At existing drawYUV boundary, test one stride/crop 420 frame through raw VideoFrame against YUV and RGB reference; only then short playback work counters.

Evidence: [work/batch_a/audits/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md](work/batch_a/audits/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R086.native-video-with-an-independent-generated-pcm-clock

**DEFER_SETUP — SOURCE_REVIEW**

Native gain uses the media element's own audio, while the PCM worklet is owned by the Wasm player. No Native-video/independent-PCM synchronization transaction exists; old ScriptProcessor clock agreement is insufficient.

Contract: One explicit mapping between generated PCM sample clock and video media time through seek/rate/stall, no acoustic-output inference.

Next bounded test / reopening condition: Specify a minimal Native-video plus existing PCM ring controller with rebase and underrun policy; compare a pulse/frame marker after one seek and rate change.

Evidence: [work/batch_a/audits/R086.native-video-with-an-independent-generated-pcm-clock.md](work/batch_a/audits/R086.native-video-with-an-independent-generated-pcm-clock.md)

## R097.mux-color-and-alpha-into-native-transparent-webm

**DEFER_SETUP — SOURCE_REVIEW**

Remux selects one video and audio stream and copies codec parameters; no two-visual-stream alignment or BlockAdditional construction exists. Existing WebM mux selection alone does not implement alpha.

Contract: Coded color/alpha identity, aligned dependencies/timestamps, correct matte/premultiplication and alpha edges.

Next bounded test / reopening condition: Build a host mux-only oracle for a three-frame aligned VP8 pair and verify BlockAdditional payloads against known alpha WebM before touching playback.

Evidence: [work/batch_a/audits/R097.mux-color-and-alpha-into-native-transparent-webm.md](work/batch_a/audits/R097.mux-color-and-alpha-into-native-transparent-webm.md)

## R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component

**DEFER_SETUP — SOURCE_REVIEW**

Current adaptation streams through FFmpeg decoder/FIFO/encoder; PCM worklet consumes a continuous ring. No miniature-file authoring, whole-file browser audio decode or seam trimming owner exists.

Contract: Independent lossless FLAC chunks produce exactly ordered trimmed PCM under one clock with bounded pending decode state.

Next bounded test / reopening condition: Define two independently decodable FLAC regions and a decodeAudioData seam oracle; compare concatenated samples with full decode before a playback scheduler.

Evidence: [work/batch_a/audits/R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component.md](work/batch_a/audits/R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component.md)

## R101.keep-decoded-video-on-the-native-overlay-display-path

**DEFER_SETUP — SOURCE_REVIEW**

Direct Native and canvas-based presentation both exist, but source code does not reveal hardware-overlay eligibility or physical GPU copy cost. Current headless evidence cannot decide composition power.

Contract: Equivalent visible video/UI and delivered frames on a recorded physical compositor path.

Next bounded test / reopening condition: Establish permitted physical Chrome compositor tracing for direct video versus equivalent DOM overlay and canvas control, then one short comparison.

Evidence: [work/batch_a/audits/R101.keep-decoded-video-on-the-native-overlay-display-path.md](work/batch_a/audits/R101.keep-decoded-video-on-the-native-overlay-display-path.md)

## R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding

**DEFER_SETUP — PREREQUISITE_PROBE**

HEVC configuration parsing and packet copy exist, but no Dolby profile-8.1 validator or selective Dolby metadata rewrite exists. Generic HEVC admission is not proof of compatible HDR10 base extraction.

Contract: Explicitly requested HDR10-compatible base, preserved picture payloads/static color/captions; losing Dolby dynamic semantics disclosed.

Next bounded test / reopening condition: Supply one trusted profile-8.1 fixture and HDR10 reference, first compare original direct playback then a host metadata-only extraction oracle.

Evidence: [work/batch_a/audits/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding.md](work/batch_a/audits/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R138.decode-the-he-aac-core-natively-reconstruct-the-extension-separately

**DEFER_SETUP — SOURCE_REVIEW**

AAC is a packet-copy construction but no core extractor, retained SBR side state or extension synthesizer exists. Full native HE-AAC support should be checked before designing reconstruction.

Contract: Preserve full HE-AAC-v1 sample interpretation and SBR fidelity, not just AAC-LC core sound.

Next bounded test / reopening condition: First qualify original HE-AAC-v1 in the browser against reference; only if missing, scope one core/SBR extraction and reference reconstruction component.

Evidence: [work/batch_a/audits/R138.decode-the-he-aac-core-natively-reconstruct-the-extension-separately.md](work/batch_a/audits/R138.decode-the-he-aac-core-natively-reconstruct-the-extension-separately.md)

## R159.remux-encrypted-media-without-decrypting-its-samples

**DEFER_SETUP — SOURCE_REVIEW**

DASH adaptation rejects ContentProtection and remux has no encryption auxiliary-record transaction or authorized EME destination owner. Codec parameter copy cannot establish preservation of encryption metadata.

Contract: Synthetic application-controlled ciphertext and all IV/subsample/key/auxiliary offsets retained, authorized output only.

Next bounded test / reopening condition: Create one application-controlled encrypted fragment mapping oracle outside playback; validate every auxiliary offset and sample ciphertext before an authorized destination test.

Evidence: [work/batch_a/audits/R159.remux-encrypted-media-without-decrypting-its-samples.md](work/batch_a/audits/R159.remux-encrypted-media-without-decrypting-its-samples.md)

## R184.browser-hevc-base-separate-dolby-vision-reshaping

**DEFER_SETUP — PREREQUISITE_PROBE**

The HEVC bridge exposes ordinary browser decoding; current YUV shader only handles 601/709 conversion, with no RPU parser or Dolby reshaping. Historical fixture/display/API blockers were in another environment and are not current failures.

Contract: Correct decoded HEVC base plus specified Dolby reshaping with trusted metadata and declared HDR output reference.

Next bounded test / reopening condition: Obtain a trusted RPU-bearing test fixture and reference transform, then test one reshaping component against the reference before browser/HDR integration.

Evidence: [work/batch_a/audits/R184.browser-hevc-base-separate-dolby-vision-reshaping.md](work/batch_a/audits/R184.browser-hevc-base-separate-dolby-vision-reshaping.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R208.make-cancellation-follow-media-dependency-boundaries

**DEFER_SETUP — SOURCE_REVIEW**

Current seek increments generation and terminates source/remux workers, with decoder stale-frame closure. That supports cancellation safety but is not independent-GOP transport scheduling. No WebTransport dependency-stream owner is present.

Contract: Obsolete dependencies may finish only without publishing stale frames; retain needed dependencies and source authorization.

Next bounded test / reopening condition: Define one two-GOP delivery adapter and compare retained required GOP versus canceled speculative GOP using the current generation publication boundary.

Evidence: [work/batch_a/audits/R208.make-cancellation-follow-media-dependency-boundaries.md](work/batch_a/audits/R208.make-cancellation-follow-media-dependency-boundaries.md)

## R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback

**DEFER_SETUP — SOURCE_REVIEW**

AVC configuration and packet copy exist, but there is no MVC view/dependency parser or explicit base-view output contract. Blind NAL removal would bypass needed configuration/timing validation.

Contract: Only explicitly requested AVC-compatible MVC base view, original coded pictures and time/audio/caption identity.

Next bounded test / reopening condition: Provide tiny trusted two-view MVC elementary input and independent base-view reference; validate selected access units before constructing fMP4.

Evidence: [work/batch_a/audits/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback.md](work/batch_a/audits/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback.md)

## R082.browser-side-video-normalization

**DEFER_SETUP — PREREQUISITE_PROBE**

Current browser bridge decodes chunks but no VideoEncoder/normalization mux queue exists. The report's MediaRecorder fallback has frame/timing differences and is not a transparent candidate.

Contract: Explicitly declared normalization fidelity, exact timestamp mapping, required audio and full duration; no silent frame omission.

Next bounded test / reopening condition: Scope one secure-context VideoDecoder-to-VideoEncoder timestamp harness on tiny identified frames with explicit output contract before any player adapter.

Evidence: [work/batch_a/audits/R082.browser-side-video-normalization.md](work/batch_a/audits/R082.browser-side-video-normalization.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R173.preserve-flic-indices-plus-palette

**DEFER_SETUP — SOURCE_REVIEW**

Current software presenter accepts 420 planes or RGB fallback, not indices/palette updates. Retaining FLIC palettes needs a stateful representation and seek reconstruction, rather than changing a texture format alone.

Contract: Each palette-only/index-only transition and seek reconstructs exact RGB; palette state is a decode dependency.

Next bounded test / reopening condition: Expose one bounded index+palette frame state adapter and compare four controlled transitions to FFmpeg before shader integration.

Evidence: [work/batch_a/audits/R173.preserve-flic-indices-plus-palette.md](work/batch_a/audits/R173.preserve-flic-indices-plus-palette.md)

## R194.browser-zlib-zmbv-reconstruction

**DEFER_SETUP — COMPONENT_TEST**

Current browser video bridge supports conventional codec chunks, and presenter consumes decoded planes. There is no persistent ZMBV inflate/motion/XOR state owner. Historical component equality cannot substitute for integrated reconstruction.

Contract: Persistent deflate stream, exact motion/XOR frames, keyframe seek state and bounds.

Next bounded test / reopening condition: Implement only the four-frame CPU reconstruction adapter around browser DecompressionStream using a trusted ZMBV reference; GPU stage remains separate.

Evidence: [work/batch_a/audits/R194.browser-zlib-zmbv-reconstruction.md](work/batch_a/audits/R194.browser-zlib-zmbv-reconstruction.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R117.play-iamf-through-native-component-decoders

**DEFER_SETUP — SOURCE_REVIEW**

Current PCM worklet consumes already mixed samples, not IAMF component streams or mix metadata. A restricted IAMF parser, component decoder and trimming/mix owner is required.

Contract: Requested IAMF channel-based mix including gain/trimming, synchronized components on one clock.

Next bounded test / reopening condition: Define one tiny channel-based IAMF presentation and reference PCM render; verify metadata/component alignment before scheduling decoded samples.

Evidence: [work/batch_a/audits/R117.play-iamf-through-native-component-decoders.md](work/batch_a/audits/R117.play-iamf-through-native-component-decoders.md)

## R172.keep-hap-bc1-compressed-to-presentation

**DEFER_SETUP — PREREQUISITE_PROBE**

Current WebGL2 path uploads uncompressed R8 planes/RGBA; no Hap packet parser/Snappy-to-BC1 representation or compressed texture upload exists. Source report does not verify current GPU S3TC.

Contract: Retained exact BC1 blocks from raw/Snappy Hap and correct qualified GPU output, no hidden RGBA expansion.

Next bounded test / reopening condition: Scope one source packet unwrap plus S3TC capability query, then a single BC1 frame upload against reference if destination is available.

Evidence: [work/batch_a/audits/R172.keep-hap-bc1-compressed-to-presentation.md](work/batch_a/audits/R172.keep-hap-bc1-compressed-to-presentation.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R193.tiled-heic-through-browser-video-decoding

**DEFER_SETUP — PREREQUISITE_PROBE**

HEVC decode configuration exists but no HEIC item graph, tile extraction or tile compositor. Historical missing encoder/API is not a current probe; the necessary coded tiled fixture and adapter are not supplied here.

Contract: All independently decodable HEVC tile identities, positioning/crop/color and complete composed image.

Next bounded test / reopening condition: Acquire one genuine two-by-two tiled HEIC and reference composition; validate item graph and tile access units before browser decode.

Evidence: [work/batch_a/audits/R193.tiled-heic-through-browser-video-decoding.md](work/batch_a/audits/R193.tiled-heic-through-browser-video-decoding.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R195.prepared-texture-video-to-several-gpu-destinations

**DEFER_SETUP — PREREQUISITE_PROBE**

The existing presenter has no Basis/ETC1S transcoder or compressed-destination selection. Prepared sequence authoring plus two admitted GPU formats is a separate representation pipeline.

Contract: Same prepared texture sequence correctly transcoded to at least two actual compressed GPU destinations, bounded resources.

Next bounded test / reopening condition: Establish one trusted Basis/ETC1S frame plus reference transcoder and two destination capability gates before sequence playback.

Evidence: [work/batch_a/audits/R195.prepared-texture-video-to-several-gpu-destinations.md](work/batch_a/audits/R195.prepared-texture-video-to-several-gpu-destinations.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R205.multicore-ffv1-without-shared-address-space-state

**DEFER_SETUP — SOURCE_REVIEW**

Software engine owns one demux/decode presentation; no independent FFV1 region task/composition layer exists. The report's four pre-encoded quadrants are not slices extracted from one FFV1 stream.

Contract: Exact reconstruction from explicitly prepared independent FFV1 regions; account preparation size and process/worker cost.

Next bounded test / reopening condition: First settle prepared-quadrant versus original-bitstream scope; for prepared scope define one frame assembly oracle and four bounded independent decoder owners.

Evidence: [work/batch_a/audits/R205.multicore-ffv1-without-shared-address-space-state.md](work/batch_a/audits/R205.multicore-ffv1-without-shared-address-space-state.md)

## R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately

**DEFER_SETUP — SOURCE_REVIEW**

Current output supports speaker-channel counts 2/6/8; it does not parse Opus Ambisonic ordering/normalization or render a sound field. Channel count alone is not spatial semantics.

Contract: Qualified decoded components with explicit Ambisonic ordering/normalization and specified spatial render; distinguish stereo from physical output.

Next bounded test / reopening condition: Supply one tiny Opus Ambisonic component/reference set and verify ordering/normalization as a component before a spatial-rendering owner.

Evidence: [work/batch_a/audits/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately.md](work/batch_a/audits/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately.md)

## R275.av1-large-scale-tile-viewport-decode

**DEFER_SETUP — SOURCE_REVIEW**

AV1 configuration is a full-frame WebCodecs destination and there is no large-scale-tile selection API/decoder adapter. Host libaom selected-tile result cannot establish browser sparse decode.

Contract: Explicit prepared large-scale-tile source and exact requested tile region, not arbitrary AV1 viewport decode.

Next bounded test / reopening condition: Locate an existing matching libaom tile-selection build and prepared fixture; validate one tile against full-frame crop before considering Wasm integration.

Evidence: [work/batch_a/audits/R275.av1-large-scale-tile-viewport-decode.md](work/batch_a/audits/R275.av1-large-scale-tile-viewport-decode.md)

## R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding

**DEFER_SETUP — SOURCE_REVIEW**

AV1 handling reads configuration and copies selected packets; it has no operating-point mask/dependency parser or OBU extractor. Temporal_id alone is insufficient.

Contract: Explicit lower-rate request retains exact selected pictures at original presentation times and duration/audio alignment.

Next bounded test / reopening condition: Author one genuinely two-temporal-layer AV1 with reference selected operating point; prove access-unit/config dependency closure before mux or browser route.

Evidence: [work/batch_a/audits/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding.md](work/batch_a/audits/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding.md)

## R019.extract-embedded-ass-while-leaving-video-native

**DEFER_SETUP — SOURCE_REVIEW**

External ASS overlay exists but embedded subtitles explicitly require mpv. Remux only exposes audio/video tracks; bounded embedded cue/header/font extraction and seek timestamp mapping are absent.

Contract: Authored ASS rendering, selected track/private header/fonts, active cue at distant seek; no full-source scan prerequisite.

Next bounded test / reopening condition: Define one Matroska ASS extraction adapter with a strict read budget using an attached-font reference; compare cue/font/timestamp assets to mpv before admission.

Evidence: [work/batch_a/audits/R019.extract-embedded-ass-while-leaving-video-native.md](work/batch_a/audits/R019.extract-embedded-ass-while-leaving-video-native.md)

## R020.render-bitmap-subtitles-without-burning-them-into-video

**DEFER_SETUP — SOURCE_REVIEW**

Existing Native overlay is libass-specific and embedded subtitle admission remains mpv. PGS palette/RLE/display-clear state needs its own bounded decoder and checkpoint owner; text/ASS conversion is not equivalent.

Contract: Exact PGS palette rectangles, forced flags, display/clear lifetimes, geometry and active-display seek with bounded memory.

Next bounded test / reopening condition: Scope one PGS display/clear decoder component against mpv bitmap output before native overlay plumbing.

Evidence: [work/batch_a/audits/R020.render-bitmap-subtitles-without-burning-them-into-video.md](work/batch_a/audits/R020.render-bitmap-subtitles-without-burning-them-into-video.md)

## R031.raw-aac-mp3-audio-beside-fragmented-video

**DEFER_SETUP — SOURCE_REVIEW**

The maintained selector negotiates one common MP4/WebM MIME; split lanes are tied to windowed adaptation, not generated-timestamp raw AAC. Historical AAC payload equality leaves priming/offset lifetime integration unresolved.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Implement only a research raw-ADTS lane adapter around existing packet output; compare the same AAC access units against fMP4 at a nonzero audio offset, then seek and drain.

Evidence: [work/batch_b/audits/R031.raw-aac-mp3-audio-beside-fragmented-video.md](work/batch_b/audits/R031.raw-aac-mp3-audio-beside-fragmented-video.md), [sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)

## R032.use-different-output-containers-for-different-tracks

**DEFER_SETUP — SOURCE_REVIEW**

Common-container negotiation excludes H264/Vorbis while mixed H264-MP4 and Opus-WebM has only historical source evidence. Independent per-track packaging requires a new finite-plan producer contract.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Prototype one H264/Opus mixed pair without changing admission; compare packet hashes, codec delay and selected audio after seek against all-MP4.

Evidence: [work/batch_b/audits/R032.use-different-output-containers-for-different-tracks.md](work/batch_b/audits/R032.use-different-output-containers-for-different-tracks.md), [sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)

## R046.a-small-javascript-ordinary-mp4-to-mse-adapter

**DEFER_SETUP — SOURCE_REVIEW**

The existing JS parser is bounded metadata admission and the splitter accepts already-fragmented output; neither constructs ordinary-MP4 sample tables. The historical adapter loses the first B-frame/edit boundary relative to direct playback.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Recover or implement only the narrow adapter and repair the documented first-frame edit/preroll mismatch before testing startup; use malformed box size as adverse input.

Evidence: [work/batch_b/audits/R046.a-small-javascript-ordinary-mp4-to-mse-adapter.md](work/batch_b/audits/R046.a-small-javascript-ordinary-mp4-to-mse-adapter.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders

**DEFER_SETUP — SOURCE_REVIEW**

The maintained build enables PCM/FLAC/DCA decoders, not ALAC or TrueHD. Historical host exactness is useful but is not a matching Wasm artifact or current browser necessity test.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: First query unchanged direct ALAC stereo playback on one fixture; only if rejected add ALAC to a separate experimental decoder build and compare exact PCM. TrueHD remains separate.

Evidence: [work/batch_b/audits/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders.md](work/batch_b/audits/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## R058.change-video-codec-while-retaining-the-audio-presentation

**DEFER_SETUP — SOURCE_REVIEW**

Current restart recreates MediaSource and native packet copying rejects changed configuration. No video-only epoch commit/rollback path exists; the historical changeType demonstration does not supply that owner.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Create a research two-epoch H264/VP9 transition harness preserving one AAC buffer; include unsupported destination rollback and backward seek.

Evidence: [work/batch_b/audits/R058.change-video-codec-while-retaining-the-audio-presentation.md](work/batch_b/audits/R058.change-video-codec-while-retaining-the-audio-presentation.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## R059.construct-a-selected-track-mp4-view-without-remuxing-samples

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Direct local playback already consumes a File Blob, so an equal-size metadata view could avoid remux for explicit alternate audio. Existing cheap inspection rejects extra tracks and does not edit moov; this is a concrete bounded new capability.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Build one isolated equal-size trak-to-free view for the existing two-audio MP4; independently compare mdat/selected packet identity and tone after seek, with tref rejection.

Evidence: [work/batch_b/audits/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md](work/batch_b/audits/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## R060.extract-in-band-closed-captions-from-compressed-video-headers

**DEFER_SETUP — SOURCE_REVIEW**

Current subtitle admission represents separate tracks, and NativeASS consumes external ASS. There is no inspected A53 extraction plus stateful CEA608 owner; historical source explicitly lacked a trusted in-band fixture.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Obtain one independently validated caption-bearing H264 sample and decoder oracle, then audit extraction preserving original NAL bytes and active caption state after seek.

Evidence: [work/batch_b/audits/R060.extract-in-band-closed-captions-from-compressed-video-headers.md](work/batch_b/audits/R060.extract-in-band-closed-captions-from-compressed-video-headers.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## R065.isolate-a-selected-program-from-multi-program-transport-streams

**DEFER_SETUP — SOURCE_REVIEW**

Track metadata exposes stream IDs but no program/PID mapping. Existing TS AAC normalization is useful reusable setup, yet a requested program cannot currently be represented as a stable playback selection.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Add research-only program mapping for one two-program TS, select the H264/AAC program and compare packets after reversing PMT declaration order.

Evidence: [work/batch_b/audits/R065.isolate-a-selected-program-from-multi-program-transport-streams.md](work/batch_b/audits/R065.isolate-a-selected-program-from-multi-program-transport-streams.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1

**DEFER_SETUP — SOURCE_REVIEW**

Current packaging emits AVC avc1 contracts and rejects new extradata; no configuration-epoch path exists. Historical avc3 media-only dimension transitions are plausible but do not make the maintained guard redundant.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Compare one avc1/new-init reference with legal avc3 repeated SPS/PPS at a RAP, seek both sides and remove epoch-B SPS/PPS as the adverse control.

Evidence: [work/batch_b/audits/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1.md](work/batch_b/audits/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1.md), [sources/proposals/R88-R101-research-backlog.md](sources/proposals/R88-R101-research-backlog.md)

## R092.normalize-vp9-codec-units-for-the-actual-destination

**DEFER_SETUP — SOURCE_REVIEW**

Current VP9 code derives configuration from key headers and submits packet bytes directly; it does not split superframes. Historical generated fixtures contained no hidden-frame/superframe feature, so repeating them cannot decide this card.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Provision one tiny pinned superframe/hidden-reference sample; verify constituent frames, shown output and timestamps before a split/merge destination comparison.

Evidence: [work/batch_b/audits/R092.normalize-vp9-codec-units-for-the-actual-destination.md](work/batch_b/audits/R092.normalize-vp9-codec-units-for-the-actual-destination.md), [sources/proposals/R88-R101-research-backlog.md](sources/proposals/R88-R101-research-backlog.md)

## R110.choose-a-destination-aware-lacing-or-unlacing-representation

**INCONCLUSIVE — SOURCE_REVIEW**

The maintained FFmpeg demux/remux boundary already reconstructs WebM output, while original direct playback preserves source packaging. Whether its emitted blocks already satisfy this exact unlacing mechanism is not established from these owners alone.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Inspect one known laced Opus file through existing remux, compare recovered packet boundaries and trim metadata, then append output with a malformed lace control.

Evidence: [work/batch_b/audits/R110.choose-a-destination-aware-lacing-or-unlacing-representation.md](work/batch_b/audits/R110.choose-a-destination-aware-lacing-or-unlacing-representation.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## R115.play-an-ongoing-fmp4-response-through-one-native-url

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Uncontrolled permitted HTTP file URLs already reach the native element. That owner can exercise progressive finite fMP4 without a new playback backend; earlier complete-Blob runs do not test response-open output.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Reuse the server with one fMP4 response held open after its first fragment; require first frame and audio before EOF, then delayed-fragment resume and clean closure against identical MSE bytes.

Evidence: [work/batch_b/audits/R115.play-an-ongoing-fmp4-response-through-one-native-url.md](work/batch_b/audits/R115.play-an-ongoing-fmp4-response-through-one-native-url.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## R001.share-source-reads-and-inspection-across-candidates

**DEFER_SETUP — IMPORTED_LOCAL_EVIDENCE**

Reported duplicate requested reads total only 1.455–3.185 ms; an authority-safe cache/handoff remains E3, not a missing-report gate. Actual local raw records and prior manifest identity were inspected in this v4 import.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Demonstrated larger repeated-read cost or reusable ownership infrastructure.

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## R002.promote-useful-startup-work-instead-of-reopening

**ALREADY_IMPLEMENTED — IMPORTED_LOCAL_EVIDENCE**

The accepted prepared backend is retained and later play invokes the same session backend, followed by output verification. This directly addresses the retained-candidate portion; optional metadata deferral and cross-backend sharing are not established. Imported direct-local-04: retainedPreparation.surface and backend are true, direct lifecycle and missing-video rejection pass, workersAfter is zero. Confirms the narrow existing prepared-session promotion; no optional metadata or cross-backend sharing claim.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: No repeat startup benchmark; reopen only with an observed redundant reconstruction in a different admitted preparation path.

Evidence: [work/batch_b/audits/R002.promote-useful-startup-work-instead-of-reopening.md](work/batch_b/audits/R002.promote-useful-startup-work-instead-of-reopening.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [work/reconciliation/local-identity.json](work/reconciliation/local-identity.json), [evidence/imports/reconciled__runs__direct-local-04__result.json](evidence/imports/reconciled__runs__direct-local-04__result.json)

## R003.coalesce-range-reads-around-useful-media-boundaries

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Reads already use cached windows (64KiB in the actual native-remux source worker; the generic RangeReader default is 256KiB) anchored at requested offsets, avoiding one request per AVIO call. Adaptive metadata/keyframe-aware sizing is absent; value requires a controlled latency trace against this actual baseline, not a deliberately tiny reader.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Replay one tail-moov and distant-seek trace with current windows versus one bounded adaptive window policy; count abandoned and useful bytes and include ETag replacement.

Evidence: [work/batch_b/audits/R003.coalesce-range-reads-around-useful-media-boundaries.md](work/batch_b/audits/R003.coalesce-range-reads-around-useful-media-boundaries.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [work/batch_e/r003-baseline-correction.md](work/batch_e/r003-baseline-correction.md)

## R018.cache-prepared-media-by-timeline-and-transformation-recipe

**DEFER_SETUP — SOURCE_REVIEW**

Existing buffered seeking reuses live MSE ranges with RAP/owner checks, but restart clears segments and workers. A prepared-fragment replay cache would need a new immutable recipe/source key and byte eviction ownership.

Contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Next bounded test / reopening condition: Specify a single-source two-interval research cache keyed by selected tracks, runtime recipe and source identity; prove a changed ETag miss before any performance comparison.

Evidence: [work/batch_b/audits/R018.cache-prepared-media-by-timeline-and-transformation-recipe.md](work/batch_b/audits/R018.cache-prepared-media-by-timeline-and-transformation-recipe.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## R021.cache-subtitle-tiles-and-schedule-only-useful-redraws

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Unchanged libass responses already skip rasterization; changed responses allocate ImageData and OffscreenCanvas for every tile. Exact tile reuse is a narrower observable gap than inventing an ASS next-change parser.

Contract: Independent rendering or browser-owned reference appropriate to the same contract, including hidden state, timing, ordering and clear events.

Next bounded test / reopening condition: Instrument existing tile updates for static text and karaoke; trial one bounded exact tile cache keyed by bytes/color/geometry and render revision, comparing pixels after paused resize.

Evidence: [work/batch_b/audits/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md](work/batch_b/audits/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## R026.replace-polling-chains-with-bounded-credits-and-deadlines

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Remux uses a 50ms pump interval despite message/update-driven work; decoder already has dequeue/wait wakeups. There is a concrete one-owner timer boundary to measure, not evidence for replacing all scheduling.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Count remux pump calls while paused/full and after delayed updateend; replace only redundant periodic wakeups with event plus deadline scheduling, then cancel a blocked read.

Evidence: [work/batch_b/audits/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md](work/batch_b/audits/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## R027.share-immutable-compiled-code-not-live-playback-state

**ADVANCE_CONFIRMATION — IMPORTED_LOCAL_EVIDENCE**

Reported maintained-reference startup suite saving 14.10%; 95% interval 9.89–18.39% straddles the 10% threshold. Functional prototype exists, but raw evidence and production ownership are not independently rechecked here. Actual local raw records and prior manifest identity were inspected in this v4 import.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Later cache/asset/memory/cancellation confirmation; do not automatically start a large confirmation campaign during breadth-first screening.

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## R040.coalesce-scrub-requests-and-commit-the-final-exact-seek

**STOP_PROFILE — IMPORTED_LOCAL_EVIDENCE**

The maintained slider input updates UI only; change commits a single exact seek. The proposed intermediate preview coalescer has no repeated backend seek work to remove in this UI profile. Imported direct-local-04 maintained component scrub: beforeCommit is empty, sole committed call and final position are 7.3, passed true. Existing input/change separation leaves no repeated backend preview work in this profile.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: No new adapter for the present slider; if live backend previews are added, replay reversal and release-during-pending gestures with exact final target.

Evidence: [work/batch_b/audits/R040.coalesce-scrub-requests-and-commit-the-final-exact-seek.md](work/batch_b/audits/R040.coalesce-scrub-requests-and-commit-the-final-exact-seek.md), [sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md), [work/reconciliation/local-identity.json](work/reconciliation/local-identity.json), [evidence/imports/reconciled__runs__direct-local-04__result.json](evidence/imports/reconciled__runs__direct-local-04__result.json)

## R047.assemble-output-as-headers-plus-original-payload-views

**ALREADY_IMPLEMENTED — IMPORTED_LOCAL_EVIDENCE**

The current dirty worker reuses a sole full owned ArrayBuffer and gathers all other cases. This is only the previously adopted narrow owned-buffer slice, not general scatter/gather or elimination of native mux copies. Current worker hash matches the prior isolated qualified worker. Imported exact captured output and append sizes match for both profiles; application gather bytes decrease 96.20% on the small fixture but only 8.96% on the movie, below its 25% value gate. Prior 100-cycle/1801.927-second run is retained historical evidence, not a v4 execution. Broad scatter/gather, CPU savings and production qualification are not established.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Keep broad scatter/gather deferred unless multiple-piece gather pressure is measured; compare extra append calls and backing retention before adding views.

Evidence: [work/batch_b/audits/R047.assemble-output-as-headers-plus-original-payload-views.md](work/batch_b/audits/R047.assemble-output-as-headers-plus-original-payload-views.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md), [work/reconciliation/local-identity.json](work/reconciliation/local-identity.json), [evidence/imports/reconciled__runs__r47-endurance-01__result.json](evidence/imports/reconciled__runs__r47-endurance-01__result.json), [evidence/imports/reconciled__runs__engine-baseline__r47-comparison.json](evidence/imports/reconciled__runs__engine-baseline__r47-comparison.json), [evidence/imports/reconciled__runs__engine-baseline__r47-real-media-comparison.json](evidence/imports/reconciled__runs__engine-baseline__r47-real-media-comparison.json)

## R048.keep-only-the-relevant-native-caption-cues-instantiated

**DEFER_SETUP — IMPORTED_LOCAL_EVIDENCE**

Browser comparison resolved the cue-boundary oracle discrepancy; this is not a cue virtualization defect. Virtualization still needs an API/lifecycle design. Actual local raw records and prior manifest identity were inspected in this v4 import.

Contract: Independent rendering or browser-owned reference appropriate to the same contract, including hidden state, timing, ordering and clear events.

Next bounded test / reopening condition: Real large-cue overhead plus a bounded API-compatible design; do not re-open the explained boundary mismatch as a bug.

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Producer lookahead uses fixed five media seconds and 12MiB, while playback rate is adjustable. Slow playback can therefore retain more wall-time work; historical source warns producer-limited fast playback may not improve.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Run one bounded 0.5x stop trace and one 4x rate jump with fixed versus rate-aware lookahead, keeping minimum reserve, 12MiB cap and output identical.

Evidence: [work/batch_b/audits/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md](work/batch_b/audits/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## R066.communicate-the-requested-start-position-before-first-data-preparation

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Direct load awaits loadeddata and candidate setup settles at zero before seeking a nonzero target. The desired target is available in caller scope but is not propagated to initial native load.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Pass a research target only to direct source initialization; compare earliest correct frame and actual range reads on one nonzero resume plus zero-start and immediate-replacement controls.

Evidence: [work/batch_b/audits/R066.communicate-the-requested-start-position-before-first-data-preparation.md](work/batch_b/audits/R066.communicate-the-requested-start-position-before-first-data-preparation.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## R069.separate-decoder-compatibility-from-per-source-initialization-identity

**STOP_PROFILE — SOURCE_REVIEW**

Current configure-after-reset accompanies software flush, replay/keyframe/recovery invalidation and decoder close. A same-byte fingerprint cannot remove that semantic reset; changed extradata already rejects/falls back.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Only instrument a separately observed wrapper-only configure boundary if one appears; do not skip reset on codec-byte equality.

Evidence: [work/batch_b/audits/R069.separate-decoder-compatibility-from-per-source-initialization-identity.md](work/batch_b/audits/R069.separate-decoder-compatibility-from-per-source-initialization-identity.md), [sources/proposals/Demuxe_R58_R69_Research_Backlog.md](sources/proposals/Demuxe_R58_R69_Research_Backlog.md)

## R074.skip-redundant-packed-pcm-staging

**STOP_PROFILE — IMPORTED_LOCAL_EVIDENCE**

Reported exact packed-lossless Wasm prototype; seven complete-operation pairs were -0.80% saving (95% interval -2.97% to +1.23%) against a predeclared 5% gate. Observer-free deployment not established. Actual local raw records and prior manifest identity were inspected in this v4 import.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Reopen for a different demonstrated workload, memory outcome or materially changed implementation; do not repeat the same seven-pair CPU screen.

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## R100.transfer-owned-packet-storage-into-webcodecs-chunks

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Normal packet input aliases shared Wasm memory and cannot be transferred; fallback slices and prefixed key packets own standalone arrays. Those branches currently still construct chunks without transfer, leaving a narrow second-copy opportunity.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Feature-test constructor detachment then use transfer only for full owned buffers in a research worker; compare chunk bytes and decoded timestamps with shared-heap and oversized-subview rejection controls.

Evidence: [work/batch_b/audits/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md](work/batch_b/audits/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md), [sources/proposals/R88-R101-research-backlog.md](sources/proposals/R88-R101-research-backlog.md)

## R118.mse-append-window-clipping-report-paragraph-label.report-frontier

**STOP_PROFILE — SOURCE_REVIEW**

Ordinary playback uses segments and RAP-aware eviction, with no requested clip contract. Append-window clipping does not avoid transport/parsing work and would drop required coded output if added as a general optimization.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: When trimming is explicitly requested, compare append-window output boundaries against an independent clip oracle and count unchanged received bytes.

Evidence: [work/batch_b/audits/R118.mse-append-window-clipping-report-paragraph-label.report-frontier.md](work/batch_b/audits/R118.mse-append-window-clipping-report-paragraph-label.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R119.canonicalize-equivalent-decoder-configurations

**DEFER_SETUP — SOURCE_REVIEW**

The codec adapter reads AVC configuration/prefixes but does not prove parameter-set semantic equivalence. Exact extradata comparison conservatively guards changed decode state; safe canonicalization requires bitstream analysis beyond this parser.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Define one constrained parameter-set equivalence transform with independently decoded pictures and unchanged slice references; include same-ID changed-SPS rejection.

Evidence: [work/batch_b/audits/R119.canonicalize-equivalent-decoder-configurations.md](work/batch_b/audits/R119.canonicalize-equivalent-decoder-configurations.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R119.mse-future-range-replacement-report-paragraph-label.report-frontier

**DEFER_SETUP — SOURCE_REVIEW**

Existing SourceBuffer removal is old-range eviction, not transactional future content replacement. There is no replacement epoch/rollback owner; source replacement currently starts a fresh generation.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Specify one same-source explicit future-edit transaction at a RAP, remove only unpresented range and append a distinct clip, with cancellation before commit.

Evidence: [work/batch_b/audits/R119.mse-future-range-replacement-report-paragraph-label.report-frontier.md](work/batch_b/audits/R119.mse-future-range-replacement-report-paragraph-label.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R122.retime-existing-frames-without-creating-new-pictures.report-frontier

**STOP_PROFILE — SOURCE_REVIEW**

Packet remux preserves source timebases and frame-rate declarations; ordinary playback requests original timing. Retiming existing pictures is an altered-output contract, not a transparent optimization for this campaign profile.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: For an explicitly requested sparse/held presentation, change only sample timing in a three-frame fixture and compare payloads, frame count and duration.

Evidence: [work/batch_b/audits/R122.retime-existing-frames-without-creating-new-pictures.report-frontier.md](work/batch_b/audits/R122.retime-existing-frames-without-creating-new-pictures.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R124.copy-a-frame-once-to-free-the-decoder

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

The retained presenter keeps a held VideoFrame for redraw until replacement; that can hold a decoder surface. Bounded queue sizes alone do not establish surface pressure or justify copying every frame.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Count held-frame lifetime during pause and a long display interval; compare copying only that held output to owned storage against direct retention, including copy/conversion cost and redraw pixels.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_b/audits/R124.copy-a-frame-once-to-free-the-decoder.md](work/batch_b/audits/R124.copy-a-frame-once-to-free-the-decoder.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier

**STOP_PROFILE — SOURCE_REVIEW**

The maintained mux preserves codec initial padding and compensates coded WebM interleaving; arbitrary extra negative DiscardPadding would compose with existing delay. The cited historical 96072-sample counterexample rejects the naive standalone crop variant, not all legal head cropping.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Only revisit with an explicit trim request and a model combining CodecDelay, pre-skip and DiscardPadding; compare exact head/tail samples.

Evidence: [work/batch_b/audits/R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier.md](work/batch_b/audits/R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R125.buffer-according-to-predicted-decode-work

**DEFER_SETUP — SOURCE_REVIEW**

Current native buffering sees media horizons and byte bounds; opaque native decoder work is not predicted. WebCodecs queue counts also lack a parser-visible per-region complexity estimator. The proposal needs a new estimator plus calibration before changing scheduling.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Capture one difficult-region trace with parser features and actual decode deadlines, estimate predictive value offline within fixed byte budgets before a controller change.

Evidence: [work/batch_b/audits/R125.buffer-according-to-predicted-decode-work.md](work/batch_b/audits/R125.buffer-according-to-predicted-decode-work.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier

**INCONCLUSIVE — SOURCE_REVIEW**

Current WebM mux forwards avg_frame_rate/r_frame_rate and uses persistent FFmpeg mux output, but this source audit does not establish whether emitted DefaultDuration is present or whether partial appends stall. The report is a metadata holdback observation, distinct from R125 decode-work prediction.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Inspect one emitted VP8 WebM header and first-block append; remove only DefaultDuration as adverse control while keeping payload/release schedule identical.

Evidence: [work/batch_b/audits/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier.md](work/batch_b/audits/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R126.find-where-hardware-decoding-loses-on-short-jobs

**DEFER_SETUP — SOURCE_REVIEW**

WebCodecs support/configuration and retained output are present, but there is no same-contract thumbnail/preview job harness comparing qualified implementations and actual acceleration. Preference fields are not hardware evidence.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Define one complete short decode-to-output job with config/extraction/cleanup for existing browser and software paths; first prove identical output, then compare a few job lengths.

Evidence: [work/batch_b/audits/R126.find-where-hardware-decoding-loses-on-short-jobs.md](work/batch_b/audits/R126.find-where-hardware-decoding-loses-on-short-jobs.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier

**DEFER_SETUP — SOURCE_REVIEW**

The source demonstrates WebM/VP9 to MP4/VP9 changeType within one SourceBuffer, but current negotiation selects one packaging for a generation; it does not expose a same-source bytestream transition. A switching contract and transition owner are prerequisites, rather than an absent report or failed browser API.

Contract: One VP9 SourceBuffer changes WebM to MP4 bytestream with continuing ordered pictures, audio if requested, and unchanged timeline; replacement/cancel cannot publish old epochs.

Next bounded test / reopening condition: Define one explicit VP9 bytestream transition using the current generation owner, then append two short independently valid epochs with a rejected incompatible-init control.

Evidence: [work/batch_c/audits/R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier.md](work/batch_c/audits/R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier.md)

## R131.global-mp4-sidx-materially-changes-remote-access.report-frontier

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

The recovered report removes the old source gate. Native direct delegates remote access to the media loader, so global sidx can affect actual transferred bytes; controlled-fetch remux is a separate route. Current RangeReader validates identities but cannot give a browser-native loader an index absent from the file.

Contract: Same fMP4 coded samples, timestamps and requested tracks, authorized remote identity, cold metadata plus exact target seek.

Next bounded test / reopening condition: Use the existing local HTTP harness for one same-payload indexed/nonindexed fMP4 pair and one seek; record metadata-ready and total seek bytes, first target picture, ETag change rejection on the controlled route separately.

Evidence: [work/batch_c/audits/R131.global-mp4-sidx-materially-changes-remote-access.report-frontier.md](work/batch_c/audits/R131.global-mp4-sidx-materially-changes-remote-access.report-frontier.md)

## R135.microfragment-size-versus-startup-bytes.report-continuity

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

Current maintained native mux defaults its first fragment to 0.5 s and subsequent fragments to 0.5 s, with actual packet-boundary constraints. The report compares 2 s with 500 ms; adopting that exact interval is not a new missing change here. This does not assert every output fragment has exact 500 ms duration.

Contract: Same native packet-copy tracks/configuration/PTS/DTS and playable random-access dependencies under current 0.5-second fragmentation.

Next bounded test / reopening condition: Reopen only for a workload where measured first playable bytes remain dominated by current fragment completion; compare a single smaller bound without changing random-access requirements.

Evidence: [work/batch_c/audits/R135.microfragment-size-versus-startup-bytes.report-continuity.md](work/batch_c/audits/R135.microfragment-size-versus-startup-bytes.report-continuity.md)

## R140.cue-less-webm-native-seek.report-continuity

**STOP_PROFILE — SOURCE_REVIEW**

For the stated sparse remote-seek goal, the full report already describes an entire-resource scan despite correct target pictures. Direct loading still delegates indexing to the browser and the reader cannot invent missing Cues. This is a source-level rejection of using indexless seek as a sparse strategy, not a newly executed negative experiment.

Contract: Cue-less WebM seek reaches the requested frame and all requested tracks without claiming sparse access from functional seek alone.

Next bounded test / reopening condition: Reopen with an indexed source or independently evidenced browser behavior that avoids scanning; measure all bytes from cold metadata acquisition through the same seek.

Evidence: [work/batch_c/audits/R140.cue-less-webm-native-seek.report-continuity.md](work/batch_c/audits/R140.cue-less-webm-native-seek.report-continuity.md)

## R144.compile-simple-ass-animations-into-reusable-timeline-programs

**DEFER_SETUP — SOURCE_REVIEW**

Native ASS renders through libass and skips unchanged bitmap replies. Compiled fade/clip programs require a new admitted ASS parser/subset and exact blend/ordering oracle; unchanged-image suppression does not implement animation programs.

Contract: Supported ASS fade/clip subset matches libass glyph masks, blend ordering and rounding with identical fonts/layout at seeks.

Next bounded test / reopening condition: Select one fade-only cue and document mask reuse and libass rounding at three times plus a seek before creating any compiler.

Evidence: [work/batch_c/audits/R144.compile-simple-ass-animations-into-reusable-timeline-programs.md](work/batch_c/audits/R144.compile-simple-ass-animations-into-reusable-timeline-programs.md)

## R144.evict-through-a-paused-current-position.report-continuity

**STOP_PROFILE — SOURCE_REVIEW**

Current eviction deliberately retains three seconds and RAP dependencies. The report proves only persistence of the paused displayed image after removal, explicitly not decoder resume. Removing current-position compressed coverage cannot meet ordinary pause/resume and seek semantics from this evidence.

Contract: Paused displayed frame remains correct and resumed audio/video can recover exact timing after current-region eviction.

Next bounded test / reopening condition: Reopen for an explicit long-pause memory contract with a bounded reappend plan; compare paused display and resumed A/V after removal at one non-RAP position.

Evidence: [work/batch_c/audits/R144.evict-through-a-paused-current-position.report-continuity.md](work/batch_c/audits/R144.evict-through-a-paused-current-position.report-continuity.md)

## R162.compile-a-qualified-mux-configuration-into-a-small-patch-program

**DEFER_SETUP — SOURCE_REVIEW**

Maintained output is FFmpeg-authored fMP4 with copied codec parameters and explicit interleaving. There is no validated stable-layout patch program or immutable sample recipe owner. Introducing a specialized writer is E3 until a concrete writer cost and restricted layout are identified.

Contract: Stable fMP4 specialization preserves packet bytes, configuration, counts, offsets and PTS/DTS and rejects changed layouts.

Next bounded test / reopening condition: Capture one current fragment and specify lengths, tfdt, counts and offset patch fields; compare independently parsed output and mutate one offset before proposing a runtime writer.

Evidence: [work/batch_c/audits/R162.compile-a-qualified-mux-configuration-into-a-small-patch-program.md](work/batch_c/audits/R162.compile-a-qualified-mux-configuration-into-a-small-patch-program.md)

## R169.make-custom-presentation-aware-of-display-cadence

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Retained presentation uses engine-selected source PTS and deadlines but schedules via setTimeout; there is no observed display-opportunity feedback in that owner. A narrow cadence observer is possible without replacing the master clock.

Contract: Original source frames and source speed under one master clock; presentation opportunity may schedule but not interpolate or silently drop required output.

Next bounded test / reopening condition: Instrument one retained playback at mismatched source/display cadence, keeping engine deadlines; compare actual displayed frame identities with scheduled identities and pause/seek cancellation.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_c/audits/R169.make-custom-presentation-aware-of-display-cadence.md](work/batch_c/audits/R169.make-custom-presentation-aware-of-display-cadence.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R170.separate-audio-clock-drift-from-an-audio-latency-jump

**DEFER_SETUP — SOURCE_REVIEW**

Current audio timing forwards a reported latency estimate and consumed media-frame count. It has neither an independent output-clock witness nor an identified drift-versus-offset estimator. Replacing mpv synchronization from those estimates alone risks competing controllers.

Contract: Separate timing slope from latency offset without changed sample count, competing controllers or unstable A/V correction.

Next bounded test / reopening condition: First define a controlled latency step versus slope disturbance and an independent timing witness; inspect the existing native audio controller before one estimator-only replay.

Evidence: [work/batch_c/audits/R170.separate-audio-clock-drift-from-an-audio-latency-jump.md](work/batch_c/audits/R170.separate-audio-clock-drift-from-an-audio-latency-jump.md)

## R188.schedule-verified-playable-data

**DEFER_SETUP — SOURCE_REVIEW**

The source validates scheduling hash-verified pieces by decodable coverage. Current source requests are synchronous demanded ranges with ETag authority, not a piece swarm or a fragment-to-piece dependency map. There is no present piece scheduler to reorder.

Contract: A playable region requires all authorized hash-verified init/media dependency pieces; corruption or canceled ownership never publishes.

Next bounded test / reopening condition: Specify one authorized verified-piece adapter and one init-plus-fragment piece map; replay existing demanded ranges against a corrupt-piece control before player integration.

Evidence: [work/batch_c/audits/R188.schedule-verified-playable-data.md](work/batch_c/audits/R188.schedule-verified-playable-data.md)

## R189.sparse-track-future-time-bounds

**STOP_PROFILE — SOURCE_REVIEW**

Native output selects only video and audio; the source model requires a selected sparse timed-metadata track blocking canonical interleave. That specific third-track bottleneck is absent from the scoped native mux. Do not remove requested sparse tracks to manufacture eligibility in another route.

Contract: Canonical mux ordering includes requested sparse metadata; future-DTS proof is valid only for source/timeline epoch.

Next bounded test / reopening condition: Reopen only when a maintained mux carries a sparse requested track and blocks on unknown future DTS; derive a source-epoch bound and inject a false bound.

Evidence: [work/batch_c/audits/R189.sparse-track-future-time-bounds.md](work/batch_c/audits/R189.sparse-track-future-time-bounds.md)

## R200.content-addressed-reuse-across-different-files

**DEFER_SETUP — SOURCE_REVIEW**

Range caching is per-source reader and decoder replay retention is mutable state tied to delivered pictures. Neither is a content-addressed closed-GOP cache across files. Coded bytes alone do not supply authorization, configuration, color and dependency identity.

Contract: Cross-file reusable closed group is immutable and keyed by authorized coded data, codec config, color and closure; file timestamps remain outside cache.

Next bounded test / reopening condition: Document an immutable closed-GOP cache key and compare one shared group across two authorized sources, changing color/configuration identity as adverse control.

Evidence: [work/batch_c/audits/R200.content-addressed-reuse-across-different-files.md](work/batch_c/audits/R200.content-addressed-reuse-across-different-files.md)

## R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness

**STOP_PROFILE — SOURCE_REVIEW**

The reported graphics reduction is an observer with worse software-GPU runtime, not a playback optimization. Current YUV presentation has no complete-frame equality readback per frame; retained pixel checks are bounded 64x64 diagnostics. There is no large recurring readback here for this replacement.

Contract: Whole-frame comparison witness must exactly match independent CPU count, max error and first mismatch on identical textures.

Next bounded test / reopening condition: Reopen for an actual whole-frame comparison workload with a physical GPU and compare exact witnesses against CPU pixels including injected faults.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_c/audits/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness.md](work/batch_c/audits/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R215.upload-operation-selected-by-existing-layout

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

YUV presenter packs every plane row into tight staging before GL upload. The report uses WebGPU operation constraints, whereas current owner is WebGL2; its 256-byte alignment example is not directly transferable. The broader layout-selected upload mechanism has a concrete copy boundary worth a GL-specific screen.

Contract: Direct existing-stride GL upload yields identical visible pixels and color with legal offsets, per-plane widths, and reset pixel-store state.

Next bounded test / reopening condition: Test one WebGL2 UNPACK_ROW_LENGTH-compatible positive stride against current packed upload using an independent pixel capture; retain packing for negative or unrepresentable strides and reset pixel-store state.

Evidence: [work/batch_c/audits/R215.upload-operation-selected-by-existing-layout.md](work/batch_c/audits/R215.upload-operation-selected-by-existing-layout.md)

## R216.one-request-for-distant-byte-ranges

**DEFER_SETUP — SOURCE_REVIEW**

RangeReader is explicitly single-flight and demands one contiguous range with strict Content-Range validation. Multipart transport would require both multi-range demand discovery and a new bounded MIME parser/capability contract; simply weakening current response checks is invalid.

Contract: Multipart fetch recovers exactly requested disjoint ranges with strong source identity, bounded parser and canceled consumers.

Next bounded test / reopening condition: Design one bounded three-region multipart decoder with exact per-part ranges and source ETag; use malformed overlapping-part and cancellation controls before coupling it to the reader.

Evidence: [work/batch_c/audits/R216.one-request-for-distant-byte-ranges.md](work/batch_c/audits/R216.one-request-for-distant-byte-ranges.md)

## R220.scoped-transport-clock-normalization

**DEFER_SETUP — SOURCE_REVIEW**

Current TS timeline work runs after FFmpeg demux, with AVC/AAC restrictions and specific timestamp repair. The report is a raw 33-bit policy model, not a live parser integration; post-demux timestamps may already be unwrapped. A second normalizer needs identified provenance before insertion.

Contract: 33-bit TS rollover normalization retains original A/V offset and reordering; ambiguous epoch or unmarked discontinuity rejects.

Next bounded test / reopening condition: Trace raw-versus-demuxed timestamps for a single rollover plus discontinuity fixture and locate one authoritative epoch owner before trying the bounded ±2 s policy.

Evidence: [work/batch_c/audits/R220.scoped-transport-clock-normalization.md](work/batch_c/audits/R220.scoped-transport-clock-normalization.md)

## R221.gpu-intermediate-lifetime-planning

**STOP_PROFILE — SOURCE_REVIEW**

The scoped presenter owns three YUV textures and one overlay, not the effect graph with multiple transient intermediates and delayed preview consumers in the report. Existing textures have distinct simultaneous roles; allocating by symbolic liveness cannot save the reported graph memory here.

Contract: Compatible GPU texture storage is reused only after the final consumer, including delayed preview and resolution transitions.

Next bounded test / reopening condition: Reopen when a real multi-pass GPU graph exists; capture last-consumer fences for one intermediate and a delayed preview before considering compatible reuse.

Evidence: [work/batch_c/audits/R221.gpu-intermediate-lifetime-planning.md](work/batch_c/audits/R221.gpu-intermediate-lifetime-planning.md)

## R222.independently-checkable-remux-construction-record

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Existing test source already compares packet payload hashes and relative timing, but does not show a reusable construction record binding source offsets, output offsets, config and identities with all five report mutations. This is a bounded oracle extension, not a mux speedup or executed validation.

Contract: Independent remux record binds source/output identity, packet offsets/hashes/config and relative timing; five malformed records must reject.

Next bounded test / reopening condition: Extend one retained small capture with source/output packet positions and config hashes; independently reject wrong offset, swapped payload, timing, config and stale source identity records.

Evidence: [work/batch_c/audits/R222.independently-checkable-remux-construction-record.md](work/batch_c/audits/R222.independently-checkable-remux-construction-record.md)

## R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Current mux outputs MP4/WebM and filters selected AV streams; it does not emit MPEG-TS. The reported selected-track payload preservation is relevant but transport PAT/PMT/PCR/continuity reconstruction is a distinct missing output route.

Contract: TS selected-track pruning preserves all selected AV packet payloads and timestamps plus coherent PAT/PMT/PID/PCR/continuity.

Next bounded test / reopening condition: First identify an explicit TS consumer and scope one host packet-preservation construction against original selected packet hashes, with broken continuity/PMT as control.

Evidence: [work/batch_c/audits/R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity.md](work/batch_c/audits/R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity.md)

## R230.exact-mp3-seek-closure.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Native adaptation admits restricted integer PCM/FLAC/DTS profiles, not an MP3 exact-seek closure feature; browser video recovery does not provide an audio reservoir bound. A two-frame MP3 closure cannot be generalized from the single report fixture.

Contract: MP3 target PCM suffix matches the continuous decoder including delay/priming; preroll is profile-specific, not fixed universally.

Next bounded test / reopening condition: Find the maintained software MP3 seek owner and compare one existing MP3 target against continuous decoded PCM with 0/1/2-frame preroll, including encoder delay handling.

Evidence: [work/batch_c/audits/R230.exact-mp3-seek-closure.report-continuity.md](work/batch_c/audits/R230.exact-mp3-seek-closure.report-continuity.md)

## R233.make-independently-resampled-audio-chunks-join-exactly

**DEFER_SETUP — SOURCE_REVIEW**

The maintained local adaptation path explicitly performs no resampling and retains continuous FIFO state. Independent absolute-output-index jobs would require a separate admitted resampler/job interface; the rational toy report does not describe libswresample state equivalence.

Contract: Partitioned audio jobs match the same continuous resampler sample count, phase, edge delay and required numerical output using absolute output intervals.

Next bounded test / reopening condition: Identify a real independently partitioned resampling consumer; compare one irregular partition including edges, halo and global phase against that same continuous resampler.

Evidence: [work/batch_c/audits/R233.make-independently-resampled-audio-chunks-join-exactly.md](work/batch_c/audits/R233.make-independently-resampled-audio-chunks-join-exactly.md)

## R237.propagate-the-visible-region-backward-through-the-effects-pipeline

**DEFER_SETUP — SOURCE_REVIEW**

Current presenter crops during final texture sampling after full-plane upload. It does not expose a graph of filter footprints or effect-intermediate regions. Backward ROI through filters requires graph semantics, not only changing viewport dimensions.

Contract: ROI through a fixed filter graph preserves every visible pixel using exact halos; unknown/global/temporal effects use full-region path.

Next bounded test / reopening condition: Specify a single fixed blur-plus-crop supported graph and compare ROI output with full output, deliberately omitting halo once; retain full-frame fallback for unknown/temporal effects.

Evidence: [work/batch_c/audits/R237.propagate-the-visible-region-backward-through-the-effects-pipeline.md](work/batch_c/audits/R237.propagate-the-visible-region-backward-through-the-effects-pipeline.md)

## R238.let-channel-reduction-cross-the-resampler-boundary

**STOP_PROFILE — SOURCE_REVIEW**

The audited native adaptation contract preserves channel layout and sample rate; there is neither requested channel reduction nor resampling to reorder. Adding downmixing would change output semantics rather than optimize this profile. Software filter routes require their own libswresample audit.

Contract: Only already-requested fixed linear mixing and compatible resampling may commute; preserve layout contract, delay, samples and rounding.

Next bounded test / reopening condition: Reopen for an explicitly requested fixed downmix plus resampling route; inspect actual library matrix ordering and compare delay/sample count/numerical output before changing it.

Evidence: [work/batch_c/audits/R238.let-channel-reduction-cross-the-resampler-boundary.md](work/batch_c/audits/R238.let-channel-reduction-cross-the-resampler-boundary.md)

## R239.wait-for-the-required-pictures-without-draining-the-decoder

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

The browser decoder bridge submits ordinary packets without flush and requests operation 3 only for null-packet drain. Both workers flush at that drain operation. Thus the proposed removal of ordinary-batch drains is already satisfied at this owner; output watchdog and true EOF drain remain required.

Contract: Ordinary decoder batches retain state and output required identities; delayed pictures, bounded outstanding work and true EOF drains remain.

Next bounded test / reopening condition: Reopen only with a caller trace showing null-packet drain at an ordinary non-EOF application batch boundary; preserve delayed output and source-generation rejection in any correction.

Evidence: [work/batch_c/audits/R239.wait-for-the-required-pictures-without-draining-the-decoder.md](work/batch_c/audits/R239.wait-for-the-required-pictures-without-draining-the-decoder.md)

## R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples

**DEFER_SETUP — SOURCE_REVIEW**

Adaptation owns actual PCM frames/FIFO and the AudioWorklet consumes a sample ring. Underrun zeros are not a validated symbolic silence interval. A symbolic representation would span codec/filter/clock boundaries and needs proof that tails and noise-producing stages are absent.

Contract: Symbolic silence represents validated zero media samples at exact clock intervals and preserves every filter tail; materialize at unsupported stages.

Next bounded test / reopening condition: Define one zero-span producer after all stateful filters, with exact sample start/count and ring materialization; compare a nonzero FIR tail crossing the boundary as adverse control.

Evidence: [work/batch_c/audits/R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples.md](work/batch_c/audits/R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples.md)

## R243.remove-nonessential-h-264-sei.report-c

**STOP_PROFILE — SOURCE_REVIEW**

Native packet copy preserves codec parameter side data and packets. The report saves only a known x264 nonessential SEI in a controlled fixture, not arbitrary type-6 semantics. No admitted metadata-discard contract exists; broad SEI stripping would violate requested color/timing/orientation semantics.

Contract: Only positively identified nonessential H264 annotation may be removed; VCL, timing, color, mastering and requested SEI semantics remain exact.

Next bounded test / reopening condition: Reopen only for a positively identified redundant encoder annotation subtype and useful transfer cost; compare VCL, decoded output, timing and retained HDR/timing metadata.

Evidence: [work/batch_c/audits/R243.remove-nonessential-h-264-sei.report-c.md](work/batch_c/audits/R243.remove-nonessential-h-264-sei.report-c.md)

## R264.exact-incremental-image-statistics

**STOP_PROFILE — SOURCE_REVIEW**

The report assumes sparse edits of a persistent scalar image with per-tile histograms. Current presenter draws changing full video frames and has no persistent histogram/statistics consumer; two bounded pixel checks are not such a workload.

Contract: Persistent 8-bit scalar-image histogram updates subtract old tiles and add new tiles, preserving full-image exact statistics after each edit.

Next bounded test / reopening condition: Reopen with an actual scalar-image statistics consumer and sparse edit rectangles; compare subtract-old/add-new global histogram with full recomputation.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_c/audits/R264.exact-incremental-image-statistics.md](work/batch_c/audits/R264.exact-incremental-image-statistics.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R265.sparse-correction-for-cached-linear-audio-filtering

**STOP_PROFILE — SOURCE_REVIEW**

The reported mechanism accelerates sparse edits to cached LTI FIR output. Current audited playback adaptation streams frames through FIFO, not an editable audio document with cached filter output. Streaming decode cannot claim the sparse-edit saving.

Contract: Sparse edit correction for fixed LTI FIR includes complete convolution support/tail and exactly matches full recomputed output.

Next bounded test / reopening condition: Reopen for an explicit offline editing consumer with immutable filter coefficients and retained source/output cache; compare one edit plus full filter tail against full recomputation.

Evidence: [work/batch_c/audits/R265.sparse-correction-for-cached-linear-audio-filtering.md](work/batch_c/audits/R265.sparse-correction-for-cached-linear-audio-filtering.md)

## R267.deadline-slack-before-optimization

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current worker and append ownership boundaries are identifiable, but existing remuxMs and queue counters are not stage-specific deadline slack. The source proves only a model. A bounded observation experiment can distinguish scheduling constraints before pursuing more batching changes.

Contract: Injected stage delay leaves media bytes/timestamps unchanged and is attributed to one read/process/append boundary with actual presentation witness.

Next bounded test / reopening condition: At one low-buffer refill inject a separately controlled small read, processing or append delay, preserving original bytes; record target-frame deadline and queue state, then stop at first classified miss.

Evidence: [work/batch_c/audits/R267.deadline-slack-before-optimization.md](work/batch_c/audits/R267.deadline-slack-before-optimization.md)

## R296.generate-seek-fragments-without-replaying-a-mux-session

**DEFER_SETUP — SOURCE_REVIEW**

Current seeks use FFmpeg indexed av_seek_frame then reconstruct output state; the report pure constructor reassembles already-existing immutable moof recipes. There is no current sample-addressable construction recipe service, and its microbenchmark omits cold indexing and source costs.

Contract: Explicit immutable seek fragment recipe preserves payloads/config/PTS/DTS/trimming and only valid random-access entry points, regardless of construction order.

Next bounded test / reopening condition: First trace one repeated distant seek to isolate mux reconstruction cost; only then compare a single explicit recipe generated in order 50,3,51,3 with a mid-GOP rejection.

Evidence: [work/batch_c/audits/R296.generate-seek-fragments-without-replaying-a-mux-session.md](work/batch_c/audits/R296.generate-seek-fragments-without-replaying-a-mux-session.md)

## R297.query-mp4-timing-tables-without-expanding-every-sample-record

**DEFER_SETUP — SOURCE_REVIEW**

The cheap JS probe reads bounded track metadata rather than expanding all timing samples. Real demux indexing resides inside FFmpeg with a 4 MiB index cap. The reported million-sample run index is a new parser representation and is not evidence that the current owner expands 22 MB of JS objects.

Contract: Compact MP4 timing queries preserve every offset/size/time/config/sync flag over admitted tables; reordered pictures require an explicit separate gate.

Next bounded test / reopening condition: Inspect the pinned FFmpeg MOV timing/index allocation on one long constant-timing source before implementing an index; compare real memory with an optimized typed-array oracle and preserve signed composition offsets as a separate gate.

Evidence: [work/batch_c/audits/R297.query-mp4-timing-tables-without-expanding-every-sample-record.md](work/batch_c/audits/R297.query-mp4-timing-tables-without-expanding-every-sample-record.md)

## R298.copy-surviving-packets-to-release-oversized-backing-buffers

**STOP_PROFILE — SOURCE_REVIEW**

RangeReader returns views into bounded cache blocks, but the native source worker immediately copies them to its mailbox; encoded browser packets are copied out of Wasm before submission. No long-lived sparse JS packet handles retaining 16 MiB source slabs were found in these owners. Range cache itself retains intentional bounded reusable blocks.

Contract: Compaction migrates all internal live immutable packet handles without invalidating external/duplicate/delayed consumers or changing packet identity.

Next bounded test / reopening condition: Reopen only with a concrete retained packet-view owner whose unique backing bytes exceed useful bytes after other consumers finish; compare one compacted slab with delayed and duplicate consumers.

Evidence: [work/batch_c/audits/R298.copy-surviving-packets-to-release-oversized-backing-buffers.md](work/batch_c/audits/R298.copy-surviving-packets-to-release-oversized-backing-buffers.md)

## R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Playback delegates rate to the media element or persistent engine; no exact reverse-GOP frame cache/presenter is exposed. The historical 30-frame reverse hash exercise uses an intentionally repeated-seek baseline. A bounded reverse-preview owner and memory contract would be new setup.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: If exact reverse preview is requested, scope one bounded GOP cache against current persistent decode, with independent frame hashes and a long/open-GOP rejection control; include all retained plane bytes.

Evidence: [work/root2/audits/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity.md](work/root2/audits/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity.md)

## R321.exact-iir-seek-checkpoints.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

The native adaptation path streams unchanged PCM/FIFO; the worklet consumes a ring and does not expose an IIR filter recurrence/checkpoint state. A fixed float64 biquad proof does not supply a checkpoint ABI for arbitrary production filters.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Select one actual requested fixed-coefficient IIR implementation, expose all recurrence/precision state and compare one resumed segment against uninterrupted output; changed coefficients/order must invalidate the checkpoint.

Evidence: [work/root2/audits/R321.exact-iir-seek-checkpoints.report-continuity.md](work/root2/audits/R321.exact-iir-seek-checkpoints.report-continuity.md)

## R323.merkle-proof-cached-range-verification.report-continuity

**STOP_PROFILE — SOURCE_REVIEW**

Current range reads use immutable/ETag authority and bounded cached ranges; they do not rehash the complete object for every independent request. The report explicitly conditions its large saving on that repeated-hash baseline, so that optimization opportunity is absent in this profile. ETag authority is not claimed cryptographic Merkle authentication.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Reopen only for a requested cryptographically rooted piece-verification source with supplied trusted root and proofs; compare against existing current verification rather than invented repeated full-object hashes.

Evidence: [work/root2/audits/R323.merkle-proof-cached-range-verification.report-continuity.md](work/root2/audits/R323.merkle-proof-cached-range-verification.report-continuity.md)

## R327.share-one-decoded-audio-source-across-many-sample-rate-consumers

**DEFER_SETUP — SOURCE_REVIEW**

Audio output has a single bounded sample ring and adaptation FIFO. No concurrent playback/analysis/export source-rate PCM consumer service or independent consumer clocks exist. Sharing one ring would couple cancellation and retention incorrectly.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Define two actual consumers over one canonical PCM interval and a bounded retention policy; compare against independent persistent decoding, reject a slow consumer that would exceed the bound.

Evidence: [work/root2/audits/R327.share-one-decoded-audio-source-across-many-sample-rate-consumers.md](work/root2/audits/R327.share-one-decoded-audio-source-across-many-sample-rate-consumers.md)

## R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects

**DEFER_SETUP — SOURCE_REVIEW**

libass already owns renderer caches and unchanged bitmap suppression, but the browser bridge exports final tiles, not reusable fully shaped scene objects. No repeated-layout frequency or shaping-bound observer exists at that boundary. A new shaping/layout API cannot be inferred from bitmap cache reuse.

Contract: Independent rendering or browser-owned reference appropriate to the same contract, including hidden state, timing, ordering and clear events.

Next bounded test / reopening condition: First measure repeated shaping/layout within one existing libass track without changing font/wrap semantics; only expose a scene representation if actual repeated work remains, using fallback-font/layout-change invalidation.

Evidence: [work/root2/audits/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects.md](work/root2/audits/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects.md)

## R334.share-one-demux-pass-across-independent-playback-and-export-timelines

**DEFER_SETUP — SOURCE_REVIEW**

Current remux mutates packet timestamps and stream index before feeding one mux context; each player owns a separate reader/cursor. A canonical immutable packet broker plus independent output lifetimes is absent. Tee capability alone does not supply dynamic authority, seek or slow-consumer policies.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Scope two consumers sharing one qualified start and cloned packet wrappers; compare both complete packet/timestamp outputs with independent persistent muxers, and cancel/slow one consumer without mutating the other.

Evidence: [work/root2/audits/R334.share-one-demux-pass-across-independent-playback-and-export-timelines.md](work/root2/audits/R334.share-one-demux-pass-across-independent-playback-and-export-timelines.md)

## R339.collapse-chroma-expansion-and-final-resizing-into-one-filter

**STOP_PROFILE — SOURCE_REVIEW**

The maintained YUV presenter samples subsampled planes directly in the final draw with crop/rotation/color conversion. It does not first materialize a full-resolution chroma plane and then resize it. The specific removable intermediate in the proposal is absent from this owner; arbitrary filter substitution would not preserve its contract.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Reopen only on an actual two-stage plane/effect path with a materialized chroma intermediate; compare exact phase/crop/boundary composite taps and reject clipping/quantization between stages.

Evidence: [work/root2/audits/R339.collapse-chroma-expansion-and-final-resizing-into-one-filter.md](work/root2/audits/R339.collapse-chroma-expansion-and-final-resizing-into-one-filter.md)

## R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index

**DEFER_SETUP — SOURCE_REVIEW**

The cheap MP4 probe is metadata admission, not a hierarchy-aware sample/seek reader; current source transport serves demanded ranges and FFmpeg owns demux indexes. A root/child/leaf SIDX traversal contract and immutable manifest discovery are not exposed. Parsing a supplied hierarchy would be new setup, not a smaller existing array.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Use one already-authored two-level SIDX with an authoritative root location; compare selected leaf ranges against an independent full parse and reject stale, overlapping or out-of-source references before any network latency comparison.

Evidence: [work/root2/audits/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index.md](work/root2/audits/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index.md)

## R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub

**DEFER_SETUP — SOURCE_REVIEW**

The UI already commits only the final scrub change; public seeks retire a generation and restore codec entry requirements. No sample-ordinal retargeting owner proves a new target is still ahead or retained. Reusing a decoder based only on timestamps/same GOP would weaken existing source/configuration authority.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: For an explicitly paused I/P exact-scrub profile, trace one continuing GOP and latest-target ordinal eligibility against the existing coalesced baseline; backward/previously released/duplicate-timestamp targets must take an explicit restart path.

Evidence: [work/root2/audits/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub.md](work/root2/audits/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub.md)

## R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline

**STOP_PROFILE — SOURCE_REVIEW**

The inspected player presenter has no current-frame histogram/percentile/LUT CPU feedback round trip. It directly converts/samples video and renders overlays. Adding a requested contrast effect would be new functionality, not removal of a present synchronization bottleneck in this profile.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Reopen for an actual requested adaptive-contrast pipeline with a measured CPU round trip; verify histogram/threshold/LUT/output for the same frame and reject stale frame-N-minus-1 statistics.

Evidence: [work/root2/audits/R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline.md](work/root2/audits/R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline.md)

## R364.reuse-gpu-command-sequences-across-changing-video-frames

**DEFER_SETUP — SOURCE_REVIEW**

Current custom plane presentation is WebGL2 with a video triangle and optional overlay draw, not a stable multi-draw WebGPU renderer using owned slot bind groups. WebGPU availability does not make render bundles usable by this owner. Rewriting the presenter just to test bundles exceeds first-pass scope.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: If a WebGPU owned-slot renderer is introduced for independent reasons, compare one existing batched layout with recorded bundles using alternating pictures/parameters and atlas-generation invalidation; never add a video copy solely for caching commands.

Evidence: [work/root2/audits/R364.reuse-gpu-command-sequences-across-changing-video-frames.md](work/root2/audits/R364.reuse-gpu-command-sequences-across-changing-video-frames.md)

## R121.insert-a-freeze-with-an-empty-edit.report-frontier

**DEFER_SETUP — SOURCE_REVIEW**

The current path preserves the source timeline; native mux sets use_editlist=0 and no requested freeze-edit authoring API exists. The recovered report demonstrates an altered timeline and continued frame work, not sparse decode. A bounded metadata edit authoring/validation slice is needed for that explicit capability.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: For an explicitly requested freeze edit, construct one source-bound elst change while retaining mdat bytes and independently check held/resumed pictures and audio policy; do not treat the freeze as an unchanged-playback speedup.

Evidence: [work/root2/audits/R121.insert-a-freeze-with-an-empty-edit.report-frontier.md](work/root2/audits/R121.insert-a-freeze-with-an-empty-edit.report-frontier.md)

## R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current packet mux preserves packets and initial padding but this source audit does not establish final positive DiscardPadding propagation. Nominal element duration is not a sample-trim oracle.

Contract: Unchanged Opus packet payloads; final audible sample count follows positive WebM DiscardPadding, independently from nominal container duration.

Next bounded test / reopening condition: Inspect one current WebM output final BlockGroup/DiscardPadding and decode sample count; zero only that metadata as adverse control while retaining packet hashes.

Evidence: [work/batch_d/audits/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md](work/batch_d/audits/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md)

## R132.incremental-mdat-sample-release.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Worker emits complete rm_step batches; FFmpeg writes custom fragments after accumulated timing. Early mdat delivery requires truthful metadata before remaining payload, not merely splitting already buffered output. No streaming mux boundary is exposed.

Contract: Same complete H264/AAC samples and timing while partial mdat arrives; actual selected A/V, not just buffered-range growth.

Next bounded test / reopening condition: First expose a bounded moof/header-plus-complete-sample production interface; withhold remaining mdat and verify actual early A/V, then truncate one sample to disprove false readiness.

Evidence: [work/batch_d/audits/R132.incremental-mdat-sample-release.report-continuity.md](work/batch_d/audits/R132.incremental-mdat-sample-release.report-continuity.md)

## R133.append-moof-and-mdat-separately.report-continuity

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

R47 already reuses sole owned buffers, but multi-piece batches still gather. Separate moof/mdat appends could remove residual gathering at the cost of extra updateend scheduling; current append interface assumes one buffer per lane.

Contract: Same init/media byte ordering, selected samples and timeline with separate moof/mdat ownership and no stale publication between appends.

Next bounded test / reopening condition: Use a test-only per-lane two-piece queue for one moof/mdat fragment; compare payload/output and cleanup, with seek between pieces as stale-input control. Count saved copy bytes and extra appends, not just detachments.

Evidence: [work/batch_d/audits/R133.append-moof-and-mdat-separately.report-continuity.md](work/batch_d/audits/R133.append-moof-and-mdat-separately.report-continuity.md)

## R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current complete batches avoid arbitrary sample splits. The reported distinction is a useful prerequisite for any partial-delivery change, not a demonstrated existing playback bottleneck.

Contract: Distinguish parser acceptance of complete coded sample from actual decoded/presented picture; arbitrary truncation must not count as ready output.

Next bounded test / reopening condition: For one captured fragment compare exact first-sample cut against 37-byte-truncated cut, observing buffered ranges and independently presented frames; do not infer presentation from range alone.

Evidence: [work/batch_d/audits/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md](work/batch_d/audits/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md)

## R136.worker-owned-mse-with-mediasourcehandle.report-continuity

**ADVANCE_CONFIRMATION — PREREQUISITE_PROBE**

MSE lives in the window while demux is already a worker. Current secure-origin shared probe supports worker construction, superseding historical opaque-origin blockage; handle attachment/sourceopen and output remain untested.

Contract: Same selected A/V, seeks and EOF through worker-owned MSE; actual handle attachment, sourceopen and deterministic worker teardown.

Next bounded test / reopening condition: Run one worker MediaSourceHandle attachment plus fragment/seek/EOF and cleanup; reject stale worker messages after destroy and report sourceopen failure separately from media failure.

Evidence: [work/batch_d/audits/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md](work/batch_d/audits/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R137.transferable-compressed-buffers-into-worker-mse.report-continuity

**ADVANCE_CONFIRMATION — PREREQUISITE_PROBE**

Compressed buffers already transfer mux-worker to window; moving MSE would change final ownership, not eliminate FFmpeg-to-owned buffer copy. Worker attachment is the missing end-to-end primitive.

Contract: Owned compressed ArrayBuffer detaches on transfer and reaches actual worker SourceBuffer output with no premature release or hidden fallback.

Next bounded test / reopening condition: After valid worker-MSE attachment, transfer one owned compressed buffer, assert sender detachment and actual decoded output; cancel before append and prove release without publication.

Evidence: [work/batch_d/audits/R137.transferable-compressed-buffers-into-worker-mse.report-continuity.md](work/batch_d/audits/R137.transferable-compressed-buffers-into-worker-mse.report-continuity.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity

**DEFER_SETUP — PREREQUISITE_PROBE**

Every start recreates MediaSource and packet processing rejects changed extradata. changeType support alone does not supply a source-queue timeline, two codec epochs or rollback transaction.

Contract: Continuous identified H264/fMP4 then VP9/WebM pictures and selected audio at a truthful join, with explicit source/codec epochs.

Next bounded test / reopening condition: Define a two-asset mapping/commit boundary and test exactly one H264-to-VP9 changeType join with numbered frames; failed second init must preserve old source ownership, not relabel payloads.

Evidence: [work/batch_d/audits/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity.md](work/batch_d/audits/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R145.native-frame-relay-without-js-pixel-readback.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Current Hybrid transfers decoded VideoFrames directly to a single canvas consumer, already avoiding pixel copies in noCopy mode. The exact report proposes native media-track capture/generator routing, an absent destination contract.

Contract: Native frame IDs/timestamps forwarded unchanged to requested media-track destination; no JS pixel materialization, no claim of browser-internal zero-copy.

Next bounded test / reopening condition: Name a required second media-track destination and verify one capture/processor/generator relay with frame IDs; a dropped/delayed final frame must fail requested output completeness.

Evidence: [work/batch_d/audits/R145.native-frame-relay-without-js-pixel-readback.report-continuity.md](work/batch_d/audits/R145.native-frame-relay-without-js-pixel-readback.report-continuity.md)

## R203.regroup-existing-opus-frames-without-re-encoding

**DEFER_SETUP — SOURCE_REVIEW**

Packet-copy remux has no libopus repacketizer owner. The report preserves PCM but its one-packet-per-page Ogg grows, so fewer packets alone is not a value decision.

Contract: Every constituent Opus encoded frame and decoded PCM preserved across legal regrouping; no new random-access claims.

Next bounded test / reopening condition: Scope one same-configuration libopus repacketizer with an independent constituent-frame/PCM oracle; measure total container bytes and release delay, with incompatible frame configurations rejected.

Evidence: [work/batch_d/audits/R203.regroup-existing-opus-frames-without-re-encoding.md](work/batch_d/audits/R203.regroup-existing-opus-frames-without-re-encoding.md)

## R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c

**DEFER_SETUP — SOURCE_REVIEW**

Current code preserves existing sample_aspect_ratio and retained display geometry. It does not expose a requested aspect-metadata editing/export operation; adding SPS/VUI and pasp patching would be a distinct semantic feature.

Contract: Explicit requested aspect metadata change with all VCL pictures, DTS/PTS/durations and unrelated metadata preserved.

Next bounded test / reopening condition: If explicit metadata correction is required, test one length-preserving avcC/pasp edit and all VCL/PTS hashes; altered SPS length or B-frame timestamps must reject or use a fully validated rewriter.

Evidence: [work/batch_d/audits/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c.md](work/batch_d/audits/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c.md)

## R272.roi-videoframe-copyto

**STOP_PROFILE — SOURCE_REVIEW**

Current retained presentation transfers complete VideoFrame resources; fallback copy reads the full visible rectangle because downstream playback needs the whole picture. There is no ROI analysis consumer to justify a cropped copy in this profile.

Contract: Only an explicitly requested ROI is copied, byte-equivalent to full-copy crop for admitted format/alignment; whole playback picture remains intact.

Next bounded test / reopening condition: Reopen for an actual ROI-only analysis request; then compare admitted rectangle copy against full-copy crop with subsampling-alignment negative control. Cropping playback output is not an optimization.

Evidence: [work/batch_d/audits/R272.roi-videoframe-copyto.md](work/batch_d/audits/R272.roi-videoframe-copyto.md)

## R289.share-one-native-decoder-across-unrelated-independent-picture-jobs

**DEFER_SETUP — PREREQUISITE_PROBE**

Decoder is scoped to one player generation, and the UI has no independent picture-job service. Cross-source jobs need full-configuration grouping and job/output correlation, beyond a localized playback patch.

Contract: Independent-picture jobs from authorized compatible sources retain exact job/frame mapping, original times/display metadata and bounded ownership.

Next bounded test / reopening condition: Define one three-IDR job API and compare persistent decoder/pool with same-config sources; duplicate source timestamps plus canceled middle job must not swap output identities.

Evidence: [work/batch_d/audits/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs.md](work/batch_d/audits/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs.md), [sources/reports/R289-R294-report.md](sources/reports/R289-R294-report.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs

**STOP_PROFILE — SOURCE_REVIEW**

The exact proposal requires an analysis task needing only a rectangle. Current caller consumes whole pictures and optimized path transfers retained frames; no unnecessary analysis full-copy boundary was found.

Contract: Real decoded ROI preserves subsampling/crop/color semantics and matches full-copy crop; decoder reconstruction work is unchanged.

Next bounded test / reopening condition: Reopen when a concrete bounded analysis consumer is added; test real decoded I420/NV12 rectangle alignment, crop and color against same-decoder full-copy reference.

Evidence: [work/batch_d/audits/R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs.md](work/batch_d/audits/R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs.md)

## R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front

**DEFER_SETUP — SOURCE_REVIEW**

Current output has one transferred owner; there is no multi-consumer accounting/deadline policy. Cloning frames without bounded fanout can retain decoder surfaces indefinitely.

Contract: Each independent consumer gets correct frame/time resource reference with bounded slow-consumer retention and complete release.

Next bounded test / reopening condition: Define a two-consumer frame lease with one slow/canceled worker, clone resource references, and prove source replacement closes all remaining owners; count peak retained surfaces.

Evidence: [work/batch_d/audits/R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front.md](work/batch_d/audits/R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front.md)

## R333.keep-soft-telecine-as-progressive-pictures-plus-timing

**STOP_PROFILE — SOURCE_REVIEW**

Related report found one progressive reconstruction plus repeat timing, not duplicated field pictures; current player does not explicitly enable deinterlacing and forwards complete decoded images. No removable telecine stage is identified for this default progressive profile. This is not whole-browser cadence qualification.

Contract: Progressive sample identity and declared repeat holds with original A/V/timed-data relationship; no film-speed change or reinterpretation of actual interlacing.

Next bounded test / reopening condition: Reopen only on a trace showing duplicate reconstructions/uploads or actual deinterlace work for an admitted progressive-repeat source; then compare cadence/audio with genuinely interlaced control and no timestamp double-counting.

Evidence: [work/batch_d/audits/R333.keep-soft-telecine-as-progressive-pictures-plus-timing.md](work/batch_d/audits/R333.keep-soft-telecine-as-progressive-pictures-plus-timing.md), [sources/reports/R332-R337-report.md](sources/reports/R332-R337-report.md)

## R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier

**DEFER_SETUP — SOURCE_REVIEW**

Current SourceBuffers use segments mode and zero offset for one already biased source timeline. Explicit 0/2/4 concatenation needs asset/source mapping and boundary priming, not just timestampOffset changes.

Contract: Segments-mode concatenation preserves each source epoch internal PTS relationship using explicit offsets and correct A/V priming.

Next bounded test / reopening condition: Define one two-clip source-to-presentation map and compare explicit offset join to reference; a B-frame/nonzero-origin clip must retain internal timing and not double-apply bias.

Evidence: [work/batch_d/audits/R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier.md](work/batch_d/audits/R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier.md)

## R004.stream-inside-a-fragment-instead-of-making-it-smaller

**STOP_PROFILE — IMPORTED_LOCAL_EVIDENCE**

Reported 26-second trace: media first-emission-to-flush max 0.320 ms, peak queue depth one; no material withholding demonstrated at this boundary. Later browser delays not measured. Actual local raw records and prior manifest identity were inspected in this v4 import.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: A trace exposing material producer/worker withholding or another specific boundary.

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## R014.avoid-duplicate-resampling-and-oversized-audio-work-batches

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

mpv output rate is set from the browser context, and fixed PCM ring batches already avoid per-packet worklet messages. Source/filter/device-rate conversion exposure is unknown; physical device conversion cannot be inferred from context rate.

Contract: Same intended audio/filter/layout output with honest latency and underrun margin; no assumed physical-device resampling elimination.

Next bounded test / reopening condition: Trace 44.1/48k source, filter and context rates plus ring occupancy; change only one batch size if duplicate conversion or oversized work is observed. Inject worker delay and reject underrun/latency regression.

Evidence: [work/batch_d/audits/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md](work/batch_d/audits/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md)

## R015.make-split-buffer-audio-switching-transactional

**DEFER_SETUP — SOURCE_REVIEW**

Track selection restarts entire remux with rollback; split buffers currently support unequal tails only, not prepare/commit/retire audio switching. Transaction and source generations need design before same-object reuse.

Contract: One authoritative presentation, retained video, correct selected audio at transaction time, no duplicate/stale samples and valid rollback.

Next bounded test / reopening condition: Specify one paused same-codec audio transaction retaining video; compare digital markers and covering frame, then cancel before commit and verify old track remains authoritative.

Evidence: [work/batch_d/audits/R015.make-split-buffer-audio-switching-transactional.md](work/batch_d/audits/R015.make-split-buffer-audio-switching-transactional.md), [sources/reports/RESULTS.md](sources/reports/RESULTS.md)

## R017.model-unequal-tails-as-explicit-track-lifetime-phases

**DEFER_SETUP — SOURCE_REVIEW**

Current implementation already supports a bounded unequal-tail window with known ends and EOS/resume logic; it does not retire an ended SourceBuffer as proposed. The existing working approach must be baseline, not historical bounded rejection.

Contract: Correct audio-long/video-long continuation, held-picture policy and distinct media/subtitle/seek ends; real finality only and backward restoration.

Next bounded test / reopening condition: Identify measured residual cost in current windowed tails before a retirement variant; if justified, test one audio-long tail and backward restoration, with a midstream gap forbidden from being treated as finality.

Evidence: [work/batch_d/audits/R017.model-unequal-tails-as-explicit-track-lifetime-phases.md](work/batch_d/audits/R017.model-unequal-tails-as-explicit-track-lifetime-phases.md), [sources/reports/RESULTS.md](sources/reports/RESULTS.md)

## R035.switch-same-codec-audio-at-a-future-boundary-without-pausing

**DEFER_SETUP — SOURCE_REVIEW**

Current selection pauses/restarts full remux; no future audio splice commit or rollback state exists. Keeping video and old-audio prefix across an unpaused boundary requires the missing audio transaction.

Contract: Unpaused same-codec switch retains old audio prefix and video, with exact digital marker splice and bounded overlapping bytes.

Next bounded test / reopening condition: First define same-configuration FLAC future-boundary transaction; compare exact digital marker boundary and video frame identity, cancel before commit, reject any gap/repeat rather than widening tolerance.

Evidence: [work/batch_d/audits/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing.md](work/batch_d/audits/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop

**DEFER_SETUP — SOURCE_REVIEW**

Current source start replaces MediaSource and resets source frames/ranges. Queue-wide logical source identities, offsets, subtitle events and bounded next-item ownership are missing.

Contract: Identical clip boundary frames/samples and public source mapping across queue/repeat, with bounded current/next retention.

Next bounded test / reopening condition: Define a two-clip queue mapping before one continuous-MSE join; use matching H264/AAC configuration and test cross-boundary seek, with changed queued source invalidating late bytes.

Evidence: [work/batch_d/audits/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop.md](work/batch_d/audits/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## R037.recover-an-interrupted-partial-append-without-replacing-mse

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current same-source unbuffered seek always replaces MSE. SourceBuffer abort/reset may preserve unaffected ranges after deliberately partial input; a tiny parser-boundary pilot can decide before changing controller ownership.

Contract: Same-source parser reset preserves unrelated accepted coverage, restores legal target RAP and rejects old delayed bytes.

Next bounded test / reopening condition: Split one captured fragment at incomplete moof and incomplete sample, abort legally and append target RAP; delayed old bytes must be rejected and target frame must match full-source seek.

Evidence: [work/batch_d/audits/R037.recover-an-interrupted-partial-append-without-replacing-mse.md](work/batch_d/audits/R037.recover-an-interrupted-partial-append-without-replacing-mse.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

QuotaExceededError currently enters one full restart, while safe RAP-aligned eviction is already implemented. An injected one-shot quota branch is a localized controller opportunity; genuine quota remains separate.

Contract: Only safe expendable RAP ranges evicted, still-owned media retried once, no lost dependencies or quality reduction; injection is controller evidence only.

Next bounded test / reopening condition: Test preserving pending bytes, evicting a safe old RAP interval and retrying once; a second refusal must stop, and non-quota error must not be retried as capacity. No memory exhaustion test.

Evidence: [work/batch_d/audits/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md](work/batch_d/audits/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## R043.change-video-configuration-while-keeping-audio-running

**DEFER_SETUP — SOURCE_REVIEW**

Split output exists but native step rejects changed video configuration; no independent future-video commit while audio stays alive exists. Configuration guards are necessary until that transaction is explicit.

Contract: Explicit resolution switch has correct new dimensions/covering frame and uninterrupted selected audio, no hidden internal-decoder-reuse assumption.

Next bounded test / reopening condition: Define one H264 360-to-720 closed-GOP transaction with actual new init; retain audio marker identity and reject failed/misaligned replacement without corrupting prior presentation.

Evidence: [work/batch_d/audits/R043.change-video-configuration-while-keeping-audio-running.md](work/batch_d/audits/R043.change-video-configuration-while-keeping-audio-running.md), [sources/reports/RESULTS_R43_R57.md](sources/reports/RESULTS_R43_R57.md)

## R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop

**DEFER_SETUP — SOURCE_REVIEW**

Seek already supplies preroll and checks covering frames, but public exact interval end/audio suppression contract is missing. Partial packet slicing alone cannot promise no preroll audio or exact end.

Contract: Requested visible interval has correct first covering frame/end policy, no leaked preroll sound/picture, retained original coded payloads.

Next bounded test / reopening condition: Define one [3.35,7.65) playback-range contract then test bounded input against full source; appendWindowStart that removes required edge GOP is the intentional failing control.

Evidence: [work/batch_d/audits/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop.md](work/batch_d/audits/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop.md), [sources/reports/RESULTS_R43_R57.md](sources/reports/RESULTS_R43_R57.md)

## R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning

**DEFER_SETUP — SOURCE_REVIEW**

Range reads and identities are bounded, and FFmpeg owns demux indexes; no persistent cross-generation fragment map is exposed. Must measure actual repeated scans before adding a second index owner.

Contract: Map is bound to source identity and codec epoch, validated byte spans/RAPs and audio preroll; unknown entries fall back rather than guess.

Next bounded test / reopening condition: Record three distant seeks and existing index use; only if repeated discovery remains, build an incremental source-bound metadata map and reject a same-name changed source/corrupt offset.

Evidence: [work/batch_d/audits/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning.md](work/batch_d/audits/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning.md), [sources/reports/RESULTS_R43_R57.md](sources/reports/RESULTS_R43_R57.md)

## R052.keep-source-sample-rates-across-audio-track-changes

**DEFER_SETUP — SOURCE_REVIEW**

Current track change remuxes at source time, copying original rate; preserving only video while swapping 44.1/48k audio needs missing per-track transaction and priming map.

Contract: Selected original-rate AAC packets retain speed, priming, duration/tail and unchanged video; no physical sample-exact output claim.

Next bounded test / reopening condition: Define one paused AAC same-profile rate switch and inspect new initialization, PCM marker speed and tail; wrong-rate description or failed backward restoration must reject.

Evidence: [work/batch_d/audits/R052.keep-source-sample-rates-across-audio-track-changes.md](work/batch_d/audits/R052.keep-source-sample-rates-across-audio-track-changes.md), [sources/reports/RESULTS_R43_R57.md](sources/reports/RESULTS_R43_R57.md)

## R054.tune-webm-cluster-production-for-early-audio-availability

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

WebM currently uses 500ms audio-only clusters, huge video time limit and 8MiB size cap; rm_step avoids closing video clusters after first keyframe. This is an actual configurable producer boundary distinct from MSE drip feeding.

Contract: Same Opus sequence/delay/tail and copied video with earlier jointly usable A/V from actual producer emissions.

Next bounded test / reopening condition: Compare one smaller supported cluster policy with live emitted-byte timestamps and PCM tail/packet oracle; reject earlier video-only availability or altered CodecDelay/DiscardPadding.

Evidence: [work/batch_d/audits/R054.tune-webm-cluster-production-for-early-audio-availability.md](work/batch_d/audits/R054.tune-webm-cluster-production-for-early-audio-availability.md), [sources/reports/RESULTS_R43_R57.md](sources/reports/RESULTS_R43_R57.md)

## R055.cache-bounded-decoded-previews-for-scrub-revisits

**DEFER_SETUP — SOURCE_REVIEW**

UI seek-preview means visibility of controls, not generated image previews. No requested thumbnail producer/cache exists; adding a second decoder merely to measure cache hits exceeds first-pass scope.

Contract: Explicit approximate preview labels match source/time/geometry; main exact seek is authoritative and cache is image/byte bounded.

Next bounded test / reopening condition: Specify eight-image/byte-capped approximate preview API and source/time key; evaluate one reverse gesture only after producer exists, rejecting late old-source capture.

Evidence: [work/batch_d/audits/R055.cache-bounded-decoded-previews-for-scrub-revisits.md](work/batch_d/audits/R055.cache-bounded-decoded-previews-for-scrub-revisits.md), [sources/reports/RESULTS_R43_R57.md](sources/reports/RESULTS_R43_R57.md)

## R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track

**DEFER_SETUP — SOURCE_REVIEW**

Native copied tracks share an established timeline bias; no public one-track delay mapping or replacement transaction exists. Setting timestampOffset cannot retime accepted audio.

Contract: Explicit requested audio offset changes only intended mapping, preserving packets/video and honest boundary/preroll semantics; no silent silence/drop.

Next bounded test / reopening condition: Define static positive/negative delay boundary semantics first; test one split-MSE impulse/flash fixture with nonzero origin and reject unrepresentable leading/tail samples rather than silently padding.

Evidence: [work/batch_d/audits/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track.md](work/batch_d/audits/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track.md), [sources/reports/R58-R69-report.md](sources/reports/R58-R69-report.md)

## R064.decode-directly-at-reduced-resolution-for-explicit-previews

**DEFER_SETUP — SOURCE_REVIEW**

No preview/economy decode policy exists; software decoder options only set resource bounds. Lowres is codec-specific and intentional quality change, not permission from small display size.

Contract: Explicit reduced-detail preview retains chosen frame/time and declared dimensions; pixel differences disclosed, normal playback restored full quality.

Next bounded test / reopening condition: Once explicit preview intent exists, query compiled MJPEG/MPEG2 max_lowres and compare one frame with full-decode scaling; unsupported codec must retain full decode and report pixel differences.

Evidence: [work/batch_d/audits/R064.decode-directly-at-reduced-resolution-for-explicit-previews.md](work/batch_d/audits/R064.decode-directly-at-reduced-resolution-for-explicit-previews.md), [sources/reports/R58-R69-report.md](sources/reports/R58-R69-report.md)

## R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy

**DEFER_SETUP — SOURCE_REVIEW**

Pause retains presentation; destroy releases it but no public idle hibernation policy/snapshot owner exists. Choosing when to discard live buffers is user-visible behavior, not a low-risk cleanup patch.

Contract: Opt-in paused-VOD release restores source, tracks, gain/rate/captions and position; no active/PiP/live interruption or stale restore callbacks.

Next bounded test / reopening condition: Specify opt-in idle threshold and saved tracks/rate/gain/captions/authorization first; one pause-release-resume pilot must reject live/PiP and cancel restoration cleanly.

Evidence: [work/batch_d/audits/R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy.md](work/batch_d/audits/R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy.md), [sources/reports/R58-R69-report.md](sources/reports/R58-R69-report.md)

## R072.decode-only-keyframes-for-coarse-previews

**DEFER_SETUP — SOURCE_REVIEW**

No maintained coarse-preview service or explicit skip_frame policy exists. Historical host hashes/CPU support a coarse-only experiment, not a browser result or permission to alter playback decoding.

Contract: Explicit coarse keyframe storyboard retains selected image identity and geometry; never substitutes for exact scrubbing or playback.

Next bounded test / reopening condition: Define one source-scoped coarse preview job and use existing decode harness only after that API exists; open-GOP/non-key request must not masquerade as exact seek.

Evidence: [work/batch_d/audits/R072.decode-only-keyframes-for-coarse-previews.md](work/batch_d/audits/R072.decode-only-keyframes-for-coarse-previews.md)

## R073.decode-a-gop-once-for-a-pending-exact-preview-batch

**DEFER_SETUP — SOURCE_REVIEW**

No pending exact-preview request batch owner exists. Current decoder is single playback generation; historical twelve-process baseline is not current persistent-Wasm scheduling cost.

Contract: Every already-pending exact preview frame returned correctly without artificial batch wait; GOP/source identity and cancellation bounded.

Next bounded test / reopening condition: Define pending-only same-GOP batching with no wait-to-fill; compare requested frames to full decode and reject sparse/different-source jobs or cancellation leakage.

Evidence: [work/batch_d/audits/R073.decode-a-gop-once-for-a-pending-exact-preview-batch.md](work/batch_d/audits/R073.decode-a-gop-once-for-a-pending-exact-preview-batch.md)

## R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata

**DEFER_SETUP — SOURCE_REVIEW**

Current path preserves source delay/padding for whole playback; it lacks arbitrary sample-domain excerpt authoring and Ogg granule/preroll mapping. Element currentTime cannot supply sample-exact cut evidence.

Contract: Requested sample interval matches continuous same-decoder reference with actual preroll convergence and no duplicated priming/padding.

Next bounded test / reopening condition: Scope one Ogg Opus interior sample cut with retained preroll and packet identity; packet-only cut is adverse control, and direct/MSE metadata mappings remain separate.

Evidence: [work/batch_d/audits/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata.md](work/batch_d/audits/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata.md), [sources/reports/R88-R101-report.md](sources/reports/R88-R101-report.md)

## R112.supply-known-webm-durations-to-prevent-parser-holdback

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current WebM delegates duration metadata to pinned FFmpeg; no observed holdback has been attributed to missing duration. A metadata inspection and matched delayed-next-packet probe is cheaper than mux changes.

Contract: Truthful source-known sample duration, identical payload/cluster schedule and output times; no guessed live duration or buffering-to-presentation inference.

Next bounded test / reopening condition: Inspect one actual output BlockDuration/DefaultDuration, then compare truthful duration signaling only if missing; use Opus as expected no-benefit and VFR last-frame timing as adverse control.

Evidence: [work/batch_d/audits/R112.supply-known-webm-durations-to-prevent-parser-holdback.md](work/batch_d/audits/R112.supply-known-webm-durations-to-prevent-parser-holdback.md), [sources/reports/R102-R115-report.md](sources/reports/R102-R115-report.md)

## R118.one-decode-many-views

**DEFER_SETUP — SOURCE_REVIEW**

One decoded frame currently transfers to one presenter; synchronized crop/detail consumers and bounded release policy are absent. Separate source decoders cannot be assumed redundant without consumers.

Contract: Synchronized crops/views share the same identified source frame and timestamp with bounded consumer lifetime.

Next bounded test / reopening condition: Define two synchronized view consumers from one frame with resource budget; slow/canceled consumer must release without starving playback or showing a mismatched timestamp.

Evidence: [work/batch_d/audits/R118.one-decode-many-views.md](work/batch_d/audits/R118.one-decode-many-views.md)

## R198.bitmap-subtitles-directly-from-rle-runs

**DEFER_SETUP — SOURCE_REVIEW**

Native subtitle overlay accepts libass bitmap tiles, not PGS RLE spans. Historical exact integer span composition uses a packet model and does not provide demux/PGS lifetime ownership.

Contract: Exact integer source-over RGBA for PGS RLE runs, palette/crop/clear events and restored seek state with bounded allocations.

Next bounded test / reopening condition: Build only a bounded run parser/compositor oracle for real selected PGS events before GPU integration; palette-only/clear/seek state and oversized run must be decisive controls.

Evidence: [work/batch_d/audits/R198.bitmap-subtitles-directly-from-rle-runs.md](work/batch_d/audits/R198.bitmap-subtitles-directly-from-rle-runs.md)

## R206.incremental-mjpeg-stripe-decode-upload

**DEFER_SETUP — SOURCE_REVIEW**

Presenter gets complete mp_image/VideoFrame outputs, not partial libjpeg stripes. Overlap would require a decoder stripe callback and unpublished-texture owner; multiple uploads alone showed no reported gain.

Contract: Complete exact JPEG image publishes only after final stripe; partial decode/upload may overlap but incomplete textures are never visible.

Next bounded test / reopening condition: Expose one bounded stripe callback and completion fence only if existing decoder permits it; compare complete pixels and withhold publication until final stripe, with partial-frame negative control.

Evidence: [work/batch_d/audits/R206.incremental-mjpeg-stripe-decode-upload.md](work/batch_d/audits/R206.incremental-mjpeg-stripe-decode-upload.md)

## R261.selective-verified-http-rescue

**DEFER_SETUP — SOURCE_REVIEW**

Current authorized RangeReader validates ETag/size and caches ranges but has no trusted per-chunk manifest/local-corruption repair source. Hash rescue requires explicit trust and substitution ownership, not generic retry.

Contract: Trusted manifest-bound repaired source matches exact authorized bytes; only mismatches fetched and corrupt remote units rejected.

Next bounded test / reopening condition: Define trusted manifest identity and one two-bad-chunk rescue component; exact whole-file hash and tampered response rejection required, keeping credentials/ETag changes separate.

Evidence: [work/batch_d/audits/R261.selective-verified-http-rescue.md](work/batch_d/audits/R261.selective-verified-http-rescue.md)

## R270.exact-flac-smart-cut-concat

**DEFER_SETUP — SOURCE_REVIEW**

Current FLAC adaptation fully decodes/encodes selected audio; no smart-cut FLAC frame/subframe/header/CRC author exists. Correct variable sample numbering is a new authoring component, not trimming timestamps.

Contract: Exact cut PCM and random seeks, retained interior FLAC subframes, truthful variable-block sample headers/CRCs and STREAMINFO.

Next bounded test / reopening condition: Scope one two-edge smart cut preserving interior subframes with CRC and variable-block sample numbering; seek into short-edge/interior transition must equal reference, stale STREAMINFO MD5 forbidden.

Evidence: [work/batch_d/audits/R270.exact-flac-smart-cut-concat.md](work/batch_d/audits/R270.exact-flac-smart-cut-concat.md)

## R271.opus-fec-aware-scheduling

**STOP_PROFILE — SOURCE_REVIEW**

Maintained path reads complete immutable file ranges and treats failed transport as an error; no real-time lossy Opus receive/PLC/FEC policy exists. Concealment changes exact file playback output.

Contract: Only explicitly authorized concealment profile may trade one-packet latency for nonexact FEC; exact file contract requires original packets.

Next bounded test / reopening condition: Reopen only for explicitly permitted real-time concealment/latency policy; compare one actual loss FEC/PLC with original-packet reference and report nonexact output, not optimization of lossless file delivery.

Evidence: [work/batch_d/audits/R271.opus-fec-aware-scheduling.md](work/batch_d/audits/R271.opus-fec-aware-scheduling.md)

## R274.virtual-webm-cues

**DEFER_SETUP — SOURCE_REVIEW**

Source-bound range ownership exists but no virtual WebM Cues author or composed-byte namespace exists. The provided report now resolves definition identity, but its raw remote logs are not local new evidence.

Contract: Truthful immutable source-bound Cues offsets yield same target frame without rewriting cluster payloads; stale index rejected.

Next bounded test / reopening condition: First inspect one target source for existing useful Cues; if absent, define immutable virtual Cues offsets and compare target frame/range bytes, rejecting stale identity and malformed cluster offsets.

Evidence: [work/batch_d/audits/R274.virtual-webm-cues.md](work/batch_d/audits/R274.virtual-webm-cues.md)

## R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming

**DEFER_SETUP — SOURCE_REVIEW**

Current whole-source remux has no Ogg Opus clipping writer or per-cut pre-skip/end-granule owner. Packet-preserving trim is distinct from arbitrary exact state convergence.

Contract: Copied Opus packets plus pre-skip/end trimming reproduce exact requested continuous-reference PCM only with qualified decoder-state convergence.

Next bounded test / reopening condition: Build one interior Ogg cut with copied packets/qualified preroll and compare every sample; shorten preroll as adverse control and do not treat recommended duration as universal exactness.

Evidence: [work/batch_d/audits/R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming.md](work/batch_d/audits/R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming.md)

## R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

RangeReader already starts misses at requested offsets, avoiding unused prefix; whether FFmpeg requests cluster start versus cue-relative block is the remaining mechanism-specific exposure. No new byte provider is needed for attribution.

Contract: Cue cluster/relative offsets retain required track, timestamp, codec and prediction context; no skipped dependencies or stale source.

Next bounded test / reopening condition: Trace one large-Cluster distant seek against validated CueRelativePosition; compare requested offsets and correct target frame, and corrupt relative offset must reject rather than skip required codec context.

Evidence: [work/batch_d/audits/R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster.md](work/batch_d/audits/R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster.md)

## R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view

**STOP_PROFILE — IMPORTED_LOCAL_EVIDENCE**

Native already attempts unchanged source direct playback before remux. Building a flat Blob view solely to remove app append ownership has no route gap when direct complete fMP4 is accepted; indexing can reopen only for demonstrated seek deficiency.

Contract: Flat view, if needed, preserves ordered payloads and complete DTS/PTS/duration/edits/priming/64-bit addressing; no entire-remote-source download assumption.

Next bounded test / reopening condition: Reopen for a source where direct complete fMP4 lacks required seeking; first show that deficiency, then compare flat sample-table view with payload/CTS/64-bit-offset oracle.

Evidence: [work/batch_d/audits/R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view.md](work/batch_d/audits/R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view.md), [work/batch_d/imported-opportunities-02-result.json](work/batch_d/imported-opportunities-02-result.json), [sources/reports/R88-R101-report.md](sources/reports/R88-R101-report.md)

## R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate

**DEFER_SETUP — SOURCE_REVIEW**

Remux explicitly rejects changed video extradata and its seek state does not expose Matroska CueCodecState. Indexed configuration-epoch mapping requires a demux/configuration transaction, while cues cannot recreate prediction history.

Contract: Cue-referenced codec state selects correct configuration epoch at a legal RAP; no prediction-history reconstruction from cue alone.

Next bounded test / reopening condition: Provide one two-epoch Matroska fixture and validate CueCodecState bytes/identity before one seek each direction; mid-GOP cold start or wrong epoch state must reject.

Evidence: [work/batch_d/audits/R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate.md](work/batch_d/audits/R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate.md)

## R013.treat-intentionally-disabled-tracks-as-removable-work

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Native audio no currently only sets muted=true, while rm_open treats negative selection as automatic. Explicit disabled-track intent is not encoded as absent audio; there is concrete potential to avoid preparation of intentionally unused audio.

Contract: Only explicit track-disable intent removes work; mute/hiding do not imply permission, re-enable restores requested track/time.

Next bounded test / reopening condition: Add test-only explicit no-audio selection sentinel without changing mute behavior; compare video identity and audio packet/decoder/encoder counters, then re-enable at legal source time; mute alone must not remove audio work.

Evidence: [work/batch_d/audits/R013.treat-intentionally-disabled-tracks-as-removable-work.md](work/batch_d/audits/R013.treat-intentionally-disabled-tracks-as-removable-work.md)

## R033.interleave-samples-for-earlier-complete-a-v-output

**STOP_PROFILE — SOURCE_REVIEW**

Related report explicitly records frag_interleave=1,2,4 losing AAC packets/tail and no earlier joint A/V; current code deliberately omits this option. Stop the reported settings/profile rather than repeat a known equivalence failure. This is a source-reconciled historical negative, not a new local experiment.

Contract: Same packets/GOP/fragment duration and DTS/PTS with earlier jointly useful A/V from different intra-fragment ordering.

Next bounded test / reopening condition: Reopen only for a materially different pinned-FFmpeg construction that first proves all AAC packet/sample counts, tail and PTS/DTS identical; then compare live joint A/V release. Do not rerun the same failed settings as if untouched.

Evidence: [work/batch_d/audits/R033.interleave-samples-for-earlier-complete-a-v-output.md](work/batch_d/audits/R033.interleave-samples-for-earlier-complete-a-v-output.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## R034.small-startup-appends-larger-steady-state-batches

**STOP_PROFILE — IMPORTED_LOCAL_EVIDENCE**

Same supplied trace does not demonstrate a trickle-producer or batching-gap problem. This is scoped opportunity evidence, not a universal rejection. Actual local raw records and prior manifest identity were inspected in this v4 import.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Different producer/delivery conditions with demonstrable useful waiting.

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## R039.prioritize-the-track-that-limits-usable-playback

**DEFER_SETUP — SOURCE_REVIEW**

Controller already gates on joint usable buffered coverage, but one sequential demux/mux call produces both tracks. No independent per-track fetch/producer credits exist to prioritize audio without extra scanning.

Contract: Bounded contiguous joint A/V availability, no starvation, same selected packets and distinction between temporary missing media and true tail.

Next bounded test / reopening condition: Show source representation permits independent required-track retrieval before defining asymmetric scheduling; one delayed-audio trace must preserve fairness and distinguish true tail from temporary gap.

Evidence: [work/batch_d/audits/R039.prioritize-the-track-that-limits-usable-playback.md](work/batch_d/audits/R039.prioritize-the-track-that-limits-usable-playback.md), [sources/reports/RESULTS_R31_R42.md](sources/reports/RESULTS_R31_R42.md)

## R042.recycle-owned-transfer-buffers-at-the-mse-boundary

**DEFER_SETUP — IMPORTED_LOCAL_EVIDENCE**

Gather bytes remain, but no observed GC/allocator pressure justifies a new buffer-return protocol on the supplied trace. Actual local raw records and prior manifest identity were inspected in this v4 import.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Observed allocation pressure or an already-safe shared buffer-return infrastructure.

Evidence: [evidence/imports/identity-check.json](evidence/imports/identity-check.json), [evidence/imports/runs__module-separated-01__result.json](evidence/imports/runs__module-separated-01__result.json), [evidence/imports/runs__follow-up__opportunity-summary.json](evidence/imports/runs__follow-up__opportunity-summary.json), [evidence/imports/runs__module-maintained-pairs-01__summary.json](evidence/imports/runs__module-maintained-pairs-01__summary.json), [evidence/imports/runs__module-authority-02__result.json](evidence/imports/runs__module-authority-02__result.json), [evidence/imports/runs__caption-boundary-integrated__result.json](evidence/imports/runs__caption-boundary-integrated__result.json), [evidence/imports/runs__r74-packed-cost-01__result.json](evidence/imports/runs__r74-packed-cost-01__result.json), [evidence/imports/runs__r74-packed-cost-01__summary.json](evidence/imports/runs__r74-packed-cost-01__summary.json)

## R111.factor-repeated-fmp4-sample-metadata-into-defaults

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

Pinned FFmpeg movenc writes default duration/size/flags in tfhd and emits trun exceptions for differing duration, size, flags and CTS. Current mux uses this writer; another equivalent defaults rewriter duplicates the stated mechanism.

Contract: Expanded sample size/DTS/PTS/duration/key/dependency/offset table remains exact while defaults eliminate repeated fields and retain exceptions.

Next bounded test / reopening condition: Reopen only if a concrete captured output has redundant equivalent fields beyond these defaults; independently expand sample tables including VFR/CTS/short-tail exceptions before any rewrite.

Evidence: [work/batch_d/audits/R111.factor-repeated-fmp4-sample-metadata-into-defaults.md](work/batch_d/audits/R111.factor-repeated-fmp4-sample-metadata-into-defaults.md), [sources/reports/R102-R115-report.md](sources/reports/R102-R115-report.md)

## R116.mse-sequence-mode-concatenation-report-paragraph-label.report-frontier

**DEFER_SETUP — SOURCE_REVIEW**

Current per-source segments timeline intentionally preserves source timing bias. Sequence concatenation requires logical asset mapping and exact audio/lead semantics; report red/green/blue samples do not establish all requested A/V boundaries.

Contract: Sequence-constructed adjacent clip timeline preserves declared A/V boundary semantics and source mapping, not just colored video samples.

Next bounded test / reopening condition: Define a two-clip queue contract and compare sequence versus explicit-offset output including audio priming; nonzero-origin/B-frame clip must not acquire unintended timing shifts.

Evidence: [work/batch_d/audits/R116.mse-sequence-mode-concatenation-report-paragraph-label.report-frontier.md](work/batch_d/audits/R116.mse-sequence-mode-concatenation-report-paragraph-label.report-frontier.md)

## R127.sequence-mode-cross-codec-concatenation-report-paragraph-label.report-frontier

**DEFER_SETUP — PREREQUISITE_PROBE**

Cross-container sequence joins require absent queue/configuration transaction and must retain selected audio; current changed-extradata rejection prevents accidental unsafe continuation.

Contract: Sequence-mode H264/fMP4-to-VP9/WebM join preserves requested A/V with valid configuration transition and truthful continuous presentation.

Next bounded test / reopening condition: Once queue mapping exists, test exactly one sequence-mode changeType join and compare end/start A/V identities; unsupported new config must roll back or fail rather than relabel.

Evidence: [work/batch_d/audits/R127.sequence-mode-cross-codec-concatenation-report-paragraph-label.report-frontier.md](work/batch_d/audits/R127.sequence-mode-cross-codec-concatenation-report-paragraph-label.report-frontier.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier

**DEFER_SETUP — SOURCE_REVIEW**

RangeReader already exposes byte-aligned cache requests; no Cues relocating/virtual byte-view writer exists. Historical near-equal totals only support request-shaping hypothesis, not a local byte-saving result.

Contract: Identical cluster bytes and frame recovery under Cues relocation; report startup/seek request timing separately from total bytes.

Next bounded test / reopening condition: Before building relocation, inspect current request timing for a real target; only if startup-versus-seek latency tradeoff matters compare front/tail Cues with unchanged cluster payloads and stale-offset control.

Evidence: [work/batch_d/audits/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier.md](work/batch_d/audits/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier.md)

## R131.automatically-search-equivalent-representations

**DEFER_SETUP — SOURCE_REVIEW**

Maintained pipeline has guarded fixed transforms, not a vetted recipe-search engine with relation oracles and budgets. Automated equivalent representation search is a separate offline system, not automatic route admission.

Contract: Only vetted transformations meeting declared frame/audio/timeline/seek/metadata relations can enter bounded offline comparison; no automatic route promotion.

Next bounded test / reopening condition: Define a two-recipe offline search only with explicit preconditions and payload/timing/seek oracle; intentionally non-equivalent recipe must be rejected and no result enters automatic routing.

Evidence: [work/batch_d/audits/R131.automatically-search-equivalent-representations.md](work/batch_d/audits/R131.automatically-search-equivalent-representations.md)

## R143.compressed-fragment-rewind-cache.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Buffered seeks already reuse live MSE; evicted fragments are not retained as compressed payload cache and source readers are retired on restart. Rewind-after-eviction needs bounded source/codec-keyed compressed ownership separate from MSE receipts.

Contract: Exact source/codec/RAP-bound compressed fragments can restore evicted interval and backward target under a byte cap, without stale source reuse.

Next bounded test / reopening condition: Specify one two-fragment byte-capped rewind cache with init/RAP dependencies; evict then reappend exact bytes and verify target frame, changed source or codec epoch must invalidate cache.

Evidence: [work/batch_d/audits/R143.compressed-fragment-rewind-cache.report-continuity.md](work/batch_d/audits/R143.compressed-fragment-rewind-cache.report-continuity.md)

## R192.identity-coded-witness-media

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Existing adaptation tests independently hash ordered video packets and complete PCM; browser signal monitoring uses pulses and frame progress, not time-local video/channel identities. Identity-coded witnesses add a distinct observer safeguard.

Contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Next bounded test / reopening condition: Reuse one tiny fixture with per-epoch visual codes and left/right tones; prove that reordered pictures, swapped channels and shifted audio are rejected by browser observations.

Evidence: [work/batch_e/audits/R192.identity-coded-witness-media.md](work/batch_e/audits/R192.identity-coded-witness-media.md), [sources/reports/R183-R192-report.md](sources/reports/R183-R192-report.md)

## R226.compact-exact-packet-index.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Current owner retains only bounded RAP times and live segment metadata, not a full six-scalar packet index. The reported 79.5% saving compares padded fields, not current MP4 tables; a persistent source-bound index owner is prerequisite.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Define the actual required seek fields and compare a bounded varint sidecar against existing container index plus sparse RAP records, including signed CTS and malformed deltas.

Evidence: [work/batch_e/audits/R226.compact-exact-packet-index.report-continuity.md](work/batch_e/audits/R226.compact-exact-packet-index.report-continuity.md), [sources/reports/R223-R231-report.md](sources/reports/R223-R231-report.md)

## R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram

**STOP_PROFILE — SOURCE_REVIEW**

Histogram push-forward is exact for declared pointwise integer LUT statistics, but the current player renders requested images and has no repeated candidate-statistics query stage. It cannot substitute for spatial effects or final rendering.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: If an analysis UI is requested, validate one immutable 10-bit ROI histogram against per-pixel LUT output, with equal-histogram spatial permutations as the limitation control.

Evidence: [work/batch_e/audits/R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram.md](work/batch_e/audits/R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram.md), [sources/proposals/Demuxe_R332_R337_Proposals.md](sources/proposals/Demuxe_R332_R337_Proposals.md)

## R120.repeat-media-without-repeating-mdat.report-frontier

**STOP_PROFILE — SOURCE_REVIEW**

The queue opens each source independently; it does not author repeated edit-list views. Repeating mdat references saves stored bytes but still decodes repeated pictures, so it is not a decode optimization for current playback.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: For an explicit repeat-export feature, compare repeated elst view to repeated payload with same frame identities, duration and browser edit semantics.

Evidence: [work/batch_e/audits/R120.repeat-media-without-repeating-mdat.report-frontier.md](work/batch_e/audits/R120.repeat-media-without-repeating-mdat.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R128.fast-playback-does-not-imply-cheap-decoding.report-frontier

**STOP_PROFILE — SOURCE_REVIEW**

The maintained rate setter changes playbackRate only. The supplied report shows every source frame decoded at faster rates, decisively rejecting faster playback itself as a dependable decode-work saving.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: If lower cadence is explicitly requested, compare dependency-valid thinning against the same playback rate, counting decoded frames and retained output identities.

Evidence: [work/batch_e/audits/R128.fast-playback-does-not-imply-cheap-decoding.report-frontier.md](work/batch_e/audits/R128.fast-playback-does-not-imply-cheap-decoding.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier

**STOP_PROFILE — SOURCE_REVIEW**

The rate control does not expose changed-pitch permission. Disabling pitch preservation changes audible output; overlapping historical CPU samples cannot justify silently changing that contract.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: With explicit pitch-shift semantics, compare pitch-preserving and non-preserving playback on one marked tone and include 1x control before cost measurements.

Evidence: [work/batch_e/audits/R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier.md](work/batch_e/audits/R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier.md), [sources/reports/R116-R131-report.md](sources/reports/R116-R131-report.md)

## R141.no-index-fragmented-mp4-native-remote-seek.report-continuity

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Direct remote sources delegate seeking to the browser; no-index fMP4 scanning may fetch the whole resource even when seek succeeds. Existing range transport supplies the controlled-request baseline, but historical six-second totals do not characterize large current sources.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Serve one existing fMP4 with/without its random-access trailer under identical capped ranges; seek late and record fetched versus useful bytes, preserving exact frames.

Evidence: [work/batch_e/audits/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md](work/batch_e/audits/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md), [sources/reports/R132-R145-report.md](sources/reports/R132-R145-report.md)

## R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

Local File playback already goes through an object URL and direct-first policy. There is no rule rejecting local media solely for lacking mfra; the locality-dependent direct attempt exists without a new adapter.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Do not add an index solely for already-local bytes; use one no-index local fixture as a regression when changing direct admission.

Evidence: [work/batch_e/audits/R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity.md](work/batch_e/audits/R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity.md), [sources/reports/R132-R145-report.md](sources/reports/R132-R145-report.md)

## R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity

**STOP_PROFILE — SOURCE_REVIEW**

Current adaptation does not claim arbitrary AAC sample-exact restarts. The cited default AAC-LC failure after 100 preroll frames invalidates codec-name-only or fixed-count exact-seek claims; tool-aware admission is necessary.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: For an exact PCM suffix feature, inspect AAC tools and compare continuous decode with one admitted restart plus a PNS/TNS-enabled counterexample.

Evidence: [work/batch_e/audits/R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity.md](work/batch_e/audits/R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity.md), [sources/reports/R223-R231-report.md](sources/reports/R223-R231-report.md)

## R240.vp9-webm-cluster-surgery.report-c

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

WebM output has explicit cluster policy, so packet-identical smaller clusters are a localized mux choice. The report proves same pictures but no startup or delivery benefit; splitting cannot invent RAPs.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Inspect current VP9 cluster release on one existing source, then lower only cluster boundary policy if it withholds useful bytes; compare packet hashes and first usable output with non-RAP seek control.

Evidence: [work/batch_e/audits/R240.vp9-webm-cluster-surgery.report-c.md](work/batch_e/audits/R240.vp9-webm-cluster-surgery.report-c.md), [sources/reports/R239-R245-rerun-report.md](sources/reports/R239-R245-rerun-report.md)

## R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding

**DEFER_SETUP — SOURCE_REVIEW**

Current finite plans preserve requested audio or explicitly allow lossy encoding; no separate permission represents discarding compatibility extensions. DTS core is not automatically browser-supported, so extraction alone does not establish a usable route.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Identify one true core-plus-extension fixture and explicitly permitted core output, then query/decode that exact core destination before adding a dca_core path.

Evidence: [work/batch_e/audits/R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding.md](work/batch_e/audits/R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## R174.flac-bit-depth-promotion-without-sample-reconstruction

**DEFER_SETUP — SOURCE_REVIEW**

Current FLAC admission requires established 16/24-bit integer precision and ordinary encode, so 20-bit framing promotion is not present. The one-frame mono result needs a bounded subframe parser and truthful STREAMINFO/CRC rewriting.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Prototype only independent mono 20-to-24 wasted-bit promotion and compare normalized exact samples, rejecting decorrelated stereo and malformed residual bounds.

Evidence: [work/batch_e/audits/R174.flac-bit-depth-promotion-without-sample-reconstruction.md](work/batch_e/audits/R174.flac-bit-depth-promotion-without-sample-reconstruction.md), [sources/reports/R172-R182-report.md](sources/reports/R172-R182-report.md)

## R219.shared-spectral-analysis

**STOP_PROFILE — SOURCE_REVIEW**

The current browser audio stage is a PCM consumer; the qualified filter subset is scalar volume, with no repeated source FFT across multiple FIR outputs. Shared FFT algebra is valid but there is no duplicated transform at this owner to remove.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: If a multichannel convolution plan is requested, audit its baseline FFT sharing first and compare complete identical tails, latency and sample error.

Evidence: [work/batch_e/audits/R219.shared-spectral-analysis.md](work/batch_e/audits/R219.shared-spectral-analysis.md), [sources/reports/R214-R222-report.md](sources/reports/R214-R222-report.md)

## R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass

**DEFER_SETUP — SOURCE_REVIEW**

Retained output uses canvas and current YUV presentation combines geometry/color conversion but subtitles remain a separate draw; requested video filters still require Software. GPU capability exists, yet a retained-frame effect contract/shader registry is not implemented.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Define one exact rotation plus simple color operation and compare a research fused presenter against existing output pixels including subtitle alpha and context loss.

Evidence: [work/batch_e/audits/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass.md](work/batch_e/audits/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R085.out-of-order-gop-decode-and-reverse-presentation

**DEFER_SETUP — SOURCE_REVIEW**

The retained owner holds a bounded forward queue plus current frame, not independent GOP caches or reverse scheduling. Historical success used prepared independent GOP encodes and its concurrent decoder stress missed frames.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: Scope a single closed-GOP reverse buffer with an explicit byte cap and exact frame IDs before parallel decode; include a non-independent GOP rejection.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_e/audits/R085.out-of-order-gop-decode-and-reverse-presentation.md](work/batch_e/audits/R085.out-of-order-gop-decode-and-reverse-presentation.md), [sources/reports/R82-R87-report.md](sources/reports/R82-R87-report.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R087.dependency-aware-transport

**STOP_PROFILE — SOURCE_REVIEW**

Current source delivery requires exact validated file ranges. Synthetic base/enhancement WebSocket loss demonstrates a dependency rule, not fidelity-preserving transport for ordinary compressed files; degraded frames are outside the current output request.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: For explicitly permitted scalable live delivery, first establish a real coded layer dependency and deadline-aware transport, with missing-base rejection.

Evidence: [work/batch_e/audits/R087.dependency-aware-transport.md](work/batch_e/audits/R087.dependency-aware-transport.md), [sources/reports/R82-R87-report.md](sources/reports/R82-R87-report.md)

## R093.opus-repacketization-without-pcm-decoding

**DEFER_SETUP — SOURCE_REVIEW**

Current packet-copy mux preserves packet boundaries; no Opus repacketizer owns grouping or compatible mode transitions. Historical exact PCM is promising but output packet reduction trades against arrival latency rather than meaningful file savings.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Add an isolated host/component repacketizer for one existing 20ms source, split grouped 40/60ms packets back, and compare exact trim plus configuration-change rejection.

Evidence: [work/batch_e/audits/R093.opus-repacketization-without-pcm-decoding.md](work/batch_e/audits/R093.opus-repacketization-without-pcm-decoding.md), [sources/proposals/R88-R101-research-backlog.md](sources/proposals/R88-R101-research-backlog.md)

## R096.sparse-native-video-with-explicit-long-frame-holds

**STOP_PROFILE — SOURCE_REVIEW**

Sparse long-held pictures are valid for an explicitly static authored timeline; ordinary source playback cannot drop changing/dependent pictures. Current direct route can already attempt prepared sparse files, so a new runtime mechanism is not justified for general playback.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: For a slide/static-source product request, compare three long-duration pictures plus continuous audio to the same timeline encoded conventionally, including final-hold seek.

Evidence: [work/batch_e/audits/R096.sparse-native-video-with-explicit-long-frame-holds.md](work/batch_e/audits/R096.sparse-native-video-with-explicit-long-frame-holds.md), [sources/proposals/R88-R101-research-backlog.md](sources/proposals/R88-R101-research-backlog.md)

## R098.one-atlas-video-for-many-synchronized-visible-clips

**STOP_PROFILE — SOURCE_REVIEW**

Current player presents one selected timeline, with no simultaneously visible synchronized grid. Atlas preparation requires re-encoding and forces shared seeking, so it does not preserve arbitrary independent-player behavior.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: For an all-visible synchronized grid request, author four-view atlas and independent references at equal quality, then compare resources including hidden-region cost.

Evidence: [work/batch_e/audits/R098.one-atlas-video-for-many-synchronized-visible-clips.md](work/batch_e/audits/R098.one-atlas-video-for-many-synchronized-visible-clips.md), [sources/proposals/R88-R101-research-backlog.md](sources/proposals/R88-R101-research-backlog.md)

## R103.join-split-or-reorder-independent-flac-channel-subframes

**DEFER_SETUP — SOURCE_REVIEW**

Maintained FLAC path decodes selected audio and admits mono/stereo; no residual-bit parser exposes independent subframes. Compressed channel selection is distinct from whole-track selection and needs new bounded framing/layout logic.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Parse one independently coded four-channel FLAC and copy two complete subframe bit ranges; compare every sample with decode-select-reencode and reject mid/side or mismatched blocks.

Evidence: [work/batch_e/audits/R103.join-split-or-reorder-independent-flac-channel-subframes.md](work/batch_e/audits/R103.join-split-or-reorder-independent-flac-channel-subframes.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## R106.recall-stored-av1-pictures-with-coded-display-instructions

**DEFER_SETUP — SOURCE_REVIEW**

The decoder bridge consumes complete encoded units and does not author AV1 reference dictionaries. Historical alt-ref overlays prove decoder support but did not build the proposed dictionary and were larger than the control.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Author one explicit A/B/A/C schedule with legal showable reference slots and compare to a normal reference-aware encode; reject missing/overwritten slots.

Evidence: [work/batch_e/audits/R106.recall-stored-av1-pictures-with-coded-display-instructions.md](work/batch_e/audits/R106.recall-stored-av1-pictures-with-coded-display-instructions.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## R109.expose-an-edited-mp4-as-a-virtual-byte-range-url

**DEFER_SETUP — SOURCE_REVIEW**

RangeReader is a consumer, not a virtual source server, and the existing MP4 probe does not author sample tables. The historical virtual resource reused reference-authored headers, leaving core mapping/authoring and authority work unresolved.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Specify one video-only closed-GOP A/B/A address map, compare random cross-boundary ranges with a materialized oracle, and reject changed source validators.

Evidence: [work/batch_e/audits/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url.md](work/batch_e/audits/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## R122.reservoir-aware-mp3-repacketization

**DEFER_SETUP — SOURCE_REVIEW**

MP3 currently passes as complete codec packets to ordinary muxing. No parser exposes reservoir-dependent coded units or synthesis-state restart certificates; packet reshuffling could preserve headers while changing output.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Use one reservoir-bearing MP3 excerpt to compare ordinary decode and reconstructed units across repeated starts, with a missing reservoir dependency control.

Evidence: [work/batch_e/audits/R122.reservoir-aware-mp3-repacketization.md](work/batch_e/audits/R122.reservoir-aware-mp3-repacketization.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R135.decode-seek-preroll-without-producing-unwanted-presentation-frames

**DEFER_SETUP — SOURCE_REVIEW**

Current remux preserves encoded samples and decoder bridge has no AV1 display-instruction rewriter. Suppressing presentation while retaining reference decoding requires authoring legal hidden preroll, not toggling a generic visibility flag.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: Prepare one reference-decoder-validated AV1 preroll sequence, compare continuing pictures and timestamps, and remove a required reference as adverse control.

Evidence: [work/batch_e/audits/R135.decode-seek-preroll-without-producing-unwanted-presentation-frames.md](work/batch_e/audits/R135.decode-seek-preroll-without-producing-unwanted-presentation-frames.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R150.recovery-windows-rather-than-immediate-clean-access-assumptions

**DEFER_SETUP — SOURCE_REVIEW**

The current packet route requires IDR start and buffered seeking requires a retained RAP. Recovery-point SEI could widen admission only with a separately represented verified recovery boundary; no such owner exists.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: Add research metadata for access offset plus signaled recovery count on one intra-refresh fixture, compare every admitted frame to continuous decode and corrupt the count.

Evidence: [work/batch_e/audits/R150.recovery-windows-rather-than-immediate-clean-access-assumptions.md](work/batch_e/audits/R150.recovery-windows-rather-than-immediate-clean-access-assumptions.md), [sources/reports/R146-R158-report.md](sources/reports/R146-R158-report.md)

## R151.parsed-coefficients-as-a-cache-tier

**STOP_PROFILE — SOURCE_REVIEW**

Current retained caches hold decoded video frames, not repeated JPEG crop/downsample queries. The report itself shows coefficient storage larger than pixels and excludes object/RSS costs; it does not justify replacing this playback cache tier.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: If an image ROI service is requested, compare compressed/coefficient/pixel policies with one shared byte budget and an optimized reconstruction oracle.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_e/audits/R151.parsed-coefficients-as-a-cache-tier.md](work/batch_e/audits/R151.parsed-coefficients-as-a-cache-tier.md), [sources/reports/R146-R158-report.md](sources/reports/R146-R158-report.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R161.roll-back-speculative-audio-when-a-late-packet-arrives

**DEFER_SETUP — SOURCE_REVIEW**

PCM ring publication has consumed/written counters but no provisional rollback window; browser decoder state is opaque. Snapshotting software Opus state also requires a matching copyable decoder ABI and a pre-commit output owner.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Define one host-only late-packet transaction before PCM publication and prove restored suffix equality; explicitly reject rollback after consumed advances.

Evidence: [work/batch_e/audits/R161.roll-back-speculative-audio-when-a-late-packet-arrives.md](work/batch_e/audits/R161.roll-back-speculative-audio-when-a-late-packet-arrives.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R163.recover-an-interrupted-recording-from-a-committed-sample-journal

**STOP_PROFILE — SOURCE_REVIEW**

Current remux streams bounded transient fragments into MSE; it is not a durable recorder and has no journal/fsync commitment contract. Recovery of a recording is useful but no existing persisted-output path is being optimized.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: When recording/export is requested, define payload/journal commit ordering and recover exact committed packet prefixes after controlled truncation.

Evidence: [work/batch_e/audits/R163.recover-an-interrupted-recording-from-a-committed-sample-journal.md](work/batch_e/audits/R163.recover-an-interrupted-recording-from-a-committed-sample-journal.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes

**DEFER_SETUP — SOURCE_REVIEW**

Current source authority uses validated HTTP ranges or local File identity, with no BitTorrent peer/hash-request or trusted BEP52 root input. Six verified leaves are a useful primitive but need an authenticated leaf-to-media byte provider.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: Define one read-only provider exposing only verified 16KiB leaves for an existing fMP4 prefix; reject wrong root, proof position and changed source before append.

Evidence: [work/batch_e/audits/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes.md](work/batch_e/audits/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes.md), [sources/reports/R203-R213-report.md](sources/reports/R203-R213-report.md)

## R228.naive-aac-splice-is-rejected.report-continuity

**STOP_PROFILE — SOURCE_REVIEW**

The supplied counterexample preserves lengths/sample counts yet changes decoded AAC B, decisively invalidating naive concatenation. Current queue opens each source separately rather than claiming same-header raw splice continuity.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: If seamless AAC composition is needed, compare explicit reset/priming treatment against independently decoded segments with full sample equality.

Evidence: [work/batch_e/audits/R228.naive-aac-splice-is-rejected.report-continuity.md](work/batch_e/audits/R228.naive-aac-splice-is-rejected.report-continuity.md), [sources/reports/R223-R231-report.md](sources/reports/R223-R231-report.md)

## R239.packet-granular-ogg-opus-repagination.report-c

**DEFER_SETUP — SOURCE_REVIEW**

Maintained output builds/mux contracts target MP4/WebM, not Ogg page production. Historical one-packet pages preserved PCM but grew 8.52%; a parser/repage path needs a delivery-latency use case.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Measure source-page withholding on one actual Ogg delivery trace, then reconstruct only one-packet pages with exact packet/granule/CRC checks and truncated continuation rejection.

Evidence: [work/batch_e/audits/R239.packet-granular-ogg-opus-repagination.report-c.md](work/batch_e/audits/R239.packet-granular-ogg-opus-repagination.report-c.md), [sources/reports/R239-R245-rerun-report.md](sources/reports/R239-R245-rerun-report.md)

## R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a

**STOP_PROFILE — SOURCE_REVIEW**

Browser decoding exposes packets and frames, not residual transforms. The historical cache is slower on unique/mixed synthetic traces and approximately tied on repetitive pools; no real decoder trace or hook establishes opportunity.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Collect a representative transform histogram from an existing software decoder only if cheap; compare against its actual SIMD/zero/DC paths before building a cache.

Evidence: [work/batch_e/audits/R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a.md](work/batch_e/audits/R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a.md), [sources/reports/R239-R246-report.md](sources/reports/R239-R246-report.md)

## R319.checkpoint-png-paeth-row-state.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Current byte readers do not expose inflated PNG rows or a PNG filter decoder. Prior-row checkpoints reduce post-inflate Paeth replay only; ordinary compressed-file random access still needs independent inflate state.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: On already-inflated rows, compare band reconstruction with checkpoint versus row-zero replay and changed-prior-row rejection; account separately for full-file inflate.

Evidence: [work/batch_e/audits/R319.checkpoint-png-paeth-row-state.report-continuity.md](work/batch_e/audits/R319.checkpoint-png-paeth-row-state.report-continuity.md), [sources/reports/R318-R323-report.md](sources/reports/R318-R323-report.md)

## R320.gram-cache-after-a-fixed-fir-effect.report-continuity

**STOP_PROFILE — SOURCE_REVIEW**

There is no repeated gain-vector energy-analysis stage over fixed filtered stems in current playback. Gram quadratic forms answer aggregate energy only and do not replace actual mixed samples or changing FIR processing.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: For an analysis tool, compare g-transpose-G-g with direct mixed energy over a fixed window, including changed filter/stem identity and clipped nonlinear control.

Evidence: [work/batch_e/audits/R320.gram-cache-after-a-fixed-fir-effect.report-continuity.md](work/batch_e/audits/R320.gram-cache-after-a-fixed-fir-effect.report-continuity.md), [sources/reports/R318-R323-report.md](sources/reports/R318-R323-report.md)

## R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier

**DEFER_SETUP — SOURCE_REVIEW**

The existing producer uses general FFmpeg FLAC encoding and compatible packet muxing; a true verbatim formatter is a new bitstream component. The historical host advantage includes executable differences and can multiply output bytes almost sevenfold.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Build one isolated S16 mono/stereo verbatim formatter with valid CRC/frame metadata, compare exact PCM and same-duration level0/5 output including total bytes and decoder work.

Evidence: [work/batch_e/audits/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier.md](work/batch_e/audits/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## R104.select-or-assemble-whole-opus-elementary-streams-without-pcm

**DEFER_SETUP — SOURCE_REVIEW**

Whole-track Opus packaging exists but selected component streams and family255 mapping are not exposed; current adaptation is mono/stereo. A self-delimiting component parser plus truthful layout/trim contract is needed.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Extract one entire independent mono component and one coupled pair from a marked fixture, compare payload/PCM and reject half-pair selection or mismatched pre-skip.

Evidence: [work/batch_e/audits/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm.md](work/batch_e/audits/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md)

## R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images

**DEFER_SETUP — SOURCE_REVIEW**

Current source worker consumes finite files/ranges and video adapter describes supported codecs; neither owns RTP/JPEG transport table parameters or missing-header reconstruction. Correct scan bytes alone cannot supply truthful JPEG tables.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Obtain one complete RTP/JPEG frame with explicit quantization/restart/geometry metadata, reconstruct its header and compare decoded pixels with an independent source, rejecting missing tables.

Evidence: [work/batch_e/audits/R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images.md](work/batch_e/audits/R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R147.random-access-inside-an-ordinary-zip-deflate-entry

**DEFER_SETUP — SOURCE_REVIEW**

Source readers expose literal file/range bytes with no archive coordinate mapping. Historical zlib snapshots are opaque process-local state and require a full initial inflate/CRC pass; browser DecompressionStream presence supplies no snapshot API.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Specify one owned inflate-state index for a bounded ZIP entry and compare random output ranges byte-for-byte, with bare compressed-cursor restart rejected.

Evidence: [work/batch_e/audits/R147.random-access-inside-an-ordinary-zip-deflate-entry.md](work/batch_e/audits/R147.random-access-inside-an-ordinary-zip-deflate-entry.md), [sources/reports/R146-R158-report.md](sources/reports/R146-R158-report.md)

## R223.flac-frame-range-microstream.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Current playback copies/muxes FLAC packets but does not create standalone range microfiles. The cited suffix kept stale STREAMINFO totals, so its exact PCM is not a truthful standalone metadata contract.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Extract complete frames from one FLAC suffix, fix total samples/checksum policy and compare exact suffix samples plus reported duration.

Evidence: [work/batch_e/audits/R223.flac-frame-range-microstream.report-continuity.md](work/batch_e/audits/R223.flac-frame-range-microstream.report-continuity.md), [sources/reports/R223-R231-report.md](sources/reports/R223-R231-report.md)

## R239.extract-an-av1-operating-point-before-decoding.report-a

**DEFER_SETUP — SOURCE_REVIEW**

Current AV1 path copies complete packets; no operating-point OBU parser exposes layer dependencies or a lower-cadence permission. Historical exact extraction is strongly fixture-scoped and required real SVC authoring.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: For explicitly requested lower cadence, use the identified SVC fixture and verify retained OBU/timestamp/picture identity with missing-base and truncated OBU controls.

Evidence: [work/batch_e/audits/R239.extract-an-av1-operating-point-before-decoding.report-a.md](work/batch_e/audits/R239.extract-an-av1-operating-point-before-decoding.report-a.md), [sources/reports/R239-R246-report.md](sources/reports/R239-R246-report.md)

## R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a

**STOP_PROFILE — SOURCE_REVIEW**

The current admitted audio graph has no exactly factorizable FIR bank; the host rank-two win depends on supplied factors and excludes clipping. No 16-to-2 filter transformation applies to scalar volume or arbitrary filters.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: If a matrix convolution bank is introduced, verify exact coefficient factorization and compare to the existing shared-FFT baseline, with perturbation and intermediate-clipping controls.

Evidence: [work/batch_e/audits/R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a.md](work/batch_e/audits/R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a.md), [sources/reports/R239-R246-report.md](sources/reports/R239-R246-report.md)

## R245.standalone-flac-from-original-frames.report-c

**DEFER_SETUP — SOURCE_REVIEW**

This report supplies corrected STREAMINFO and exact bounded PCM for three original FLAC frames, unlike the R223 stale-total microstream. Current player has no standalone audio-excerpt author; importing this requires that narrow framing owner.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Implement one complete-frame excerpt writer only when requested, correct total samples/checksum, and compare frame payloads, PCM, duration and corrupted CRC rejection.

Evidence: [work/batch_e/audits/R245.standalone-flac-from-original-frames.report-c.md](work/batch_e/audits/R245.standalone-flac-from-original-frames.report-c.md), [sources/reports/R239-R245-rerun-report.md](sources/reports/R239-R245-rerun-report.md)

## R268.aac-selective-channel-element-reconstruction

**DEFER_SETUP — SOURCE_REVIEW**

AAC initialization is parsed for muxing, but element-level SCE dependency admission/rewriting is not implemented. Whole audio-track selection is not independent channel-element selection; arbitrary CPE/SBR tools cannot inherit the six-SCE result.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Use one independent-SCE AAC fixture to select element4 and compare full source-channel PCM, rejecting CPE, SBR, prediction and coupling.

Evidence: [work/batch_e/audits/R268.aac-selective-channel-element-reconstruction.md](work/batch_e/audits/R268.aac-selective-channel-element-reconstruction.md), [sources/reports/R268-R275-report.md](sources/reports/R268-R275-report.md)

## R241.jpeg-90-dct-domain-rotation.report-c

**STOP_PROFILE — SOURCE_REVIEW**

Existing display rotation operates after decode and preserves current presentation semantics. Coefficient-domain JPEG rotation is an export/representation operation with up-to-two-level IDCT differences, not an exact pixel replacement for present display rotation.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: For requested JPEG export without requantization, compare all coefficients/quantization tables and report decoded rounding difference separately.

Evidence: [work/batch_e/audits/R241.jpeg-90-dct-domain-rotation.report-c.md](work/batch_e/audits/R241.jpeg-90-dct-domain-rotation.report-c.md), [sources/reports/R239-R245-rerun-report.md](sources/reports/R239-R245-rerun-report.md)

## R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a

**DEFER_SETUP — SOURCE_REVIEW**

The shared current probe exposes a nonfallback Apple GPU, so the historical no-GPU blocker is stale. A conforming gain-map fixture/reference and an UltraHDR metadata/reconstruction path remain unprovided; current SDR YUV shader is not that implementation.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Acquire one pinned conforming gain-map image and decoded HDR reference, then audit metadata and browser component decode before a reconstruction shader.

Evidence: [work/batch_e/audits/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a.md](work/batch_e/audits/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a.md), [sources/reports/R239-R246-report.md](sources/reports/R239-R246-report.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R010.screen-float-preserving-destinations-before-writing-adapters

**INCONCLUSIVE — SOURCE_REVIEW**

An existing Float32 PCM worklet path can consume float samples, while native FLAC deliberately rejects float precision and the report rejects tested raw-PCM MSE routes. The unresolved requirement is one complete browser-owned native A/V clock, not whether float samples can exist anywhere.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Query exact current direct Float32 WAV and proposed streaming MIME, then require a unified A/V destination; do not build an adapter if only complete audio files succeed.

Evidence: [work/batch_e/audits/R010.screen-float-preserving-destinations-before-writing-adapters.md](work/batch_e/audits/R010.screen-float-preserving-destinations-before-writing-adapters.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Shared secure-localhost evidence now exposes AudioEncoder, removing the old opaque-page API blocker. Current lossy path uses a Wasm Opus encoder, so exact codec/rate/channel support and PCM transfer overhead are the next bounded questions.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Query one 48kHz stereo Opus AudioEncoder profile and encode a tiny known PCM block; inspect delay/padding and decoded output before any comparison with matching Wasm settings.

Evidence: [work/batch_e/audits/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md](work/batch_e/audits/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R025.try-a-generated-video-track-as-an-alternative-presenter

**INCONCLUSIVE — PREREQUISITE_PROBE**

Current Chrome exposes legacy MediaStreamTrackGenerator in the window only; VideoTrackGenerator is absent in both contexts. This removes uncertainty about default exposure but leaves the reported write/stall and timestamp scheduling question unresolved. API presence alone does not justify a presenter benefit or working sink claim.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Run one fresh video-only generator exposure/write/close probe, require ordered frame identity under delayed arrival and compare with existing canvas scheduling.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_e/audits/R025.try-a-generated-video-track-as-an-alternative-presenter.md](work/batch_e/audits/R025.try-a-generated-video-track-as-an-alternative-presenter.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [evidence/prerequisites/api-gates.json](evidence/prerequisites/api-gates.json), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R030.investigate-containerless-encoded-chunk-mse

**HOLD_ENV — PREREQUISITE_PROBE**

appendEncodedChunks is absent in both window and dedicated worker on the current default Chrome configuration; ordinary appendBuffer is present. No encoded-chunk candidate ran. Experimental feature enablement is a separate research configuration, not a negative mechanism result.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Read the exact appendEncodedChunks/config-based API presence on unmodified Chrome and record flags; if absent, stop as an upstream-watch environment gate.

Evidence: [work/batch_e/audits/R030.investigate-containerless-encoded-chunk-mse.md](work/batch_e/audits/R030.investigate-containerless-encoded-chunk-mse.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md), [evidence/prerequisites/api-gates.json](evidence/prerequisites/api-gates.json)

## R022.use-document-pip-to-keep-native-subtitles-and-controls

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

NativeASS explicitly disables video-only PiP and binds document fullscreen/listeners; player disconnection may trigger lifecycle cleanup. Document PiP is a concrete destination need but requires moving the owner without accidental destruction.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Query Document PiP under user activation in a normal desktop session, then move one paused ASS container and verify restore/resize/listener ownership before playback.

Evidence: [work/batch_e/audits/R022.use-document-pip-to-keep-native-subtitles-and-controls.md](work/batch_e/audits/R022.use-document-pip-to-keep-native-subtitles-and-controls.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## R008.keep-display-only-transformations-out-of-cpu-video-filters

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Metadata rotation/aspect already reaches presentation transforms, but every requested video-filter string still forces Software. A distinct display-operation API could reuse those owners without reinterpreting pixel-processing semantics.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Trace one explicitly display-only rotation/mirror request against software reference pixels and subtitle/pointer geometry; preserve pixel-filter APIs and source metadata separately.

Evidence: [work/batch_e/audits/R008.keep-display-only-transformations-out-of-cpu-video-filters.md](work/batch_e/audits/R008.keep-display-only-transformations-out-of-cpu-video-filters.md), [sources/proposals/Demuxe_Routing_Optimization_Ideas.md](sources/proposals/Demuxe_Routing_Optimization_Ideas.md)

## R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

Current eviction chooses known RAPs behind playback and buffered seek checks live ranges plus retained RAP coverage. The proposed application-level boundary mechanism is already present; browser allocation opacity remains.

Contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Next bounded test / reopening condition: No duplicate eviction policy; add one long-GOP rewind regression only when changing retention budgets or RAP mapping.

Evidence: [work/batch_e/audits/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media.md](work/batch_e/audits/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## R053.coalesce-gain-gestures-into-audio-clock-automation

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current GainNode updates are immediate setValueAtTime calls; ordinary slider volume currently commits on change. A short ramp is an explicitly different transition contract and a localized quality probe, not established CPU optimization.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Compare step versus 5ms gain-ramp envelopes in OfflineAudioContext, with emergency zero immediate and one media-element graph lifecycle control.

Evidence: [work/batch_e/audits/R053.coalesce-gain-gestures-into-audio-clock-automation.md](work/batch_e/audits/R053.coalesce-gain-gestures-into-audio-clock-automation.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## R056.map-repeated-clip-boundaries-in-integer-media-ticks

**STOP_PROFILE — SOURCE_REVIEW**

Current queue activates independent sources after ended rather than accumulating rounded clip durations onto one timeline. No cumulative float-offset algorithm exists at this owner; the historical arithmetic report also rejects a contrived rounded baseline.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: If continuous composition is added, retain rational source timestamps and compare late joins directly against exact sample counts.

Evidence: [work/batch_e/audits/R056.map-repeated-clip-boundaries-in-integer-media-ticks.md](work/batch_e/audits/R056.map-repeated-clip-boundaries-in-integer-media-ticks.md), [sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)

## R070.remove-the-intermediate-host-remux

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

Maintained rm_open already bounded-prefetches AAC and derives initialization before direct fragmented output; there is no intermediate host MP4 stage in runtime. The lab two-pass removal is therefore not a missing production optimization.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Retain AAC initialization negative control when changing TS preparation; no duplicated pipeline simplification needed.

Evidence: [work/batch_e/audits/R070.remove-the-intermediate-host-remux.md](work/batch_e/audits/R070.remove-the-intermediate-host-remux.md), [sources/reports/R70-R75-report.md](sources/reports/R70-R75-report.md)

## R071.tune-flac-effort-without-changing-frame-duration

**INCONCLUSIVE — SOURCE_REVIEW**

Current encoder defaults level5 as reviewed. Historical level0 saved little host CPU while increasing bytes, and its forced block size is not matching maintained frame_size; this does not prove the same Wasm tradeoff.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: If preparation CPU becomes a bottleneck, compare level0 and5 with identical actual frame duration and full decoded samples using existing fixtures; charge bytes and browser decoder work.

Evidence: [work/batch_e/audits/R071.tune-flac-effort-without-changing-frame-duration.md](work/batch_e/audits/R071.tune-flac-effort-without-changing-frame-duration.md), [sources/reports/R70-R75-report.md](sources/reports/R70-R75-report.md)

## R075.compact-large-seek-maps-with-checkpoints

**DEFER_SETUP — SOURCE_REVIEW**

The current JS metadata probe is bounded and does not retain a dense 100000-entry seek map; FFmpeg owns the live demux index under a 4 MiB cap. The reported delta/checkpoint representation saves synthetic array bytes but does not identify a current array owner to replace.

Contract: Source-bound immutable monotonic time/byte map with exact predecessor queries above 4 GiB and safe-integer/varint rejection.

Next bounded test / reopening condition: Inspect one large-source real FFmpeg index allocation and expose its actual query/identity contract before testing block-16 deltas.

Evidence: [work/batch_f/audits/R075.compact-large-seek-maps-with-checkpoints.md](work/batch_f/audits/R075.compact-large-seek-maps-with-checkpoints.md)

## R095.fixed-opus-gain-through-codec-container-headers

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Native gain currently creates one media-element Web Audio gain stage. Fixed Opus output-gain metadata is a narrower explicit static-asset request and could avoid that graph; the report has packet and amplitude controls, but container honor and existing gain combination are not established for the current served route.

Contract: Explicit static attenuation preserves Opus packet identity, rate/layout and existing gain semantics without claiming live slider equivalence.

Next bounded test / reopening condition: Use one Opus asset with existing nonzero header gain; compare fixed -6 dB header preparation with the current gain node on one admitted container and one seek.

Evidence: [work/batch_f/audits/R095.fixed-opus-gain-through-codec-container-headers.md](work/batch_f/audits/R095.fixed-opus-gain-through-codec-container-headers.md)

## R107.separate-av1-base-decoding-from-film-grain-reconstruction

**DEFER_SETUP — SOURCE_REVIEW**

Browser video submission preserves AV1 coded payloads and returns reconstructed frames; no grain-disable bitstream parser or grain synthesis component exists here. Historical host grain-off CPU improvement intentionally changes pictures and is not an exact-output result.

Contract: Preserve AV1 reference pictures, per-frame grain seed/inheritance and chosen post-grain reference algorithm; grain-off is a separately requested changed presentation.

Next bounded test / reopening condition: First inventory one valid AV1 grain fixture and a reference exposing pre/post-grain planes; scope a parser-only sidecar before any external synthesis.

Evidence: [work/batch_f/audits/R107.separate-av1-base-decoding-from-film-grain-reconstruction.md](work/batch_f/audits/R107.separate-av1-base-decoding-from-film-grain-reconstruction.md)

## R158.structure-aware-failure-preserving-reduction

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current packaging negotiation and runtime capture provide a place for a differential destination predicate, but no structure-aware reducer is present. The historical laced/unlaced WebM predicate is concrete and can be reused as an oracle design, not presumed a current Chrome failure.

Contract: Reduction must preserve a parsed audio stream, specific laced rejection, unlaced acceptance and equal nonempty decoded PCM.

Next bounded test / reopening condition: Reconfirm the original laced/unlaced destination distinction first; if reproduced, reduce one element while preserving EBML lengths and the positive control.

Evidence: [work/batch_f/audits/R158.structure-aware-failure-preserving-reduction.md](work/batch_f/audits/R158.structure-aware-failure-preserving-reduction.md)

## R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

The historical seven-witness result used abstract routes. Current planAdmission is a finite executable decision function with explicit isolation, subtitle and lossless-policy guards; maintained tests already encode useful distinctions. A model-derived subset must be checked against this actual function.

Contract: An offline witness subset preserves real route-pair distinctions and known injected policy faults; it does not replace complete qualification.

Next bounded test / reopening condition: Build a truth table from existing plan-admission fixtures, select a compact subset and hold out changed-policy cases without modifying admission.

Evidence: [work/batch_f/audits/R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors.md](work/batch_f/audits/R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors.md)

## R179.exact-subtitle-font-subsetting

**STOP_PROFILE — SOURCE_REVIEW**

The full report shows a concrete decomposed combining-acute mismatch for the subset recipe. Current libass receives complete supplied fonts under byte/cache limits; reducing these fonts with that failed recipe cannot preserve the exact subtitle contract. This is a historical experimental rejection, not a new test or an environment blocker.

Contract: Same shaping, glyph positions and raster bytes for the complete declared track/font configuration.

Next bounded test / reopening condition: Reopen only with a corrected font-subset recipe retaining the missing combining-mark behavior; compare isolated glyphs and the full ASS composition.

Evidence: [work/batch_f/audits/R179.exact-subtitle-font-subsetting.md](work/batch_f/audits/R179.exact-subtitle-font-subsetting.md)

## R185.progressively-refine-one-preview

**DEFER_SETUP — SOURCE_REVIEW**

The existing seek UI and retained video draw have no progressive-image preview resource owner. The report relies on compositor-visible progressive JPEG states that canvas did not expose; piping through current canvas drawing would not reproduce that mechanism.

Contract: Preview is explicitly provisional and may refine; replacement cancels obsolete image and only the new source can commit.

Next bounded test / reopening condition: Specify one image-element preview owner and source-generation token before using a progressive JPEG; inspect compositor refinement and cancel before final scan.

Evidence: [work/batch_f/audits/R185.progressively-refine-one-preview.md](work/batch_f/audits/R185.progressively-refine-one-preview.md)

## R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility

**DEFER_SETUP — SOURCE_REVIEW**

chooseVariant uses explicit representation or bandwidth while planAdmission separately enforces complete playback requirements. There is a genuine compatibility-policy separation, but current bounded manifest selection is not a qualified dynamic ABR owner; per-track invalidation requires a larger streaming transition contract.

Contract: Representation changes preserve requested language, quality bounds, subtitles, HDR and source authority under one timeline owner.

Next bounded test / reopening condition: Audit one two-rendition manifest selection against complete-plan facts before introducing runtime switching; retain explicit representation intent.

Evidence: [work/batch_f/audits/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility.md](work/batch_f/audits/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility.md)

## R304.factor-a-multichannel-effect-into-fewer-independent-filters

**STOP_PROFILE — SOURCE_REVIEW**

The scoped Native/Hybrid admitted effect is scalar gain, and FLAC adaptation preserves channels without an 8x8 FIR bank. The exact factorization report is useful algebra, but no current MIMO convolution workload exists in these owners.

Contract: Only an authored exact coefficient-wise factorization may preserve requested multichannel FIR including normalization, delay and tails.

Next bounded test / reopening condition: Reopen for a real requested fixed MIMO bank; compare against a shared-transform optimized convolver and full-rank control.

Evidence: [work/batch_f/audits/R304.factor-a-multichannel-effect-into-fewer-independent-filters.md](work/batch_f/audits/R304.factor-a-multichannel-effect-into-fewer-independent-filters.md)

## R309.recalculate-mix-loudness-from-cached-cross-products

**STOP_PROFILE — SOURCE_REVIEW**

Current gain is one scalar playback control; diagnostics expose bounded RMS, not stem-mix loudness analysis. The report proves integer mean-square energy, explicitly not full K-weighted gated LUFS. There is no repeated multistem analysis query here to accelerate.

Contract: Fixed-history aligned stems retain all cross terms and recompute requested weighting/gating with a declared tolerance.

Next bounded test / reopening condition: Reopen with a concrete repeated mix-analysis consumer; compare window energies before gated loudness against independently rendered mixes.

Evidence: [work/batch_f/audits/R309.recalculate-mix-loudness-from-cached-cross-products.md](work/batch_f/audits/R309.recalculate-mix-loudness-from-cached-cross-products.md)

## R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them

**STOP_PROFILE — SOURCE_REVIEW**

Current output diagnostics do not perform a full finite-filter oversampled peak scan. The report shows a workload-dependent exact digital reference optimization, not an opportunity to replace ordinary playback or its RMS observation.

Contract: Same pinned oversampled maximum or ceiling decision including complete halos, phases and arithmetic margin.

Next bounded test / reopening condition: Reopen when an actual peak-analysis operation is requested; compare sparse transient and dense high-level inputs against a contiguous full scan.

Evidence: [work/batch_f/audits/R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them.md](work/batch_f/audits/R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them.md)

## R316.cache-the-peak-envelope-of-every-fixed-gain-mix

**STOP_PROFILE — SOURCE_REVIEW**

There is no fixed-gain multistem peak-query service in the current player. The report itself needs about 1493 repeated queries to repay Python hull construction; using it for one playback gain setting would add preparation with no relevant amortization.

Contract: Exact sample-peak value for synchronized integer stems and fixed rational gains, with tie location excluded unless separately supported.

Next bounded test / reopening condition: Reopen for a measured many-query fader-preview consumer and compare total hull construction plus queries with exhaustive vectorized scans.

Evidence: [work/batch_f/audits/R316.cache-the-peak-envelope-of-every-fixed-gain-mix.md](work/batch_f/audits/R316.cache-the-peak-envelope-of-every-fixed-gain-mix.md)

## R324.reuse-av1-show-existing-frame-for-repeated-ui-states

**STOP_PROFILE — SOURCE_REVIEW**

Current browser decoder already consumes standard AV1 coded streams; Demuxe does not author UI state streams. The report ordinary encoder already uses show_existing and yields the same total size, so no new encoding benefit is established over its correct baseline.

Contract: Exact repeated complete pictures, timestamps and reference slots; show-existing display is not independently random accessible.

Next bounded test / reopening condition: Reopen only with an authored state-stream workload and a baseline encoder failing to exploit known repetition; include dependent show-existing seek.

Evidence: [work/batch_f/audits/R324.reuse-av1-show-existing-frame-for-repeated-ui-states.md](work/batch_f/audits/R324.reuse-av1-show-existing-frame-for-repeated-ui-states.md)

## R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget

**DEFER_SETUP — SOURCE_REVIEW**

Current output delegates processing/synchronization to mpv and exposes no controlled first-order filter state bound. The source certificate is valid only for declared bounded approximation; this must not be substituted for exact effect-seek semantics or decoder history.

Contract: Explicit error budget on the complete post-seek suffix, certified input/state bounds and finite-precision allowance.

Next bounded test / reopening condition: Define one opt-in first-order DSP instance and compare calculated preroll with continuous reference; inspect the near-unit-pole fallback.

Evidence: [work/batch_f/audits/R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget.md](work/batch_f/audits/R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget.md)

## R347.morph-convolution-effects-using-reusable-basis-outputs

**STOP_PROFILE — SOURCE_REVIEW**

Current native graph has scalar gain, not a persistent convolution-basis morphing effect or repeated automation-edit cache. Historical correct basis outputs do not make this an optimization of the actual admitted gain operation.

Contract: Declared output-time convolution weights preserve complete tails, normalization and fixed basis; no arbitrary IR approximation.

Next bounded test / reopening condition: Reopen for a requested two-basis morph effect and compare cached outputs with persistent optimized dual convolution.

Evidence: [work/batch_f/audits/R347.morph-convolution-effects-using-reusable-basis-outputs.md](work/batch_f/audits/R347.morph-convolution-effects-using-reusable-basis-outputs.md)

## R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up

**DEFER_SETUP — SOURCE_REVIEW**

The old report lacked VideoDecoder in an insecure origin; the shared current secure probe resolves that API block. Current browser/software paths implement fallback rather than two simultaneously decoded branches with an explicit prefix handoff. A dual-owner same-clock protocol is new setup.

Contract: Both decoders start from valid dependencies; exact frames, one audio clock, bounded overlap and explicit ownership handoff without duplicate audio.

Next bounded test / reopening condition: First specify video-only prefix limits and one handoff point in the retained presenter; compare adjacent handoff frame identities and immediate browser-win cancellation.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_f/audits/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up.md](work/batch_f/audits/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R230.mux-media-to-reduce-the-extra-bytes-required-for-integrity-verification

**DEFER_SETUP — SOURCE_REVIEW**

Current remote authority is strong ETag/immutable ranges, not hash-piece integrity units, and FFmpeg controls output interleaving. Layout-to-verification alignment requires a supplied piece boundary contract and new output identity; no such current producer is present.

Contract: Legal sample layout preserves requested AV and timing while aligning verified useful groups under a fixed padding budget and new source identity.

Next bounded test / reopening condition: Specify one verification-unit map over a small remux output and count cold bytes until verified AV against ordinary interleaving.

Evidence: [work/batch_f/audits/R230.mux-media-to-reduce-the-extra-bytes-required-for-integrity-verification.md](work/batch_f/audits/R230.mux-media-to-reduce-the-extra-bytes-required-for-integrity-verification.md)

## R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts

**DEFER_SETUP — SOURCE_REVIEW**

Existing presentation selects/draws original frames; it does not request temporal box exposure. Implementing duration-aware blend changes presentation unless explicitly requested and needs a bounded exposure-frame owner and linear-light contract.

Contract: Declared held-frame interval integration at exact timeline ticks, explicit endpoint/gap policy and linear-light domain.

Next bounded test / reopening condition: Use one requested VFR two-color exposure with 10/30 ms holds to compare exact 25/75 weighting against a bounded accumulator.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_f/audits/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts.md](work/batch_f/audits/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R214.packed-v210-without-cpu-planarization

**DEFER_SETUP — SOURCE_REVIEW**

Current YUV fast path admits planar 420P, while v210 needs packed 10-bit 4:2:2 words, stride and partial-group semantics. Shared WebGPU availability resolves the historical generic GPU block but does not supply a v210 destination shader or admission contract.

Contract: Exact 10-bit Y/U/V including padded stride and partial last group, then declared color conversion.

Next bounded test / reopening condition: Specify a packed-v210 shader boundary on one width-50 buffer and compare recovered planes with independent host decode before live integration.

Evidence: [work/batch_f/audits/R214.packed-v210-without-cpu-planarization.md](work/batch_f/audits/R214.packed-v210-without-cpu-planarization.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R228.decode-interlaced-mjpeg-as-native-field-images

**DEFER_SETUP — SOURCE_REVIEW**

Video configuration and presentation do not expose a JPEG-field parser or field-time compositor. Current image dimensions alone cannot distinguish temporally separate interlaced fields; weaving would not satisfy the requested deinterlacing output.

Contract: Qualified complete MJPEG fields preserve order and distinct times under one explicit composition/deinterlace method.

Next bounded test / reopening condition: Extract two known opposite field identifiers and compare field order/timing with the software decoder before browser image decoding integration.

Evidence: [work/batch_f/audits/R228.decode-interlaced-mjpeg-as-native-field-images.md](work/batch_f/audits/R228.decode-interlaced-mjpeg-as-native-field-images.md)

## R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline

**DEFER_SETUP — SOURCE_REVIEW**

Current native owner opens one source and timeline; finite DASH adaptation is unrelated to Matroska ordered editions/linked-segment semantics. A source-authorized edition map and subtitle/track remapping are missing, not the report definition.

Contract: Preserve selected ordered edition, authorized linked segments, track/subtitle intent and virtual-time seek mapping.

Next bounded test / reopening condition: Model one same-configuration two-interval edition including a virtual seek and reject an unauthorized linked segment before playback.

Evidence: [work/batch_f/audits/R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline.md](work/batch_f/audits/R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline.md)

## R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached

**STOP_PROFILE — SOURCE_REVIEW**

The player presents video plus subtitle overlay, not repeated WebP color+alpha asset variants. The report exact independent ALPH reuse is meaningful for a separate image cache but no current repeated color decode owner was identified here.

Contract: Only independently stored alpha may change while cached color and complete RGBA semantics remain identical.

Next bounded test / reopening condition: Reopen for an actual WebP mask/composition consumer and compare uncompressed ALPH variants against raw decoder RGBA, not premultiplied canvas RGB.

Evidence: [work/batch_f/audits/R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached.md](work/batch_f/audits/R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached.md)

## R083.decode-graphics-processing-encode

**DEFER_SETUP — SOURCE_REVIEW**

Current graphics owner presents, not encodes; software handles requested video filters. Historical MediaRecorder pilot dropped callbacks and had transformed-pixel error. Shared physical GPU API availability removes only a prerequisite, not frame/timestamp preserving encode integration.

Contract: Every required transformed frame retains declared timestamps, color and audio under an explicit lossy/output contract.

Next bounded test / reopening condition: Define one three-frame deterministic inversion encode with timestamp ownership before realtime tests; compare full retained frame identities.

Evidence: [work/batch_f/audits/R083.decode-graphics-processing-encode.md](work/batch_f/audits/R083.decode-graphics-processing-encode.md)

## R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif

**DEFER_SETUP — SOURCE_REVIEW**

Current packet-copy mux can preserve admitted AV1 packets but does not extract AVIF items or author timed image sequences. The report narrows compatibility to single-item, matching sequence configuration; grids/auxiliary images need separate handling.

Contract: Compatible AV1 coded image payloads/configuration remain exact with truthful timed samples or independent AVIF item semantics.

Next bounded test / reopening condition: Parse one compatible three-image AVIF set and compare packet hashes through host mux plus current native playback before any public image-sequence route.

Evidence: [work/batch_f/audits/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif.md](work/batch_f/audits/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif.md)

## R269.av1-pre-super-resolution-preview

**DEFER_SETUP — SOURCE_REVIEW**

Current bridge receives public reconstructed VideoFrames and AVFrames, not pre-super-resolution AV1 pixels. The report explicitly could not access those pixels; adding a custom decoder tap is substantial setup, whereas lower-resolution re-encode is a different mechanism.

Contract: Requested preview uses actual pre-super-resolution reconstruction with explicit lower-fidelity contract and known geometry.

Next bounded test / reopening condition: Locate a pinned decoder-internal pre-super-resolution surface and its ownership/lifetime contract before any preview comparison.

Evidence: [work/batch_f/audits/R269.av1-pre-super-resolution-preview.md](work/batch_f/audits/R269.av1-pre-super-resolution-preview.md)

## R273.jpeg-xl-dc-preview

**DEFER_SETUP — SOURCE_REVIEW**

The report uses libjxl progressive events and intentionally approximate DC output. Current player has no JPEG XL decoder/event bridge or progressive still-preview consumer, so a new codec service exceeds a first-pass candidate patch.

Contract: DC image is explicitly provisional; cancellation consumes no later codestream bytes and eventual full decode remains exact.

Next bounded test / reopening condition: Identify an existing libjxl runtime and scope only progression event/FlushImage plus cancel on a tiny image before UI integration.

Evidence: [work/batch_f/audits/R273.jpeg-xl-dc-preview.md](work/batch_f/audits/R273.jpeg-xl-dc-preview.md)

## R302.develop-ultra-hdr-gain-maps-after-native-image-decoding

**DEFER_SETUP — SOURCE_REVIEW**

Current YUV branch excludes PQ/HLG and supplies no Ultra HDR component parser or gain-map reconstruction oracle. Historical lack of WebGPU is obsolete in the shared probe; pinned libultrahdr and component-value fidelity still need a real setup inventory. No current missing-install claim is inferred from the old host.

Contract: Same decoded base/map arrays reproduce pinned Ultra HDR output at declared capacities and error bounds, separately from physical HDR display.

Next bounded test / reopening condition: Provision/identify one pinned libultrahdr reference and compare identical arrays for one grayscale map before browser decode/shader integration.

Evidence: [work/batch_f/audits/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding.md](work/batch_f/audits/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R348.convert-packed-dsd-directly-to-the-requested-pcm-rate

**DEFER_SETUP — SOURCE_REVIEW**

Local adaptation accepts restricted integer inputs and preserves sample rate; DSD-to-44.1 kHz fused packed conversion is not this path. Software output selects device-rate float, but its two actual conversion filters/rounding boundaries must be identified before fusion.

Contract: Pinned bit order, filter cascade, phase, delay, sample count and finite end behavior match the declared PCM tolerance; no native DSD claim.

Next bounded test / reopening condition: Trace one DSD64 software path and compare optimized packed-byte cascade with an independently high-precision composed kernel on chunk edges.

Evidence: [work/batch_f/audits/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate.md](work/batch_f/audits/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate.md)

## R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size

**DEFER_SETUP — SOURCE_REVIEW**

Current custom browser codec bridge does not author JPEG Huffman tables and does not admit MJPEG there. This proposal needs an entropy parser/serializer preserving coefficients, plus a decoder-cost workload rather than just smaller bytes.

Contract: Quantized JPEG coefficients and all image semantics remain unchanged under rewritten valid Huffman tables.

Next bounded test / reopening condition: First compare one image coefficient dump before/after a table rewrite with a corrupted-code control; identify repeated decode amortization before runtime integration.

Evidence: [work/batch_f/audits/R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size.md](work/batch_f/audits/R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size.md)

## R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries

**STOP_PROFILE — SOURCE_REVIEW**

Current admitted scalar gain and ring output do not compute max-decay envelopes. The report exact/toleranced prefix result is for a specific recurrence and cannot replace a differently defined compressor or limiter.

Contract: Declared finite nonnegative max-decay recurrence with stated initial state, NaN policy and numerical tolerance.

Next bounded test / reopening condition: Reopen when a consumer requests this exact envelope; compare both local passes and summary prefix with optimized sequential output.

Evidence: [work/batch_f/audits/R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries.md](work/batch_f/audits/R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries.md)

## R305.compose-ogg-checksums-from-reusable-byte-range-summaries

**STOP_PROFILE — SOURCE_REVIEW**

Maintained remux output is MP4/WebM, not Ogg page relayout. Historical exact Ogg CRC composition offers no repeated checksum scan in these owners to remove. Source integrity is not replaceable by CRC summaries.

Contract: Ogg-convention CRC with zeroed header checksum and immutable identity-bound body spans preserves packets/lacing/granules.

Next bounded test / reopening condition: Reopen with a real repeated Ogg page producer; compare summary combination against independent libogg and mutated span length.

Evidence: [work/batch_f/audits/R305.compose-ogg-checksums-from-reusable-byte-range-summaries.md](work/batch_f/audits/R305.compose-ogg-checksums-from-reusable-byte-range-summaries.md)

## R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it

**STOP_PROFILE — SOURCE_REVIEW**

There is no finite-window sample-peak edit processor in current playback adaptation. Historical incremental results qualify only the stated gain rule, not FFmpeg alimiter with recursive release. Ordinary playback gain changes do not create sparse source edits.

Contract: Exact finite-lookahead peak/gain/output operator with declared padding and source/recipe identity.

Next bounded test / reopening condition: Reopen for a bounded audio-edit consumer; compare sparse edit invalidation with a monotonic-deque complete scan including removed unique maxima.

Evidence: [work/batch_f/audits/R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it.md](work/batch_f/audits/R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it.md)

## R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index

**STOP_PROFILE — SOURCE_REVIEW**

Current gain changes playback, while diagnostics offer RMS rather than a retained integrated loudness query. No hundreds-of-gain-candidates normalization service exists here. Historical libebur128 result is scoped and promising only for such repeated analysis.

Contract: Positive whole-history scalar gain with fixed weighting/windows and all pre-gate energies; correct empty sets and threshold membership.

Next bounded test / reopening condition: Reopen for repeated normalization analysis and compare sorted queries with fresh reference measurements near both gates.

Evidence: [work/batch_f/audits/R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index.md](work/batch_f/audits/R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index.md)

## R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed

**DEFER_SETUP — SOURCE_REVIEW**

Current app holds returned frames and replay packets; opaque decoder references remain FFmpeg/browser-owned. Closing displayed VideoFrames is not evidence that decoder bookkeeping can survive freed reference pixels. The source is only a dependency-DAG model.

Contract: Required prediction and presentation pixels remain live until last use while codec bookkeeping survives independently.

Next bounded test / reopening condition: Inspect one pinned software decoder reference structure and prove separate metadata/pixel lifetime on one independent boundary before modifying allocation.

Evidence: [work/batch_f/audits/R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed.md](work/batch_f/audits/R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed.md)

## R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles

**DEFER_SETUP — SOURCE_REVIEW**

Current fast presenter is 8-bit 420P; compact 10-bit reference tiles would require changed software decoder storage and reconstruction access. Report poststorage exactness does not establish codec-internal support or eliminate required plane materialization.

Contract: Exact 10-bit values with local-minimum plus byte offset only when range <=255, wider fallback otherwise.

Next bounded test / reopening condition: Audit one high-bit-depth retained reference owner and compare compact/uncompact tile access including checkerboard fallback before integration.

Evidence: [work/batch_f/audits/R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles.md](work/batch_f/audits/R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles.md)

## R308.move-already-filtered-pixels-instead-of-filtering-them-again

**DEFER_SETUP — SOURCE_REVIEW**

Current presenter does not receive ZMBV copy certificates or filter-footprint maps. The report exact sparse output was slower than vectorized full filtering; that is a historical implementation negative, not universal rejection. Low-overhead motion plumbing is new setup.

Contract: Same full processed picture with certified translated neighborhoods and complete filter halos; every requested frame remains presented.

Next bounded test / reopening condition: First expose one ZMBV motion-copy certificate without guessing from residual alone, then compare a single eligible interior plus mixed-motion boundary.

Evidence: [work/batch_f/audits/R308.move-already-filtered-pixels-instead-of-filtering-them-again.md](work/batch_f/audits/R308.move-already-filtered-pixels-instead-of-filtering-them-again.md)

## R331.decode-sparse-flac-channels-only-when-the-selected-output-matrix-actually-needs-them

**STOP_PROFILE — SOURCE_REVIEW**

Current Native adaptation admits mono/stereo preservation and does not permit a matrix that ignores selected 7.1 FLAC channels. Skipping channels would change requested output in this scoped route, even though independent subframes can support an explicitly different matrix elsewhere.

Contract: Only channels proven unused by an explicitly requested matrix may skip reconstruction; entropy boundaries still parse and coupled assignments reject.

Next bounded test / reopening condition: Reopen for a declared matrix using a strict subset of independent FLAC channels; compare its output with full decode plus identical matrix.

Evidence: [work/batch_f/audits/R331.decode-sparse-flac-channels-only-when-the-selected-output-matrix-actually-needs-them.md](work/batch_f/audits/R331.decode-sparse-flac-channels-only-when-the-selected-output-matrix-actually-needs-them.md)

## R338.decode-into-the-layout-the-next-stage-already-needs

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Historical missing-header blocker is not current: pinned avcodec.h exposes get_buffer2 and constraints. A real row repack exists in presenter. First compare stride-aware upload (R215) before adding custom decoder allocation; availability of headers alone is not a callback ownership pass.

Contract: DR1-qualified decoder-valid aligned buffers preserve visible planes and every delayed owner, memory-growth and release boundary.

Next bounded test / reopening condition: Inventory one matching independent-picture decoder/artifact, compare default versus stride-aware upload, and only if needed scope a real get_buffer2 callback test.

Evidence: [work/batch_f/audits/R338.decode-into-the-layout-the-next-stage-already-needs.md](work/batch_f/audits/R338.decode-into-the-layout-the-next-stage-already-needs.md)

## R354.replace-an-oversized-preparation-heap-while-native-playback-continues

**DEFER_SETUP — SOURCE_REVIEW**

MediaSource lives on page while preparation uses a separate worker, so lifetime separation exists. Worker currently owns FFmpeg demux/mux state, not immutable continuation sample recipes. Historical 64 MiB scratch handoff is synthetic and no real temporary spike is established by that report.

Contract: Same continuing init/packets/timestamps/audio/EOF with one committed next-sample recipe, live MSE owner and stale-generation rejection.

Next bounded test / reopening condition: First observe a genuine remux high-water spike; if present, specify one fragment continuation identity and compare keeping instance with safe replacement peak overlap.

Evidence: [work/batch_f/audits/R354.replace-an-oversized-preparation-heap-while-native-playback-continues.md](work/batch_f/audits/R354.replace-an-oversized-preparation-heap-while-native-playback-continues.md)

## R041.route-simple-subrip-captions-to-native-text-tracks

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current browser text-track owner accepts URL tracks and applies remux timeline bias; byte SubtitleAsset admission permits ASS/SSA but excludes SRT. A strict external SRT-to-VTT adapter is a concrete small missing component; embedded extraction is a separate larger feature.

Contract: Finite simple SubRip subset preserves Unicode/text/timing/allowed markup, language and cue visibility; unsupported styling rejects.

Next bounded test / reopening condition: Convert one external overlap/multiline SRT into owned WebVTT URL and compare with hand-authored VTT through existing addTextTrack and source cleanup.

Evidence: [work/batch_f/audits/R041.route-simple-subrip-captions-to-native-text-tracks.md](work/batch_f/audits/R041.route-simple-subrip-captions-to-native-text-tracks.md)

## R225.h-264-self-contained-idr-suffix.report-continuity

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current TS seek finds and verifies a preceding IDR with bounded backward reads; the report narrower Annex-B repeated-SPS/PPS suffix is a real opportunity only where configuration closure is independently known. It does not justify skipping the current verification loop blindly.

Contract: Requested suffix preserves decoded frames from a certified IDR carrying full SPS/PPS and A/V timeline dependencies.

Next bounded test / reopening condition: On one existing AVC sample inspect repeated parameters and compare suffix decode with continuous reference; log actual backward scan avoided separately.

Evidence: [work/batch_f/audits/R225.h-264-self-contained-idr-suffix.report-continuity.md](work/batch_f/audits/R225.h-264-self-contained-idr-suffix.report-continuity.md)

## R227.coded-sample-identity-across-containers.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Current cache keys are per-source byte offsets and FFmpeg copies selected packet payloads; no container-independent immutable sample cache exists. Equal AVC hashes across MP4/MKV do not identify common timestamps, codec config, color or authorization.

Contract: Reusable coded sample identity additionally binds configuration, dependency closure and output semantics while preserving each source timeline.

Next bounded test / reopening condition: Define one canonical packet object key across two authorized containers and compare payload/config identity with a changed-color or timing control.

Evidence: [work/batch_f/audits/R227.coded-sample-identity-across-containers.report-continuity.md](work/batch_f/audits/R227.coded-sample-identity-across-containers.report-continuity.md)

## R121.native-reference-state-capsules-for-fast-seeking

**DEFER_SETUP — SOURCE_REVIEW**

Current browser decoder requires ordinary key entry points and has no synthetic I_PCM reference-seed writer. Seed pixels alone omit frame-number/POC/reference management, and authoring a state capsule is a new codec subsystem.

Contract: One-reference no-B AVC synthetic seed plus predictive suffix must reproduce exact reference pixels and all required auxiliary decode state.

Next bounded test / reopening condition: Document one constrained seed and independently decode the following predictive frame before any runtime seek wiring.

Evidence: [work/batch_f/audits/R121.native-reference-state-capsules-for-fast-seeking.md](work/batch_f/audits/R121.native-reference-state-capsules-for-fast-seeking.md)

## R123.checkpoint-the-software-decoder-inside-a-gop

**DEFER_SETUP — SOURCE_REVIEW**

Current software fallback resets codec buffers and replays retained packets. There is no codec-aware versioned export of reference pictures/bookkeeping. Raw AVCodecContext copying would violate pointers and ownership; WebCodecs state export is not available through this owner.

Contract: Versioned complete software decoder continuation at safe picture boundary preserves exact future output and ownership.

Next bounded test / reopening condition: Inventory one pinned decoder checkpoint field set and state hash against packet replay; reject any opaque pointer dependency before implementation.

Evidence: [work/batch_f/audits/R123.checkpoint-the-software-decoder-inside-a-gop.md](work/batch_f/audits/R123.checkpoint-the-software-decoder-inside-a-gop.md)

## R132.exact-frame-dependency-slicing

**DEFER_SETUP — SOURCE_REVIEW**

Current bridge delegates complete packet decoding and SIMD kernels reconstruct requested blocks without a frame-dependency slicing graph. Skipping picture reconstruction requires parsing reference management inside a controlled decoder, not merely dropping submitted packets.

Contract: Exact requested target includes complete coded dependency closure while required reference bookkeeping is parsed.

Next bounded test / reopening condition: Identify one constrained software GOP and compare a parsed dependency graph with full decode before suppressing one certified unused reconstruction.

Evidence: [work/batch_f/audits/R132.exact-frame-dependency-slicing.md](work/batch_f/audits/R132.exact-frame-dependency-slicing.md)

## R133.exact-cropped-playback-from-video-that-was-never-tiled

**DEFER_SETUP — SOURCE_REVIEW**

Current crop occurs at presentation after full decoded planes. MPEG-2 region-limited reconstruction needs backward motion/interpolation/filter closure across pictures; changing viewport alone cannot implement the proposal.

Contract: Requested crop is exact to full MPEG-2 I/P decode with all transitive motion/filter support retained.

Next bounded test / reopening condition: Trace one constrained crop dependency region and compare full-decode pixels; measure whether closure expands to most of the picture before editing decoder.

Evidence: [work/batch_f/audits/R133.exact-cropped-playback-from-video-that-was-never-tiled.md](work/batch_f/audits/R133.exact-cropped-playback-from-video-that-was-never-tiled.md)

## R139.mix-channels-before-performing-all-their-output-transforms

**STOP_PROFILE — SOURCE_REVIEW**

The selected Native adaptation explicitly preserves channel layout and does not admit an output downmix. Spectral mixing before synthesis requires that requested matrix plus compatible codec window/state; no such operation is available to optimize in this route.

Contract: Only an explicitly requested downmix may reorder compatible spectral synthesis while preserving overlap and numeric contract.

Next bounded test / reopening condition: Reopen for one existing downmix decoder path and audit its AC3 optimized ordering before proposing a new transform change.

Evidence: [work/batch_f/audits/R139.mix-channels-before-performing-all-their-output-transforms.md](work/batch_f/audits/R139.mix-channels-before-performing-all-their-output-transforms.md)

## R145.guarded-format-specialized-wasm-decoder-variants

**DEFER_SETUP — SOURCE_REVIEW**

Current codec bridge qualifies codec names/configuration and uses maintained decoder/kernel stack. A progressive/precision/tool-specialized Wasm runtime is a distinct build/profile artifact; a source audit cannot infer startup benefit or safely drop uncommon tools.

Contract: Unexpected stream/config changes reject safely while admitted pictures remain exact under pinned compiler and codec settings.

Next bounded test / reopening condition: Record one narrow progressive AVC tool set and current code-size/hot-path exposure; only then scope one specialized artifact with a changed-tool control.

Evidence: [work/batch_f/audits/R145.guarded-format-specialized-wasm-decoder-variants.md](work/batch_f/audits/R145.guarded-format-specialized-wasm-decoder-variants.md)

## R152.copy-on-write-tiled-retained-pictures

**DEFER_SETUP — SOURCE_REVIEW**

Current frames are full AVFrame/VideoFrame surfaces and downstream draw expects them. Historical tiled sharing is postdecode after full comparisons, not decoder-internal COW. Tile table ownership plus flattening would be new representation work.

Contract: Immutable retained planar pictures reconstruct exactly and edits never mutate prior references, including filter-boundary consumers.

Next bounded test / reopening condition: Profile one actual multi-frame retained owner, then compare postdecode tile sharing including equality scans and flattening before decoder changes.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/batch_f/audits/R152.copy-on-write-tiled-retained-pictures.md](work/batch_f/audits/R152.copy-on-write-tiled-retained-pictures.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R181.dependency-aware-corruption-tracking

**DEFER_SETUP — SOURCE_REVIEW**

Current bridge retains recovery packets and waits for key entry after reset but has no per-picture contamination provenance graph. Historical exact output after next IDR supports conservative recovery, not certification inside arbitrary damaged GOPs.

Contract: Only independently certified unaffected output can be surfaced; unknown reference management remains untrusted until reset.

Next bounded test / reopening condition: Define a source-generation trust flag for one lost nonreference picture and one reference loss before adding per-picture provenance.

Evidence: [work/batch_f/audits/R181.dependency-aware-corruption-tracking.md](work/batch_f/audits/R181.dependency-aware-corruption-tracking.md)

## R191.seekable-fixed-linear-effects-via-block-state-transforms

**DEFER_SETUP — SOURCE_REVIEW**

Effects are delegated to mpv; the app does not own fixed biquad block-state transforms or an edit timeline. Report double-precision model cannot serialize arbitrary Web Audio/mpv internal state, and no new effect subsystem is warranted in first pass.

Contract: Fixed linear recurrence, state coordinate system and exact/toleranced output contract include complete tails and source history.

Next bounded test / reopening condition: Identify one controlled fixed biquad owner and compare one prefix transform-derived seek state against continuous replay before integration.

Evidence: [work/batch_f/audits/R191.seekable-fixed-linear-effects-via-block-state-transforms.md](work/batch_f/audits/R191.seekable-fixed-linear-effects-via-block-state-transforms.md)

## R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries

**DEFER_SETUP — SOURCE_REVIEW**

Local adaptation does not admit Vorbis decoding; software audio is continuous mpv-owned. Independent Vorbis jobs need packet/window overlap and global trimming before any parallel scheduler can safely splice PCM.

Contract: Complete continuous-reference PCM with correct window transition, global sample offsets and initial/end trim.

Next bounded test / reopening condition: Inspect one pinned Vorbis packet stream and compare two jobs with a preceding packet, varying short/long window transition and EOF trim.

Evidence: [work/batch_f/audits/R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries.md](work/batch_f/audits/R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries.md)

## R235.cache-fractional-pixel-reference-predictions

**DEFER_SETUP — SOURCE_REVIEW**

Actual qpel owner already reuses horizontal temporaries within a block. Historical H264-like cache is not a normative replacement across phases/chroma/weighted prediction; persistent cache needs finalized reference identity and measured hot repeat exposure.

Contract: Cache stage preserves exact unclipped intermediates and final pixels for the same reference/phase/geometry/numeric stage.

Next bounded test / reopening condition: Instrument repeated nontrivial qpel keys in the pinned kernel before adding a bounded cache; compare an old/new reference at identical coordinates.

Evidence: [work/batch_f/audits/R235.cache-fractional-pixel-reference-predictions.md](work/batch_f/audits/R235.cache-fractional-pixel-reference-predictions.md)

## R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder

**DEFER_SETUP — SOURCE_REVIEW**

Current FLAC path requires established integer precision and rejects unqualified conversion. allowLossy applies Opus, not an explicit float quantization/error policy. Float-to-24-bit FLAC needs a separate requested fidelity contract; it must not weaken sample-exact admission.

Contract: Explicit permitted quantization reports RMS/peak error and clipping/headroom while preserving rate/layout and avoiding hidden dither/limiter choices.

Next bounded test / reopening condition: Define a research-only float quantization contract on one in-range signal plus out-of-range rejection and compare against the same normal float decoder.

Evidence: [work/batch_f/audits/R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder.md](work/batch_f/audits/R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder.md)

## R016.keep-a-stable-audio-output-format-through-frequent-switches

**DEFER_SETUP — SOURCE_REVIEW**

Audio track switch currently restarts remux at the existing position; FLAC output preserves source rate/layout rather than enforcing a stable session configuration. A persistent audio producer and permitted common profile are needed, especially where native tracks differ.

Contract: Requested language/role remains selected, compatible rate/layout and exact integer samples preserved; heterogeneous conversion requires explicit permission.

Next bounded test / reopening condition: Trace one pair of compatible integer tracks through current switch and measure interruption before designing one stable FLAC producer boundary.

Evidence: [work/batch_f/audits/R016.keep-a-stable-audio-output-format-through-frequent-switches.md](work/batch_f/audits/R016.keep-a-stable-audio-output-format-through-frequent-switches.md)

## R061.keep-explicit-channel-processing-on-the-native-audio-graph

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Native already owns one media-element gain graph, providing a bounded insertion point for an explicitly requested channel-index matrix. Current admission does not support remapping, and historical six-channel index result does not justify semantic speaker guesses or downmix permission.

Contract: Declared known-layout matrix preserves intended channels/rate/headroom; identity must be transparent and any downmix remains explicitly requested.

Next bounded test / reopening condition: In an isolated graph extension compare six-channel identity and one-index attenuation against OfflineAudioContext matrix reference, reusing the single media source.

Evidence: [work/batch_f/audits/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md](work/batch_f/audits/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md)

## R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes

**DEFER_SETUP — SOURCE_REVIEW**

Current API exposes filters/gain and sequential queue playback, not an authorized crossfade source-to-presentation map or hybrid copied/new FLAC seam construction. Processing only a seam requires independent FLAC numbering/configuration and audio/video/caption overlap semantics. General allow-lossy admission is not that authorization.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Define one explicit equal-rate PCM/FLAC crossfade contract; compare a frame-aligned copied/processed seam with a full-render integer-rounding oracle, rejecting mixed rates and preserving unchanged video/audio outside the seam.

Evidence: [work/root3/audits/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes.md](work/root3/audits/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes.md)

## R108.crop-or-transform-mjpeg-in-the-coefficient-domain

**DEFER_SETUP — SOURCE_REVIEW**

The current native/browser video codec bridge has no MJPEG coefficient transform or JPEG image-decode adapter. Display crop/rotation already occurs in the shader without rewriting media. A required transformed asset needs a coefficient-domain component and iMCU/orientation contract, not another display transform.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: For a requested transformed MJPEG asset, use a perfect aligned grayscale JPEG crop as one component and compare retained coefficients plus decoded geometry; misaligned/edge transforms must reject rather than expand silently.

Evidence: [work/root3/audits/R108.crop-or-transform-mjpeg-in-the-coefficient-domain.md](work/root3/audits/R108.crop-or-transform-mjpeg-in-the-coefficient-domain.md)

## R116.compatibility-islands-use-software-only-for-the-troublesome-section

**DEFER_SETUP — SOURCE_REVIEW**

The existing bridge has bounded software replay on failure, but no source-defined supported/unsupported/supported island plan with handback to a browser decoder and one stable color/audio owner. Software fallback is not reversible island orchestration.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Describe one independently decodable three-section source and exact configuration/ordinal boundaries; compare uninterrupted oracle pictures across both transitions before introducing handback ownership.

Evidence: [work/root3/audits/R116.compatibility-islands-use-software-only-for-the-troublesome-section.md](work/root3/audits/R116.compatibility-islands-use-software-only-for-the-troublesome-section.md)

## R127.nonlinear-speed-curves-without-video-re-encoding

**DEFER_SETUP — SOURCE_REVIEW**

Current playback speed is a scalar media-element/engine property, while remux preserves a fixed source mapping. There is no explicit nonlinear monotonic timeline plus synchronized single audio time-stretch owner. Piecewise packet timestamp edits alone cannot establish A/V semantics.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Define one monotonic speed curve and fixed audio-stretch contract; independently verify DTS/PTS order and mapped audio/video markers, rejecting a nonmonotonic or reorder-invalid curve.

Evidence: [work/root3/audits/R127.nonlinear-speed-curves-without-video-re-encoding.md](work/root3/audits/R127.nonlinear-speed-curves-without-video-re-encoding.md)

## R130.protect-reference-critical-bytes-more-heavily-than-disposable-bytes

**DEFER_SETUP — SOURCE_REVIEW**

The current source path is authorized HTTP/local ranges with retry and version checks, not an erasure-coded unreliable-packet provider. Neither a dependency-labelled repair budget nor verified reconstruction exists. Adding repair transport merely for a screen exceeds scope.

Contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Next bounded test / reopening condition: On one supplied unreliable-piece transport, compare equal fixed redundancy assigned uniformly versus verified dependency importance; recover exact original bytes before decode and include deliberately misclassified reference-critical loss.

Evidence: [work/root3/audits/R130.protect-reference-critical-bytes-more-heavily-than-disposable-bytes.md](work/root3/audits/R130.protect-reference-critical-bytes-more-heavily-than-disposable-bytes.md)

## R154.silence-certification-mathematical-boundary-only

**STOP_PROFILE — SOURCE_REVIEW**

The report itself disproves zero-current-coefficients implying silence when prior overlap is nonzero; no coded AAC coefficients or overlap state were certified. Current native adaptation does not admit AAC for this decode path and exposes no AAC synthesis-state certificate. Skipping synthesis from packet silence assumptions is unsupported in this profile.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Reopen only with an actual admitted AAC tool/state extractor and conservative certificate spanning previous overlap, transitions and coupling; require nonzero-overlap/zero-current coefficients to remain non-silent.

Evidence: [work/root3/audits/R154.silence-certification-mathematical-boundary-only.md](work/root3/audits/R154.silence-certification-mathematical-boundary-only.md)

## R156.sparse-translucent-layers-with-correct-disposal

**ALREADY_IMPLEMENTED — SOURCE_REVIEW**

For the maintained subtitle overlay, old/current bounds are unioned, the bounded staging canvas is reset, all current tiles are redrawn and only that region is uploaded. This already applies sparse presentation with disposal at that specific layer owner. It does not implement a compressed layered-video format or claim reduced physical GPU traffic.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Reopen for measured layer/overlay redraw work outside the existing bounded dirty region; use overlap/disappearance pixel controls and preserve redraws of every still-visible translucent tile.

Evidence: [work/root3/audits/R156.sparse-translucent-layers-with-correct-disposal.md](work/root3/audits/R156.sparse-translucent-layers-with-correct-disposal.md)

## R182.jpeg-mosaic-from-restart-intervals

**DEFER_SETUP — SOURCE_REVIEW**

There is no JPEG restart-interval compositor or JPEG table/MCU identity parser in the current video boundary. The historical grayscale row-mosaic is a narrowly authored compressed composition capability, not arbitrary crop or a maintained delivery bottleneck.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: For a requested compressed row mosaic, admit only matching tables/geometry and complete restart intervals, compare exact decoded selected rows, and reject a table mismatch or partial-MCU boundary.

Evidence: [work/root3/audits/R182.jpeg-mosaic-from-restart-intervals.md](work/root3/audits/R182.jpeg-mosaic-from-restart-intervals.md)

## R186.reversible-xor-frame-cache

**DEFER_SETUP — SOURCE_REVIEW**

Current retained output is a bounded live VideoFrame map plus one redraw frame; it is not an archive of full decoded reverse-preview frames. A checkpoint/XOR/zlib representation would require an exact decoded-plane cache and eviction owner. The report also shows random data can exceed raw size.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: If reverse-preview retention is requested, compare one bounded coherent and one incompressible real decoded sequence against both raw-cache traversal and persistent decode; cap representation growth and preserve checkpoint bridge reconstruction.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/root3/audits/R186.reversible-xor-frame-cache.md](work/root3/audits/R186.reversible-xor-frame-cache.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R201.periodic-steady-state-filter-initialization

**DEFER_SETUP — SOURCE_REVIEW**

The inspected audio output and native adaptation do not expose a requested periodic IIR loop recurrence or complete filter state. Solving the reported scalar fixed point cannot initialize arbitrary nonlinear/time-varying software filter graphs.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Select one explicit stable linear periodic filter and expose its full state/coefficient/rounding contract; compare first-loop output with converged reference and reject unstable or changing coefficients.

Evidence: [work/root3/audits/R201.periodic-steady-state-filter-initialization.md](work/root3/audits/R201.periodic-steady-state-filter-initialization.md)

## R224.opus-exact-state-pre-roll.report-continuity

**STOP_PROFILE — SOURCE_REVIEW**

The report contains a concrete counterexample to treating an ordinary 80 ms Opus preroll as bit-exact state restoration. Current packet-copy Opus and browser seek behavior expose no decoder-state witness; original compressed packets cannot justify an exactness claim. The report fixture first passes at 600 ms but supplies no universal bound.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: For a specifically requested bit-exact Opus seek mode, establish output/state closure on that exact decoder/stream against uninterrupted PCM; do not generalize either 80 or 600 ms to all streams.

Evidence: [work/root3/audits/R224.opus-exact-state-pre-roll.report-continuity.md](work/root3/audits/R224.opus-exact-state-pre-roll.report-continuity.md)

## R063.use-the-browser-image-decoder-for-qualified-mjpeg-video

**DEFER_SETUP — SOURCE_REVIEW**

The maintained bridge supports AVC/HEVC/VP8/VP9/AV1 WebCodecs configurations, not an MJPEG image-decoder promise adapter with mpv timing. createImageBitmap availability alone would repeat a known primitive. Genuine AVI1 table normalization, color/field/orientation and stale-result ownership are not implemented.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Scope self-contained JPEG followed by one genuine AVI1/default-table frame through a bounded image promise adapter; compare decoded geometry/color to a fixed oracle and close stale results after source replacement, without adding an independent audio clock.

Earlier retained-engine-worker citations identify the experimental predecessor. Maintained Hybrid selects filter-retained-engine-worker, with the same bounded frame/held-frame ownership plus geometry and subtitle composition; use this active owner for follow-up. The separate API gate record is authoritative for R025 exposure.

Evidence: [work/root3/audits/R063.use-the-browser-image-decoder-for-qualified-mjpeg-video.md](work/root3/audits/R063.use-the-browser-image-decoder-for-qualified-mjpeg-video.md), [work/batch_h/active-owner-reconciliation.md](work/batch_h/active-owner-reconciliation.md)

## R240.extract-a-native-2d-view-from-multiview-hevc.report-a

**DEFER_SETUP — SOURCE_REVIEW**

The historical HEVC browser failure and x265 limitation are not transplanted to this machine: current secure WebCodecs HEVC configuration query succeeds. No marked-eye multiview fixture, view/dependency selector or stereo oracle is supplied to the maintained HEVC configuration bridge. Ordinary HEVC is not evidence of base-view extraction.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Acquire one conforming marked-eye MV-HEVC fixture and exact layer/dependency metadata, then validate a single requested 2D view and reconstructed configuration against the corresponding stereo-reference view before destination playback.

Evidence: [work/root3/audits/R240.extract-a-native-2d-view-from-multiview-hevc.report-a.md](work/root3/audits/R240.extract-a-native-2d-view-from-multiview-hevc.report-a.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R196.independent-aac-channel-assembly

**DEFER_SETUP — SOURCE_REVIEW**

Current mux copies one selected audio stream; there is no AAC raw-element parser/PCE writer or priming alignment owner. Mono AAC channels cannot be arbitrarily concatenated without validating independent syntax.

Contract: Two independent AAC-LC SCE streams retain exact per-channel PCM and sample alignment, with truthful PCE tags/layout and all excluded tools rejected.

Next bounded test / reopening condition: Implement only a bounded AAC element/PCE oracle for one synchronized pair with disabled coupling/PNS/TNS/SBR; enable one excluded tool or change priming as an explicit reject control.

Evidence: [work/batch_g/audits/R196.independent-aac-channel-assembly.md](work/batch_g/audits/R196.independent-aac-channel-assembly.md)

## R084.spatially-selective-video

**DEFER_SETUP — SOURCE_REVIEW**

Current playback decodes one full representation; no authored quadrant catalogue, viewport tile selection or synchronized compositor exists. Historical prepared tiles are near-equivalent lossy output, not same-pixel optimization.

Contract: Explicit prepared spatial viewport contract reports re-encoding/pixel error, exact selected tile identities and times; full-quality original requests remain unchanged.

Next bounded test / reopening condition: Define one prepared-tile manifest and viewport request contract; compare one tile against original crop and all-four reconstruction, rejecting claims of byte/pixel equality when encode boundaries differ.

Evidence: [work/batch_g/audits/R084.spatially-selective-video.md](work/batch_g/audits/R084.spatially-selective-video.md)

## R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice

**DEFER_SETUP — SOURCE_REVIEW**

Current H264 parser initializes CABAC contexts per slice and the browser bridge treats decode state as opaque. Mid-slice arithmetic/neighbor state restoration requires a maintained decoder instrumentation/export ABI, not source range seeking alone.

Contract: Source/version-bound complete entropy registers, contexts, bit position and neighbor syntax reproduce every subsequent parsed symbol before reconstruction.

Next bounded test / reopening condition: Define one logical CABAC checkpoint at a known syntax boundary in controlled decoder; compare full suffix symbols, then corrupt one context/neighbor field and reject. Charge initial state generation.

Evidence: [work/batch_g/audits/R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice.md](work/batch_g/audits/R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice.md)

## R136.give-two-independent-videos-separate-reference-banks-inside-one-decoder

**DEFER_SETUP — SOURCE_REVIEW**

WebCodecs accepts conventional full AV1 chunks and owns references opaquely; no prepared alternating-stream encoder/reference-slot contract exists. Two unrelated videos cannot be interleaved safely by changing timestamps.

Contract: Prepared compatible streams use distinct valid reference banks and produce both exact independently decoded outputs with original source mapping.

Next bounded test / reopening condition: Provide a tiny authored AV1 reserved-slot pair and bitstream reference-state oracle before using one decoder; cross-bank reference or changed shared sequence state must fail.

Evidence: [work/batch_g/audits/R136.give-two-independent-videos-separate-reference-banks-inside-one-decoder.md](work/batch_g/audits/R136.give-two-independent-videos-separate-reference-banks-inside-one-decoder.md)

## R137.prepared-non-keyframe-representation-switches-using-av1-s-frames

**DEFER_SETUP — SOURCE_REVIEW**

Existing configure/reset path starts with key requirement and no prepared S-frame switch transaction or shared-history representation pair. S-frame is not a cold-start substitute.

Contract: Running AV1 decoder shares qualified reference history at deliberate S-frame switch, with exact subsequent pictures, delay and source identity.

Next bounded test / reopening condition: Provide two authored streams with known shared history and one S-frame boundary; compare complete suffix to reference and reject cold start or mismatched reference history.

Evidence: [work/batch_g/audits/R137.prepared-non-keyframe-representation-switches-using-av1-s-frames.md](work/batch_g/audits/R137.prepared-non-keyframe-representation-switches-using-av1-s-frames.md)

## R178.selective-jpeg-2000-source-reads

**DEFER_SETUP — SOURCE_REVIEW**

RangeReader can fetch bounded offsets, but current software output is complete decoded image and no OpenJPEG decode-area callback/index adapter exists. Historical quality/reduce constraints did not reduce bytes inside the same tile.

Contract: Requested JPEG2000 region/resolution/layers match full-backed same-decoder output exactly; report spatial selection separately from quality/resolution byte savings.

Next bounded test / reopening condition: Define source-bound tile/packet mapping and one OpenJPEG callback adapter; compare two corner ROIs and full-image reduced-resolution control, counting unique bytes rather than decoder calls.

Evidence: [work/batch_g/audits/R178.selective-jpeg-2000-source-reads.md](work/batch_g/audits/R178.selective-jpeg-2000-source-reads.md)

## R190.restricted-ima-adpcm-through-two-clipped-scans

**DEFER_SETUP — SOURCE_REVIEW**

Pinned IMA expansion is scalar recurrence with exact clipping; no associative scan representation/kernel or scratch owner exists. The historical Python two-scan implementation was slower and is algebra evidence only.

Contract: Exact IMA-WAV mono/stereo samples including clipped index/predictor extremes and channel interleave.

Next bounded test / reopening condition: Design one work-efficient compiled two-scan kernel only after accounting scratch/synchronization; compare all samples plus index0/88 and predictor-extreme controls before any timing.

Evidence: [work/batch_g/audits/R190.restricted-ima-adpcm-through-two-clipped-scans.md](work/batch_g/audits/R190.restricted-ima-adpcm-through-two-clipped-scans.md)

## R202.guarded-narrow-arithmetic

**ADVANCE_CONFIRMATION — SOURCE_REVIEW**

Current IDCT uses its bit-depth template and arithmetic/storage contract; maintained custom SIMD initializes biweight/deblock, not a guarded IDCT path. The reported 2672 model bound cannot simply replace this implementation without proving identical bias/shifts/clipping.

Contract: A conservative guard admits only blocks whose exact production IDCT intermediates fit selected lane width; admitted pixels match wide reference and rejected blocks fall back.

Next bounded test / reopening condition: First reconcile actual IDCT arithmetic with the 2672 bound and collect bounded admitted-block counts; then one kernel oracle at 2672/2673, negative extrema and high-bit-depth rejection. No whole-decoder promotion.

Evidence: [work/batch_g/audits/R202.guarded-narrow-arithmetic.md](work/batch_g/audits/R202.guarded-narrow-arithmetic.md)

## R212.vectorize-across-independent-streams-rather-than-time

**STOP_PROFILE — SOURCE_REVIEW**

Current player produces one selected audio stream, not eight independent IMA state machines. Cross-stream SIMD requires simultaneous independent demand absent from this playback profile; adding dummy streams would create an artificial gain.

Contract: Only genuinely concurrent independent streams may occupy SIMD lanes; preserve each exact state/sample sequence and latency.

Next bounded test / reopening condition: Reopen when actual multi-stream workload exists; compare bounded lane batching to optimized scalar streams and reject latency added solely to fill lanes. AVX2 host speed is not Wasm128 speed.

Evidence: [work/batch_g/audits/R212.vectorize-across-independent-streams-rather-than-time.md](work/batch_g/audits/R212.vectorize-across-independent-streams-rather-than-time.md)

## R232.decode-raw-sensor-data-once-develop-the-picture-during-playback

**DEFER_SETUP — SOURCE_REVIEW**

Presenter receives decoded YUV/RGB; there is no retained Bayer sensor plane, DNG metadata/profile parser or development recipe owner. Existing 601/709 shader is not RAW development.

Contract: Exact unpacked sensor samples and explicitly specified Bayer demosaic/color/exposure recipe; reject unsupported CFA/opcodes/profiles.

Next bounded test / reopening condition: Scope one RGGB R16 sensor-plane adapter with integer color oracle before UI adjustments; gray-as-RGB and unsupported CFA/layout must fail, counting upload/retention.

Evidence: [work/batch_g/audits/R232.decode-raw-sensor-data-once-develop-the-picture-during-playback.md](work/batch_g/audits/R232.decode-raw-sensor-data-once-develop-the-picture-during-playback.md), [sources/reports/R232-R238-report.md](sources/reports/R232-R238-report.md)

## R242.decompress-haps-texture-data-directly-into-gpu-owned-storage

**DEFER_SETUP — PREREQUISITE_PROBE**

Current textures upload decoded R8/RGBA bytes. No bounded Hap/Snappy job parser, GPU overlap-dependency scheduler or compressed-texture copy path exists. BC support alone cannot provide GPU Snappy reconstruction.

Contract: Exact Hap texture-block bytes from validated literal/copy jobs, legal overlap semantics and legal compressed texture publication.

Next bounded test / reopening condition: Define one bounded Snappy job graph and exact reconstructed-byte oracle; overlapping backreference and compressed-block alignment controls must pass before GPU presentation.

Evidence: [work/batch_g/audits/R242.decompress-haps-texture-data-directly-into-gpu-owned-storage.md](work/batch_g/audits/R242.decompress-haps-texture-data-directly-into-gpu-owned-storage.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R245.parallelize-recursive-audio-effects-by-correcting-each-chunks-initial-state

**DEFER_SETUP — SOURCE_REVIEW**

mpv owns user audio filters and one streaming output state; no fixed linear effect recipe or chunk-state transition export exists. Arbitrary existing filters cannot be assumed linear/stable or correction-compatible.

Contract: Specified fixed stable linear DSP has declared numerical tolerance, correct initial history, output length and complete tails.

Next bounded test / reopening condition: Select one explicit stable IIR recipe and logical transition representation; compare irregular chunk partitions with full suffix/tails and incorrect zero-history control before scheduling integration.

Evidence: [work/batch_g/audits/R245.parallelize-recursive-audio-effects-by-correcting-each-chunks-initial-state.md](work/batch_g/audits/R245.parallelize-recursive-audio-effects-by-correcting-each-chunks-initial-state.md)

## R263.retained-deep-samples-deferred-composition

**DEFER_SETUP — PREREQUISITE_PROBE**

Current surfaces represent flat images; no deep-sample parser, retained sample lists or ROI compositor exists. Historical CPU synthetic deep result does not supply OpenEXR I/O or GPU implementation.

Contract: Same ordered deep samples produce exact declared ROI compositing, with retained-memory bounds and full-frame adverse workload.

Next bounded test / reopening condition: Define one bounded real deep input/sample-list adapter and independent ROI oracle; test sparse and full-frame views and reject changed depth/sample order. Charge initial parsing and storage.

Evidence: [work/batch_g/audits/R263.retained-deep-samples-deferred-composition.md](work/batch_g/audits/R263.retained-deep-samples-deferred-composition.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R290.compose-exact-motion-copy-chains-before-reconstructing-pixels

**DEFER_SETUP — SOURCE_REVIEW**

Current software/browser bridge returns reconstructed planes or frames, not symbolic prediction maps. Historical matches were detected after full decode, so they did not eliminate real MPEG2 reconstruction.

Contract: Exact integer-plane motion-copy dependency composition with every boundary operation, residual leaf and reference state preserved.

Next bounded test / reopening condition: Expose eligible no-residual integer-motion syntax from controlled MPEG2 decoder; compare one composed-chain suffix and chroma misalignment/changing-boundary fallback before performance claims.

Evidence: [work/batch_g/audits/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels.md](work/batch_g/audits/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels.md), [sources/reports/R289-R294-report.md](sources/reports/R289-R294-report.md)

## R303.schedule-h-264-deblocking-as-a-dependency-graph

**DEFER_SETUP — PREREQUISITE_PROBE**

Maintained Wasm SIMD deblocks CPU-resident samples with existing kernel ordering. No captured full edge graph or GPU-resident reconstruction owner exists, and readback may erase GPU benefit. Historical schedule graph is component-only.

Contract: Exact weak/strong luma filtering order with conservative read/write dependencies and unchanged subsequent reference pictures.

Next bounded test / reopening condition: Capture one actual single-slice edge trace with unfiltered plane and parameters; verify dependency schedule against optimized output plus unsafe reverse-order control before any GPU dispatch pipeline.

Evidence: [work/batch_g/audits/R303.schedule-h-264-deblocking-as-a-dependency-graph.md](work/batch_g/audits/R303.schedule-h-264-deblocking-as-a-dependency-graph.md), [sources/reports/R301-R306-report.md](sources/reports/R301-R306-report.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R315.carry-hidden-caption-state-across-packet-copy-cuts

**DEFER_SETUP — SOURCE_REVIEW**

Current subtitle bridge consumes already-rendered bitmap snapshots; NativeASS handles external ASS. No controlled CEA608 parser/logical state capsule restore owner exists. Visible bitmap/text snapshots cannot preserve hidden pop-on state.

Contract: Admitted CEA608 pop-on displayed/hidden buffers, style/cursor/mode/repeated-command state and times continue exactly across source-bound cut.

Next bounded test / reopening condition: Define versioned logical CEA608 state and one cut between hidden write/EOC; compare entire suffix and reject visible-text-only, repeated-EOC or wrong-service/source capsule.

Evidence: [work/batch_g/audits/R315.carry-hidden-caption-state-across-packet-copy-cuts.md](work/batch_g/audits/R315.carry-hidden-caption-state-across-packet-copy-cuts.md), [sources/reports/R313-R317-report.md](sources/reports/R313-R317-report.md)

## R326.smart-cut-predictive-video-by-synthesizing-only-the-missing-reference-boundary

**DEFER_SETUP — SOURCE_REVIEW**

Current pipeline consumes original packets and legal keyframe boundaries; no exact synthetic-reference encoder/state validator exists. Matching one MPEG2 reference pixel plane does not establish hidden reference equivalence for other codecs.

Contract: Constrained synthetic boundary plus copied predictive suffix reproduces all suffix pictures, numbering/filter state and timing.

Next bounded test / reopening condition: Scope one no-B MPEG2 constant-block boundary in an isolated encoder oracle; preserve all suffix payloads and compare complete suffix, with missing synthetic reference as fail control.

Evidence: [work/batch_g/audits/R326.smart-cut-predictive-video-by-synthesizing-only-the-missing-reference-boundary.md](work/batch_g/audits/R326.smart-cut-predictive-video-by-synthesizing-only-the-missing-reference-boundary.md), [sources/reports/R324-R331-report.md](sources/reports/R324-R331-report.md)

## R328.skip-decoding-video-frames-whose-entire-visible-contribution-is-provably-occluded

**DEFER_SETUP — SOURCE_REVIEW**

Current presentation has ordinary DOM/canvas layers but no authoritative fully opaque coverage timeline or future-reference liveness graph. Hiding an element cannot authorize decode suppression.

Contract: Only provably covered, future-unreferenced reconstruction may be skipped; syntax/reference state and all later visible pictures remain exact.

Next bounded test / reopening condition: Define a source-time opaque-coverage contract and controlled no-b-pyramid reference oracle; test one nonreference covered picture and reject covered reference/partial-alpha cases. Count modest historical savings honestly.

Evidence: [work/batch_g/audits/R328.skip-decoding-video-frames-whose-entire-visible-contribution-is-provably-occluded.md](work/batch_g/audits/R328.skip-decoding-video-frames-whose-entire-visible-contribution-is-provably-occluded.md), [sources/reports/R324-R331-report.md](sources/reports/R324-R331-report.md)

## R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together

**DEFER_SETUP — SOURCE_REVIEW**

Seek commands let mpv rebuild decoder/filter state; no portable versioned logical state serializer spans decoder, resampler, mixer and filters. Raw decoder snapshot in historical prototype is not maintained ABI.

Contract: Exact resumed sample/tail/state identity under same source/recipe/runtime; reject all identity changes and never persist raw pointers.

Next bounded test / reopening condition: Define a versioned state schema for one fixed Opus/resampler/IIR pipeline; test nonzero resampler phase checkpoint and reject zeroed phase/filter state or runtime mismatch.

Evidence: [work/batch_g/audits/R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together.md](work/batch_g/audits/R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together.md), [sources/reports/R324-R331-report.md](sources/reports/R324-R331-report.md)

## R344.seek-through-apng-by-resolving-the-last-writer-of-each-region

**DEFER_SETUP — SOURCE_REVIEW**

Current software decoder yields complete animation frames; no APNG operation index, standalone per-frame PNG view or bounded unresolved-region planner exists. Historical checkpoint was faster than planner at different retention cost, so use equal memory baseline.

Contract: Eight-bit SOURCE/NONE APNG target and continuation are sample-exact, transparent SOURCE replaces history, unsupported disposal/blend rejects.

Next bounded test / reopening condition: Define one validated APNG index/region planner with cap; test overlapping/transparent SOURCE and default-image exclusion, reject OVER/PREVIOUS and charge all selected-image decode/index reads.

Evidence: [work/batch_g/audits/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region.md](work/batch_g/audits/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region.md), [sources/reports/R343-R347-rerun-report.md](sources/reports/R343-R347-rerun-report.md)

## R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries

**DEFER_SETUP — SOURCE_REVIEW**

Playback rate delegates to mpv speed; no selected simple phase-vocoder algorithm or exposed phase/OLA state exists. Replacing a production stretcher with a teaching algorithm changes semantics.

Contract: Explicit fixed mono phase-vocoder algorithm preserves declared complex-spectrum/PCM tolerance, global phase anchors, OLA coverage, delay and trimming.

Next bounded test / reopening condition: Specify one fixed FFT/hop/stretch/padding recipe before irregular-chunk prefix oracle; test pi-wrap ties, tiny magnitudes and impulse at chunk boundary, charging complete transforms/OLA.

Evidence: [work/batch_g/audits/R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries.md](work/batch_g/audits/R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries.md)

## R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded

**DEFER_SETUP — SOURCE_REVIEW**

No APNG retained composition/index owner or opt-in approximation contract exists. Current output promises full frame; bounded transmittance cannot silently justify approximate playback, and historical microbenchmark excludes decode/index work.

Contract: Exact opaque-overwrite elision separate from opt-in bounded-error OVER/NONE preview in normalized premultiplied output; uncovered pixel/underflow never prove exactness.

Next bounded test / reopening condition: Define explicit preview tolerance/surface and bounded APNG history planner; test every pixel bound, uncovered pixel, transparent colored sample and underflow, restoring exact state before exact continuation.

Evidence: [work/batch_g/audits/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded.md](work/batch_g/audits/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded.md), [sources/reports/R358-R362-report.md](sources/reports/R358-R362-report.md)

## R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame

**DEFER_SETUP — PREREQUISITE_PROBE**

Presenter uses expanded 8-bit planes/RGBA; no B44 block parser/index or half-float demand sampler exists. Generic shader-f16 capability is not a B44 sampler and current color path cannot preserve arbitrary HALF values.

Contract: Flat B44 HALF non-subsampled pLinear-off samples equal pinned decode at bit patterns before declared nearest sampling/color; nonzero origins/edges bounded.

Next bounded test / reopening condition: Define one bounded B44 block address/unpack oracle including negative HALF/nonzero window; reject raw-chunk fallback/truncation before shader implementation and compare dense-view recomputation cost.

Evidence: [work/batch_g/audits/R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame.md](work/batch_g/audits/R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame.md), [sources/reports/R313-R317-report.md](sources/reports/R313-R317-report.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder

**DEFER_SETUP — SOURCE_REVIEW**

Current decoded YUV mapping assumes ordinary image planes and no carrier-atlas interpretation/profile exists. New prepared three-width luma atlas and shader require explicit contract and range oracle.

Contract: Explicit prepared 4:4:4 planes recover correct ranges/colors/times from luma atlas without filtered region bleed; report actual sample errors.

Next bounded test / reopening condition: Create one trusted all-byte ramp carrier and decode-plane oracle, then exact atlas shader nearest lookup; reject clipping/neutral-chroma conversion changes and count larger coded surface/preparation.

Evidence: [work/batch_g/audits/R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder.md](work/batch_g/audits/R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder.md), [sources/reports/R102-R115-report.md](sources/reports/R102-R115-report.md)

## R143.native-base-video-plus-an-exact-correction-stream

**DEFER_SETUP — SOURCE_REVIEW**

Current browser-decoded frame path has no signed correction stream or base-reconstruction identity contract. Platform-varying base/color conversion can invalidate supposedly exact residuals.

Contract: Exact declared source samples require identical base reconstruction, specified upsampling and signed correction semantics with full timing alignment.

Next bounded test / reopening condition: Define one prepared base/correction oracle tied to exact decoder reconstruction; deliberately different base reconstruction must reject rather than display approximate corrected output; count correction bytes/production.

Evidence: [work/batch_g/audits/R143.native-base-video-plus-an-exact-correction-stream.md](work/batch_g/audits/R143.native-base-video-plus-an-exact-correction-stream.md)

## R209.fetch-wavpack-correction-data-only-when-exact-output-is-required

**DEFER_SETUP — SOURCE_REVIEW**

Current single-source packet decoder does not own a separate WavPack correction stream or exact/lossy mode transition. Dual-source authorization and block-aligned correction mapping are prerequisites.

Contract: Explicit base-only lossy mode differs from exact base-plus-correction; exact suffix requires matching correction blocks and original sample mapping.

Next bounded test / reopening condition: Define bounded source-paired correction map and one block-boundary mode switch; verify suffix PCM exactness and reject absent/stale correction without claiming lossless output.

Evidence: [work/batch_g/audits/R209.fetch-wavpack-correction-data-only-when-exact-output-is-required.md](work/batch_g/audits/R209.fetch-wavpack-correction-data-only-when-exact-output-is-required.md)

## R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap

**STOP_PROFILE — SOURCE_REVIEW**

Maintained finite-source path reads complete authorized bytes and has no packet-loss concealment deadline or DRED model state. Normal packets make redundancy irrelevant for this exact-file profile; historical encoder build blocker is not asserted about current SDK.

Contract: No-loss ordinary output stays identical; explicitly authorized repair equals same eager pinned DRED reference, not original lost samples.

Next bounded test / reopening condition: Reopen only for an actual loss-repair use case plus mutually compatible DRED encoder/model/decoder; then one missing-packet/deadline/cancellation comparison without increasing candidate playout delay.

Evidence: [work/batch_g/audits/R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap.md](work/batch_g/audits/R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap.md), [sources/reports/R301-R306-report.md](sources/reports/R301-R306-report.md)

## R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode

**DEFER_SETUP — SOURCE_REVIEW**

Current video route exposes codec frames, not a JPEG XL original-JPEG reconstruction adapter followed by browser image decode. A libjxl source file in dependency tree is not proof the required Wasm API is built/available.

Contract: Only JPEG-origin JXL with valid reconstruction metadata emits byte-identical original JPEG and matching browser decoded pixels within output bounds.

Next bounded test / reopening condition: Establish one bounded libjxl reconstruction API artifact and genuine JPEG-origin JXL fixture; exact JPEG hash then browser image equality, rejecting missing metadata/truncation/oversized output.

Evidence: [work/batch_g/audits/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode.md](work/batch_g/audits/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode.md)

## R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac

**DEFER_SETUP — SOURCE_REVIEW**

The maintained FLAC path preserves selected integer samples and layouts through decode/encode; it does not expose mid subframes or a rounded-mono request. Mid extraction needs a bit parser and a precisely defined floor/rounding contract, especially for negative odd sums and coding-mode transitions.

Contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Next bounded test / reopening condition: Parse one all-mid-side FLAC fixture, extract only mid residuals into valid mono frames, and compare against the explicitly rounded integer average; reject a switched left/side frame.

Evidence: [work/batch_h/audits/R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac.md](work/batch_h/audits/R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R204.edit-mp3-coded-gain-without-changing-spectral-payload

**STOP_PROFILE — SOURCE_REVIEW**

Current real-time gain already uses one GainNode without audio re-encoding. Editing MP3 global_gain is a narrow approximate altered-output/export representation, so it offers no demonstrated advantage over the existing live gain owner.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: For a requested persistent MP3 gain edit, compare bounded MPEG1 mono side-info changes with declared amplitude tolerance and unchanged main data; reject gain underflow and MPEG2.

Evidence: [work/batch_h/audits/R204.edit-mp3-coded-gain-without-changing-spectral-payload.md](work/batch_h/audits/R204.edit-mp3-coded-gain-without-changing-spectral-payload.md), [sources/reports/R203-R213-report.md](sources/reports/R203-R213-report.md)

## R244.make-dithering-reproducible-at-any-sample-position

**STOP_PROFILE — SOURCE_REVIEW**

Current lossless preparation rejects quantization and copies integer values; its optional S16/S24-to-float conversion is exact. There is no dithered parallel quantizer at this boundary, so adding counter noise would change required output rather than remove work.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: If explicit quantized export is added, define track/channel/absolute-sample seed mapping and compare shuffled chunks with a serial oracle, including chunk-index reset failure.

Evidence: [work/batch_h/audits/R244.make-dithering-reproducible-at-any-sample-position.md](work/batch_h/audits/R244.make-dithering-reproducible-at-any-sample-position.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R246.make-parallel-audio-quantization-deterministic-without-shared-random-state

**STOP_PROFILE — SOURCE_REVIEW**

The Philox source provides concrete deterministic-worker correctness, distinct from unspecified legacy dither equality. Current playback has no Q8-to-integer parallel render stage; the reported worker results do not justify inserting quantization into this lossless path.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: For a new permitted quantizer, reuse published known-answer vectors and absolute counter mapping, then compare canceled/replayed workers at 2^32 and 2^48 boundaries.

Evidence: [work/batch_h/audits/R246.make-parallel-audio-quantization-deterministic-without-shared-random-state.md](work/batch_h/audits/R246.make-parallel-audio-quantization-deterministic-without-shared-random-state.md), [sources/reports/R239-R246-report.md](sources/reports/R239-R246-report.md)

## R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification

**DEFER_SETUP — SOURCE_REVIEW**

Current readers validate range identity and retry transport but have no independently trusted compressed-frame hashes or FLAC frame-length index. Related report CRC32 localization/collision filtering is not the proposed FLAC single-bit syndrome implementation.

Contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Next bounded test / reopening condition: Provide a tiny frame extent plus separately trusted SHA256, then enumerate bounded single-bit candidates on a temporary copy and reject CRC-valid hash-invalid, missing-identity and two-bit controls.

Evidence: [work/batch_h/audits/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification.md](work/batch_h/audits/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification.md), [sources/proposals/Demuxe_R307_R312_Proposals.md](sources/proposals/Demuxe_R307_R312_Proposals.md)

## R322.invert-flac-polarity-directly-in-the-residual-domain

**DEFER_SETUP — SOURCE_REVIEW**

Current adaptation does not expose fixed-predictor residuals or compressed polarity editing. Negating a two-complement minimum overflows at unchanged bit depth, and shifted LPC does not inherit the fixed-predictor proof.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Build a component writer for one fixed-predictor order with safe headroom, verify exact negated PCM and reject minimum-value overflow, then consider remaining admitted orders separately.

Evidence: [work/batch_h/audits/R322.invert-flac-polarity-directly-in-the-residual-domain.md](work/batch_h/audits/R322.invert-flac-polarity-directly-in-the-residual-domain.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R141.split-flac-frames-in-time-while-reusing-their-prediction-work

**DEFER_SETUP — SOURCE_REVIEW**

The encoder generates complete frames and packet-copy mux preserves packet boundaries. Splitting a FLAC frame in time needs reconstructed boundary warmups plus residual partition/framing rewrite, none exposed by the maintained packet interface.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: For one restricted predictor/frame, derive split warmups and reframe two outputs; compare concatenated PCM exactly and reject invalid split/residual partition cases.

Evidence: [work/batch_h/audits/R141.split-flac-frames-in-time-while-reusing-their-prediction-work.md](work/batch_h/audits/R141.split-flac-frames-in-time-while-reusing-their-prediction-work.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R155.fused-synthesis-and-resampling-mathematical-boundary-only

**STOP_PROFILE — SOURCE_REVIEW**

The maintained adaptation contract forbids resampling, and the historical dense 24MiB matrix only verifies linear composition. It lacks real AAC transforms, streaming edge handling and comparison against a fast implementation; no optimization is supported.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Only after a requested fixed-rate conversion exists, inspect an actual synthesis/resample boundary and derive a structured fused kernel with identical delay/tails.

Evidence: [work/batch_h/audits/R155.fused-synthesis-and-resampling-mathematical-boundary-only.md](work/batch_h/audits/R155.fused-synthesis-and-resampling-mathematical-boundary-only.md), [sources/reports/R146-R158-report.md](sources/reports/R146-R158-report.md)

## R166.prove-where-an-audio-edit-stops-affecting-subsequent-output

**DEFER_SETUP — SOURCE_REVIEW**

Current audio preparation is continuous and does not splice altered AAC packets or track coding-tool recovery certificates. A codec name and packet count cannot establish that transform/PNS/persistent state has converged after an edit.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: On one declared AAC tool profile, alter a bounded packet interval and compare every suffix sample against uninterrupted decode; unknown state must prevent certification.

Evidence: [work/batch_h/audits/R166.prove-where-an-audio-edit-stops-affecting-subsequent-output.md](work/batch_h/audits/R166.prove-where-an-audio-edit-stops-affecting-subsequent-output.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R157.interpolation-guided-by-real-codec-motion-vectors

**STOP_PROFILE — SOURCE_REVIEW**

Current bridge exposes decoded pictures but not codec motion-vector side data, and ordinary playback does not request synthetic intermediate pictures. Historical cut control is worse than frame hold, rejecting universal guided-interpolation quality from average errors.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: For requested interpolation, first expose real vectors and compare cut/occlusion cases separately against hold/blend and independent ground truth.

Evidence: [work/batch_h/audits/R157.interpolation-guided-by-real-codec-motion-vectors.md](work/batch_h/audits/R157.interpolation-guided-by-real-codec-motion-vectors.md), [sources/reports/R146-R158-report.md](sources/reports/R146-R158-report.md)

## R167.produce-a-requested-dissolve-directly-in-transform-space

**STOP_PROFILE — SOURCE_REVIEW**

The current presenter already has decoded surfaces, so a requested display dissolve can blend there. Transform-space JPEG output differs at intermediate alpha and needs entropy serialization; it is an export representation, not a pixel-identical live-display shortcut.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: For an explicit JPEG dissolve export, define coefficient/blend rounding domain and compare endpoints exactly plus intermediate tolerated error, including mismatched tables.

Evidence: [work/batch_h/audits/R167.produce-a-requested-dissolve-directly-in-transform-space.md](work/batch_h/audits/R167.produce-a-requested-dissolve-directly-in-transform-space.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R244.recompute-video-effects-only-where-the-input-actually-changed.report-a

**STOP_PROFILE — SOURCE_REVIEW**

Current presentation receives complete frames with no trustworthy effect-damage metadata. The reported full compare/retain/halo CPU implementation is 3.28x slower despite fewer evaluated blur pixels, so porting that discovery scheme has negative evidence.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Revisit only a cheap producer-supplied damage map; compare all final pixels including blur halo, subtitle changes and seek invalidation before measuring a GPU path.

Evidence: [work/batch_h/audits/R244.recompute-video-effects-only-where-the-input-actually-changed.report-a.md](work/batch_h/audits/R244.recompute-video-effects-only-where-the-input-actually-changed.report-a.md), [sources/reports/R239-R246-report.md](sources/reports/R239-R246-report.md)

## R244.reservoir-independent-prepared-mp3.report-c

**STOP_PROFILE — SOURCE_REVIEW**

Current packet-copy playback preserves source MP3 and does not author a no-reservoir encoding. Removing reservoir dependence changes preparation requirements and still leaves synthesis-state preroll, so it cannot make arbitrary MP3 packets independent.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: For explicitly prepared seek-friendly MP3, compare no-reservoir and normal encodes at matched requested quality and verify exact suffix recovery after restart.

Evidence: [work/batch_h/audits/R244.reservoir-independent-prepared-mp3.report-c.md](work/batch_h/audits/R244.reservoir-independent-prepared-mp3.report-c.md), [sources/reports/R239-R245-rerun-report.md](sources/reports/R239-R245-rerun-report.md)

## R322.animated-image-disposal-checkpoints.report-continuity

**DEFER_SETUP — SOURCE_REVIEW**

Current retained state contains video frames and generations, not an animated-image compositor with disposal transactions. A checkpoint must capture post-disposal canvas state; historical controlled commands do not parse real GIF palettes/interlace/transparency.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Define one tiny real disposal fixture and reference compositor, checkpoint after prior disposal and compare random seeks, with restore-to-previous incorrectly timed as adverse control.

Evidence: [work/batch_h/audits/R322.animated-image-disposal-checkpoints.report-continuity.md](work/batch_h/audits/R322.animated-image-disposal-checkpoints.report-continuity.md), [sources/reports/R318-R323-report.md](sources/reports/R318-R323-report.md)

## R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams

**DEFER_SETUP — SOURCE_REVIEW**

Current HEVC adapter carries existing configuration, not slice/tile merging. Shared current hvc1 query is positive, so historical blanket browser unavailability cannot be carried forward; motion-constrained inputs and a strict merger remain setup.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Provision two controlled motion-constrained tiles and a pinned strict merger, validate every reconstructed region before one exact browser HEVC configuration probe.

Evidence: [work/batch_h/audits/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams.md](work/batch_h/audits/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams.md), [sources/proposals/R102-R115-research-backlog.md](sources/proposals/R102-R115-research-backlog.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R120.entropy-only-transcoding

**DEFER_SETUP — SOURCE_REVIEW**

Current AVC parsing validates parameter sets/packet framing and passes entropy-coded slices unchanged. CABAC-to-CAVLC translation requires full symbol/context parsing and new slice serialization, far beyond a metadata relabel.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Use a restricted I/P slice corpus with independent reconstruction hashes; demonstrate one entropy representation conversion preserving coefficients/motion and reject unsupported slice tools.

Evidence: [work/batch_h/audits/R120.entropy-only-transcoding.md](work/batch_h/audits/R120.entropy-only-transcoding.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R128.compile-screen-operations-directly-into-video-prediction-commands

**DEFER_SETUP — SOURCE_REVIEW**

Demuxe consumes compressed media or decoded frames; it has no producer screen-operation log or encoder interface accepting copy/scroll decisions. Motion commands cannot be recovered merely from current presentation damage.

Contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Next bounded test / reopening condition: Define a producer-assisted block-aligned scene operation trace and reference renderer, then encode one legal constrained prediction sequence with exact target frames.

Evidence: [work/batch_h/audits/R128.compile-screen-operations-directly-into-video-prediction-commands.md](work/batch_h/audits/R128.compile-screen-operations-directly-into-video-prediction-commands.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R129.extend-gpu-reconstruction-from-still-pictures-to-predictive-video

**DEFER_SETUP — SOURCE_REVIEW**

Existing GPU presentation uploads reconstructed planes; browser decode outputs complete frames. A CPU entropy/GPU MPEG2 reconstruction split requires coefficient, motion, reference and synchronization interfaces absent from these owners.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Start with one progressive I picture and exact coefficient/pixel oracle, then one P reference case; defer B/interlace and full decoder replacement.

Evidence: [work/batch_h/audits/R129.extend-gpu-reconstruction-from-still-pictures-to-predictive-video.md](work/batch_h/audits/R129.extend-gpu-reconstruction-from-still-pictures-to-predictive-video.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes

**DEFER_SETUP — SOURCE_REVIEW**

Current captions composite after decode and preserve video bytes. Fixed-quantization MJPEG burn-in is a requested persistent pixel change needing coefficient access and whole-image entropy serialization, not an overlay optimization of this existing presenter.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: On one block-aligned MJPEG frame, preserve untouched coefficients and rewrite affected blocks; compare outside-region pixels and chroma edges while charging full serialization.

Evidence: [work/batch_h/audits/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes.md](work/batch_h/audits/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R148.actual-mpeg-2-coefficient-data-reused-by-jpeg

**STOP_PROFILE — SOURCE_REVIEW**

The historical bridge admits only flat DC-only MPEG2 I blocks and rejects actual nonzero AC. Current playback uses general MPEG2 software decode where no browser bridge exists, so this restricted grayscale construction cannot replace that route.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: If a matching DC-only image-extraction workload exists, test certificate rejection of AC, field DCT and truncation before considering JPEG emission.

Evidence: [work/batch_h/audits/R148.actual-mpeg-2-coefficient-data-reused-by-jpeg.md](work/batch_h/audits/R148.actual-mpeg-2-coefficient-data-reused-by-jpeg.md), [sources/reports/R146-R158-report.md](sources/reports/R146-R158-report.md)

## R153.shared-continuation-and-the-wrong-history-negative

**DEFER_SETUP — SOURCE_REVIEW**

Current source replacement retires generation and buffered reuse requires same source/RAP coverage; there is no branch-composition owner. The wrong-history counterexample proves shared timestamps/configuration are insufficient without a clean continuation boundary.

Contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Next bounded test / reopening condition: Represent one A/B branch plus shared RAP continuation and compare exact frames against full-source MSE; append a non-RAP continuation as a required negative.

Evidence: [work/batch_h/audits/R153.shared-continuation-and-the-wrong-history-negative.md](work/batch_h/audits/R153.shared-continuation-and-the-wrong-history-negative.md), [sources/reports/R146-R158-report.md](sources/reports/R146-R158-report.md)

## R164.reconstruct-fixed-predictor-lossless-audio-with-parallel-scans

**DEFER_SETUP — SOURCE_REVIEW**

The decoder delivers already reconstructed samples to the maintained adapter; fixed-predictor residuals are not exposed. Parallel exact scans require a decoder-internal stage plus entropy parsing/transfer accounting, not replacing the sample-copy loop.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: Extract one admitted fixed-order residual block, perform bounded exact prefix reconstruction against a scalar integer oracle and include overflow/end-boundary controls.

Evidence: [work/batch_h/audits/R164.reconstruct-fixed-predictor-lossless-audio-with-parallel-scans.md](work/batch_h/audits/R164.reconstruct-fixed-predictor-lossless-audio-with-parallel-scans.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R165.reverse-predictive-audio-by-transforming-its-residuals

**DEFER_SETUP — SOURCE_REVIEW**

Current audio path decodes forward and streams ordered PCM. The first-order residual reversal identity needs the last sample, warmup rewrite and valid FLAC framing; no compressed reverse-audio owner is present.

Contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Next bounded test / reopening condition: For one order1 block, derive last sample then reverse/negate residuals and compare exact reversed PCM, rejecting unsupported predictor orders and integer overflow.

Evidence: [work/batch_h/audits/R165.reverse-predictive-audio-by-transforming-its-residuals.md](work/batch_h/audits/R165.reverse-predictive-audio-by-transforming-its-residuals.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R168.compress-cold-reference-tiles-not-just-whole-cached-frames

**STOP_PROFILE — SOURCE_REVIEW**

Browser reference pictures are opaque; retained frames are output surfaces, not motion-compensation reference tiles. The historical cold-tile trace decompressed frequently and was much slower than dense access, so it is not a latency optimization for current owners.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Only after identifying real software-reference memory pressure, trace tile locality and compare compression plus halo expansion under the same byte budget.

Evidence: [work/batch_h/audits/R168.compress-cold-reference-tiles-not-just-whole-cached-frames.md](work/batch_h/audits/R168.compress-cold-reference-tiles-not-just-whole-cached-frames.md), [sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)

## R175.tighten-verified-h-264-decoder-requirements

**DEFER_SETUP — SOURCE_REVIEW**

Current SPS reading establishes dimensions/reorder contract and preserves truthful configuration. It does not inspect every slice/reference operation to certify a lower advertised DPB requirement; changing SPS optimistically would weaken admission.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Audit one overstated progressive I/P stream across every reference-list operation, then rewrite only num_ref_frames with exact frame hashes and a hidden extra-reference negative.

Evidence: [work/batch_h/audits/R175.tighten-verified-h-264-decoder-requirements.md](work/batch_h/audits/R175.tighten-verified-h-264-decoder-requirements.md), [sources/reports/R172-R182-report.md](sources/reports/R172-R182-report.md)

## R177.gpu-jpeg-entropy-decoding

**DEFER_SETUP — SOURCE_REVIEW**

Shared current evidence exposes a real nonfallback Apple WebGPU adapter, so the historical no-GPU/blocked-localhost verdict is no longer the blocker. Existing renderer accepts decoded planes; there is still no GPU JPEG entropy parser/kernel or malformed-input oracle.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: Prepare one restart-bounded JPEG entropy segment and independent coefficient oracle, then test a single bounded GPU kernel with truncated/invalid Huffman controls.

Evidence: [work/batch_h/audits/R177.gpu-jpeg-entropy-decoding.md](work/batch_h/audits/R177.gpu-jpeg-entropy-decoding.md), [sources/reports/R172-R182-report.md](sources/reports/R172-R182-report.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R187.recover-encoder-decisions-from-the-source

**DEFER_SETUP — SOURCE_REVIEW**

Current player exposes packet/frame flow, not source encoder decision logs or a target transcoder search interface. Historical x264 first-pass hints guided a separate block-matching model and did not demonstrate actual bitstream extraction or AVC-to-HEVC quality/cost.

Contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Next bounded test / reopening condition: Identify one available source hint and a real target encoder hook, then compare complete rate-distortion output to its own search baseline, including scene changes.

Evidence: [work/batch_h/audits/R187.recover-encoder-decisions-from-the-source.md](work/batch_h/audits/R187.recover-encoder-decisions-from-the-source.md), [sources/reports/R183-R192-report.md](sources/reports/R183-R192-report.md)

## R197.common-jpeg-quantization-basis-without-requantization-loss

**STOP_PROFILE — SOURCE_REVIEW**

Current playback consumes JPEG/video pixels without requiring a shared coefficient quantization basis. The gcd transform is exactly useful for coefficient editing but substantially grew both example files, so it is not a transparent compression/playback improvement.

Contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Next bounded test / reopening condition: For a coefficient-domain composition requirement, verify each dequantized coefficient after gcd rescaling with JCOEF overflow rejection, then charge larger entropy payloads.

Evidence: [work/batch_h/audits/R197.common-jpeg-quantization-basis-without-requantization-loss.md](work/batch_h/audits/R197.common-jpeg-quantization-basis-without-requantization-loss.md), [sources/reports/R193-R202-report.md](sources/reports/R193-R202-report.md)

## R199.certified-error-preview-reconstruction

**DEFER_SETUP — SOURCE_REVIEW**

Current UI commits seeks and presenter renders decoded pictures; there is no JPEG coefficient-preview reconstruction owner. Historical certificate applies a pinned double IDCT model rather than arbitrary browser JPEG output. Adding an approximate preview decoder needs an explicit output contract and parser.

Contract: Explicit per-pixel error budget relative to the pinned reconstruction model, labeled provisional rather than exact source playback.

Next bounded test / reopening condition: Identify one coefficient-accessible JPEG preview consumer and compare certificate including rounding against its reference before any browser presentation.

Evidence: [work/batch_i/audits/R199.certified-error-preview-reconstruction.md](work/batch_i/audits/R199.certified-error-preview-reconstruction.md)

## R217.exact-waveform-summaries-from-first-order-flac

**DEFER_SETUP — SOURCE_REVIEW**

FLAC decoder currently reconstructs fixed-order PCM and adaptation consumes AVFrames. Source-order-1 residual bin summaries could avoid that only for a new waveform-summary consumer; no such request/bridge exists in current playback. It does not eliminate entropy decoding.

Contract: Exact count/min/max/sum/integer energy per waveform bin spanning frames, tied to source and channel identity.

Next bounded test / reopening condition: Specify one waveform-bin output over an order-1 mono source and compare residual traversal with decoded-PCM summaries including a bin crossing frame boundary.

Evidence: [work/batch_i/audits/R217.exact-waveform-summaries-from-first-order-flac.md](work/batch_i/audits/R217.exact-waveform-summaries-from-first-order-flac.md)

## R218.exact-restricted-png-scans

**DEFER_SETUP — SOURCE_REVIEW**

Current graphics path receives decoded YUV/RGB, not PNG inflated scanlines. Shared deflate correctness/API availability removes an inflate prerequisite only; a new restricted PNG parser/reconstruction destination remains setup. Historical absent GPU is not current.

Contract: Noninterlaced RGBA8 None/Sub/Up profile yields exact bytes and rejects other filters, dimensions and bit depths.

Next bounded test / reopening condition: Scope one validated IDAT-to-scanline component with independent PNG decode; preserve strict admission before GPU prefix experiments.

Evidence: [work/batch_i/audits/R218.exact-restricted-png-scans.md](work/batch_i/audits/R218.exact-restricted-png-scans.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R231.parallelize-rice-parsing-through-composable-finite-state-transitions

**DEFER_SETUP — SOURCE_REVIEW**

The pinned decoder already parses Rice per validated partition with escape coding and overflow limits. A composable boundary-state parser would replace a real hot primitive but needs bounded state summaries and an executor; no actual parallel parsing opportunity trace is provided.

Contract: Exact code boundaries and signed residuals for fixed Rice parameter and bounded partitions with malformed/long-unary rejection.

Next bounded test / reopening condition: Count unary run and partition distribution on one admitted FLAC stream; compare one chunk-boundary parser with the existing bounded Golomb loop before parallel scheduling.

Evidence: [work/batch_i/audits/R231.parallelize-rice-parsing-through-composable-finite-state-transitions.md](work/batch_i/audits/R231.parallelize-rice-parsing-through-composable-finite-state-transitions.md)

## R234.replace-general-flac-predictors-with-equivalent-fixed-predictors

**DEFER_SETUP — SOURCE_REVIEW**

The decoder supports fixed and LPC forms while preparation currently runs full decoding/encoding; there is no FLAC syntax transformer. Historical equivalence checks leave serialization/CRC roundtrip open. A useful source must actually contain shift-zero exact fixed coefficients.

Contract: Only exactly equivalent LPC coefficients/zero shift rewrite to fixed syntax, preserving warm-ups/residual bits and decoded PCM.

Next bounded test / reopening condition: First count exact eligible LPC subframes in a real source; if nonzero, rewrite one frame and independently check residual bits, CRC and samples.

Evidence: [work/batch_i/audits/R234.replace-general-flac-predictors-with-equivalent-fixed-predictors.md](work/batch_i/audits/R234.replace-general-flac-predictors-with-equivalent-fixed-predictors.md)

## R240.add-useful-jpeg-restart-boundaries-without-another-image-generation-loss

**DEFER_SETUP — SOURCE_REVIEW**

FFmpeg already honors JPEG restart boundaries, but Demuxe has no coefficient-preserving JPEG entropy reserializer or regional JPEG requester. Markers alone would not prove browser parallel work or repay rewriting.

Contract: Quantized coefficients and image metadata remain exact under valid restart layout, including predictor reset and entropy escaping.

Next bounded test / reopening condition: Identify one repeated regional MJPEG/image decode workload; author one restart layout and compare coefficients/output before measuring use of boundaries.

Evidence: [work/batch_i/audits/R240.add-useful-jpeg-restart-boundaries-without-another-image-generation-loss.md](work/batch_i/audits/R240.add-useful-jpeg-restart-boundaries-without-another-image-generation-loss.md)

## R266.snappy-dependency-graph

**STOP_PROFILE — SOURCE_REVIEW**

Pinned Snappy copy primitive handles overlap sequentially; historical graph construction is 4.1x to 11.3x slower on both tested CPU shapes and incomplete for full Snappy framing. Do not replace the CPU decoder on this evidence. GPU availability is not a graph-executor result.

Contract: Exact literal/COPY_2 subset with overlap-safe dependencies; broader tags/framing are separate.

Next bounded test / reopening condition: Reopen only with a bounded parallel executor and measured broad independent layers whose total graph/upload cost can beat current decode.

Evidence: [work/batch_i/audits/R266.snappy-dependency-graph.md](work/batch_i/audits/R266.snappy-dependency-graph.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op

**STOP_PROFILE — SOURCE_REVIEW**

Pinned FFmpeg already returns when alpha/beta are zero and the historical encoder already disabled these filters. Its successful rewrite needed an artificially enabled equivalent source. A new derivative preprocessor has no demonstrated useful no-op workload in current software decode.

Contract: Complete future-reference plane equality under proof for every affected luma/chroma edge and legal rewritten syntax.

Next bounded test / reopening condition: Reopen only with naturally occurring eligible enabled slices and measured avoidable browser cost; retain near-threshold QP rejection.

Evidence: [work/batch_i/audits/R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op.md](work/batch_i/audits/R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op.md)

## R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook

**DEFER_SETUP — SOURCE_REVIEW**

Current custom browser bridge does not admit MJPEG and software decoding uses established codec machinery. Historical source-specialized Wasm is an offline-generated coefficient kernel, not a bounded runtime generator or full player. Real repeated table frequency and module amortization remain required.

Contract: Pinned validated Huffman table/scan layout consumes identical bits/symbols/coefficients and pixels with bounded trusted generation.

Next bounded test / reopening condition: Measure table reuse in one actual MJPEG source and identify the general lookup baseline; only then scope one trusted generated kernel.

Evidence: [work/batch_i/audits/R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook.md](work/batch_i/audits/R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook.md)

## R299.change-flac-predictor-order-directly-in-the-residual-domain

**STOP_PROFILE — SOURCE_REVIEW**

Historical order-1 to order-2 transform is exact but increases fixture bytes 1.7% and provides no complete preparation/decode gain. Current adaptation uses the optimized FLAC encoder; replacing it with residual conversion lacks a demonstrated value on this profile.

Contract: Same mono PCM, sample count, warm-ups and legal residual/frame integrity for the exact admitted orders.

Next bounded test / reopening condition: Reopen for sources with a measured useful predictor tradeoff; compare leave-unchanged and restricted optimized decode/reencode including all entropy/CRC work.

Evidence: [work/batch_i/audits/R299.change-flac-predictor-order-directly-in-the-residual-domain.md](work/batch_i/audits/R299.change-flac-predictor-order-directly-in-the-residual-domain.md)

## R300.reuse-repeated-inverse-transform-results-across-different-video-blocks

**DEFER_SETUP — SOURCE_REVIEW**

A concrete transform-plus-prediction/clipping boundary exists, with DC fast paths already present. Historical dct_coeff emitted no real trace; model cache success cannot establish nontrivial reuse. Source is available now but an instrumented coefficient trace is still new setup.

Contract: Exact signed transform residual keyed by full normalized coefficient/mode inputs; picture-specific prediction/clipping applied afterward.

Next bounded test / reopening condition: Instrument bounded counts/hashes of real nonzero non-DC 4x4 blocks before implementing cache; compare graphics and natural-video traces.

Evidence: [work/batch_i/audits/R300.reuse-repeated-inverse-transform-results-across-different-video-blocks.md](work/batch_i/audits/R300.reuse-repeated-inverse-transform-results-across-different-video-blocks.md)

## R301.edit-displayed-frames-without-changing-the-prediction-history

**DEFER_SETUP — SOURCE_REVIEW**

Current AV1 path submits valid original packets; there is no writer for hidden original B plus independent edited no-refresh picture. Historical primitive did not construct the full sequence. Current VideoDecoder availability resolves only the historical API blocker.

Contract: Unchanged source reference history and suffix pictures, explicitly edited displayed frame/time, no false redaction claim.

Next bounded test / reopening condition: First implement one legal constrained intra-only no-refresh insertion with independent decoder reference-state checks; compare all later pictures before browser delivery.

Evidence: [work/batch_i/audits/R301.edit-displayed-frames-without-changing-the-prediction-history.md](work/batch_i/audits/R301.edit-displayed-frames-without-changing-the-prediction-history.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images

**STOP_PROFILE — SOURCE_REVIEW**

Historical per-phrase descriptors already exceed complete index bytes by 29.7% before dictionary traffic. Current rendering has no GIF dictionary job consumer. GPU availability does not rescue the failed initial layout economics without a separately specified coarser executor.

Contract: Exact GIF indices/colors under immutable dictionary generations and race-free bounded output.

Next bounded test / reopening condition: Reopen only for coarser job aggregation with credible total traffic savings; compare optimized/native decode before building full GPU path.

Evidence: [work/batch_i/audits/R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images.md](work/batch_i/audits/R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps

**STOP_PROFILE — SOURCE_REVIEW**

The report floating transfer-curve implementation exceeds its 1e-12 tolerance by orders of magnitude and is slower. Current scalar/audio ring operations do not need this recurrence. Preserve the exact rational identity but reject that floating implementation rather than marking it merely blocked.

Contract: Declared true two-coefficient attack/release recurrence with correct branch history and numerical tolerance.

Next bounded test / reopening condition: Reopen only with a separately justified finite-precision representation preserving branch decisions; compare optimized sequential/across-channel baseline.

Evidence: [work/batch_i/audits/R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps.md](work/batch_i/audits/R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps.md)

## R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums

**DEFER_SETUP — SOURCE_REVIEW**

Pinned lossless JPEG decoder handles boundary seeds, precision alignment and restart state serially. Historical predictor-4 scans prove a constrained component but no current GPU residual-grid interface; source may use another predictor and cannot be re-encoded merely to hide setup.

Contract: SOF3 grayscale predictor4, point-transform0, no restart, exact modulo samples and reference stored alignment.

Next bounded test / reopening condition: Count eligible source usage then compare one real parsed residual grid to the pinned decoder with initial-row/column seeds before GPU passes.

Evidence: [work/batch_i/audits/R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums.md](work/batch_i/audits/R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums.md)

## R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file

**DEFER_SETUP — SOURCE_REVIEW**

Current reader validates authorized ranges/ETag but provides no segmented Streaming AEAD adapter. Historical Tink/WebCrypto/network absence is not a verified current blocker; a pinned reviewed construction and key/context owner still need setup. Do not substitute a homemade format.

Contract: Only authenticated requested plaintext segments under trusted source version may publish; failure is not EOF and unread media is not claimed authenticated.

Next bounded test / reopening condition: Identify one pinned Tink reference and test one official segmented vector plus a straddling range before wrapping existing reader.

Evidence: [work/batch_i/audits/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file.md](work/batch_i/audits/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file.md)

## R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata

**DEFER_SETUP — SOURCE_REVIEW**

Current native remux selects MP4/WebM and copies existing channel metadata; there is no Ogg mapping-family writer. Legal dual-mono/silent-slot assignments represent an explicit changed output request, not preservation of original channel layout.

Contract: Original Opus packets, pre-skip/gain/timing remain exact while declared mapping duplicates mono or supplies a silent index.

Next bounded test / reopening condition: Define one Ogg Opus mono-to-dual mapping and compare decoded channels with source-plus-zero reference before adding any player API.

Evidence: [work/batch_i/audits/R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata.md](work/batch_i/audits/R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata.md)

## R149.image-data-through-a-lossless-audio-decoder

**STOP_PROFILE — SOURCE_REVIEW**

Image-as-FLAC is unrelated to current audio output contract and both historical fixtures are larger than PNG. Browser recovery relies on a matched sample rate and nearest-grid decoding, not exact float PCM. No image carrier consumer exists and speakers must not receive carrier data.

Contract: Reversible recovered integer image bytes under fixed rate/count; never identify resampled floats as carrier preservation.

Next bounded test / reopening condition: Reopen only with a concrete available-decoder constraint and a corpus showing useful complete-cost advantage over ordinary image formats.

Evidence: [work/batch_i/audits/R149.image-data-through-a-lossless-audio-decoder.md](work/batch_i/audits/R149.image-data-through-a-lossless-audio-decoder.md)

## R180.residual-domain-flac-mixing

**DEFER_SETUP — SOURCE_REVIEW**

Current adaptation handles one selected audio track, not aligned two-source residual mixing. Report exact order3 frame sum has a narrow compatible predictor/headroom contract; parsing/reencoding and source authority need a new preparation owner.

Contract: Requested integer sum of aligned predictor-compatible mono frames preserves sample count without clipping and with rebuilt integrity.

Next bounded test / reopening condition: Find one explicit two-source mix request and validate alignment/predictor/headroom before comparing a single residual sum with PCM oracle.

Evidence: [work/batch_i/audits/R180.residual-domain-flac-mixing.md](work/batch_i/audits/R180.residual-domain-flac-mixing.md)

## R227.rotate-and-rearrange-texture-video-while-keeping-its-blocks-compressed

**DEFER_SETUP — SOURCE_REVIEW**

Current texture uploads are uncompressed YUV/RGBA, not BC1/BC3 video blocks. Shared GPU compression support is only a capability; source secondary compression and selector permutation are new format infrastructure.

Contract: Requested block-aligned right-angle transform preserves exact reconstructed BC texels and metadata.

Next bounded test / reopening condition: Identify one actual BC1 source and compare block/selector permutation against decode-transform reference, including edge blocks and BC3 alpha separately.

Evidence: [work/batch_i/audits/R227.rotate-and-rearrange-texture-video-while-keeping-its-blocks-compressed.md](work/batch_i/audits/R227.rotate-and-rearrange-texture-video-while-keeping-its-blocks-compressed.md), [evidence/prerequisites/result.json](evidence/prerequisites/result.json)

## R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope

**DEFER_SETUP — SOURCE_REVIEW**

Pinned Vorbis decoder contains the Floor1 render boundary, but current diagnostics are PCM RMS and no encoded-envelope visualizer exists. Historical floor interception gives a useful oracle; it does not justify labeling the curve final spectrum or waveform.

Contract: Explicit source Floor1 envelope bins and timestamps match decoder instrumentation; Floor0/codebook profiles remain gated.

Next bounded test / reopening condition: Expose one bounded Floor1 memo observation and compare an encoded-envelope display with independent floor curves before any PCM-free route.

Evidence: [work/batch_i/audits/R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope.md](work/batch_i/audits/R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope.md)

## R310.compile-g-711-processing-chains-into-exact-lookup-tables

**STOP_PROFILE — SOURCE_REVIEW**

Pinned G711 already uses conversion maps; current native adaptation does not admit a G711 process/reencode operation. Historical host-process ratios are not an optimized fused baseline, and there is no current fixed telephony recipe to compile.

Contract: Byte-identical pinned samplewise G711 recipe including law, gain/rounding and output encoding; not lossless original audio.

Next bounded test / reopening condition: Reopen for a concrete fixed G711 chain and enumerate every code/pair against independent fused implementation with changed-parameter invalidation.

Evidence: [work/batch_i/audits/R310.compile-g-711-processing-chains-into-exact-lookup-tables.md](work/batch_i/audits/R310.compile-g-711-processing-chains-into-exact-lookup-tables.md)

## R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples

**DEFER_SETUP — SOURCE_REVIEW**

Current lossless adaptation preserves samples; constant-offset editing is a new explicit request and bitstream transformer. Historical order1 +300 proof is sound for its profile but uses an explicit unknown MD5 policy and requires interior headroom analysis.

Contract: Exact requested integer correction with unchanged residual bits, complete headroom proof and truthful rebuilt CRC/decoded-audio digest policy.

Next bounded test / reopening condition: Specify one opt-in offset derivative, audit real fixed-order frequency and count range-analysis cost before a bounded warm-up patcher.

Evidence: [work/batch_i/audits/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples.md](work/batch_i/audits/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples.md)

## R345.stack-png-images-by-joining-their-compressed-scanline-streams

**STOP_PROFILE — SOURCE_REVIEW**

Current player does not batch PNG previews into atlases. Historical splice is exact but cold assembly is slower than the tiny baseline; cached-metadata advantage would require repeated prepared-image reuse absent here. This is scoped no current profile, not unsupported deflate.

Contract: Equal-width compatible PNGs retain filtered bytes and pixel stack with independent first-row prediction and original-stream distance validity.

Next bounded test / reopening condition: Reopen for a repeated prepared-preview atlas consumer with cached validated block metadata and compare full final-image decode/latency.

Evidence: [work/batch_i/audits/R345.stack-png-images-by-joining-their-compressed-scanline-streams.md](work/batch_i/audits/R345.stack-png-images-by-joining-their-compressed-scanline-streams.md)

## R346.turn-paeth-prediction-into-composable-byte-state-maps

**STOP_PROFILE — SOURCE_REVIEW**

The existing Paeth owner computes one predictor per byte. Historical dense 256-state maps are exact but 252.4x slower and require 4096 logical map bytes for a 1024-byte row. No reason to replace current CPU reconstruction with this candidate.

Contract: Exact Paeth tie-breaking and modulo-256 mapping retaining previous-row dependency.

Next bounded test / reopening condition: Reopen only with a compact exact map or real parallel schedule whose complete work beats serial/SIMD; retain exhaustive short-chunk state checks.

Evidence: [work/batch_i/audits/R346.turn-paeth-prediction-into-composable-byte-state-maps.md](work/batch_i/audits/R346.turn-paeth-prediction-into-composable-byte-state-maps.md)

## R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals

**DEFER_SETUP — SOURCE_REVIEW**

Current encoder can choose stereo representation; no residual-domain adapter exists. Historical parity conversion saves correlated-fixture bytes but is slightly slower than PCM M/S arithmetic, and source was forced to independent order1. Natural occurrence and total destination value are unproven.

Contract: Exact L/R samples with safe extra side precision, parity/floor behavior, identical sample timeline and valid CRC/seek metadata.

Next bounded test / reopening condition: Count independently coded order1 stereo frames in one real input; compare leave-unchanged, restricted encoder and parity transform including entropy and scratch costs.

Evidence: [work/batch_i/audits/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals.md](work/batch_i/audits/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals.md)

## R365.compute-gif-color-statistics-without-expanding-lzw-strings

**STOP_PROFILE — SOURCE_REVIEW**

Historical aggregate-query kernel is exact and beneficial on repetitive GIF but slower on noise; current player requires spatial decoded pixels and has no GIF histogram request. An added aggregate parse cannot be credited as replacing rendering.

Contract: Exact source-image palette histogram/counts without positions or animation-composite semantics, with full validated parse and bounded counters.

Next bounded test / reopening condition: Reopen for a source-level histogram consumer; compare propagation with fused no-image-allocation decode/count on repetitive and noisy sources.

Evidence: [work/batch_i/audits/R365.compute-gif-color-statistics-without-expanding-lzw-strings.md](work/batch_i/audits/R365.compute-gif-color-statistics-without-expanding-lzw-strings.md)

## R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments

**STOP_PROFILE — SOURCE_REVIEW**

Current player uses scalar playback gain and diagnostic RMS, not repeated fixed-alignment polynomial fade energy queries. Historical result needs about 48 queries plus retained source arrays for cancellation fallback; it does not render chosen audio or compute loudness.

Contract: Declared local-sample-grid polynomial gain energy/RMS including cross terms and guarded cancellation; no peak/LUFS/waveform claim.

Next bounded test / reopening condition: Reopen for an actual many-query fade-analysis consumer and compare build plus guarded queries with fused persistent mix-energy loop.

Evidence: [work/batch_i/audits/R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments.md](work/batch_i/audits/R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments.md)

## R076.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R76 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R76, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R077.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R77 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R77, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R078.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R78 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R78, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R079.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R79 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R79, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R080.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R80 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R80, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R081.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R81 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R81, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R247.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R247 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R247, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R248.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R248 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R248, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R249.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R249 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R249, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R250.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R250 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R250, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R251.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R251 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R251, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R252.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R252 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R252, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R253.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R253 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R253, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R254.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R254 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R254, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R255.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R255 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R255, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R256.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R256 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R256, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R257.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R257 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R257, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R258.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R258 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R258, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R259.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R259 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R259, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R260.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R260 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R260, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R276.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R276 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R276, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R277.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R277 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R277, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R278.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R278 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R278, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R279.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R279 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R279, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R280.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R280 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R280, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R281.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R281 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R281, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R282.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R282 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R282, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R283.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R283 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R283, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R284.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R284 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R284, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R285.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R285 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R285, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R286.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R286 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R286, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R287.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R287 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R287, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)

## R288.definition-not-recovered

**HOLD_SOURCE — SOURCE_REVIEW**

R288 has no named definition in the verified v4 register or bounded authorized-checkout heading search; no mechanism inferred.

Contract: None

Next bounded test / reopening condition: Recover an exact attributed definition for R288, preserve its bytes/hash, and migrate this placeholder before scientific screening.

Evidence: [evidence/source-recovery.md](evidence/source-recovery.md)
