<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# September 19 stage advancement

All 425 item homes now have a post-migration, stage-specific current record. **This is not completion of 425 implementations, successful experiments, or release qualifications.**

- 36 items gained new component/runtime execution evidence, including shared experiments and negative controls.
- 6 items received new source/prerequisite-only follow-ups.
- 383 items had prior evidence and stage gates reconciled without new execution.

Current dispositions: 122 pursue, 96 stop for the scoped profile, 14 already implemented, 193 blocked. There are 90 scoped correctness passes, 2 failed correctness gates, 44 pending and 196 blocked. Three pursue/design records also have blocked implementation gates, explaining the blocker-count difference. No new performance success is claimed.

[Live derived stage summary](../STATUS.md) · [All ranked current items](../ITEMS.md) · [Membership and work accounting](2026-09-19-stage-advancement.json)

## Material results

- Genuine AV1 temporal extraction kept12/24 pictures with exact independent host/browser pixels and timestamps; the callable invalid operating-point guard now rejects before output. Tile selection matches a full-decode crop, but its independent reference/lifecycle gate stays pending.
- Genuine Dolby8.1 HDR10-base and MVC2D-base extraction preserve coded payloads, timing and full decoded references. Dolby reshaping still needs an independent color oracle.
- ManagedMediaSource demand worked in installed WebKit; correct experimental Chrome buffer-construction order enabled VP9/Opus containerless playback. AVC remains unsupported there.
- Opus regrouping preserves host/browser samples and actual seek/EOF; byte savings depend on page policy and aggregation adds delay. Ogg exact cropping needs real state closure; ~84ms preroll was insufficient for exact PCM.
- FLAC smart-cut/concat preserves interior payloads, reconstructs only edges, and passes independent sample seeks.
- MSE transitions, audio switching, queue reuse, excerpt clipping and timing/index components have scoped execution evidence. Pending exact-boundary and failure-recovery gates remain visible.
- HEIC strict pixel fidelity is rejected: browser range conversion loses distinctions. Basis BC1/BC3 rendering works but its exact precision contract still needs resolution.

## Remaining limits

The original top100 has four prerequisite-blocked items: R295/R101/R169 physical display evidence and R184 independent Dolby reshaping reference. Other viable top100 items still have explicit pending correctness/performance gates. Across the whole catalogue, 33 definitions remain missing; source-only setup/fixture gates are not negative experiments.

Production source/routing and the three preexisting tracked edits were preserved. Historical campaign evidence and its three preexisting hash discrepancies were preserved. New source/data/license checks apply to the new runs. No push or publication occurred.

## New follow-up item homes

- [R353.let-browser-managed-streaming-windows-control-remux-production](../items/R353.let-browser-managed-streaming-windows-control-remux-production/README.md)
- [R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding](../items/R099.expose-an-hdr10-compatible-dolby-vision-base-without-video-re-encoding/README.md)
- [R184.browser-hevc-base-separate-dolby-vision-reshaping](../items/R184.browser-hevc-base-separate-dolby-vision-reshaping/README.md)
- [R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback](../items/R307.extract-an-mvc-base-view-for-explicitly-requested-2d-playback/README.md)
- [R193.tiled-heic-through-browser-video-decoding](../items/R193.tiled-heic-through-browser-video-decoding/README.md)
- [R195.prepared-texture-video-to-several-gpu-destinations](../items/R195.prepared-texture-video-to-several-gpu-destinations/README.md)
- [R275.av1-large-scale-tile-viewport-decode](../items/R275.av1-large-scale-tile-viewport-decode/README.md)
- [R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding](../items/R350.extract-a-declared-lower-frame-rate-av1-operating-point-before-decoding/README.md)
- [R233.make-independently-resampled-audio-chunks-join-exactly](../items/R233.make-independently-resampled-audio-chunks-join-exactly/README.md)
- [R237.propagate-the-visible-region-backward-through-the-effects-pipeline](../items/R237.propagate-the-visible-region-backward-through-the-effects-pipeline/README.md)
- [R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples](../items/R243.carry-exact-silence-through-the-pipeline-without-allocating-its-samples/README.md)
- [R296.generate-seek-fragments-without-replaying-a-mux-session](../items/R296.generate-seek-fragments-without-replaying-a-mux-session/README.md)
- [R297.query-mp4-timing-tables-without-expanding-every-sample-record](../items/R297.query-mp4-timing-tables-without-expanding-every-sample-record/README.md)
- [R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity](../items/R318.decode-a-gop-once-for-exact-reverse-frame-playback.report-continuity/README.md)
- [R321.exact-iir-seek-checkpoints.report-continuity](../items/R321.exact-iir-seek-checkpoints.report-continuity/README.md)
- [R327.share-one-decoded-audio-source-across-many-sample-rate-consumers](../items/R327.share-one-decoded-audio-source-across-many-sample-rate-consumers/README.md)
- [R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects](../items/R330.encode-repeated-subtitle-glyph-arrangements-as-reusable-scene-objects/README.md)
- [R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index](../items/R349.seek-through-hierarchical-mp4-indexes-without-loading-the-whole-index/README.md)
- [R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub](../items/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub/README.md)
- [R364.reuse-gpu-command-sequences-across-changing-video-frames](../items/R364.reuse-gpu-command-sequences-across-changing-video-frames/README.md)
- [R121.insert-a-freeze-with-an-empty-edit.report-frontier](../items/R121.insert-a-freeze-with-an-empty-edit.report-frontier/README.md)
- [R132.incremental-mdat-sample-release.report-continuity](../items/R132.incremental-mdat-sample-release.report-continuity/README.md)
- [R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity](../items/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity/README.md)
- [R203.regroup-existing-opus-frames-without-re-encoding](../items/R203.regroup-existing-opus-frames-without-re-encoding/README.md)
- [R289.share-one-native-decoder-across-unrelated-independent-picture-jobs](../items/R289.share-one-native-decoder-across-unrelated-independent-picture-jobs/README.md)
- [R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front](../items/R323.fan-one-decoded-videoframe-into-several-workers-without-copying-its-pixels-up-front/README.md)
- [R015.make-split-buffer-audio-switching-transactional](../items/R015.make-split-buffer-audio-switching-transactional/README.md)
- [R035.switch-same-codec-audio-at-a-future-boundary-without-pausing](../items/R035.switch-same-codec-audio-at-a-future-boundary-without-pausing/README.md)
- [R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop](../items/R036.reuse-one-mse-presentation-across-a-queue-or-repeat-loop/README.md)
- [R043.change-video-configuration-while-keeping-audio-running](../items/R043.change-video-configuration-while-keeping-audio-running/README.md)
- [R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop](../items/R044.play-an-exact-requested-excerpt-without-re-encoding-its-edge-gop/README.md)
- [R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning](../items/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning/README.md)
- [R052.keep-source-sample-rates-across-audio-track-changes](../items/R052.keep-source-sample-rates-across-audio-track-changes/README.md)
- [R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track](../items/R062.apply-an-explicit-audio-sync-offset-by-remapping-one-track/README.md)
- [R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata](../items/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata/README.md)
- [R118.one-decode-many-views](../items/R118.one-decode-many-views/README.md)
- [R270.exact-flac-smart-cut-concat](../items/R270.exact-flac-smart-cut-concat/README.md)
- [R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming](../items/R320.make-exact-ogg-opus-clip-edges-with-packet-copy-plus-pre-skip-end-trimming/README.md)
- [R093.opus-repacketization-without-pcm-decoding](../items/R093.opus-repacketization-without-pcm-decoding/README.md)
- [R239.packet-granular-ogg-opus-repagination.report-c](../items/R239.packet-granular-ogg-opus-repagination.report-c/README.md)
- [R239.extract-an-av1-operating-point-before-decoding.report-a](../items/R239.extract-an-av1-operating-point-before-decoding.report-a/README.md)
- [R030.investigate-containerless-encoded-chunk-mse](../items/R030.investigate-containerless-encoded-chunk-mse/README.md)

[Final campaign verification](../shared/runs/20260919T202912Z-campaign-checks/verification.json)
