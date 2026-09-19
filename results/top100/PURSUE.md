# Further pursuit and regression backlog

70 scoped decisions merit further work or retained regression coverage. These are not 70 production-ready features or measured speedups. Read each limitation before selecting implementation work.

## Rank 1 — R007.close-the-hevc-in-ts-browser-owned-construction-gap

**PURSUE** · REAL_PATH_SCREEN

Actual isolated Wasm gate extension plays HEVC/AAC TS and seeks; current bridge rejects it. Complete output video and PCM match independent host decode with passthrough frame timing; AVC control still passes. Additional codec-aware adverse timestamp/configuration cases remain before integration.

Evidence: [browser-result.json](transport/browser-result.json), [hevc-remux.c](transport/hevc-remux.c), [build-commands.json](transport/build-commands.json).

## Rank 2 — R262.configuration-interval-seek

**PURSUE** · COMPONENT_TEST

Explicit source-bound SPS/RAP intervals decode all96 authored pictures exactly through browser configuration change; indexed second interval matches48 pictures/timestamps, dependent cold start rejects. Container indexing and source replacement integration remain later.

Evidence: [result.json](configuration/result.json), [input.json](configuration/input.json).

## Rank 4 — R343.unwrap-aac-latm-into-a-browser-decoded-audio-route

**PURSUE** · COMPONENT_TEST

Restricted bit-aligned LOAS/LATM AAC-LC extraction produces142 AAC frames with exact independent PCM; truncation/sync/missing configuration reject. Browser raw AAC lane plays marked audio beside changing video. Multi-program/layer/CRC/otherData variants deliberately reject.

Evidence: [latm-result.json](transport/latm-result.json), [result.json](lanes/result.json).

## Rank 6 — R358.unwrap-matroska-track-compression-before-choosing-a-decoder

**PURSUE** · COMPONENT_TEST

Actual isolated JSPI build produced browser-playable A/V with host decoded-output oracle. Nonisolated delayed reads and cancellation passed; Matroska zlib profile passed. Ordinary AAC MP4 priming/trim negative retained separately; not general route qualification.

Evidence: [fixture.json](matroska/fixture.json), [result.json](destinations/result.json).

## Rank 7 — R363.expose-prepared-fragments-as-a-native-hls-presentation

**PURSUE** · REAL_PATH_SCREEN

Actual Demuxe-produced fMP4 fragments served as native HLS byte ranges reach marked A/V, seek and EOF; misaligned ranges fail. Tiny loopback delivery prototype only; not a generic source-authorized production resource service.

Evidence: [maintained-result.json](hls/maintained-result.json), [native-delivery.json](hls/native-delivery.json).

## Rank 9 — R138.one-sourcebuffer-different-codec-and-container.report-continuity

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Rendered pictures and selected audio survive a codec/container transition through one SourceBuffer; useful explicit continuity capability, without claiming gapless or application integration.

Evidence: [result.json](../full-completion/continuity/result.json).

## Rank 10 — R005.move-mse-ownership-off-the-window-thread

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Worker-owned MediaSourceHandle produces actual A/V through EOF with malformed-input rejection and teardown; localized scheduler integration merits testing, not proven UI/CPU improvement.

Evidence: [worker-result.json](../full-completion/continuity/worker-result.json).

## Rank 13 — R335.recover-the-gpu-presenter-without-reopening-healthy-decoders

**PURSUE** · COMPONENT_TEST

Actual WebGPU device destruction/recreation preserves held decoded-frame redraw exactly; same VideoDecoder remains configured and emits the next timestamp. Worth independent presenter recovery. This is a small GPU owner prototype, not the current player integration.

Evidence: [result.json](gpu/result.json).

## Rank 15 — R057.probe-a-real-six-channel-native-flac-destination

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Direct and MSE FLAC preserve six independently identified channels at the Web Audio boundary; intentional stereo downmix fails the same matrix oracle. Native adaptation work is worth pursuing without assuming physical speaker support.

Evidence: [result.json](../full-completion/r57/result.json).

## Rank 16 — R088.native-hls-playlist-views-over-compatible-existing-media

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Native HLS byte-range view reaches marked audio/video, seeks and EOF; deliberately misaligned segment ranges fail. Local unchanged fMP4 payload supports the proposed destination primitive.

Evidence: [native-delivery.json](../full-completion/continuity/native-delivery.json).

## Rank 17 — R183.native-color-with-separately-decoded-transparency

**PURSUE** · COMPONENT_TEST

Independent VP8 color/mask decoders pair frames by timestamp and dimensions, preserve exact alpha and reference visible color after explicit SD matrix metadata. Wrong pair rejects; implicit matrix variant failed and retained. No production two-clock owner or cost benefit claimed.

Evidence: [result.json](alpha/result.json).

## Rank 18 — R114.use-webrtc-native-media-reception-as-a-packet-copy-destination

**PURSUE** · COMPONENT_TEST

Actual loopback WebRTC native receiver renders pre-encoded H264 red frame substituted into outgoing encoded frames; all three received NAL lists match source exactly. Isolated Chrome disabled mDNS IP hiding after local mDNS ICE stall. Placeholder encoder still runs; proves destination capability, not encoder-free sender/service or net CPU savings.

Evidence: [result.json](webrtc/result.json).

## Rank 19 — R176.jspi-backed-synchronous-wasm-i-o

**PURSUE** · COMPONENT_TEST

Actual isolated JSPI build produced browser-playable A/V with host decoded-output oracle. Nonisolated delayed reads and cancellation passed; Matroska zlib profile passed. Ordinary AAC MP4 priming/trim negative retained separately; not general route qualification.

Evidence: [result.json](jspi/result.json), [result.json](destinations/result.json).

## Rank 20 — R006.offer-a-non-pthread-remux-path-without-isolation

**PURSUE** · COMPONENT_TEST

Actual isolated JSPI build produced browser-playable A/V with host decoded-output oracle. Nonisolated delayed reads and cancellation passed; Matroska zlib profile passed. Ordinary AAC MP4 priming/trim negative retained separately; not general route qualification.

Evidence: [result.json](jspi/result.json), [result.json](destinations/result.json).

## Rank 21 — R024.compare-raw-yuv-videoframe-presentation-with-existing-software-output

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Raw I420 VideoFrame preserves padded strides/crop and black/white oracle exactly at the current display boundary. A scoped SDR performance comparison is now feasible; general color/HDR/rotation remain unqualified.

Evidence: [result.json](../full-completion/presentation/result.json).

## Rank 22 — R086.native-video-with-an-independent-generated-pcm-clock

**PURSUE_CLOCK_CONTROL** · COMPONENT_TEST

Actual maintained PCM AudioWorklet with native video survives seek/rate epochs and injected producer starvation. Active phase clock errors up to80ms, starvation grows to253ms and rebase recovers below18ms; correct generated tone observed. Needs tighter output-time feedback before sync qualification; not acoustic or arbitrary decoded-audio proof.

Evidence: [independent-audio-result.json](independent-audio-result.json).

## Rank 23 — R097.mux-color-and-alpha-into-native-transparent-webm

**PURSUE** · COMPONENT_TEST

Mux-only reconstruction of suitable aligned VP8 color/alpha packet pairs preserves complete host RGBA and native transparency through seek, rewind and EOF. Mispaired timestamp rejects. Color/mask source preparation cost remains separate; no hardware alpha claim.

Evidence: [fixture.json](alpha/fixture.json), [result.json](alpha/result.json).

## Rank 24 — R160.turn-a-whole-file-audio-decoder-into-a-bounded-streaming-component

**PURSUE** · COMPONENT_TEST

Two prepared independently decodable FLAC regions decoded through browser whole-file API concatenate sample-exactly to full-file decode. One-sample seam error detected. Generic arbitrary-file segmentation and streaming scheduler remain later work.

Evidence: [seams-result.json](audio/seams-result.json).

## Rank 28 — R159.remux-encrypted-media-without-decrypting-its-samples

**PURSUE_COMPONENT_EME_UNVERIFIED** · COMPONENT_TEST

Restricted owned CENC container relocation preserves ciphertext, IV/subsamples and repaired sample/auxiliary offsets; independent decryption matches all reference pixels and wrong-IV mutation fails. Both original and relocated direct ClearKey playback reach EOF but yield no observed decoded frames: browser destination unverified. Generic fragmented encrypted remux remains further work.

Evidence: [result.json](cenc/result.json), [browser-result.json](cenc/browser-result.json), [original-browser-result.json](cenc/original-browser-result.json).

## Rank 30 — R208.make-cancellation-follow-media-dependency-boundaries

**PURSUE** · COMPONENT_TEST

Required target GOP remains retained and independently decodes24 exact frames while actual unrelated speculative fetch aborts, observed by server. Stale generation publication rejects. HTTP dependency component, not WebTransport integration.

Evidence: [result.json](ownership/result.json).

## Rank 32 — R082.browser-side-video-normalization

**PURSUE** · COMPONENT_TEST

Actual browser VP9 decode to AVC VideoEncoder to decoder: all72 frames and timestamps retained, every visible RGB frame exceeds32dB PSNR for explicitly lossy output. Wrong timestamp order rejected. Component viability only; source audio/mux/route costs not qualified.

Evidence: [normalize-result.json](normalize-result.json).

## Rank 33 — R173.preserve-flic-indices-plus-palette

**PURSUE** · COMPONENT_TEST

Actual two-frame FLC with palette-only second update renders exact independent RGBA through index+palette GPU textures. Restricted COLOR256/COPY chunks establish representation feasibility; other FLIC opcodes and seek checkpoints remain future work.

Evidence: [result.json](gpu/result.json), [input.json](gpu/input.json).

## Rank 34 — R194.browser-zlib-zmbv-reconstruction

**PURSUE** · COMPONENT_TEST

Persistent browser DecompressionStream plus strict ZMBV32 motion/XOR reconstruction matches all eight host reference frames. Cold dependent frame rejects. Bounded 32x32 CPU component; other pixel formats and GPU presentation not claimed.

Evidence: [zmbv-result.json](gpu/zmbv-result.json).

## Rank 35 — R117.play-iamf-through-native-component-decoders

**PURSUE** · COMPONENT_TEST

Genuine authored IAMF stereo presentation passes strict one-element/one-layer/zero-gain applicability gate; host-extracted FLAC component natively decodes all96000 frames matching original PCM. Unsupported gain rejects. Host demux prerequisite and flat presentation only; no generic IAMF renderer or browser IAMF parser.

Evidence: [presentation-result.json](iamf/presentation-result.json), [native-result.json](iamf/native-result.json), [groups.json](iamf/groups.json).

## Rank 36 — R172.keep-hap-bc1-compressed-to-presentation

**PURSUE** · COMPONENT_TEST

Actual Hap1 packet with BC1 texture payload renders through WebGPU compression support and matches independently decoded host RGBA:16 compressed bytes vs128 RGBA bytes for tiny fixture. Uncompressed Hap transport only; Snappy/larger corpus/seek/cost not qualified.

Evidence: [result.json](gpu/result.json), [input.json](gpu/input.json).

## Rank 39 — R205.multicore-ffv1-without-shared-address-space-state

**PURSUE** · COMPONENT_TEST

Prepared four independent FFV1 quadrant streams decoded by four separate host processes reconstruct 12 frames exactly. Swapped quadrants fail; preparation size recorded. Original-bitstream slice extraction and browser multicore route are not proven.

Evidence: [result.json](ffv1/result.json).

## Rank 40 — R241.decode-an-ambisonic-sound-field-natively-then-render-its-spatial-meaning-separately

**PURSUE** · COMPONENT_TEST

Genuine mapping-family-2 four-channel Opus decoded with correct channel tones and near-exact host PCM. Explicit ACN/SN3D W,Y,Z,X directional matrix matches scalar oracle; wrong ordering fails. No physical spatial qualification.

Evidence: [native-result.json](audio/native-result.json), [seams-result.json](audio/seams-result.json).

## Rank 43 — R019.extract-embedded-ass-while-leaving-video-native

**PURSUE** · COMPONENT_TEST

Restricted Matroska range reader extracts3 ASS cues and exact attached font with764367bytes read from7.87MB source under2MiB cap, skipping media payloads. Actual libass tiles match independent demux on correct muxed timeline, including long active cue15s, rewind and stale publication guard.8372 tiny reads need coalescing before remote use; no default Native admission.

Evidence: [result.json](embedded-ass/result.json), [browser-result.json](embedded-ass/browser-result.json).

## Rank 44 — R020.render-bitmap-subtitles-without-burning-them-into-video

**PURSUE** · COMPONENT_TEST

Actual PGS complete-object literal bitmap display/clear decoder matches independent FFmpeg overlay at8 samples; truncated segment rejects. Exact event-boundary timing remains unqualified after oracle frame-sync discrepancy; general RLE/fragmented objects/native overlay ownership remain outside component.

Evidence: [result.json](pgs/result.json).

## Rank 45 — R031.raw-aac-mp3-audio-beside-fragmented-video

**PURSUE** · COMPONENT_TEST

Raw AAC audio SourceBuffer beside fragmented AVC video plays marked audio through both geometry intervals and EOF. Priming/offset and production append lifecycle still need integration checks.

Evidence: [result.json](lanes/result.json).

## Rank 46 — R032.use-different-output-containers-for-different-tracks

**PURSUE** · COMPONENT_TEST

Independent MP4 AVC video and WebM Opus audio SourceBuffers play both video geometry intervals with880Hz audio to EOF. Technically viable mixed-container lane destination; not an automatic routing change.

Evidence: [result.json](lanes/result.json).

## Rank 47 — R046.a-small-javascript-ordinary-mp4-to-mse-adapter

**PURSUE** · COMPONENT_TEST

Strict bounded JavaScript sample-table adapter preserves all tested packet timing/payload and full decoded output; actual MSE marked A/V reaches EOF. Further profiles need B-frame/tail-moov and edit-list variation.

Evidence: [result.json](mp4/result.json), [result.json](destinations/result.json).

## Rank 48 — R051.try-integer-lossless-source-codecs-before-changing-lossy-decoders

**PURSUE** · COMPONENT_TEST

ALAC rejected by native media element and decodeAudioData, then isolated pinned ALAC Wasm decoder reproduced all 96000 stereo frames exactly with missing-extradata and truncated-packet rejection. Worth pursuing ALAC adaptation; TrueHD and complete route cost remain untested.

Evidence: [environment.json](environment.json), [native-result.json](audio/native-result.json), [result.json](lossless/result.json).

## Rank 49 — R058.change-video-codec-while-retaining-the-audio-presentation

**PURSUE** · COMPONENT_TEST

Video configuration/resolution changes from160x96 to320x180 while the original audio SourceBuffer remains alive and audio signal continues. Same-codec geometry case only; cross-codec and gaplessness not asserted.

Evidence: [result.json](lanes/result.json).

## Rank 50 — R059.construct-a-selected-track-mp4-view-without-remuxing-samples

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Both front- and tail-moov Blob views play the requested second AAC tone through seek/EOF with5368 metadata bytes edited and unchanged214 selected packet payloads/timestamps/durations. Must enable the selected tkhd track; hiding the old track alone produced silent browser audio despite valid ffprobe output.

Evidence: [result.json](../full-completion/r59/result.json).

## Rank 51 — R060.extract-in-band-closed-captions-from-compressed-video-headers

**PURSUE** · COMPONENT_TEST

Actual registered A53 SEI extraction from authored H264 yields CEA608 pop-on HI matching independent FFmpeg SRT decoder. Existing compressed NALs and all decoded video pixels remain exact; bad parity rejects. Restricted caption state component, not full608/708 renderer or seek restoration.

Evidence: [result.json](captions/result.json).

## Rank 52 — R065.isolate-a-selected-program-from-multi-program-transport-streams

**PURSUE** · COMPONENT_TEST

Explicit program202 TS packet filter keeps selected elementary/PCR/PMT PIDs and rewrites PAT with valid CRC. Reversed PAT order produces identical selected payload/timing. Unchanged RemuxPlayer plays/seeks output, complete host decoded pixels/PCM exact. Missing program rejects; dynamic PSI/scrambled transport outside scope.

Evidence: [result.json](program/result.json), [browser-result.json](program/browser-result.json).

## Rank 53 — R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1

**PURSUE** · COMPONENT_TEST

avc3 source-authored parameter change with fresh init and in-band headers renders both exact geometries, retained separate audio and EOF. This validates bounded AVC transition, not arbitrary no-init changes or HEVC hev1.

Evidence: [result.json](lanes/result.json).

## Rank 54 — R092.normalize-vp9-codec-units-for-the-actual-destination

**PURSUE** · IMPORTED_LOCAL_EVIDENCE

Reconciled actual existing aggregate/split VP9 superframe test against unchanged worker and fixture identities: six hidden frames retained, 72 exact visible frames/timestamps, seek passes, missing-hidden oracle and cold-dependent-start fail. Destination-specific normalized framing works; generic split policy not justified.

Evidence: [result.json](../full-completion/r332/result.json).

## Rank 56 — R115.play-an-ongoing-fmp4-response-through-one-native-url

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Native URL produces marked audio/video before response EOF with a four-second initial fragment; one-second initial fragment waited for EOF with either known or unknown total length, whereas MSE produced output early. Pursue only for an explicit buffering/latency contract, not assumed low-latency equivalence.

Evidence: [native-delivery-long.json](../full-completion/continuity/native-delivery-long.json).

## Rank 59 — R003.coalesce-range-reads-around-useful-media-boundaries

**PURSUE** · REUSED_REAL_PATH_SCREEN

Reconciled completed prior evidence: Actual remux read-window candidate reduced requests 73 to 24 while fetched bytes changed 4784128 to 5701632. Source identity replacement rejects, decoded-frame progress and distant seek pass, workers close. Worth a latency/abandoned-byte tradeoff study; this is not boundary-indexed coalescing or a CPU benchmark.

Evidence: [result.json](../full-completion/remux-policies/result.json).

## Rank 60 — R018.cache-prepared-media-by-timeline-and-transformation-recipe

**PURSUE** · COMPONENT_TEST

Prepared fragment cache hit preserves actual artifact bytes; changed source ETag, tracks, interval, recipe, or runtime cause miss. Corrupt entry rejects within1MiB budget. No production cache integration or benefit measurement.

Evidence: [result.json](ownership/result.json).

## Rank 61 — R021.cache-subtitle-tiles-and-schedule-only-useful-redraws

**PURSUE** · REAL_PATH_SCREEN

Built isolated pinned libass runtime, then real static/karaoke tiles rendered exactly with bounded cache through time changes, rewind and resize:28 cache hits/20 misses,145496 peak retained bytes. Value is repeated-tile allocation avoidance, not proven CPU saving.

Evidence: [result.json](subtitles/result.json), [ass-build.log](ass-build.log).

## Rank 62 — R026.replace-polling-chains-with-bounded-credits-and-deadlines

**PURSUE** · REUSED_REAL_PATH_SCREEN

Reconciled completed prior evidence: Paused pump callbacks changed from 24 to 1 over the same 1.2s observation. Event wakes resume playback/seek, changed source rejects, and cleanup passes. Worth integrating this one-owner timer policy behind lifecycle checks, not replacing every scheduler.

Evidence: [result.json](../full-completion/remux-policies/result.json).

## Rank 63 — R027.share-immutable-compiled-code-not-live-playback-state

**PURSUE** · REUSED_IMPORTED_LOCAL_EVIDENCE

Reconciled completed prior evidence: Verified local initial startup comparison remains sufficient to justify follow-up: reported 14.10% saving, 95% interval 9.89-18.39% crosses the original 10% gate. Do not repeat this benchmark merely for catalogue closure; cache identity/cancellation and production ownership remain later qualification.

Evidence: [summary.json](../full-completion/../local-screening/runs/module-maintained-pairs-01/summary.json), [identity-check.json](../full-completion/../full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json).

## Rank 66 — R048.keep-only-the-relevant-native-caption-cues-instantiated

**PURSUE** · COMPONENT_TEST

Actual10000-cue native TextTrack versus at-most22 materialized cues yields identical active cue text at6 forward/backward seeks, including near end. Removing active cue detected. Native cue-object count reduced; total memory/CPU benefit and API-compatible player adapter unqualified.

Evidence: [result.json](cue-window/result.json).

## Rank 67 — R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds

**PURSUE** · REUSED_REAL_PATH_SCREEN

Reconciled completed prior evidence: At 0.5x startup, peak buffered media changed 5.503999s to 3.007999s, fetched bytes 2359296 to 1572864. Actual 4x after seek is explicitly asserted; frame progress, source replacement rejection and worker cleanup pass. Worth a bounded rate-aware preparation policy; no generalized high-speed improvement claimed.

Evidence: [result.json](../full-completion/remux-policies/result.json).

## Rank 71 — R100.transfer-owned-packet-storage-into-webcodecs-chunks

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Whole-owned packet transfer detaches input, preserves chunk bytes and matches independent decoded I420. Shared heaps and oversized subviews reject at the candidate ownership guard. Normal maintained VP9 path already has zero owned packet bytes, so pursue only measured fallback/prefix branches, not global copying changes.

Evidence: [result.json](../full-completion/frame-boundaries/result.json), [result.json](../full-completion/r332/result.json).

## Rank 72 — R118.mse-append-window-clipping-report-paragraph-label.report-frontier

**PURSUE** · COMPONENT_TEST

Explicit0.5-1.5s MSE window clips rendered video and buffered interval while all input bytes still received. Purpose is requested presentation trim, not decode/source-byte saving. Video-only component; current combined A/V controller not integrated.

Evidence: [result.json](mse/result.json).

## Rank 73 — R119.canonicalize-equivalent-decoder-configurations

**PURSUE** · COMPONENT_TEST

Exact duplicate AVC SPS/PPS entries canonicalize to one copy, preserving48 browser-decoded frames and PTS against independent host oracle; same-ID changed SPS rejects. No semantic equivalence beyond exact duplicate parameter bytes; source reset still required.

Evidence: [canonical-config-result.json](canonical-config-result.json).

## Rank 74 — R119.mse-future-range-replacement-report-paragraph-label.report-frontier

**PURSUE** · COMPONENT_TEST

Future RAP-aligned range replacement changes red to green after2s while retaining SourceBuffer. Stale canceled transaction leaves buffered ranges unchanged; valid commit plays to EOF. Video-only component; current combined A/V controller not integrated.

Evidence: [result.json](mse/result.json).

## Rank 75 — R122.retime-existing-frames-without-creating-new-pictures.report-frontier

**PURSUE** · COMPONENT_TEST

Explicit2x held/slower presentation patches timing without adding pictures:24 original compressed samples and decoded frames retained, every PTS/DTS/duration doubles. No motion interpolation or default rate change.

Evidence: [result.json](patch-mux/result.json).

## Rank 77 — R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier

**PURSUE_BROWSER_ORACLE_DIVERGENCE** · COMPONENT_TEST

Corrected prior transcription: Chrome native decode applies requested additional480-sample head trim exactly, output95520 samples; host FFmpeg output stays unchanged96000 despite identical packet payloads. Browser composition is viable for this profile, but cross-decoder trim semantics/oracle divergence must be resolved before integration. No universal trimming rule.

Evidence: [result.json](head-trim/result.json), [browser-result.json](head-trim/browser-result.json).

## Rank 78 — R125.buffer-according-to-predicted-decode-work

**PURSUE** · COMPONENT_TEST

Correct72-frame serialized decode trace: packet-size linear model lowered held-out latency MAE versus constant prediction on24 held-out frames. Tiny synthetic trace only; predictive buffering controller and representative difficult-region value remain future confirmation.

Evidence: [decode-cost-result.json](decode-cost-result.json).

## Rank 79 — R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier

**PURSUE_AS_REGRESSION_TEST** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Truthful 100ms VP8 DefaultDuration yields one early frame and [0,0.1] range from the first block. Replacing only this metadata with same-size Void yields neither until remaining bytes arrive. Worth retaining as parser-availability regression coverage; does not justify inventing VFR durations or claim a missing maintained mux feature.

Evidence: [result.json](../full-completion/webm-boundaries/result.json).

## Rank 80 — R126.find-where-hardware-decoding-loses-on-short-jobs

**PURSUE_PREFERENCE_ONLY** · COMPONENT_TEST

Both acceleration preferences passed exact visible-pixel and timestamp oracle before retained timing rerun. Software-preferred complete1/12/72-frame jobs were faster in this bounded profile. Hints do not prove decoder hardware identity; no universal hardware crossover claim or production policy.

Evidence: [decode-cost-qualification.json](decode-cost-qualification.json), [decode-cost-result.json](decode-cost-result.json).

## Rank 81 — R126.same-codec-bytestream-change-in-one-sourcebuffer-report-paragraph-label.report-frontier

**PURSUE** · COMPONENT_TEST

Actual same VP9 codec WebM-to-fMP4 changeType keeps SourceBuffer and renders both marked intervals to EOF; invalid type rejected. Video-only component; current combined A/V controller not integrated.

Evidence: [result.json](mse/result.json).

## Rank 82 — R131.global-mp4-sidx-materially-changes-remote-access.report-frontier

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Same-size same-packet indexed and unindexed variants reach identical target pixel hashes at 20s. Global index reduces this bounded native request trace from 6656858 to 6296410 bytes. Benefit is modest on this 26-second local fixture; pursue asset-side metadata only with real remote byte/latency exposure.

Evidence: [result.json](../full-completion/remote-index/result.json), [identity.json](../full-completion/remote-index/identity.json).

## Rank 85 — R144.compile-simple-ass-animations-into-reusable-timeline-programs

**PURSUE** · COMPONENT_TEST

Restricted fad animation reused two opacity-regime mask templates plus piecewise alpha; matches actual libass geometry/masks with at most one alpha unit at seven times including rewind. Single-mask variant fails because libass changes outline mask when fill becomes opaque. No general ASS compiler or measured gain.

Evidence: [fade-result.json](subtitles/fade-result.json), [fade-single-mask-failure.json](subtitles/fade-single-mask-failure.json).

## Rank 86 — R144.evict-through-a-paused-current-position.report-continuity

**PURSUE** · COMPONENT_TEST

Pause at non-boundary position, remove through current position, retain paused display, reappend removed media, resume to EOF. Buffered-time shrink observed; physical memory reduction not inferred. Video-only component; current combined A/V controller not integrated.

Evidence: [result.json](mse/result.json).

## Rank 87 — R162.compile-a-qualified-mux-configuration-into-a-small-patch-program

**PURSUE** · COMPONENT_TEST

Compiled fixed moof template plus typed duration/size/tfdt/sequence/data-offset fields reproduces24 qualified single-sample fragments with exact packet payload/timing and decoded frames. Mutated nonparameter skeleton and zero duration reject; generic mux layouts excluded.

Evidence: [result.json](patch-mux/result.json).

## Rank 89 — R170.separate-audio-clock-drift-from-an-audio-latency-jump

**PURSUE_COMPONENT** · COMPONENT_TEST

Controlled clock observations distinguish100ppm drift from50ms output-latency step and ignore120ms callback-delivery delay. Uses actual AudioContext timestamp schema/anchor but injections are synthetic; physical device drift/jump and integrated correction remain unqualified.

Evidence: [classification-result.json](clock/classification-result.json).

## Rank 90 — R188.schedule-verified-playable-data

**PURSUE** · COMPONENT_TEST

Verified scheduling holds23 dependent packets until RAP arrives and matches trusted digest; corrupt RAP rejects. Only complete verified dependency closure publishes, with24 decoded frames exact against full-source oracle.

Evidence: [result.json](ownership/result.json).

## Rank 92 — R200.content-addressed-reuse-across-different-files

**PURSUE** · COMPONENT_TEST

Two different owned file wrappers share exact coded packets/configuration through bounded content-addressed entries, retaining source timelines separately. Poisoned digest entry rejects, changed configuration misses, all references released. No workload benefit or cross-authority reuse claim.

Evidence: [content-cache-result.json](ownership/content-cache-result.json).

## Rank 93 — R213.compare-whole-frames-on-the-graphics-side-and-read-back-only-the-witness

**PURSUE** · COMPONENT_TEST

Actual GPU atomic difference witness scans all 15360 resident RGBA pixels with four-byte readback. Equal frame and first/middle/last changed pixels match CPU oracle. Opportunity restricted to pixels already on GPU; no measured whole-player savings.

Evidence: [witness-result.json](gpu/witness-result.json).

## Rank 94 — R215.upload-operation-selected-by-existing-layout

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: A direct stride-aware heap upload produces byte-identical GL pixels, removes120 JavaScript row-copy bytes for the tested frame, restores row state and rejects short stride. Driver copies and CPU benefit remain unmeasured.

Evidence: [result.json](../full-completion/presentation/result.json).

## Rank 95 — R216.one-request-for-distant-byte-ranges

**PURSUE** · COMPONENT_TEST

Actual HTTP multipart range response matches two independent single-range reads; truncated multipart rejects. One request replaces two for capable test origin, with575 response bytes for384 payload bytes. Production origin capability remains prerequisite.

Evidence: [result.json](ownership/result.json).

## Rank 98 — R222.independently-checkable-remux-construction-record

**PURSUE** · REUSED_COMPONENT_TEST

Reconciled completed prior evidence: Independent source/output byte ranges, packet timestamps and config hashes validate214 packets and reject wrong offset, swapped range, timing, configuration and stale source. Useful reproducible remux audit artifact, not performance gain.

Evidence: [result.json](../full-completion/r222/result.json).

## Rank 99 — R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity

**PURSUE** · COMPONENT_TEST

Explicit program202 TS packet filter keeps selected elementary/PCR/PMT PIDs and rewrites PAT with valid CRC. Reversed PAT order produces identical selected payload/timing. Unchanged RemuxPlayer plays/seeks output, complete host decoded pixels/PCM exact. Missing program rejects; dynamic PSI/scrambled transport outside scope.

Evidence: [result.json](program/result.json), [browser-result.json](program/browser-result.json).

## Rank 100 — R230.exact-mp3-seek-closure.report-continuity

**PURSUE** · COMPONENT_TEST

Actual MP3 continuous PCM suffix oracle at two targets distinguishes insufficient cold/preroll windows from exact recovery. Validated closure is tied to authored48k stereo128k fixture without Xing trimming; not a universal2-frame rule or browser seek feature.

Evidence: [result.json](mp3/result.json).
