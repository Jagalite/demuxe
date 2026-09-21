<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Screened ideas D01–D73: research incorporation

All 73 external screens from 17 batches are mapped to 60 canonical item homes: 52 existing owners and 8 new bounded candidates. D labels remain provenance, not R-number allocations.

This campaign imports source reports, controls, observations and original archives. It does not execute the maintained player, overturn prior scoped stops, or establish whole-player performance, hardware decoding, memory or energy savings. Existing item decisions, stages and next actions are preserved; each supplement records its own retest requirement.

[Machine-readable reconciliation](../shared/runs/20260921T023214Z-screened-ideas-d01-d73/reconciliation.json) · [Archive provenance and recovery](../shared/runs/20260921T023214Z-screened-ideas-d01-d73/README.md) · [Source master handoff](../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/demuxe_all_screened_ideas_D01-D73/MASTER_HANDOFF.md)

## Reconciliation

Classification counts: 55 merge_existing, 8 new_candidate, 3 regression_only, 7 stop/negative. Every imported positive requires a current-owner retest before promotion.

| External ID | Screen | Canonical owner | Classification |
|---|---|---|---|
| D01 | AAC Program Config Element normalization | [R119.canonicalize-equivalent-decoder-configurations](../items/R119.canonicalize-equivalent-decoder-configurations/README.md) | merge_existing |
| D02 | Same-size selected-track fMP4 projection | [R059.construct-a-selected-track-mp4-view-without-remuxing-samples](../items/R059.construct-a-selected-track-mp4-view-without-remuxing-samples/README.md) | merge_existing |
| D03 | Do not widen AVC length prefixes without a demonstrated need | [R119.canonicalize-equivalent-decoder-configurations](../items/R119.canonicalize-equivalent-decoder-configurations/README.md) | stop/negative |
| D04 | Strengthen six-channel native FLAC to whole-buffer 24-bit exactness | [R057.probe-a-real-six-channel-native-flac-destination](../items/R057.probe-a-real-six-channel-native-flac-destination/README.md) | merge_existing |
| D05 | Publish decompressed packets only after complete validation | [R358.unwrap-matroska-track-compression-before-choosing-a-decoder](../items/R358.unwrap-matroska-track-compression-before-choosing-a-decoder/README.md) | merge_existing |
| D06 | Source-defined compatibility islands, without claiming handoff | [R116.compatibility-islands-use-software-only-for-the-troublesome-section](../items/R116.compatibility-islands-use-software-only-for-the-troublesome-section/README.md) | merge_existing |
| D07 | Let a native sink expose minimal repair sets, but not define validity | [R131.automatically-search-equivalent-representations](../items/R131.automatically-search-equivalent-representations/README.md) | merge_existing |
| D08 | Canonicalize an exactly representable explicit AAC sample rate | [R119.canonicalize-equivalent-decoder-configurations](../items/R119.canonicalize-equivalent-decoder-configurations/README.md) | merge_existing |
| D09 | Make existing fragments relocatable by repairing their address metadata | [R162.compile-a-qualified-mux-configuration-into-a-small-patch-program](../items/R162.compile-a-qualified-mux-configuration-into-a-small-patch-program/README.md) | merge_existing |
| D10 | Synthesize missing decode-time headers from proven continuity | [R162.compile-a-qualified-mux-configuration-into-a-small-patch-program](../items/R162.compile-a-qualified-mux-configuration-into-a-small-patch-program/README.md) | merge_existing |
| D11 | Require a complete set of repairs before deciding a route is impossible | [R131.automatically-search-equivalent-representations](../items/R131.automatically-search-equivalent-representations/README.md) | merge_existing |
| D12 | A validated packet still needs a current source owner before publication | [R208.make-cancellation-follow-media-dependency-boundaries](../items/R208.make-cancellation-follow-media-dependency-boundaries/README.md) | merge_existing |
| D13 | A route needs track-output and timing witnesses, not only video and EOF | [R192.identity-coded-witness-media](../items/R192.identity-coded-witness-media/README.md) | merge_existing |
| D14 | Jointly declare selected tracks before beginning native playback | [R032.use-different-output-containers-for-different-tracks](../items/R032.use-different-output-containers-for-different-tracks/README.md) | merge_existing |
| D15 | A remux must retain both gain and end trimming | [R095.fixed-opus-gain-through-codec-container-headers](../items/R095.fixed-opus-gain-through-codec-container-headers/README.md) | merge_existing |
| D16 | A true simple FLAC carrier: feasible, not automatically cheaper | [R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier](../items/R102.use-verbatim-flac-as-a-lightweight-integer-pcm-carrier/README.md) | merge_existing |
| D17 | Keep video ownership stable through an audio codec change | [R138.one-sourcebuffer-different-codec-and-container.report-continuity](../items/R138.one-sourcebuffer-different-codec-and-container.report-continuity/README.md) | merge_existing |
| D18 | A decoding success is not an integrity verdict | [R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification](../items/R311.use-frame-crcs-to-narrow-a-repair-then-require-trusted-hash-verification/README.md) | merge_existing |
| D19 | Match the numerical contract without expanding the samples | [R174.flac-bit-depth-promotion-without-sample-reconstruction](../items/R174.flac-bit-depth-promotion-without-sample-reconstruction/README.md) | merge_existing |
| D20 | Eliminate disagreement in color interpretation, not coded pictures | [R008.keep-display-only-transformations-out-of-cpu-video-filters](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | merge_existing |
| D21 | Source-bound reconstruction of abbreviated JPEG frames | [R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images](../items/R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images/README.md) | merge_existing |
| D22 | Translate known static orientation into the browser's presentation metadata | [R008.keep-display-only-transformations-out-of-cpu-video-filters](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | merge_existing |
| D23 | Select independent FLAC channels without decoding their samples | [R103.join-split-or-reorder-independent-flac-channel-subframes](../items/R103.join-split-or-reorder-independent-flac-channel-subframes/README.md) | merge_existing |
| D24 | Give RLE subtitle bitmaps to a native PNG decoder without a raster intermediate | [R198.bitmap-subtitles-directly-from-rle-runs](../items/R198.bitmap-subtitles-directly-from-rle-runs/README.md) | merge_existing |
| D25 | Cold APNG seeks using native PNG subframe views and disposal-aware plans | [R344.seek-through-apng-by-resolving-the-last-writer-of-each-region](../items/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region/README.md) | merge_existing |
| D26 | Explicit mono duplication and silent slots through Opus mapping | [R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata](../items/R225.produce-dual-mono-and-silent-channel-slots-through-opus-mapping-metadata/README.md) | merge_existing |
| D27 | Configuration changes without an automatic player rebuild | [R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1](../items/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1/README.md) | merge_existing |
| D28 | Reset parsing and reject stale completions before retry | [R037.recover-an-interrupted-partial-append-without-replacing-mse](../items/R037.recover-an-interrupted-partial-append-without-replacing-mse/README.md) | regression_only |
| D29 | Metadata-only cropping: valid coded output, wrong browser presentation | [R008.keep-display-only-transformations-out-of-cpu-video-filters](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | stop/negative |
| D30 | Trimming presentation must not delete decode prerequisites | [R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop](../items/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop/README.md) | stop/negative |
| D31 | Change packet grouping after startup rather than imposing one latency policy | [R203.regroup-existing-opus-frames-without-re-encoding](../items/R203.regroup-existing-opus-frames-without-re-encoding/README.md) | merge_existing |
| D32 | Rewrap G.711 telephony audio rather than decoding it in application code | [native-g711-wave-rewrap](../items/native-g711-wave-rewrap/README.md) | new_candidate |
| D33 | Can finite MP4 edit metadata express exact audio excerpts? | [R109.expose-an-edited-mp4-as-a-virtual-byte-range-url](../items/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url/README.md) | stop/negative |
| D34 | Recover original JPEG bytes from JPEG-origin JPEG XL, then use browser JPEG decoding | [R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode](../items/R146.jpeg-xl-reconstruction-followed-by-browser-jpeg-decode/README.md) | merge_existing |
| D35 | Preserve exact edits by moving selection to the native audio scheduler | [native-audio-sample-window-scheduling](../items/native-audio-sample-window-scheduling/README.md) | new_candidate |
| D36 | Author a source-indexed edited MP4, then leave playback to the browser | [R109.expose-an-edited-mp4-as-a-virtual-byte-range-url](../items/R109.expose-an-edited-mp4-as-a-virtual-byte-range-url/README.md) | merge_existing |
| D37 | Refer to repeated coded pictures twice without storing them twice | [R120.repeat-media-without-repeating-mdat.report-frontier](../items/R120.repeat-media-without-repeating-mdat.report-frontier/README.md) | merge_existing |
| D38 | Admit a useful seek GOP without waiting for earlier GOPs | [R188.schedule-verified-playable-data](../items/R188.schedule-verified-playable-data/README.md) | merge_existing |
| D39 | Reuse AVIF coded images as timed AV1 samples, with a presentation gate | [R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif](../items/R089.avif-image-payloads-as-timed-av1-video-and-eligible-av1-frames-as-avif/README.md) | merge_existing |
| D40 | Select whole Opus elementary streams rather than reconstructing every channel | [R104.select-or-assemble-whole-opus-elementary-streams-without-pcm](../items/R104.select-or-assemble-whole-opus-elementary-streams-without-pcm/README.md) | merge_existing |
| D41 | Restore stripped headers after unlacing, not once per block | [R110.choose-a-destination-aware-lacing-or-unlacing-representation](../items/R110.choose-a-destination-aware-lacing-or-unlacing-representation/README.md) | merge_existing |
| D42 | Chained audio needs independent configuration, trimming, and decoder state | [chained-ogg-native-link-scheduling](../items/chained-ogg-native-link-scheduling/README.md) | new_candidate |
| D43 | Bounded native resampling needs more than a nominal rate ratio | [R233.make-independently-resampled-audio-chunks-join-exactly](../items/R233.make-independently-resampled-audio-chunks-join-exactly/README.md) | merge_existing |
| D44 | Try an unchanged native destination before projecting sample descriptions | [R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1](../items/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1/README.md) | merge_existing |
| D45 | A recovery point is not necessarily a native cold-start point | [R150.recovery-windows-rather-than-immediate-clean-access-assumptions](../items/R150.recovery-windows-rather-than-immediate-clean-access-assumptions/README.md) | stop/negative |
| D46 | Treat codec/container color conflicts as an authority problem | [R008.keep-display-only-transformations-out-of-cpu-video-filters](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | merge_existing |
| D47 | Bounded Vorbis views across short/long blocks | [R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries](../items/R223.decode-one-vorbis-stream-in-parallel-using-small-overlapping-boundaries/README.md) | merge_existing |
| D48 | Byte availability is not the complete MP3 output state | [R230.exact-mp3-seek-closure.report-continuity](../items/R230.exact-mp3-seek-closure.report-continuity/README.md) | stop/negative |
| D49 | Crop the native presentation, not the encoded image | [R008.keep-display-only-transformations-out-of-cpu-video-filters](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | merge_existing |
| D50 | Reduce an epoch while timestamps are still integers | [R220.scoped-transport-clock-normalization](../items/R220.scoped-transport-clock-normalization/README.md) | merge_existing |
| D51 | Express a requested crossfade in the browser audio graph | [R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes](../items/R068.process-only-the-audio-region-that-an-explicitly-requested-crossfade-changes/README.md) | merge_existing |
| D52 | Preserve explicit silent time with constant FLAC frames | [R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples](../items/R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples/README.md) | merge_existing |
| D53 | A sub-millisecond eviction error can discard a full extra GOP | [R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media](../items/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media/README.md) | regression_only |
| D54 | Project source subtitles onto an edited native timeline | [R041.route-simple-subrip-captions-to-native-text-tracks](../items/R041.route-simple-subrip-captions-to-native-text-tracks/README.md) | merge_existing |
| D55 | Render bounded finite-filter requests with stable native channel state | [native-fir-window-rendering](../items/native-fir-window-rendering/README.md) | new_candidate |
| D56 | Preserve an explicit cadence with coded picture recalls | [R106.recall-stored-av1-pictures-with-coded-display-instructions](../items/R106.recall-stored-av1-pictures-with-coded-display-instructions/README.md) | stop/negative |
| D57 | Sparse audio can be scheduled without expanding its held spans | [sparse-wave-native-scheduling](../items/sparse-wave-native-scheduling/README.md) | new_candidate |
| D58 | Give a native IIR filter only enough history for a declared error budget | [R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget](../items/R341.derive-audio-effect-preroll-from-a-guaranteed-error-budget/README.md) | merge_existing |
| D59 | Native JPEG decoding for restricted TIFF pages and regions | [R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images](../items/R140.turn-abbreviated-jpeg-transport-frames-into-browser-decodable-images/README.md) | merge_existing |
| D60 | Destination-specific recovery of mislabeled random-access samples | [verified-mp4-sync-label-repair](../items/verified-mp4-sync-label-repair/README.md) | new_candidate |
| D61 | One bounded copy can make native audio looping correct | [native-audio-isolated-cycle-loop](../items/native-audio-isolated-cycle-loop/README.md) | new_candidate |
| D62 | Retain PGS object data, not stale rendered subtitles | [R198.bitmap-subtitles-directly-from-rle-runs](../items/R198.bitmap-subtitles-directly-from-rle-runs/README.md) | merge_existing |
| D63 | Native clipping of lossless audio at individual sample boundaries | [R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata](../items/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata/README.md) | merge_existing |
| D64 | Join independent FLAC selections without creating a new encoded bridge | [R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop](../items/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop/README.md) | merge_existing |
| D65 | Select an Ogg logical stream by retaining its original pages | [native-ogg-page-projection](../items/native-ogg-page-projection/README.md) | new_candidate |
| D66 | Separate source-local track numbering from playback-lane numbering | [R069.separate-decoder-compatibility-from-per-source-initialization-identity](../items/R069.separate-decoder-compatibility-from-per-source-initialization-identity/README.md) | merge_existing |
| D67 | Native image decoding with a source-derived animation seek plan | [R322.animated-image-disposal-checkpoints.report-continuity](../items/R322.animated-image-disposal-checkpoints.report-continuity/README.md) | merge_existing |
| D68 | Preserve PCM values while changing only the incompatible representation | [R010.screen-float-preserving-destinations-before-writing-adapters](../items/R010.screen-float-preserving-destinations-before-writing-adapters/README.md) | merge_existing |
| D69 | Translate the packet table, not just the packet bytes | [R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming](../items/R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming/README.md) | merge_existing |
| D70 | Give native text the syllable timeline rather than repainting it in JavaScript | [R144.compile-simple-ass-animations-into-reusable-timeline-programs](../items/R144.compile-simple-ass-animations-into-reusable-timeline-programs/README.md) | merge_existing |
| D71 | Compressed-only reverse views of independently decodable video | [R085.out-of-order-gop-decode-and-reverse-presentation](../items/R085.out-of-order-gop-decode-and-reverse-presentation/README.md) | merge_existing |
| D72 | Preserve sparse-video durations instead of guessing a constant frame rate | [R112.supply-known-webm-durations-to-prevent-parser-holdback](../items/R112.supply-known-webm-durations-to-prevent-parser-holdback/README.md) | regression_only |
| D73 | Resolve geometry at the boundary that actually presents it | [R008.keep-display-only-transformations-out-of-cpu-video-filters](../items/R008.keep-display-only-transformations-out-of-cpu-video-filters/README.md) | merge_existing |

## Next research gates

1. Review the current owner and its latest scoped decision before selecting a screen. Start with AAC/configuration and container admission where a real source exposes a gap.
2. Reproduce the smallest report-defined test, including negative controls, with current source/runtime identities. Record already-implemented behavior as regression evidence.
3. Require output and lifecycle correctness before complete-cost measurement. Keep direct, MSE, Web Audio, image and Shaka destinations separate.
4. Preserve stops: compulsory AVC prefix widening, native metadata crop, naive video clipping, exact MP4 audio edit views, AVC cold recovery, strict MP3 short-window exactness and default display recalls. Positive subprofiles do not erase nearby failures (YUV AVIF, high-DPI crops, late silence repair, fractional-alpha WebP, resampled loops).

No production routing change or new runtime subsystem is part of this incorporation.

## Verification

Run `python3 research/shared/tooling/verify-screened-ideas.py` to check all 73 mappings, original archive members, materialized evidence, and preserved history prefixes without executing imported code. The repository-wide checks remain `python3 scripts/research.py verify` and `python3 scripts/check-licenses.py`.

The import-specific verifier and licensing checks passed. The full research verifier reports two evidence-hash mismatches in already-modified `web/range-reader.js` and `web/native-remux-source-worker.js`; this import did not edit those files or refresh their historical hashes. See the [recorded validation](../shared/runs/20260921T023214Z-screened-ideas-d01-d73/verification.json). Existing decisions, stages and next actions were also confirmed unchanged for all 52 existing owners.
