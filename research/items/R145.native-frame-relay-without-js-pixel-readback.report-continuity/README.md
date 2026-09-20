<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# native frame relay without JS pixel readback

Disposition: **pursue**. correctness: **passed**, performance: **not_applicable**.

Implemented the exact report-continuity native route: nativevideo captureStream→MediaStreamTrackProcessor→unchanged VideoFrame writes→MediaStreamTrackGenerator→second nativevideo. Destination observer verifies every full-frame RGBA against an independent hostFFmpeg oracle for24 losslesscoded visual IDs0..23 at12fps. All24 distinct IDs arrive in order, including final23; every observed image is exact. Capture emitted60 frames including repeated source images, so framecallback counts are explicitly not the source completeness oracle. A separate negative relay deliberately identifies/drops finalID23 and fails completeness despite otherwise healthy playback. Actual cancellation holds one old capture frame, changes sourceepoch, closes/discards stale output, then forwards a surviving newowner frame; all capture/generator tracks end. Main relay does no application pixel readback; only independent destinationobserver and negativecontrol inspectpixels. This is a new routing capability, not zero-copy/hardware/latency equivalence: destination track has its own capture timestamps and repeatedimages. No independent audiovisual-clock or precise source-PTS preservation claim. No performance cost-reduction hypothesis is present in this exact report key, so performance is not applicable.

Next: Scoped native media-track routing capability verified with complete visual IDs and final-frame falsifier. A timing-preserving audiovisual destination, higher cadence/load or different browser needs its own output-clock and deadline contract; no production admission.

[Current record](item.json) · [History](history.jsonl) · [Run analysis](evidence/20260919T220411Z-native-relay/analysis.md)
