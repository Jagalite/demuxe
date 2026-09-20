<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract an MVC base view for explicitly requested 2D playback

Current decision: **stop_current_profile**. HostMVC base extraction remains byte/picture exact, but browser-owner endpoint is not qualified: maintained RemuxPlayer explicitly rejects interlaced AVC. Direct MSE plays and seeks, yet settled nativeBlob versus MSE comparison retains a real first-boundary full-image mismatch at0.08s and duration1.58versus1.60. Stop this browser profile pending field/timeline qualification; no efficiency benchmark on failed endpoint.

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | New executable probe and declared workload/controls registered with source/input/runtime evidence. |
| screen | passed | HostMVC base extraction remains byte/picture exact, but browser-owner endpoint is not qualified: maintained RemuxPlayer explicitly rejects interlaced AVC. Direct MSE plays and seeks, yet settled nativeBlob versus MSE comparison retains a real first-boundary full-image mismatch at0.08s and duration1.58versus1.60. Stop this browser profile pending field/timeline qualification; no efficiency benchmark on failed endpoint. |
| correctness | failed | Prior genuineMVC extraction: baseelementary bytes/all39picture hashes exact,39PES/78field timestamps checked, dependentview rejects. New hostbaseMP4 also all39picture hashes exact. Actual maintained RemuxPlayer rejects Interlaced AVC requires decoder handling, zerooutput/zeroworkers. Direct MSE and nativeBlob both reach EOF, sixreverse/forwardseek samples compared full1920x1080RGBA aftertwoanimationframes:5exact,0.08s mismatch persists. Final staleframe in firstcapture fixed bypresentation wait, distinctinitialboundary mismatch retained. No claim of browser timing/fidelity pass; no newWasmMVC extractor or selectedaudio/stereo. |
| performance | not_applicable | Browser endpoint correctness does not pass and maintained route rejects this interlacedprofile. Stop before performance under PROCESS; hostextraction fidelity is positive but cannot authorize a browser-efficiency claim. |
| results | passed | Actual new execution raw outcomes, controls and scoped interpretation retained. |
| decision | passed | stop_current_profile: HostMVC base extraction remains byte/picture exact, but browser-owner endpoint is not qualified: maintained RemuxPlayer explicitly rejects interlaced AVC. Direct MSE plays and seeks, yet settled nativeBlob versus MSE comparison retains a real first-boundary full-image mismatch at0.08s and duration1.58versus1.60. Stop this browser profile pending field/timeline qualification; no efficiency benchmark on failed endpoint. |

Next/reopen: Reopen with a truthful interlacedfield/timeline destination contract or progressiveMVC source. Explain0.08s frame mismatch and20ms duration difference using decoded field/frame timestamps before adding an interlace exception to the bridge. Keep generic owner guard; do not route by MIME support alone.

[Current contract](item.json) · [History](history.jsonl) · [Evidence](evidence/index.json)
