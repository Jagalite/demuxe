<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile screen operations directly into video prediction commands

Full identity: `R128.compile-screen-operations-directly-into-video-prediction-commands`.

Current decision: **inconclusive** (actual_producer_authored_avc_and_native_decoder).

Producer-owned aligned screen replace/copy commands become actual CAVLC I_PCM replacement and skip-run video, without motion estimation. All30 full I420 frames and PTS match independent host and Chrome, including frame_num wrap. Legal-but-stale skipped replacement remains decodable but corrupts27expectedpictures; out-of-bounds/color/timeline guards reject. Against in-process lossless x264 with incremental raster updates,7paired complete local producer+player jobs median0.8643x cost but bootstrap95[0.6080,1.0096] does not establish a reliable gain. Coded bytes26942 versus7810 (3.45x) also matter. Correct capability, cost inconclusive.

Next action: Keep producer-assisted scope and bounds; pursue only with a realistic local transport/bitrate budget or a cheaper exact replacement code before product integration.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Actual producer trace, reference raster renderer, legal AVC I_PCM/skip-run writer and in-process ordinaryencoder baseline. |
| screen | passed | Knownscreencommands directly encode prediction syntax; no motion search or reencode proxy. |
| correctness | passed | 30host/native fullframes+PTS exact, frame_num wrap and stale/legalwrongcopy falsifier; operationbounds reject and allframesclose. |
| performance | failed | Reliable gain not established against incrementalbaseline:median0.8643ratio,bootstrap95 .6080–1.0096;3.45xencodedbytes, local-only costprofile. |
| results | passed | Producer-owned aligned screen replace/copy commands become actual CAVLC I_PCM replacement and skip-run video, without motion estimation. All30 full I420 frames and PTS match independent host and Chrome, including frame_num wrap. Legal-but-stale skipped replacement remains decodable but corrupts27expectedpictures; out-of-bounds/color/timeline guards reject. Against in-process lossless x264 with incremental raster updates,7paired complete local producer+player jobs median0.8643x cost but bootstrap95[0.6080,1.0096] does not establish a reliable gain. Coded bytes26942 versus7810 (3.45x) also matter. Correct capability, cost inconclusive. |
| decision | passed | Producer-owned aligned screen replace/copy commands become actual CAVLC I_PCM replacement and skip-run video, without motion estimation. All30 full I420 frames and PTS match independent host and Chrome, including frame_num wrap. Legal-but-stale skipped replacement remains decodable but corrupts27expectedpictures; out-of-bounds/color/timeline guards reject. Against in-process lossless x264 with incremental raster updates,7paired complete local producer+player jobs median0.8643x cost but bootstrap95[0.6080,1.0096] does not establish a reliable gain. Coded bytes26942 versus7810 (3.45x) also matter. Correct capability, cost inconclusive. |

[New run](../../shared/runs/20260920T002106Z-screen-command-qualification/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
