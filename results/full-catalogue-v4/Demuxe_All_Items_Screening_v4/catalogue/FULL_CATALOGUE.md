# Full ranked research catalogue

This replaces the fixed 17-item shortlist as the scope of first-pass work. Ranks are revisable engineering judgments about the **next honest decision**, not measured speedups, prevalence or production readiness. Read the per-item card and original source before acting. E0 is a prerequisite/audit, not a successful runtime test. Existing local findings stay outside the fresh-screen lane until a reopening reason exists.

| Rank | Band | ID / branch | Exact source-defined mechanism | Impact | Screen / qualification | State |
|---:|---:|---|---|---:|---|---|
| 1 | 1 | R07 / proposal | [Close the HEVC-in-TS browser-owned construction gap](cards/R007.close-the-hevc-in-ts-browser-owned-construction-gap.md) | 5 | E0 / Q3 | UNSCREENED |
| 2 | 1 | R262 / report-defined | [configuration-interval seek](cards/R262.configuration-interval-seek.md) | 5 | E0 / Q3 | UNSCREENED |
| 3 | 1 | R332 / proposal | [Normalize VP9 superframes at the decoder boundary, not globally](cards/R332.normalize-vp9-superframes-at-the-decoder-boundary-not-globally.md) | 5 | E0 / Q3 | UNSCREENED |
| 4 | 1 | R343 / proposal | [Unwrap AAC-LATM into a browser-decoded audio route](cards/R343.unwrap-aac-latm-into-a-browser-decoded-audio-route.md) | 5 | E0 / Q3 | UNSCREENED |
| 5 | 1 | R355 / proposal | [Preserve native playback when an MPEG-TS track changes packet identifier](cards/R355.preserve-native-playback-when-an-mpeg-ts-track-changes-packet-identifier.md) | 5 | E0 / Q3 | UNSCREENED |
| 6 | 1 | R358 / proposal | [Unwrap Matroska track compression before choosing a decoder](cards/R358.unwrap-matroska-track-compression-before-choosing-a-decoder.md) | 5 | E0 / Q3 | UNSCREENED |
| 7 | 1 | R363 / proposal | [Expose prepared fragments as a native HLS presentation](cards/R363.expose-prepared-fragments-as-a-native-hls-presentation.md) | 5 | E0 / Q4 | UNSCREENED |
| 8 | 1 | R09 / proposal | [Pass already-valid fragmented media through unchanged](cards/R009.pass-already-valid-fragmented-media-through-unchanged.md) | 5 | E1 / Q3 | UNSCREENED |
| 9 | 1 | R138 / report-continuity | [one SourceBuffer, different codec and container](cards/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md) | 5 | E1 / Q4 | UNSCREENED |
| 10 | 1 | R05 / proposal | [Move MSE ownership off the window thread](cards/R005.move-mse-ownership-off-the-window-thread.md) | 4 | E0 / Q2 | UNSCREENED |
| 11 | 1 | R242 / report-A | [Keep decoder sessions continuous across transport and mux boundaries](cards/R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a.md) | 4 | E0 / Q3 | UNSCREENED |
| 12 | 1 | R295 / proposal | [Preserve hardware-overlay eligibility through subtitle and UI composition](cards/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition.md) | 4 | E0 / Q4 | UNSCREENED |
| 13 | 1 | R335 / proposal | [Recover the GPU presenter without reopening healthy decoders](cards/R335.recover-the-gpu-presenter-without-reopening-healthy-decoders.md) | 4 | E0 / Q4 | UNSCREENED |
| 14 | 1 | R353 / proposal | [Let browser-managed streaming windows control remux production](cards/R353.let-browser-managed-streaming-windows-control-remux-production.md) | 4 | E0 / Q4 | UNSCREENED |
| 15 | 1 | R57 / proposal | [Probe a real six-channel Native FLAC destination](cards/R057.probe-a-real-six-channel-native-flac-destination.md) | 5 | E0 / Q3 | UNSCREENED |
| 16 | 1 | R88 / proposal | [Native HLS playlist views over compatible existing media](cards/R088.native-hls-playlist-views-over-compatible-existing-media.md) | 5 | E0 / Q3 | UNSCREENED |
| 17 | 1 | R183 / report-defined | [native color with separately decoded transparency](cards/R183.native-color-with-separately-decoded-transparency.md) | 5 | E0 / Q3 | UNSCREENED |
| 18 | 1 | R114 / proposal | [Use WebRTC native media reception as a packet-copy destination](cards/R114.use-webrtc-native-media-reception-as-a-packet-copy-destination.md) | 5 | E0 / Q4 | UNSCREENED |
| 19 | 1 | R176 / report-defined | [JSPI-backed synchronous Wasm I/O](cards/R176.jspi-backed-synchronous-wasm-i-o.md) | 5 | E0 / Q4 | UNSCREENED |
| 20 | 1 | R06 / proposal | [Offer a non-pthread remux path without isolation](cards/R006.offer-a-non-pthread-remux-path-without-isolation.md) | 4 | E0 / Q3 | UNSCREENED |
| 21 | 1 | R24 / proposal | [Compare raw-YUV VideoFrame presentation with existing Software output](cards/R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output.md) | 4 | E0 / Q3 | UNSCREENED |
| 22 | 1 | R86 / report-defined | [Native video with an independent generated-PCM clock](cards/R086.native-video-with-an-independent-generated-pcm-clock.md) | 4 | E0 / Q3 | UNSCREENED |
| 23 | 1 | R97 / proposal | [Mux color and alpha into native transparent WebM](cards/R097.mux-color-and-alpha-into-native-transparent-webm.md) | 4 | E0 / Q3 | UNSCREENED |
| 24 | 1 | R160 / proposal | [Turn a whole-file audio decoder into a bounded streaming component](cards/R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component.md) | 4 | E0 / Q3 | UNSCREENED |
| 25 | 1 | R101 / proposal | [Keep decoded video on the native overlay/display path](cards/R101.keep-decoded-video-on-the-native-overlay-display-path.md) | 4 | E0 / Q4 | UNSCREENED |
| 26 | 1 | R99 / proposal | [Expose an HDR10-compatible Dolby Vision base without video re-encoding](cards/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding.md) | 5 | E0 / Q4 | UNSCREENED |
| 27 | 1 | R138 / proposal | [Decode the HE-AAC core natively, reconstruct the extension separately](cards/R138.decode-the-he-aac-core-natively-reconstruct-the-extension-separately.md) | 5 | E0 / Q4 | UNSCREENED |
| 28 | 1 | R159 / proposal | [Remux encrypted media without decrypting its samples](cards/R159.remux-encrypted-media-without-decrypting-its-samples.md) | 5 | E0 / Q4 | UNSCREENED |
| 29 | 1 | R184 / report-defined | [browser HEVC base + separate Dolby Vision reshaping](cards/R184.browser-hevc-base-separate-dolby-vision-reshaping.md) | 5 | E0 / Q4 | UNSCREENED |
| 30 | 1 | R208 / report-defined | [Make cancellation follow media dependency boundaries](cards/R208.make-cancellation-follow-media-dependency-boundaries.md) | 5 | E0 / Q4 | UNSCREENED |
| 31 | 1 | R307 / proposal | [Extract an MVC base view for explicitly requested 2D playback](cards/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback.md) | 5 | E0 / Q4 | UNSCREENED |
| 32 | 1 | R82 / report-defined | [Browser-side video normalization](cards/R082.browser-side-video-normalization.md) | 4 | E0 / Q3 | UNSCREENED |
| 33 | 1 | R173 / report-defined | [preserve FLIC indices plus palette](cards/R173.preserve-flic-indices-plus-palette.md) | 4 | E0 / Q3 | UNSCREENED |
| 34 | 1 | R194 / report-defined | [browser zlib + ZMBV reconstruction](cards/R194.browser-zlib-zmbv-reconstruction.md) | 4 | E0 / Q3 | UNSCREENED |
| 35 | 1 | R117 / proposal | [Play IAMF through native component decoders](cards/R117.play-iamf-through-native-component-decoders.md) | 4 | E0 / Q4 | UNSCREENED |
| 36 | 1 | R172 / report-defined | [keep Hap BC1 compressed to presentation](cards/R172.keep-hap-bc1-compressed-to-presentation.md) | 4 | E0 / Q4 | UNSCREENED |
| 37 | 1 | R193 / report-defined | [tiled HEIC through browser video decoding](cards/R193.tiled-heic-through-browser-video-decoding.md) | 4 | E0 / Q4 | UNSCREENED |
| 38 | 1 | R195 / report-defined | [prepared texture video to several GPU destinations](cards/R195.prepared-texture-video-to-several-gpu-destinations.md) | 4 | E0 / Q4 | UNSCREENED |
| 39 | 1 | R205 / report-defined | [Multicore FFV1 without shared address-space state](cards/R205.multicore-ffv1-without-shared-address-space-state.md) | 4 | E0 / Q4 | UNSCREENED |
| 40 | 1 | R241 / proposal | [Decode an Ambisonic sound field natively, then render its spatial meaning separately](cards/R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately.md) | 4 | E0 / Q4 | UNSCREENED |
| 41 | 1 | R275 / report-defined | [AV1 large-scale tile viewport decode](cards/R275.av1-large-scale-tile-viewport-decode.md) | 4 | E0 / Q4 | UNSCREENED |
| 42 | 1 | R350 / proposal | [Extract a declared lower-frame-rate AV1 operating point before decoding](cards/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding.md) | 4 | E0 / Q4 | UNSCREENED |
| 43 | 2 | R19 / proposal | [Extract embedded ASS while leaving video Native](cards/R019.extract-embedded-ass-while-leaving-video-native.md) | 5 | E2 / Q3 | UNSCREENED |
| 44 | 2 | R20 / proposal | [Render bitmap subtitles without burning them into video](cards/R020.render-bitmap-subtitles-without-burning-them-into-video.md) | 5 | E2 / Q3 | UNSCREENED |
| 45 | 2 | R31 / proposal | [Raw AAC/MP3 audio beside fragmented video](cards/R031.raw-aac-mp3-audio-beside-fragmented-video.md) | 5 | E2 / Q3 | UNSCREENED |
| 46 | 2 | R32 / proposal | [Use different output containers for different tracks](cards/R032.use-different-output-containers-for-different-tracks.md) | 5 | E2 / Q3 | UNSCREENED |
| 47 | 2 | R46 / proposal | [A small JavaScript ordinary-MP4-to-MSE adapter](cards/R046.a-small-javascript-ordinary-mp4-to-mse-adapter.md) | 5 | E2 / Q3 | UNSCREENED |
| 48 | 2 | R51 / proposal | [Try integer-lossless source codecs before changing lossy decoders](cards/R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders.md) | 5 | E2 / Q3 | UNSCREENED |
| 49 | 2 | R58 / proposal | [Change video codec while retaining the audio presentation](cards/R058.change-video-codec-while-retaining-the-audio-presentation.md) | 5 | E2 / Q3 | UNSCREENED |
| 50 | 2 | R59 / proposal | [Construct a selected-track MP4 view without remuxing samples](cards/R059.construct-a-selected-track-mp4-view-without-remuxing-samples.md) | 5 | E2 / Q3 | UNSCREENED |
| 51 | 2 | R60 / proposal | [Extract in-band closed captions from compressed video headers](cards/R060.extract-in-band-closed-captions-from-compressed-video-headers.md) | 5 | E2 / Q3 | UNSCREENED |
| 52 | 2 | R65 / proposal | [Isolate a selected program from multi-program transport streams](cards/R065.isolate-a-selected-program-from-multi-program-transport-streams.md) | 5 | E2 / Q3 | UNSCREENED |
| 53 | 2 | R91 / proposal | [In-band video configuration changes with avc3, and qualified hev1](cards/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1.md) | 5 | E2 / Q3 | UNSCREENED |
| 54 | 2 | R92 / proposal | [Normalize VP9 codec units for the actual destination](cards/R092.normalize-vp9-codec-units-for-the-actual-destination.md) | 5 | E2 / Q3 | UNSCREENED |
| 55 | 2 | R110 / proposal | [Choose a destination-aware lacing or unlacing representation](cards/R110.choose-a-destination-aware-lacing-or-unlacing-representation.md) | 5 | E2 / Q3 | UNSCREENED |
| 56 | 2 | R115 / proposal | [Play an ongoing fMP4 response through one native URL](cards/R115.play-an-ongoing-fmp4-response-through-one-native-url.md) | 5 | E2 / Q3 | UNSCREENED |
| 57 | 2 | R01 / proposal | [Share source reads and inspection across candidates](cards/R001.share-source-reads-and-inspection-across-candidates.md) | 4 | E1 / Q2 | USER_REPORTED_FIRST_PASS_COMPLETE |
| 58 | 2 | R02 / proposal | [Promote useful startup work instead of reopening](cards/R002.promote-useful-startup-work-instead-of-reopening.md) | 4 | E1 / Q2 | UNSCREENED |
| 59 | 2 | R03 / proposal | [Coalesce range reads around useful media boundaries](cards/R003.coalesce-range-reads-around-useful-media-boundaries.md) | 4 | E1 / Q2 | UNSCREENED |
| 60 | 2 | R18 / proposal | [Cache prepared media by timeline and transformation recipe](cards/R018.cache-prepared-media-by-timeline-and-transformation-recipe.md) | 4 | E1 / Q2 | UNSCREENED |
| 61 | 2 | R21 / proposal | [Cache subtitle tiles and schedule only useful redraws](cards/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws.md) | 4 | E1 / Q2 | UNSCREENED |
| 62 | 2 | R26 / proposal | [Replace polling chains with bounded credits and deadlines](cards/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md) | 4 | E1 / Q2 | UNSCREENED |
| 63 | 2 | R27 / proposal | [Share immutable compiled code, not live playback state](cards/R027.share-immutable-compiled-code-not-live-playback-state.md) | 4 | E1 / Q2 | USER_REPORTED_FIRST_PASS_COMPLETE |
| 64 | 2 | R40 / proposal | [Coalesce scrub requests and commit the final exact seek](cards/R040.coalesce-scrub-requests-and-commit-the-final-exact-seek.md) | 4 | E1 / Q2 | UNSCREENED |
| 65 | 2 | R47 / proposal | [Assemble output as headers plus original payload views](cards/R047.assemble-output-as-headers-plus-original-payload-views.md) | 4 | E1 / Q2 | UNSCREENED |
| 66 | 2 | R48 / proposal | [Keep only the relevant native caption cues instantiated](cards/R048.keep-only-the-relevant-native-caption-cues-instantiated.md) | 4 | E1 / Q2 | USER_REPORTED_FIRST_PASS_COMPLETE |
| 67 | 2 | R49 / proposal | [Size lookahead in wall-clock time, not fixed media seconds](cards/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md) | 4 | E1 / Q2 | UNSCREENED |
| 68 | 2 | R66 / proposal | [Communicate the requested start position before first-data preparation](cards/R066.communicate-the-requested-start-position-before-first-data-preparation.md) | 4 | E1 / Q2 | UNSCREENED |
| 69 | 2 | R69 / proposal | [Separate decoder compatibility from per-source initialization identity](cards/R069.separate-decoder-compatibility-from-per-source-initialization-identity.md) | 4 | E1 / Q2 | UNSCREENED |
| 70 | 2 | R74 / report-defined | [Skip redundant packed-PCM staging](cards/R074.skip-redundant-packed-pcm-staging.md) | 4 | E1 / Q2 | USER_REPORTED_FIRST_PASS_COMPLETE |
| 71 | 2 | R100 / proposal | [Transfer owned packet storage into WebCodecs chunks](cards/R100.transfer-owned-packet-storage-into-webcodecs-chunks.md) | 4 | E1 / Q2 | UNSCREENED |
| 72 | 2 | R118 / report-frontier | [MSE append-window clipping [report paragraph label]](cards/R118.mse-append-window-clipping-report-paragraph-label.report-frontier.md) | 4 | E1 / Q2 | UNSCREENED |
| 73 | 2 | R119 / proposal | [Canonicalize equivalent decoder configurations](cards/R119.canonicalize-equivalent-decoder-configurations.md) | 4 | E1 / Q2 | UNSCREENED |
| 74 | 2 | R119 / report-frontier | [MSE future-range replacement [report paragraph label]](cards/R119.mse-future-range-replacement-report-paragraph-label.report-frontier.md) | 4 | E1 / Q2 | UNSCREENED |
| 75 | 2 | R122 / report-frontier | [Retime existing frames without creating new pictures](cards/R122.retime-existing-frames-without-creating-new-pictures.report-frontier.md) | 4 | E1 / Q2 | UNSCREENED |
| 76 | 2 | R124 / proposal | [Copy a frame once to free the decoder](cards/R124.copy-a-frame-once-to-free-the-decoder.md) | 4 | E1 / Q2 | UNSCREENED |
| 77 | 2 | R124 / report-frontier | [WebM negative DiscardPadding head-crop composition [report paragraph label]](cards/R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier.md) | 4 | E1 / Q2 | UNSCREENED |
| 78 | 2 | R125 / proposal | [Buffer according to predicted decode work](cards/R125.buffer-according-to-predicted-decode-work.md) | 4 | E1 / Q2 | UNSCREENED |
| 79 | 2 | R125 / report-frontier | [WebM DefaultDuration parser holdback [report paragraph label]](cards/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier.md) | 4 | E1 / Q2 | UNSCREENED |
| 80 | 2 | R126 / proposal | [Find where hardware decoding loses on short jobs](cards/R126.find-where-hardware-decoding-loses-on-short-jobs.md) | 4 | E1 / Q2 | UNSCREENED |
| 81 | 2 | R126 / report-frontier | [Same-codec bytestream change in one SourceBuffer [report paragraph label]](cards/R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier.md) | 4 | E1 / Q2 | UNSCREENED |
| 82 | 2 | R131 / report-frontier | [global MP4 sidx materially changes remote access](cards/R131.global-mp4-sidx-materially-changes-remote-access.report-frontier.md) | 4 | E1 / Q2 | UNSCREENED |
| 83 | 2 | R135 / report-continuity | [microfragment size versus startup bytes](cards/R135.microfragment-size-versus-startup-bytes.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 84 | 2 | R140 / report-continuity | [cue-less WebM native seek](cards/R140.cue-less-webm-native-seek.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 85 | 2 | R144 / proposal | [Compile simple ASS animations into reusable timeline programs](cards/R144.compile-simple-ass-animations-into-reusable-timeline-programs.md) | 4 | E1 / Q2 | UNSCREENED |
| 86 | 2 | R144 / report-continuity | [evict through a paused current position](cards/R144.evict-through-a-paused-current-position.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 87 | 2 | R162 / proposal | [Compile a qualified mux configuration into a small patch program](cards/R162.compile-a-qualified-mux-configuration-into-a-small-patch-program.md) | 4 | E1 / Q2 | UNSCREENED |
| 88 | 2 | R169 / proposal | [Make custom presentation aware of display cadence](cards/R169.make-custom-presentation-aware-of-display-cadence.md) | 4 | E1 / Q2 | UNSCREENED |
| 89 | 2 | R170 / proposal | [Separate audio-clock drift from an audio-latency jump](cards/R170.separate-audio-clock-drift-from-an-audio-latency-jump.md) | 4 | E1 / Q2 | UNSCREENED |
| 90 | 2 | R188 / report-defined | [schedule verified playable data](cards/R188.schedule-verified-playable-data.md) | 4 | E1 / Q2 | UNSCREENED |
| 91 | 2 | R189 / report-defined | [sparse-track future-time bounds](cards/R189.sparse-track-future-time-bounds.md) | 4 | E1 / Q2 | UNSCREENED |
| 92 | 2 | R200 / report-defined | [content-addressed reuse across different files](cards/R200.content-addressed-reuse-across-different-files.md) | 4 | E1 / Q2 | UNSCREENED |
| 93 | 2 | R213 / report-defined | [Compare whole frames on the graphics side and read back only the witness](cards/R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness.md) | 4 | E1 / Q2 | UNSCREENED |
| 94 | 2 | R215 / report-defined | [upload operation selected by existing layout](cards/R215.upload-operation-selected-by-existing-layout.md) | 4 | E1 / Q2 | UNSCREENED |
| 95 | 2 | R216 / report-defined | [one request for distant byte ranges](cards/R216.one-request-for-distant-byte-ranges.md) | 4 | E1 / Q2 | UNSCREENED |
| 96 | 2 | R220 / report-defined | [scoped transport-clock normalization](cards/R220.scoped-transport-clock-normalization.md) | 4 | E1 / Q2 | UNSCREENED |
| 97 | 2 | R221 / report-defined | [GPU intermediate lifetime planning](cards/R221.gpu-intermediate-lifetime-planning.md) | 4 | E1 / Q2 | UNSCREENED |
| 98 | 2 | R222 / report-defined | [independently checkable remux construction record](cards/R222.independently-checkable-remux-construction-record.md) | 4 | E1 / Q2 | UNSCREENED |
| 99 | 2 | R229 / report-continuity | [MPEG-TS track elimination with payload preservation](cards/R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 100 | 2 | R230 / report-continuity | [exact MP3 seek closure](cards/R230.exact-mp3-seek-closure.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 101 | 2 | R233 / proposal | [Make independently resampled audio chunks join exactly](cards/R233.make-independently-resampled-audio-chunks-join-exactly.md) | 4 | E1 / Q2 | UNSCREENED |
| 102 | 2 | R237 / proposal | [Propagate the visible region backward through the effects pipeline](cards/R237.propagate-the-visible-region-backward-through-the-effects-pipeline.md) | 4 | E1 / Q2 | UNSCREENED |
| 103 | 2 | R238 / proposal | [Let channel reduction cross the resampler boundary](cards/R238.let-channel-reduction-cross-the-resampler-boundary.md) | 4 | E1 / Q2 | UNSCREENED |
| 104 | 2 | R239 / proposal | [Wait for the required pictures without draining the decoder](cards/R239.wait-for-the-required-pictures-without-draining-the-decoder.md) | 4 | E1 / Q2 | UNSCREENED |
| 105 | 2 | R243 / proposal | [Carry exact silence through the pipeline without allocating its samples](cards/R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples.md) | 4 | E1 / Q2 | UNSCREENED |
| 106 | 2 | R243 / report-C | [remove nonessential H.264 SEI](cards/R243.remove-nonessential-h-264-sei.report-c.md) | 4 | E1 / Q2 | UNSCREENED |
| 107 | 2 | R264 / report-defined | [exact incremental image statistics](cards/R264.exact-incremental-image-statistics.md) | 4 | E1 / Q2 | UNSCREENED |
| 108 | 2 | R265 / report-defined | [sparse correction for cached linear audio filtering](cards/R265.sparse-correction-for-cached-linear-audio-filtering.md) | 4 | E1 / Q2 | UNSCREENED |
| 109 | 2 | R267 / report-defined | [deadline slack before optimization](cards/R267.deadline-slack-before-optimization.md) | 4 | E1 / Q2 | UNSCREENED |
| 110 | 2 | R296 / proposal | [Generate seek fragments without replaying a mux session](cards/R296.generate-seek-fragments-without-replaying-a-mux-session.md) | 4 | E1 / Q2 | UNSCREENED |
| 111 | 2 | R297 / proposal | [Query MP4 timing tables without expanding every sample record](cards/R297.query-mp4-timing-tables-without-expanding-every-sample-record.md) | 4 | E1 / Q2 | UNSCREENED |
| 112 | 2 | R298 / proposal | [Copy surviving packets to release oversized backing buffers](cards/R298.copy-surviving-packets-to-release-oversized-backing-buffers.md) | 4 | E1 / Q2 | UNSCREENED |
| 113 | 2 | R318 / report-continuity | [Decode a GOP once for exact reverse-frame playback](cards/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 114 | 2 | R321 / report-continuity | [Exact IIR seek checkpoints](cards/R321.exact-iir-seek-checkpoints.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 115 | 2 | R323 / report-continuity | [Merkle-proof cached-range verification](cards/R323.merkle-proof-cached-range-verification.report-continuity.md) | 4 | E1 / Q2 | UNSCREENED |
| 116 | 2 | R327 / proposal | [Share one decoded audio source across many sample-rate consumers](cards/R327.share-one-decoded-audio-source-across-many-sample-rate-consumers.md) | 4 | E1 / Q2 | UNSCREENED |
| 117 | 2 | R330 / proposal | [Encode repeated subtitle glyph arrangements as reusable scene objects](cards/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects.md) | 4 | E1 / Q2 | UNSCREENED |
| 118 | 2 | R334 / proposal | [Share one demux pass across independent playback and export timelines](cards/R334.share-one-demux-pass-across-independent-playback-and-export-timelines.md) | 4 | E1 / Q2 | UNSCREENED |
| 119 | 2 | R339 / proposal | [Collapse chroma expansion and final resizing into one filter](cards/R339.collapse-chroma-expansion-and-final-resizing-into-one-filter.md) | 4 | E1 / Q2 | UNSCREENED |
| 120 | 2 | R349 / proposal | [Seek through hierarchical MP4 indexes without loading the whole index](cards/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index.md) | 4 | E1 / Q2 | UNSCREENED |
| 121 | 2 | R360 / proposal | [Retarget in-flight decoding instead of restarting a forward scrub](cards/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub.md) | 4 | E1 / Q2 | UNSCREENED |
| 122 | 2 | R361 / proposal | [Keep frame-adaptive analysis and rendering on one GPU timeline](cards/R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline.md) | 4 | E1 / Q2 | UNSCREENED |
| 123 | 2 | R364 / proposal | [Reuse GPU command sequences across changing video frames](cards/R364.reuse-gpu-command-sequences-across-changing-video-frames.md) | 4 | E1 / Q2 | UNSCREENED |
| 124 | 2 | R121 / report-frontier | [Insert a freeze with an empty edit](cards/R121.insert-a-freeze-with-an-empty-edit.report-frontier.md) | 4 | E1 / Q3 | UNSCREENED |
| 125 | 2 | R123 / report-frontier | [WebM positive DiscardPadding tail trim [report paragraph label]](cards/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md) | 4 | E1 / Q3 | UNSCREENED |
| 126 | 2 | R132 / report-continuity | [incremental mdat sample release](cards/R132.incremental-mdat-sample-release.report-continuity.md) | 4 | E1 / Q3 | UNSCREENED |
| 127 | 2 | R133 / report-continuity | [append moof and mdat separately](cards/R133.append-moof-and-mdat-separately.report-continuity.md) | 4 | E1 / Q3 | UNSCREENED |
| 128 | 2 | R134 / report-continuity | [complete-sample versus arbitrary byte boundary](cards/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md) | 4 | E1 / Q3 | UNSCREENED |
| 129 | 2 | R136 / report-continuity | [worker-owned MSE with MediaSourceHandle](cards/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md) | 4 | E1 / Q3 | UNSCREENED |
| 130 | 2 | R137 / report-continuity | [transferable compressed buffers into worker MSE](cards/R137.transferable-compressed-buffers-into-worker-mse.report-continuity.md) | 4 | E1 / Q3 | UNSCREENED |
| 131 | 2 | R139 / report-continuity | [continuous playback through H.264/fMP4 → VP9/WebM](cards/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity.md) | 4 | E1 / Q3 | UNSCREENED |
| 132 | 2 | R145 / report-continuity | [native frame relay without JS pixel readback](cards/R145.native-frame-relay-without-js-pixel-readback.report-continuity.md) | 4 | E1 / Q3 | UNSCREENED |
| 133 | 2 | R203 / report-defined | [Regroup existing Opus frames without re-encoding](cards/R203.regroup-existing-opus-frames-without-re-encoding.md) | 4 | E1 / Q3 | UNSCREENED |
| 134 | 2 | R242 / report-C | [H.264 aspect metadata with no VCL rewrite](cards/R242.h-264-aspect-metadata-with-no-vcl-rewrite.report-c.md) | 4 | E1 / Q3 | UNSCREENED |
| 135 | 2 | R272 / report-defined | [ROI VideoFrame.copyTo](cards/R272.roi-videoframe-copyto.md) | 4 | E1 / Q3 | UNSCREENED |
| 136 | 2 | R289 / proposal | [Share one native decoder across unrelated independent-picture jobs](cards/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs.md) | 4 | E1 / Q3 | UNSCREENED |
| 137 | 2 | R319 / proposal | [Copy only the part of a decoded VideoFrame an analysis task actually needs](cards/R319.copy-only-the-part-of-a-decoded-videoframe-an-analysis-task-actually-needs.md) | 4 | E1 / Q3 | UNSCREENED |
| 138 | 2 | R323 / proposal | [Fan one decoded VideoFrame into several workers without copying its pixels up front](cards/R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front.md) | 4 | E1 / Q3 | UNSCREENED |
| 139 | 2 | R333 / proposal | [Keep soft telecine as progressive pictures plus timing](cards/R333.keep-soft-telecine-as-progressive-pictures-plus-timing.md) | 4 | E1 / Q3 | UNSCREENED |
| 140 | 2 | R117 / report-frontier | [MSE timestampOffset concatenation [report paragraph label]](cards/R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier.md) | 4 | E1 / Q4 | UNSCREENED |
| 141 | 2 | R04 / proposal | [Stream inside a fragment instead of making it smaller](cards/R004.stream-inside-a-fragment-instead-of-making-it-smaller.md) | 4 | E2 / Q2 | USER_REPORTED_FIRST_PASS_COMPLETE |
| 142 | 2 | R14 / proposal | [Avoid duplicate resampling and oversized audio work batches](cards/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md) | 4 | E2 / Q2 | UNSCREENED |
| 143 | 2 | R15 / proposal | [Make split-buffer audio switching transactional](cards/R015.make-split-buffer-audio-switching-transactional.md) | 4 | E2 / Q2 | UNSCREENED |
| 144 | 2 | R17 / proposal | [Model unequal tails as explicit track-lifetime phases](cards/R017.model-unequal-tails-as-explicit-track-lifetime-phases.md) | 4 | E2 / Q2 | UNSCREENED |
| 145 | 2 | R35 / proposal | [Switch same-codec audio at a future boundary without pausing](cards/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing.md) | 4 | E2 / Q2 | UNSCREENED |
| 146 | 2 | R36 / proposal | [Reuse one MSE presentation across a queue or repeat loop](cards/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop.md) | 4 | E2 / Q2 | UNSCREENED |
| 147 | 2 | R37 / proposal | [Recover an interrupted partial append without replacing MSE](cards/R037.recover-an-interrupted-partial-append-without-replacing-mse.md) | 4 | E2 / Q2 | UNSCREENED |
| 148 | 2 | R38 / proposal | [Recover from a full buffer by evicting and retrying in place](cards/R038.recover-from-a-full-buffer-by-evicting-and-retrying-in-place.md) | 4 | E2 / Q2 | UNSCREENED |
| 149 | 2 | R43 / proposal | [Change video configuration while keeping audio running](cards/R043.change-video-configuration-while-keeping-audio-running.md) | 4 | E2 / Q2 | UNSCREENED |
| 150 | 2 | R44 / proposal | [Play an exact requested excerpt without re-encoding its edge GOP](cards/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop.md) | 4 | E2 / Q2 | UNSCREENED |
| 151 | 2 | R45 / proposal | [Use a source-bound seek map rather than repeated fragment scanning](cards/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning.md) | 4 | E2 / Q2 | UNSCREENED |
| 152 | 2 | R52 / proposal | [Keep source sample rates across audio-track changes](cards/R052.keep-source-sample-rates-across-audio-track-changes.md) | 4 | E2 / Q2 | UNSCREENED |
| 153 | 2 | R54 / proposal | [Tune WebM cluster production for early audio availability](cards/R054.tune-webm-cluster-production-for-early-audio-availability.md) | 4 | E2 / Q2 | UNSCREENED |
| 154 | 2 | R55 / proposal | [Cache bounded decoded previews for scrub revisits](cards/R055.cache-bounded-decoded-previews-for-scrub-revisits.md) | 4 | E2 / Q2 | UNSCREENED |
| 155 | 2 | R62 / proposal | [Apply an explicit audio-sync offset by remapping one track](cards/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track.md) | 4 | E2 / Q2 | UNSCREENED |
| 156 | 2 | R64 / proposal | [Decode directly at reduced resolution for explicit previews](cards/R064.decode-directly-at-reduced-resolution-for-explicit-previews.md) | 4 | E2 / Q2 | UNSCREENED |
| 157 | 2 | R67 / proposal | [Hibernate long-paused presentations under an explicit memory policy](cards/R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy.md) | 4 | E2 / Q2 | UNSCREENED |
| 158 | 2 | R72 / report-defined | [Decode only keyframes for coarse previews](cards/R072.decode-only-keyframes-for-coarse-previews.md) | 4 | E2 / Q2 | UNSCREENED |
| 159 | 2 | R73 / report-defined | [Decode a GOP once for a pending exact-preview batch](cards/R073.decode-a-gop-once-for-a-pending-exact-preview-batch.md) | 4 | E2 / Q2 | UNSCREENED |
| 160 | 2 | R94 / proposal | [Sample-accurate audio boundaries using mux trim and preroll metadata](cards/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata.md) | 4 | E2 / Q2 | UNSCREENED |
| 161 | 2 | R112 / proposal | [Supply known WebM durations to prevent parser holdback](cards/R112.supply-known-webm-durations-to-prevent-parser-holdback.md) | 4 | E2 / Q2 | UNSCREENED |
| 162 | 2 | R118 / proposal | [One decode, many views](cards/R118.one-decode-many-views.md) | 4 | E2 / Q2 | UNSCREENED |
| 163 | 2 | R198 / report-defined | [bitmap subtitles directly from RLE runs](cards/R198.bitmap-subtitles-directly-from-rle-runs.md) | 4 | E2 / Q2 | UNSCREENED |
| 164 | 2 | R206 / report-defined | [Incremental MJPEG stripe decode/upload](cards/R206.incremental-mjpeg-stripe-decode-upload.md) | 4 | E2 / Q2 | UNSCREENED |
| 165 | 2 | R261 / report-defined | [selective verified HTTP rescue](cards/R261.selective-verified-http-rescue.md) | 4 | E2 / Q2 | UNSCREENED |
| 166 | 2 | R270 / report-defined | [exact FLAC smart-cut/concat](cards/R270.exact-flac-smart-cut-concat.md) | 4 | E2 / Q2 | UNSCREENED |
| 167 | 2 | R271 / report-defined | [Opus FEC-aware scheduling](cards/R271.opus-fec-aware-scheduling.md) | 4 | E2 / Q2 | UNSCREENED |
| 168 | 2 | R274 / report-defined | [virtual WebM Cues](cards/R274.virtual-webm-cues.md) | 4 | E2 / Q2 | UNSCREENED |
| 169 | 2 | R320 / proposal | [Make exact Ogg Opus clip edges with packet copy plus pre-skip/end trimming](cards/R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming.md) | 4 | E2 / Q2 | UNSCREENED |
| 170 | 2 | R321 / proposal | [Range-fetch directly to a Matroska block inside a large Cluster](cards/R321.range-fetch-directly-to-a-matroska-block-inside-a-large-cluster.md) | 4 | E2 / Q2 | UNSCREENED |
| 171 | 2 | R90 / proposal | [Convert finite fMP4 fragments into a metadata-indexed native MP4 view](cards/R090.convert-finite-fmp4-fragments-into-a-metadata-indexed-native-mp4-view.md) | 4 | E2 / Q3 | UNSCREENED |
| 172 | 2 | R318 / proposal | [Seek directly into Matroska configuration changes using CueCodecState](cards/R318.seek-directly-into-matroska-configuration-changes-using-cuecodecstate.md) | 4 | E2 / Q3 | UNSCREENED |
| 173 | 2 | R13 / proposal | [Treat intentionally disabled tracks as removable work](cards/R013.treat-intentionally-disabled-tracks-as-removable-work.md) | 3 | E1 / Q2 | UNSCREENED |
| 174 | 2 | R33 / proposal | [Interleave samples for earlier complete A/V output](cards/R033.interleave-samples-for-earlier-complete-a-v-output.md) | 3 | E1 / Q2 | UNSCREENED |
| 175 | 2 | R34 / proposal | [Small startup appends, larger steady-state batches](cards/R034.small-startup-appends-larger-steady-state-batches.md) | 3 | E1 / Q2 | USER_REPORTED_FIRST_PASS_COMPLETE |
| 176 | 2 | R39 / proposal | [Prioritize the track that limits usable playback](cards/R039.prioritize-the-track-that-limits-usable-playback.md) | 3 | E1 / Q2 | UNSCREENED |
| 177 | 2 | R42 / proposal | [Recycle owned transfer buffers at the MSE boundary](cards/R042.recycle-owned-transfer-buffers-at-the-mse-boundary.md) | 3 | E1 / Q2 | USER_REPORTED_FIRST_PASS_COMPLETE |
| 178 | 2 | R111 / proposal | [Factor repeated fMP4 sample metadata into defaults](cards/R111.factor-repeated-fmp4-sample-metadata-into-defaults.md) | 3 | E1 / Q2 | UNSCREENED |
| 179 | 2 | R116 / report-frontier | [MSE sequence-mode concatenation [report paragraph label]](cards/R116.mse-sequence-mode-concatenation-report-paragraph-label.report-frontier.md) | 3 | E1 / Q2 | UNSCREENED |
| 180 | 2 | R127 / report-frontier | [Sequence-mode cross-codec concatenation [report paragraph label]](cards/R127.sequence-mode-cross-codec-concatenation-report-paragraph-label.report-frontier.md) | 3 | E1 / Q2 | UNSCREENED |
| 181 | 2 | R130 / report-frontier | [WebM Cues placement changes request timing, not total work here](cards/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier.md) | 3 | E1 / Q2 | UNSCREENED |
| 182 | 2 | R131 / proposal | [Automatically search equivalent representations](cards/R131.automatically-search-equivalent-representations.md) | 3 | E1 / Q2 | UNSCREENED |
| 183 | 2 | R143 / report-continuity | [compressed-fragment rewind cache](cards/R143.compressed-fragment-rewind-cache.report-continuity.md) | 3 | E1 / Q2 | UNSCREENED |
| 184 | 2 | R192 / report-defined | [identity-coded witness media](cards/R192.identity-coded-witness-media.md) | 3 | E1 / Q2 | UNSCREENED |
| 185 | 2 | R226 / report-continuity | [compact exact packet index](cards/R226.compact-exact-packet-index.report-continuity.md) | 3 | E1 / Q2 | UNSCREENED |
| 186 | 2 | R337 / proposal | [Evaluate tone-curve statistics from an exact source histogram](cards/R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram.md) | 3 | E1 / Q2 | UNSCREENED |
| 187 | 2 | R120 / report-frontier | [Repeat media without repeating mdat](cards/R120.repeat-media-without-repeating-mdat.report-frontier.md) | 3 | E1 / Q3 | UNSCREENED |
| 188 | 2 | R128 / report-frontier | [fast playback does not imply cheap decoding](cards/R128.fast-playback-does-not-imply-cheap-decoding.report-frontier.md) | 3 | E1 / Q3 | UNSCREENED |
| 189 | 2 | R129 / report-frontier | [pitch preservation is a real optional processing stage](cards/R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier.md) | 3 | E1 / Q3 | UNSCREENED |
| 190 | 2 | R141 / report-continuity | [no-index fragmented MP4 native remote seek](cards/R141.no-index-fragmented-mp4-native-remote-seek.report-continuity.md) | 3 | E1 / Q3 | UNSCREENED |
| 191 | 2 | R142 / report-continuity | [the same no-index fMP4 when all bytes are local](cards/R142.the-same-no-index-fmp4-when-all-bytes-are-local.report-continuity.md) | 3 | E1 / Q3 | UNSCREENED |
| 192 | 2 | R231 / report-continuity | [AAC exact seek needs a tool-aware profile](cards/R231.aac-exact-seek-needs-a-tool-aware-profile.report-continuity.md) | 3 | E1 / Q3 | UNSCREENED |
| 193 | 2 | R240 / report-C | [VP9 WebM cluster surgery](cards/R240.vp9-webm-cluster-surgery.report-c.md) | 3 | E1 / Q3 | UNSCREENED |
| 194 | 2 | R29 / proposal | [Offer explicit compatible-core extraction before audio re-encoding](cards/R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding.md) | 5 | E2 / Q3 | UNSCREENED |
| 195 | 2 | R174 / report-defined | [FLAC bit-depth promotion without sample reconstruction](cards/R174.flac-bit-depth-promotion-without-sample-reconstruction.md) | 5 | E2 / Q3 | UNSCREENED |
| 196 | 2 | R219 / report-defined | [shared spectral analysis](cards/R219.shared-spectral-analysis.md) | 4 | E1 / Q2 | UNSCREENED |
| 197 | 2 | R23 / proposal | [Fuse qualified video effects into one GPU presentation pass](cards/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass.md) | 4 | E2 / Q2 | UNSCREENED |
| 198 | 2 | R85 / report-defined | [Out-of-order GOP decode and reverse presentation](cards/R085.out-of-order-gop-decode-and-reverse-presentation.md) | 4 | E2 / Q2 | UNSCREENED |
| 199 | 2 | R87 / report-defined | [Dependency-aware transport](cards/R087.dependency-aware-transport.md) | 4 | E2 / Q2 | UNSCREENED |
| 200 | 2 | R93 / proposal | [Opus repacketization without PCM decoding](cards/R093.opus-repacketization-without-pcm-decoding.md) | 4 | E2 / Q2 | UNSCREENED |
| 201 | 2 | R96 / proposal | [Sparse native video with explicit long frame holds](cards/R096.sparse-native-video-with-explicit-long-frame-holds.md) | 4 | E2 / Q2 | UNSCREENED |
| 202 | 2 | R98 / proposal | [One atlas video for many synchronized visible clips](cards/R098.one-atlas-video-for-many-synchronized-visible-clips.md) | 4 | E2 / Q2 | UNSCREENED |
| 203 | 2 | R103 / proposal | [Join, split or reorder independent FLAC channel subframes](cards/R103.join-split-or-reorder-independent-flac-channel-subframes.md) | 4 | E2 / Q2 | UNSCREENED |
| 204 | 2 | R106 / proposal | [Recall stored AV1 pictures with coded display instructions](cards/R106.recall-stored-av1-pictures-with-coded-display-instructions.md) | 4 | E2 / Q2 | UNSCREENED |
| 205 | 2 | R109 / proposal | [Expose an edited MP4 as a virtual byte-range URL](cards/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url.md) | 4 | E2 / Q2 | UNSCREENED |
| 206 | 2 | R122 / proposal | [Reservoir-aware MP3 repacketization](cards/R122.reservoir-aware-mp3-repacketization.md) | 4 | E2 / Q2 | UNSCREENED |
| 207 | 2 | R135 / proposal | [Decode seek preroll without producing unwanted presentation frames](cards/R135.decode-seek-preroll-without-producing-unwanted-presentation-frames.md) | 4 | E2 / Q2 | UNSCREENED |
| 208 | 2 | R150 / report-defined | [Recovery windows rather than immediate clean-access assumptions](cards/R150.recovery-windows-rather-than-immediate-clean-access-assumptions.md) | 4 | E2 / Q2 | UNSCREENED |
| 209 | 2 | R151 / report-defined | [Parsed coefficients as a cache tier](cards/R151.parsed-coefficients-as-a-cache-tier.md) | 4 | E2 / Q2 | UNSCREENED |
| 210 | 2 | R161 / proposal | [Roll back speculative audio when a late packet arrives](cards/R161.roll-back-speculative-audio-when-a-late-packet-arrives.md) | 4 | E2 / Q2 | UNSCREENED |
| 211 | 2 | R163 / proposal | [Recover an interrupted recording from a committed sample journal](cards/R163.recover-an-interrupted-recording-from-a-committed-sample-journal.md) | 4 | E2 / Q2 | UNSCREENED |
| 212 | 2 | R207 / report-defined | [Verify useful BitTorrent-v2 blocks before a whole piece completes](cards/R207.verify-useful-bittorrent-v2-blocks-before-a-whole-piece-completes.md) | 4 | E2 / Q2 | UNSCREENED |
| 213 | 2 | R228 / report-continuity | [naive AAC splice is rejected](cards/R228.naive-aac-splice-is-rejected.report-continuity.md) | 4 | E2 / Q2 | UNSCREENED |
| 214 | 2 | R239 / report-C | [packet-granular Ogg Opus repagination](cards/R239.packet-granular-ogg-opus-repagination.report-c.md) | 4 | E2 / Q2 | UNSCREENED |
| 215 | 2 | R243 / report-A | [Cache inverse-transform results for recurring residual blocks](cards/R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a.md) | 4 | E2 / Q2 | UNSCREENED |
| 216 | 2 | R319 / report-continuity | [Checkpoint PNG Paeth row state](cards/R319.checkpoint-png-paeth-row-state.report-continuity.md) | 4 | E2 / Q2 | UNSCREENED |
| 217 | 2 | R320 / report-continuity | [Gram cache after a fixed FIR effect](cards/R320.gram-cache-after-a-fixed-fir-effect.report-continuity.md) | 4 | E2 / Q2 | UNSCREENED |
| 218 | 2 | R102 / proposal | [Use verbatim FLAC as a lightweight integer-PCM carrier](cards/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier.md) | 4 | E2 / Q3 | UNSCREENED |
| 219 | 2 | R104 / proposal | [Select or assemble whole Opus elementary streams without PCM](cards/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm.md) | 4 | E2 / Q3 | UNSCREENED |
| 220 | 2 | R140 / proposal | [Turn abbreviated JPEG transport frames into browser-decodable images](cards/R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images.md) | 4 | E2 / Q3 | UNSCREENED |
| 221 | 2 | R147 / report-defined | [Random access inside an ordinary ZIP DEFLATE entry](cards/R147.random-access-inside-an-ordinary-zip-deflate-entry.md) | 4 | E2 / Q3 | UNSCREENED |
| 222 | 2 | R223 / report-continuity | [FLAC frame-range microstream](cards/R223.flac-frame-range-microstream.report-continuity.md) | 4 | E2 / Q3 | UNSCREENED |
| 223 | 2 | R239 / report-A | [Extract an AV1 operating point before decoding](cards/R239.extract-an-av1-operating-point-before-decoding.report-a.md) | 4 | E2 / Q3 | UNSCREENED |
| 224 | 2 | R245 / report-A | [Factor a multichannel filter bank into fewer actual filters](cards/R245.factor-a-multichannel-filter-bank-into-fewer-actual-filters.report-a.md) | 4 | E2 / Q3 | UNSCREENED |
| 225 | 2 | R245 / report-C | [standalone FLAC from original frames](cards/R245.standalone-flac-from-original-frames.report-c.md) | 4 | E2 / Q3 | UNSCREENED |
| 226 | 2 | R268 / report-defined | [AAC selective channel-element reconstruction](cards/R268.aac-selective-channel-element-reconstruction.md) | 4 | E2 / Q3 | UNSCREENED |
| 227 | 2 | R241 / report-C | [JPEG 90° DCT-domain rotation](cards/R241.jpeg-90-dct-domain-rotation.report-c.md) | 4 | E2 / Q4 | UNSCREENED |
| 228 | 2 | R241 / report-A | [Reconstruct gain-map HDR using browser-decoded component images](cards/R241.reconstruct-gain-map-hdr-using-browser-decoded-component-images.report-a.md) | 4 | E2 / Q4 | UNSCREENED |
| 229 | 2 | R10 / proposal | [Screen float-preserving destinations before writing adapters](cards/R010.screen-float-preserving-destinations-before-writing-adapters.md) | 3 | E0 / Q3 | UNSCREENED |
| 230 | 2 | R12 / proposal | [Use a browser audio encoder for the permitted lossy branch](cards/R012.use-a-browser-audio-encoder-for-the-permitted-lossy-branch.md) | 3 | E0 / Q3 | UNSCREENED |
| 231 | 2 | R25 / proposal | [Try a generated video track as an alternative presenter](cards/R025.try-a-generated-video-track-as-an-alternative-presenter.md) | 3 | E0 / Q3 | UNSCREENED |
| 232 | 2 | R30 / proposal | [Investigate containerless encoded-chunk MSE](cards/R030.investigate-containerless-encoded-chunk-mse.md) | 3 | E0 / Q3 | UNSCREENED |
| 233 | 2 | R22 / proposal | [Use Document PiP to keep Native subtitles and controls](cards/R022.use-document-pip-to-keep-native-subtitles-and-controls.md) | 3 | E0 / Q4 | UNSCREENED |
| 234 | 2 | R08 / proposal | [Keep display-only transformations out of CPU video filters](cards/R008.keep-display-only-transformations-out-of-cpu-video-filters.md) | 3 | E1 / Q2 | UNSCREENED |
| 235 | 2 | R50 / proposal | [Evict on actual GOP boundaries to preserve useful rewind media](cards/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media.md) | 3 | E1 / Q2 | UNSCREENED |
| 236 | 2 | R53 / proposal | [Coalesce gain gestures into audio-clock automation](cards/R053.coalesce-gain-gestures-into-audio-clock-automation.md) | 3 | E1 / Q2 | UNSCREENED |
| 237 | 2 | R56 / proposal | [Map repeated clip boundaries in integer media ticks](cards/R056.map-repeated-clip-boundaries-in-integer-media-ticks.md) | 3 | E1 / Q2 | UNSCREENED |
| 238 | 2 | R70 / report-defined | [Remove the intermediate host remux](cards/R070.remove-the-intermediate-host-remux.md) | 3 | E1 / Q2 | UNSCREENED |
| 239 | 2 | R71 / report-defined | [Tune FLAC effort without changing frame duration](cards/R071.tune-flac-effort-without-changing-frame-duration.md) | 3 | E1 / Q2 | UNSCREENED |
| 240 | 2 | R75 / report-defined | [Compact large seek maps with checkpoints](cards/R075.compact-large-seek-maps-with-checkpoints.md) | 3 | E1 / Q2 | UNSCREENED |
| 241 | 2 | R95 / proposal | [Fixed Opus gain through codec/container headers](cards/R095.fixed-opus-gain-through-codec-container-headers.md) | 3 | E1 / Q2 | UNSCREENED |
| 242 | 2 | R107 / proposal | [Separate AV1 base decoding from film-grain reconstruction](cards/R107.separate-av1-base-decoding-from-film-grain-reconstruction.md) | 3 | E1 / Q2 | UNSCREENED |
| 243 | 2 | R158 / report-defined | [Structure-aware failure-preserving reduction](cards/R158.structure-aware-failure-preserving-reduction.md) | 3 | E1 / Q2 | UNSCREENED |
| 244 | 2 | R171 / proposal | [Derive a small set of tests that distinguish route behaviors](cards/R171.derive-a-small-set-of-tests-that-distinguish-route-behaviors.md) | 3 | E1 / Q2 | UNSCREENED |
| 245 | 2 | R179 / report-defined | [exact subtitle font subsetting](cards/R179.exact-subtitle-font-subsetting.md) | 3 | E1 / Q2 | UNSCREENED |
| 246 | 2 | R185 / report-defined | [progressively refine one preview](cards/R185.progressively-refine-one-preview.md) | 3 | E1 / Q2 | UNSCREENED |
| 247 | 2 | R28 / proposal | [Make streaming representation choices aware of complete-plan feasibility](cards/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility.md) | 3 | E1 / Q3 | UNSCREENED |
| 248 | 2 | R304 / proposal | [Factor a multichannel effect into fewer independent filters](cards/R304.factor-a-multichannel-effect-into-fewer-independent-filters.md) | 4 | E1 / Q2 | UNSCREENED |
| 249 | 2 | R309 / proposal | [Recalculate mix loudness from cached cross-products](cards/R309.recalculate-mix-loudness-from-cached-cross-products.md) | 4 | E1 / Q2 | UNSCREENED |
| 250 | 2 | R312 / proposal | [Find oversampled peaks by ruling out regions before reconstructing them](cards/R312.find-oversampled-peaks-by-ruling-out-regions-before-reconstructing-them.md) | 4 | E1 / Q2 | UNSCREENED |
| 251 | 2 | R316 / proposal | [Cache the peak envelope of every fixed-gain mix](cards/R316.cache-the-peak-envelope-of-every-fixed-gain-mix.md) | 4 | E1 / Q2 | UNSCREENED |
| 252 | 2 | R324 / proposal | [Reuse AV1 show_existing_frame for repeated UI states](cards/R324.reuse-av1-show-existing-frame-for-repeated-ui-states.md) | 4 | E1 / Q2 | UNSCREENED |
| 253 | 2 | R341 / proposal | [Derive audio-effect preroll from a guaranteed error budget](cards/R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget.md) | 4 | E1 / Q2 | UNSCREENED |
| 254 | 2 | R347 / proposal | [Morph convolution effects using reusable basis outputs](cards/R347.morph-convolution-effects-using-reusable-basis-outputs.md) | 4 | E1 / Q2 | UNSCREENED |
| 255 | 2 | R359 / proposal | [Start with a bounded software prefix while browser decoding warms up](cards/R359.start-with-a-bounded-software-prefix-while-browser-decoding-warms-up.md) | 4 | E1 / Q2 | UNSCREENED |
| 256 | 2 | R230 / proposal | [Mux media to reduce the extra bytes required for integrity verification](cards/R230.mux-media-to-reduce-the-extra-bytes-required-for-integrity-verification.md) | 4 | E2 / Q2 | UNSCREENED |
| 257 | 2 | R352 / proposal | [Integrate video exposure over real frame durations instead of frame counts](cards/R352.integrate-video-exposure-over-real-frame-durations-instead-of-frame-counts.md) | 4 | E2 / Q2 | UNSCREENED |
| 258 | 2 | R214 / report-defined | [packed v210 without CPU planarization](cards/R214.packed-v210-without-cpu-planarization.md) | 4 | E2 / Q3 | UNSCREENED |
| 259 | 2 | R228 / proposal | [Decode interlaced MJPEG as native field images](cards/R228.decode-interlaced-mjpeg-as-native-field-images.md) | 4 | E2 / Q3 | UNSCREENED |
| 260 | 2 | R229 / proposal | [Compile Matroska ordered editions into a minimal-transformation playback timeline](cards/R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline.md) | 4 | E2 / Q3 | UNSCREENED |
| 261 | 2 | R325 / proposal | [Decode only the alpha plane of a transparent image when color is already cached](cards/R325.decode-only-the-alpha-plane-of-a-transparent-image-when-color-is-already-cached.md) | 4 | E2 / Q3 | UNSCREENED |
| 262 | 2 | R83 / report-defined | [Decode → graphics processing → encode](cards/R083.decode-graphics-processing-encode.md) | 3 | E0 / Q3 | UNSCREENED |
| 263 | 2 | R89 / proposal | [AVIF image payloads as timed AV1 video, and eligible AV1 frames as AVIF](cards/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif.md) | 3 | E0 / Q3 | UNSCREENED |
| 264 | 2 | R269 / report-defined | [AV1 pre-super-resolution preview](cards/R269.av1-pre-super-resolution-preview.md) | 3 | E0 / Q3 | UNSCREENED |
| 265 | 2 | R273 / report-defined | [JPEG XL DC preview](cards/R273.jpeg-xl-dc-preview.md) | 3 | E0 / Q3 | UNSCREENED |
| 266 | 2 | R302 / proposal | [Develop Ultra HDR gain maps after native image decoding](cards/R302.develop-ultra-hdr-gain-maps-after-native-image-decoding.md) | 3 | E0 / Q4 | UNSCREENED |
| 267 | 2 | R348 / proposal | [Convert packed DSD directly to the requested PCM rate](cards/R348.convert-packed-dsd-directly-to-the-requested-pcm-rate.md) | 3 | E0 / Q4 | UNSCREENED |
| 268 | 2 | R226 / proposal | [Optimize JPEG Huffman tables for decoding cost, not only file size](cards/R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size.md) | 3 | E1 / Q2 | UNSCREENED |
| 269 | 2 | R294 / proposal | [Parallelize a nonlinear peak-release envelope using composable summaries](cards/R294.parallelize-a-nonlinear-peak-release-envelope-using-composable-summaries.md) | 3 | E1 / Q2 | UNSCREENED |
| 270 | 2 | R305 / proposal | [Compose Ogg checksums from reusable byte-range summaries](cards/R305.compose-ogg-checksums-from-reusable-byte-range-summaries.md) | 3 | E1 / Q2 | UNSCREENED |
| 271 | 2 | R342 / proposal | [Recompute lookahead gain only where an edit can affect it](cards/R342.recompute-lookahead-gain-only-where-an-edit-can-affect-it.md) | 3 | E1 / Q2 | UNSCREENED |
| 272 | 2 | R357 / proposal | [Evaluate gain-only loudness changes from a sorted energy index](cards/R357.evaluate-gain-only-loudness-changes-from-a-sorted-energy-index.md) | 3 | E1 / Q2 | UNSCREENED |
| 273 | 3 | R210 / report-defined | [Retain reference bookkeeping after pixels are no longer needed](cards/R210.retain-reference-bookkeeping-after-pixels-are-no-longer-needed.md) | 4 | E3 / Q3 | UNSCREENED |
| 274 | 3 | R211 / report-defined | [Exact local-offset storage for high-bit-depth reference tiles](cards/R211.exact-local-offset-storage-for-high-bit-depth-reference-tiles.md) | 4 | E3 / Q3 | UNSCREENED |
| 275 | 3 | R308 / proposal | [Move already-filtered pixels instead of filtering them again](cards/R308.move-already-filtered-pixels-instead-of-filtering-them-again.md) | 4 | E3 / Q3 | UNSCREENED |
| 276 | 3 | R331 / proposal | [Decode sparse FLAC channels only when the selected output matrix actually needs them](cards/R331.decode-sparse-flac-channels-only-when-the-selected-output-matrix-actually-needs-them.md) | 4 | E3 / Q3 | UNSCREENED |
| 277 | 3 | R338 / proposal | [Decode into the layout the next stage already needs](cards/R338.decode-into-the-layout-the-next-stage-already-needs.md) | 4 | E3 / Q3 | UNSCREENED |
| 278 | 3 | R354 / proposal | [Replace an oversized preparation heap while native playback continues](cards/R354.replace-an-oversized-preparation-heap-while-native-playback-continues.md) | 4 | E3 / Q4 | UNSCREENED |
| 279 | 3 | R41 / proposal | [Route simple SubRip captions to Native text tracks](cards/R041.route-simple-subrip-captions-to-native-text-tracks.md) | 3 | E2 / Q3 | UNSCREENED |
| 280 | 3 | R225 / report-continuity | [H.264 self-contained IDR suffix](cards/R225.h-264-self-contained-idr-suffix.report-continuity.md) | 2 | E1 / Q2 | UNSCREENED |
| 281 | 3 | R227 / report-continuity | [coded-sample identity across containers](cards/R227.coded-sample-identity-across-containers.report-continuity.md) | 2 | E1 / Q3 | UNSCREENED |
| 282 | 3 | R121 / proposal | [Native reference-state capsules for fast seeking](cards/R121.native-reference-state-capsules-for-fast-seeking.md) | 4 | E3 / Q3 | UNSCREENED |
| 283 | 3 | R123 / proposal | [Checkpoint the software decoder inside a GOP](cards/R123.checkpoint-the-software-decoder-inside-a-gop.md) | 4 | E3 / Q3 | UNSCREENED |
| 284 | 3 | R132 / proposal | [Exact-frame dependency slicing](cards/R132.exact-frame-dependency-slicing.md) | 4 | E3 / Q3 | UNSCREENED |
| 285 | 3 | R133 / proposal | [Exact cropped playback from video that was never tiled](cards/R133.exact-cropped-playback-from-video-that-was-never-tiled.md) | 4 | E3 / Q3 | UNSCREENED |
| 286 | 3 | R139 / proposal | [Mix channels before performing all their output transforms](cards/R139.mix-channels-before-performing-all-their-output-transforms.md) | 4 | E3 / Q3 | UNSCREENED |
| 287 | 3 | R145 / proposal | [Guarded, format-specialized Wasm decoder variants](cards/R145.guarded-format-specialized-wasm-decoder-variants.md) | 4 | E3 / Q3 | UNSCREENED |
| 288 | 3 | R152 / report-defined | [Copy-on-write tiled retained pictures](cards/R152.copy-on-write-tiled-retained-pictures.md) | 4 | E3 / Q3 | UNSCREENED |
| 289 | 3 | R181 / report-defined | [dependency-aware corruption tracking](cards/R181.dependency-aware-corruption-tracking.md) | 4 | E3 / Q3 | UNSCREENED |
| 290 | 3 | R191 / report-defined | [seekable fixed linear effects via block state transforms](cards/R191.seekable-fixed-linear-effects-via-block-state-transforms.md) | 4 | E3 / Q3 | UNSCREENED |
| 291 | 3 | R223 / proposal | [Decode one Vorbis stream in parallel using small overlapping boundaries](cards/R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries.md) | 4 | E3 / Q3 | UNSCREENED |
| 292 | 3 | R235 / proposal | [Cache fractional-pixel reference predictions](cards/R235.cache-fractional-pixel-reference-predictions.md) | 4 | E3 / Q3 | UNSCREENED |
| 293 | 3 | R11 / proposal | [Test an explicit quantized-FLAC policy using the normal decoder](cards/R011.test-an-explicit-quantized-flac-policy-using-the-normal-decoder.md) | 3 | E2 / Q2 | UNSCREENED |
| 294 | 3 | R16 / proposal | [Keep a stable audio output format through frequent switches](cards/R016.keep-a-stable-audio-output-format-through-frequent-switches.md) | 3 | E2 / Q2 | UNSCREENED |
| 295 | 3 | R61 / proposal | [Keep explicit channel processing on the Native audio graph](cards/R061.keep-explicit-channel-processing-on-the-native-audio-graph.md) | 3 | E2 / Q2 | UNSCREENED |
| 296 | 3 | R68 / proposal | [Process only the audio region that an explicitly requested crossfade changes](cards/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes.md) | 3 | E2 / Q2 | UNSCREENED |
| 297 | 3 | R108 / proposal | [Crop or transform MJPEG in the coefficient domain](cards/R108.crop-or-transform-mjpeg-in-the-coefficient-domain.md) | 3 | E2 / Q2 | UNSCREENED |
| 298 | 3 | R116 / proposal | [Compatibility islands: use software only for the troublesome section](cards/R116.compatibility-islands-use-software-only-for-the-troublesome-section.md) | 3 | E2 / Q2 | UNSCREENED |
| 299 | 3 | R127 / proposal | [Nonlinear speed curves without video re-encoding](cards/R127.nonlinear-speed-curves-without-video-re-encoding.md) | 3 | E2 / Q2 | UNSCREENED |
| 300 | 3 | R130 / proposal | [Protect reference-critical bytes more heavily than disposable bytes](cards/R130.protect-reference-critical-bytes-more-heavily-than-disposable-bytes.md) | 3 | E2 / Q2 | UNSCREENED |
| 301 | 3 | R154 / report-defined | [Silence certification: mathematical boundary only](cards/R154.silence-certification-mathematical-boundary-only.md) | 3 | E2 / Q2 | UNSCREENED |
| 302 | 3 | R156 / report-defined | [Sparse translucent layers with correct disposal](cards/R156.sparse-translucent-layers-with-correct-disposal.md) | 3 | E2 / Q2 | UNSCREENED |
| 303 | 3 | R182 / report-defined | [JPEG mosaic from restart intervals](cards/R182.jpeg-mosaic-from-restart-intervals.md) | 3 | E2 / Q2 | UNSCREENED |
| 304 | 3 | R186 / report-defined | [reversible XOR frame cache](cards/R186.reversible-xor-frame-cache.md) | 3 | E2 / Q2 | UNSCREENED |
| 305 | 3 | R201 / report-defined | [periodic steady-state filter initialization](cards/R201.periodic-steady-state-filter-initialization.md) | 3 | E2 / Q2 | UNSCREENED |
| 306 | 3 | R224 / report-continuity | [Opus exact-state pre-roll](cards/R224.opus-exact-state-pre-roll.report-continuity.md) | 3 | E2 / Q2 | UNSCREENED |
| 307 | 3 | R63 / proposal | [Use the browser image decoder for qualified MJPEG video](cards/R063.use-the-browser-image-decoder-for-qualified-mjpeg-video.md) | 3 | E2 / Q3 | UNSCREENED |
| 308 | 3 | R240 / report-A | [Extract a native 2D view from multiview HEVC](cards/R240.extract-a-native-2d-view-from-multiview-hevc.report-a.md) | 3 | E2 / Q3 | UNSCREENED |
| 309 | 3 | R196 / report-defined | [independent AAC channel assembly](cards/R196.independent-aac-channel-assembly.md) | 5 | E3 / Q3 | UNSCREENED |
| 310 | 3 | R84 / report-defined | [Spatially selective video](cards/R084.spatially-selective-video.md) | 4 | E3 / Q3 | UNSCREENED |
| 311 | 3 | R134 / proposal | [Sidecars that let decoding start halfway through an entropy-coded slice](cards/R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice.md) | 4 | E3 / Q3 | UNSCREENED |
| 312 | 3 | R136 / proposal | [Give two independent videos separate reference banks inside one decoder](cards/R136.give-two-independent-videos-separate-reference-banks-inside-one-decoder.md) | 4 | E3 / Q3 | UNSCREENED |
| 313 | 3 | R137 / proposal | [Prepared non-keyframe representation switches using AV1 S-frames](cards/R137.prepared-non-keyframe-representation-switches-using-av1-s-frames.md) | 4 | E3 / Q3 | UNSCREENED |
| 314 | 3 | R178 / report-defined | [selective JPEG 2000 source reads](cards/R178.selective-jpeg-2000-source-reads.md) | 4 | E3 / Q3 | UNSCREENED |
| 315 | 3 | R190 / report-defined | [restricted IMA ADPCM through two clipped scans](cards/R190.restricted-ima-adpcm-through-two-clipped-scans.md) | 4 | E3 / Q3 | UNSCREENED |
| 316 | 3 | R202 / report-defined | [guarded narrow arithmetic](cards/R202.guarded-narrow-arithmetic.md) | 4 | E3 / Q3 | UNSCREENED |
| 317 | 3 | R212 / report-defined | [Vectorize across independent streams rather than time](cards/R212.vectorize-across-independent-streams-rather-than-time.md) | 4 | E3 / Q3 | UNSCREENED |
| 318 | 3 | R232 / proposal | [Decode RAW sensor data once; develop the picture during playback](cards/R232.decode-raw-sensor-data-once-develop-the-picture-during-playback.md) | 4 | E3 / Q3 | UNSCREENED |
| 319 | 3 | R242 / proposal | [Decompress Hap’s texture data directly into GPU-owned storage](cards/R242.decompress-haps-texture-data-directly-into-gpu-owned-storage.md) | 4 | E3 / Q3 | UNSCREENED |
| 320 | 3 | R245 / proposal | [Parallelize recursive audio effects by correcting each chunk’s initial state](cards/R245.parallelize-recursive-audio-effects-by-correcting-each-chunks-initial-state.md) | 4 | E3 / Q3 | UNSCREENED |
| 321 | 3 | R263 / report-defined | [retained deep samples / deferred composition](cards/R263.retained-deep-samples-deferred-composition.md) | 4 | E3 / Q3 | UNSCREENED |
| 322 | 3 | R290 / proposal | [Compose exact motion-copy chains before reconstructing pixels](cards/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels.md) | 4 | E3 / Q3 | UNSCREENED |
| 323 | 3 | R303 / proposal | [Schedule H.264 deblocking as a dependency graph](cards/R303.schedule-h-264-deblocking-as-a-dependency-graph.md) | 4 | E3 / Q3 | UNSCREENED |
| 324 | 3 | R315 / proposal | [Carry hidden caption state across packet-copy cuts](cards/R315.carry-hidden-caption-state-across-packet-copy-cuts.md) | 4 | E3 / Q3 | UNSCREENED |
| 325 | 3 | R326 / proposal | [Smart-cut predictive video by synthesizing only the missing reference boundary](cards/R326.smart-cut-predictive-video-by-synthesizing-only-the-missing-reference-boundary.md) | 4 | E3 / Q3 | UNSCREENED |
| 326 | 3 | R328 / proposal | [Skip decoding video frames whose entire visible contribution is provably occluded](cards/R328.skip-decoding-video-frames-whose-entire-visible-contribution-is-provably-occluded.md) | 4 | E3 / Q3 | UNSCREENED |
| 327 | 3 | R329 / proposal | [Build audio seek checkpoints from codec state plus filter state together](cards/R329.build-audio-seek-checkpoints-from-codec-state-plus-filter-state-together.md) | 4 | E3 / Q3 | UNSCREENED |
| 328 | 3 | R344 / proposal | [Seek through APNG by resolving the last writer of each region](cards/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region.md) | 4 | E3 / Q3 | UNSCREENED |
| 329 | 3 | R351 / proposal | [Parallelize phase-vocoder accumulation without resetting phase at job boundaries](cards/R351.parallelize-phase-vocoder-accumulation-without-resetting-phase-at-job-boundaries.md) | 4 | E3 / Q3 | UNSCREENED |
| 330 | 3 | R362 / proposal | [Stop replaying alpha-animation history when its remaining contribution is bounded](cards/R362.stop-replaying-alpha-animation-history-when-its-remaining-contribution-is-bounded.md) | 4 | E3 / Q3 | UNSCREENED |
| 331 | 3 | R313 / proposal | [Sample B44-compressed HDR images without expanding the whole frame](cards/R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame.md) | 4 | E3 / Q4 | UNSCREENED |
| 332 | 3 | R113 / proposal | [Carry full-resolution color planes through a 4:2:0 video decoder](cards/R113.carry-full-resolution-color-planes-through-a-4-2-0-video-decoder.md) | 3 | E2 / Q2 | UNSCREENED |
| 333 | 3 | R143 / proposal | [Native base video plus an exact correction stream](cards/R143.native-base-video-plus-an-exact-correction-stream.md) | 3 | E2 / Q2 | UNSCREENED |
| 334 | 3 | R209 / report-defined | [Fetch WavPack correction data only when exact output is required](cards/R209.fetch-wavpack-correction-data-only-when-exact-output-is-required.md) | 3 | E2 / Q2 | UNSCREENED |
| 335 | 3 | R306 / proposal | [Defer Opus redundancy processing until it can repair a real gap](cards/R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap.md) | 3 | E2 / Q2 | UNSCREENED |
| 336 | 3 | R146 / report-defined | [JPEG XL reconstruction followed by browser JPEG decode](cards/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode.md) | 3 | E2 / Q3 | UNSCREENED |
| 337 | 3 | R224 / proposal | [Extract the exact rounded mono mix already stored inside mid-side FLAC](cards/R224.extract-the-exact-rounded-mono-mix-already-stored-inside-mid-side-flac.md) | 3 | E2 / Q3 | UNSCREENED |
| 338 | 3 | R204 / report-defined | [Edit MP3 coded gain without changing spectral payload](cards/R204.edit-mp3-coded-gain-without-changing-spectral-payload.md) | 2 | E1 / Q2 | UNSCREENED |
| 339 | 3 | R244 / proposal | [Make dithering reproducible at any sample position](cards/R244.make-dithering-reproducible-at-any-sample-position.md) | 2 | E1 / Q2 | UNSCREENED |
| 340 | 3 | R246 / report-defined | [Make parallel audio quantization deterministic without shared random state](cards/R246.make-parallel-audio-quantization-deterministic-without-shared-random-state.md) | 2 | E1 / Q2 | UNSCREENED |
| 341 | 3 | R311 / proposal | [Use frame CRCs to narrow a repair, then require trusted-hash verification](cards/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification.md) | 2 | E1 / Q2 | UNSCREENED |
| 342 | 3 | R322 / proposal | [Invert FLAC polarity directly in the residual domain](cards/R322.invert-flac-polarity-directly-in-the-residual-domain.md) | 2 | E1 / Q2 | UNSCREENED |
| 343 | 4 | R141 / proposal | [Split FLAC frames in time while reusing their prediction work](cards/R141.split-flac-frames-in-time-while-reusing-their-prediction-work.md) | 3 | E3 / Q3 | UNSCREENED |
| 344 | 4 | R155 / report-defined | [Fused synthesis and resampling: mathematical boundary only](cards/R155.fused-synthesis-and-resampling-mathematical-boundary-only.md) | 3 | E3 / Q3 | UNSCREENED |
| 345 | 4 | R166 / proposal | [Prove where an audio edit stops affecting subsequent output](cards/R166.prove-where-an-audio-edit-stops-affecting-subsequent-output.md) | 3 | E3 / Q3 | UNSCREENED |
| 346 | 4 | R157 / report-defined | [Interpolation guided by real codec motion vectors](cards/R157.interpolation-guided-by-real-codec-motion-vectors.md) | 2 | E2 / Q2 | UNSCREENED |
| 347 | 4 | R167 / proposal | [Produce a requested dissolve directly in transform space](cards/R167.produce-a-requested-dissolve-directly-in-transform-space.md) | 2 | E2 / Q2 | UNSCREENED |
| 348 | 4 | R244 / report-A | [Recompute video effects only where the input actually changed](cards/R244.recompute-video-effects-only-where-the-input-actually-changed.report-a.md) | 2 | E2 / Q2 | UNSCREENED |
| 349 | 4 | R244 / report-C | [reservoir-independent prepared MP3](cards/R244.reservoir-independent-prepared-mp3.report-c.md) | 2 | E2 / Q2 | UNSCREENED |
| 350 | 4 | R322 / report-continuity | [Animated-image disposal checkpoints](cards/R322.animated-image-disposal-checkpoints.report-continuity.md) | 2 | E2 / Q2 | UNSCREENED |
| 351 | 4 | R105 / proposal | [Build a single HEVC mosaic from compatible compressed streams](cards/R105.build-a-single-hevc-mosaic-from-compatible-compressed-streams.md) | 3 | E3 / Q3 | UNSCREENED |
| 352 | 4 | R120 / proposal | [Entropy-only transcoding](cards/R120.entropy-only-transcoding.md) | 3 | E3 / Q3 | UNSCREENED |
| 353 | 4 | R128 / proposal | [Compile screen operations directly into video prediction commands](cards/R128.compile-screen-operations-directly-into-video-prediction-commands.md) | 3 | E3 / Q3 | UNSCREENED |
| 354 | 4 | R129 / proposal | [Extend GPU reconstruction from still pictures to predictive video](cards/R129.extend-gpu-reconstruction-from-still-pictures-to-predictive-video.md) | 3 | E3 / Q3 | UNSCREENED |
| 355 | 4 | R142 / proposal | [Burn in an overlay by re-encoding only the spatial blocks it changes](cards/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes.md) | 3 | E3 / Q3 | UNSCREENED |
| 356 | 4 | R148 / report-defined | [Actual MPEG-2 coefficient data reused by JPEG](cards/R148.actual-mpeg-2-coefficient-data-reused-by-jpeg.md) | 3 | E3 / Q3 | UNSCREENED |
| 357 | 4 | R153 / report-defined | [Shared continuation and the wrong-history negative](cards/R153.shared-continuation-and-the-wrong-history-negative.md) | 3 | E3 / Q3 | UNSCREENED |
| 358 | 4 | R164 / proposal | [Reconstruct fixed-predictor lossless audio with parallel scans](cards/R164.reconstruct-fixed-predictor-lossless-audio-with-parallel-scans.md) | 3 | E3 / Q3 | UNSCREENED |
| 359 | 4 | R165 / proposal | [Reverse predictive audio by transforming its residuals](cards/R165.reverse-predictive-audio-by-transforming-its-residuals.md) | 3 | E3 / Q3 | UNSCREENED |
| 360 | 4 | R168 / proposal | [Compress cold reference tiles, not just whole cached frames](cards/R168.compress-cold-reference-tiles-not-just-whole-cached-frames.md) | 3 | E3 / Q3 | UNSCREENED |
| 361 | 4 | R175 / report-defined | [tighten verified H.264 decoder requirements](cards/R175.tighten-verified-h-264-decoder-requirements.md) | 3 | E3 / Q3 | UNSCREENED |
| 362 | 4 | R177 / report-defined | [GPU JPEG entropy decoding](cards/R177.gpu-jpeg-entropy-decoding.md) | 3 | E3 / Q3 | UNSCREENED |
| 363 | 4 | R187 / report-defined | [recover encoder decisions from the source](cards/R187.recover-encoder-decisions-from-the-source.md) | 3 | E3 / Q3 | UNSCREENED |
| 364 | 4 | R197 / report-defined | [common JPEG quantization basis without requantization loss](cards/R197.common-jpeg-quantization-basis-without-requantization-loss.md) | 3 | E3 / Q3 | UNSCREENED |
| 365 | 4 | R199 / report-defined | [certified-error preview reconstruction](cards/R199.certified-error-preview-reconstruction.md) | 3 | E3 / Q3 | UNSCREENED |
| 366 | 4 | R217 / report-defined | [exact waveform summaries from first-order FLAC](cards/R217.exact-waveform-summaries-from-first-order-flac.md) | 3 | E3 / Q3 | UNSCREENED |
| 367 | 4 | R218 / report-defined | [exact restricted PNG scans](cards/R218.exact-restricted-png-scans.md) | 3 | E3 / Q3 | UNSCREENED |
| 368 | 4 | R231 / proposal | [Parallelize Rice parsing through composable finite-state transitions](cards/R231.parallelize-rice-parsing-through-composable-finite-state-transitions.md) | 3 | E3 / Q3 | UNSCREENED |
| 369 | 4 | R234 / proposal | [Replace general FLAC predictors with equivalent fixed predictors](cards/R234.replace-general-flac-predictors-with-equivalent-fixed-predictors.md) | 3 | E3 / Q3 | UNSCREENED |
| 370 | 4 | R240 / proposal | [Add useful JPEG restart boundaries without another image-generation loss](cards/R240.add-useful-jpeg-restart-boundaries-without-another-image-generation-loss.md) | 3 | E3 / Q3 | UNSCREENED |
| 371 | 4 | R266 / report-defined | [Snappy dependency graph](cards/R266.snappy-dependency-graph.md) | 3 | E3 / Q3 | UNSCREENED |
| 372 | 4 | R291 / proposal | [Disable in-loop filtering only after proving it is a no-op](cards/R291.disable-in-loop-filtering-only-after-proving-it-is-a-no-op.md) | 3 | E3 / Q3 | UNSCREENED |
| 373 | 4 | R292 / proposal | [Compile a decoder kernel for a repeatedly used Huffman codebook](cards/R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook.md) | 3 | E3 / Q3 | UNSCREENED |
| 374 | 4 | R299 / proposal | [Change FLAC predictor order directly in the residual domain](cards/R299.change-flac-predictor-order-directly-in-the-residual-domain.md) | 3 | E3 / Q3 | UNSCREENED |
| 375 | 4 | R300 / proposal | [Reuse repeated inverse-transform results across different video blocks](cards/R300.reuse-repeated-inverse-transform-results-across-different-video-blocks.md) | 3 | E3 / Q3 | UNSCREENED |
| 376 | 4 | R301 / proposal | [Edit displayed frames without changing the prediction history](cards/R301.edit-displayed-frames-without-changing-the-prediction-history.md) | 3 | E3 / Q3 | UNSCREENED |
| 377 | 4 | R314 / proposal | [Send GIF dictionaries to the GPU instead of expanded index images](cards/R314.send-gif-dictionaries-to-the-gpu-instead-of-expanded-index-images.md) | 3 | E3 / Q3 | UNSCREENED |
| 378 | 4 | R317 / proposal | [Parallelize a true attack/release envelope with piecewise-affine maps](cards/R317.parallelize-a-true-attack-release-envelope-with-piecewise-affine-maps.md) | 3 | E3 / Q3 | UNSCREENED |
| 379 | 4 | R336 / proposal | [Reconstruct predictor-4 lossless JPEG with two-dimensional prefix sums](cards/R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums.md) | 3 | E3 / Q3 | UNSCREENED |
| 380 | 4 | R293 / proposal | [Seek inside authenticated encrypted media without decrypting the whole file](cards/R293.seek-inside-authenticated-encrypted-media-without-decrypting-the-whole-file.md) | 3 | E3 / Q4 | UNSCREENED |
| 381 | 4 | R225 / proposal | [Produce dual-mono and silent channel slots through Opus mapping metadata](cards/R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata.md) | 2 | E2 / Q3 | UNSCREENED |
| 382 | 5 | R149 / report-defined | [Image data through a lossless audio decoder](cards/R149.image-data-through-a-lossless-audio-decoder.md) | 2 | E3 / Q3 | UNSCREENED |
| 383 | 5 | R180 / report-defined | [residual-domain FLAC mixing](cards/R180.residual-domain-flac-mixing.md) | 2 | E3 / Q3 | UNSCREENED |
| 384 | 5 | R227 / proposal | [Rotate and rearrange texture video while keeping its blocks compressed](cards/R227.rotate-and-rearrange-texture-video-while-keeping-its-blocks-compressed.md) | 2 | E3 / Q3 | UNSCREENED |
| 385 | 5 | R236 / proposal | [Build a visualizer from Vorbis’s encoded spectral envelope](cards/R236.build-a-visualizer-from-vorbiss-encoded-spectral-envelope.md) | 2 | E3 / Q3 | UNSCREENED |
| 386 | 5 | R310 / proposal | [Compile G.711 processing chains into exact lookup tables](cards/R310.compile-g-711-processing-chains-into-exact-lookup-tables.md) | 2 | E3 / Q3 | UNSCREENED |
| 387 | 5 | R340 / proposal | [Edit an entire FLAC block by changing only its warm-up samples](cards/R340.edit-an-entire-flac-block-by-changing-only-its-warm-up-samples.md) | 2 | E3 / Q3 | UNSCREENED |
| 388 | 5 | R345 / proposal | [Stack PNG images by joining their compressed scanline streams](cards/R345.stack-png-images-by-joining-their-compressed-scanline-streams.md) | 2 | E3 / Q3 | UNSCREENED |
| 389 | 5 | R346 / proposal | [Turn Paeth prediction into composable byte-state maps](cards/R346.turn-paeth-prediction-into-composable-byte-state-maps.md) | 2 | E3 / Q3 | UNSCREENED |
| 390 | 5 | R356 / proposal | [Repack independent stereo FLAC as mid-side using parity-state residuals](cards/R356.repack-independent-stereo-flac-as-mid-side-using-parity-state-residuals.md) | 2 | E3 / Q3 | UNSCREENED |
| 391 | 5 | R365 / proposal | [Compute GIF color statistics without expanding LZW strings](cards/R365.compute-gif-color-statistics-without-expanding-lzw-strings.md) | 2 | E3 / Q3 | UNSCREENED |
| 392 | 5 | R366 / proposal | [Evaluate time-varying audio fades from cached polynomial moments](cards/R366.evaluate-time-varying-audio-fades-from-cached-polynomial-moments.md) | 2 | E3 / Q3 | UNSCREENED |

## Unrecovered definitions

R76, R77, R78, R79, R80, R81, R247, R248, R249, R250, R251, R252, R253, R254, R255, R256, R257, R258, R259, R260, R276, R277, R278, R279, R280, R281, R282, R283, R284, R285, R286, R287, R288. These get one bounded source gate, then HOLD_SOURCE; they are not rejected, tested, or fabricated. See SOURCE_GAPS.md.
