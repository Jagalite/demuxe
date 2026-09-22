<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Ecosystem expansion — evaluated and integrated

All **22 proposals** evaluated at `20260922T131542Z-ecosystem-evaluation`: **19 existing canonical owners**, **3 new item homes**. The imported report covered 38 external targets; these are source references, not 38 new research items.

[Evaluation report](../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md) · [Oracle matrix](../shared/runs/20260922T131542Z-ecosystem-evaluation/oracle-matrix.md) · [Original imported report](../../research/shared/runs/20260922T001856Z-research-batches-import/snapshots/demuxe-ecosystem-expansion-2026-09-21.md)

Evidence: current-source inspection, 76 executed Node contract checks and three synthetic boundary probes. No new browser playback or performance qualification. Original import/source observations are retained without claiming a fresh upstream audit.

Evaluation and research integration are complete. Follow-ups below remain explicit even where their parent item already concluded an earlier profile. Deferred proposals require their stated trigger; they are not active implementation commitments.

| ID | Canonical owner | Outcome |
|---|---|---|
| EB01 | [R005.move-mse-ownership-off-the-window-thread](../items/R005.move-mse-ownership-off-the-window-thread/README.md) | followup_required |
| EB02 | [R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media](../items/R050.evict-on-actual-gop-boundaries-to-preserve-useful-rewind-media/README.md) | regression_only |
| EB03 | [mpv-cache-browser-stream](../items/mpv-cache-browser-stream/README.md) | no_new_work_current_scope |
| EB04 | [R298.copy-surviving-packets-to-release-oversized-backing-buffers](../items/R298.copy-surviving-packets-to-release-oversized-backing-buffers/README.md) | no_new_work_current_scope |
| EB05 | [R100.transfer-owned-packet-storage-into-webcodecs-chunks](../items/R100.transfer-owned-packet-storage-into-webcodecs-chunks/README.md) | followup_required |
| EB06 | [R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub](../items/R360.retarget-in-flight-decoding-instead-of-restarting-a-forward-scrub/README.md) | no_new_work_current_scope |
| EB07 | [unified-hybrid-software-engine](../items/unified-hybrid-software-engine/README.md) | deferred_until_trigger |
| EB08 | [R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1](../items/R091.in-band-video-configuration-changes-with-avc3-and-qualified-hev1/README.md) | deferred_until_trigger |
| EB09 | [R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata](../items/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata/README.md) | followup_required |
| EB10 | [R086.native-video-with-an-independent-generated-pcm-clock](../items/R086.native-video-with-an-independent-generated-pcm-clock/README.md) | no_new_work_current_scope |
| EB11 | [R014.avoid-duplicate-resampling-and-oversized-audio-work-batches](../items/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches/README.md) | no_new_work_current_scope |
| EB12 | [R031.raw-aac-mp3-audio-beside-fragmented-video](../items/R031.raw-aac-mp3-audio-beside-fragmented-video/README.md) | deferred_until_trigger |
| EB13 | [R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning](../items/R045.use-a-source-bound-seek-map-rather-than-repeated-fragment-scanning/README.md) | no_new_work_current_scope |
| EB14 | [R274.virtual-webm-cues](../items/R274.virtual-webm-cues/README.md) | deferred_until_trigger |
| EB15 | [R208.make-cancellation-follow-media-dependency-boundaries](../items/R208.make-cancellation-follow-media-dependency-boundaries/README.md) | no_new_work_current_scope |
| EB16 | [reconnect-overlap-identity](../items/reconnect-overlap-identity/README.md) | deferred_until_trigger |
| EB17 | [R220.scoped-transport-clock-normalization](../items/R220.scoped-transport-clock-normalization/README.md) | no_new_work_current_scope |
| EB18 | [R021.cache-subtitle-tiles-and-schedule-only-useful-redraws](../items/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws/README.md) | followup_required |
| EB19 | [explicit-media-repair-accounting](../items/explicit-media-repair-accounting/README.md) | followup_required |
| EB20 | [R192.identity-coded-witness-media](../items/R192.identity-coded-witness-media/README.md) | qualification_followup |
| EB21 | [live-dependency-group-deadlines](../items/live-dependency-group-deadlines/README.md) | deferred_until_trigger |
| EB22 | [R018.cache-prepared-media-by-timeline-and-transformation-recipe](../items/R018.cache-prepared-media-by-timeline-and-transformation-recipe/README.md) | deferred_until_trigger |

## Remaining gates

- **EB01**: Extend the maintained append owner with bounded intended/committed/failed/observed states only if used for recovery or exact residency reporting. Test synchronous and asynchronous failure, browser eviction, overlapping appends and source replacement in real MSE before measuring avoided work.
- **EB05**: For one concrete new adapter, declare accepted chunk/frame family, format, memory domain, maximum outstanding objects and terminal release. Reject incompatible families and run exhaustion/cancel/source-replacement plus output comparisons before any conversion-cost claim.
- **EB09**: Use independently decoded impulse/channel-marked AAC, MP3 and Opus fixtures at head/tail and seek boundaries; declare each trim owner and sample units. Require exact counts/positions before admitting any new wrapper or split route.
- **EB18**: Compare position-only versus content changes on a persistent moving-ASS workload, font replacement and resize; independently verify glyph/color/placement and measure full rendering/upload cost before adding a tile cache.
- **EB19**: Start with existing AAC timestamp and AVC/HEVC DTS repairs: emit bounded reason/source-epoch/input-output identities with unchanged-media controls. Then inject junk, truncated init and inconsistent metadata; distinguish strict rejection, requested salvage and live concealment before broadening.
- **EB20**: For EB01/EB09/EB14/EB19 experiments, fill the matrix with a second structural implementation or independently authored parser and a failing negative control. Record lineage, tolerance and exact scope; do not label Node contracts browser conformance.

## Deferred reopening conditions

- **EB07**: Apply adapter-local family checks if a software WebCodecs adapter is introduced. Reject mixed families before publication and repeat output/fallback qualification; do not install a global shim.
- **EB08**: When introducing a browser encoder, gate init on bounded first outputs of every selected track; test mismatched requested/actual config, a delayed track, cancellation and a later epoch before admission.
- **EB12**: Select a real source whose cheapest unchanged route fails, then compare exact compressed frames and decoded timing/channels across the specific wrapper; charge parse/mux/setup. Preserve working direct playback.
- **EB14**: Reopen for a specific recording that cannot use the fixed-size/reserved-space baseline. Prove checked convergence across EBML integer-width boundaries, all offset targets, opaque-metadata handling, source identity and bounded failure before timing.
- **EB16**: Reopen only for an explicit reconnecting audio source contract. Byte-verify hash candidates, retain unique samples, bound overlap, reject silence/periodic ambiguity and label estimated alternate-source alignment separately.
- **EB21**: Reopen for an explicit live transport/latency policy outside the current packaged-stream owner. Test late groups, dependency closure, pause/resume, A/V/subtitle resync and a strict VOD no-drop control; report skipped intervals and latency, not equal-output savings.
- **EB22**: When a repeated-preparation workload warrants integration, key reuse by immutable source, selected tracks, recipe, metadata epoch, destination and runtime; test individual invalidations and consumer cancellation, then charge retained memory and cold preparation.

[Validation and inherited evidence drift](../shared/runs/20260922T131542Z-ecosystem-evaluation/VALIDATION.md).
