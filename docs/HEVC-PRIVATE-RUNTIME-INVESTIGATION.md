# HEVC private-runtime investigation — 2026-09-27

The retained HEVC CPU failures do not currently support a JSPI- or Asyncify-specific defect. All three runtime captures are byte-identical, and dropped-frame failures reproduce when the captured output plays in a plain HTML video element with no Demuxe workers. That control changes MSE playback to progressive file playback, so it does not establish the cause of the original MSE failures. HEVC CPU publication remains withheld.

## Scope and provenance

Exact fixture: `hevc10-ac3`, HEVC Main 10, 320×180, 30 fps, 36 seconds, AC-3 48 kHz stereo. Source SHA-256: `397b6bc06df86631ae51f657c9881c9c75296997704b8ab8709d3c2c4aac49af`.

Used the original frozen `build/head-to-head/assets-private-remux-main-01` assets, manifest SHA-256 `eefc1d98df4e7d0a128c39ba38d9d9137e2f588ca58a1c8f248fda678bbc2968`, rather than rebuilding the concurrently edited checkout. Browser: headed Chrome 153.0.8010.53 on this Mac. Both new runs use the maintained 150-second startup gate, fresh contexts, foreground checks, five-second warmup, and 20-second observation windows. Instruments add overhead and can change scheduling; their CPU values are diagnostic only.

Evidence lives in [hevc-investigation-01](../results/jspi-asyncify/hevc-investigation-01/). No production code, README CPU values, or qualification thresholds were changed.

## Original failures: no measured buffer starvation

[Retained analysis](../results/jspi-asyncify/hevc-investigation-01/retained-analysis.json) covers both original nine-window campaigns, including rejected windows.

| Rejected window | Total frames | Dropped | Minimum forward buffer | Maximum append latency |
| --- | ---: | ---: | ---: | ---: |
| Attempt 01, pthread, round 2 | 601 | 28 | 4.000 s | 0.35 ms |
| Attempt 02, Asyncify, round 3 | 600 | 69 | 3.993 s | 0.30 ms |

Both maintained readyState 4, with no recorded waits, recoveries, or gap skips. Drops accumulated throughout the window. Fragment-size sequences match across all 18 windows. These measurements provide no evidence of remux producer starvation; they cannot exclude unobserved browser scheduling delays.

The two unusually low accepted CPU windows in attempt 01 were approximately 6.03% pthread and 5.80% JSPI. Their renderer/GPU contributions were approximately 2.2%/2.9%, versus approximately 7–8%/12–13% in the ordinary HEVC windows. That locates most of the variation in browser rendering/GPU processes, but does not explain it. Historical power logs show Chrome video wake-lock activity and no recorded display transition in the inspected interval; they do not establish physical display visibility or occlusion.

## Instrumented Player and plain-file replay

[Harness](../tests/hevc-private-diagnostic.mjs), [raw results](../results/jspi-asyncify/hevc-investigation-01/diagnostic-01/result.json), and [hash manifest](../results/jspi-asyncify/hevc-investigation-01/diagnostic-01/manifest.json).

Order: pthread, JSPI, Asyncify, plain file, plain file, Asyncify, JSPI, pthread. Each Player arm uses the production Player from the frozen assets. Private runtime documents run without COOP/COEP. SourceBuffer capture, CDP Media events, long-task observation, and continuous video-frame callbacks are enabled.

| Arm | Windows | Dropped frames per window | Cadence |
| --- | ---: | --- | --- |
| pthread Player | 2 | 0, 0 | Both passed |
| JSPI Player | 2 | 0, 0 | Both passed |
| Asyncify Player | 2 | 0, 0 | Both passed |
| Plain video, captured MP4 | 2 | 119, 123 | Both failed |

All windows counted 600 total frames. The plain file had its full range buffered and no observed long tasks during the measured interval. Its video-frame callback counts fell by the same number of frames. Initial and final marked-picture checks passed; worker cleanup passed for all Player arms.

Chrome reported `VideoToolboxVideoDecoder` (platform decoder) and `SymphoniaAudioDecoder` for the HEVC/FLAC output. The callback `processingDuration` metric includes decoder/queue elapsed time; it is not active CPU time and does not prove hardware decoder saturation.

## Exact output and timestamp checks

The three complete captured outputs are each 4,961,412 bytes with SHA-256 `285ac0232005ac7497f9579f3cc0047e7bc692e57139cb4fa9e8f5fdb7309c86`. Thus these runtime choices produced identical compressed media and container bytes in this capture run.

[Packet analysis](../results/jspi-asyncify/hevc-investigation-01/packet-analysis.json), [source ffprobe](../results/jspi-asyncify/hevc-investigation-01/source-ffprobe.json), [capture ffprobe](../results/jspi-asyncify/hevc-investigation-01/capture-ffprobe.json):

- All 1,080 HEVC packets are preserved, with identical per-packet SHA-256 values in the same decode order.
- Every video PTS, and every comparable DTS, shifts by exactly +1.005 seconds. No backward DTS or missing/duplicate presentation interval was found; adjacent sorted PTS intervals remain 33–34 ms.
- Output audio is FLAC, beginning at the same 1.005-second timestamp as video, with regular 24 ms packet intervals. Its packet-duration sum is 35.994667 seconds.
- The Player subtracts its one-second timeline bias when reporting source time. Raw captured MP4 timestamps retain that bias. The fragmented-file duration metadata alone should not be interpreted as an extra second of source content.

These checks exclude runtime-specific output corruption in the captures. They do not fully validate every MP4 metadata field or exclude a shared mux/browser interaction.

## Plain MSE versus file replay

[Control harness](../tests/hevc-captured-replay.mjs), [raw results](../results/jspi-asyncify/hevc-investigation-01/replay-02/result.json), and [hash manifest](../results/jspi-asyncify/hevc-investigation-01/replay-02/manifest.json).

A fresh gated browser replayed exactly the same captured bytes, with no Demuxe, FFmpeg, or other workers. Order: MSE, file, file, MSE. MSE appends the full capture in one operation and seeks to the first buffered timestamp before playing; file playback uses the MP4 URL directly. This control records cadence only, without CPU sampling or marked-picture screenshots. It is not an exact reproduction of production incremental append timing.

| Window | Total frames | Dropped | Cadence |
| --- | ---: | ---: | --- |
| MSE 1 | 600 | 0 | Passed |
| File 1 | 600 | 0 | Passed |
| File 2 | 600 | 111 | Failed |
| MSE 2 | 600 | 0 | Passed |

All four windows remained focused/visible at readyState 4, with no observed long tasks during the window. The consecutive file pass/failure demonstrates variability even with identical bytes and the same browser launch. Together with the earlier file failures, it establishes that the symptom can occur outside the Demuxe/runtime code. It does not establish that the original incremental-MSE failures share that cause.

An initial [setup attempt](../results/jspi-asyncify/hevc-investigation-01/replay-01/ABORTED.md) stalled before measurement because the control omitted the initial seek across the captured timeline gap. It was aborted and retained, then corrected with an initial seek and bounded play timeout. It is excluded from the cadence results.

## Remaining qualification boundary

The original MSE cadence failures and low renderer/GPU CPU state have not yet been reproduced and explained under controlled conditions. Plain-file failure is evidence that the symptom can occur without private runtimes, not proof that every failure has the same cause. This run does not establish a general Chrome HEVC defect, a VideoToolbox defect, or a FLAC defect.

Keep HEVC CPU cells unpublished. A future qualification run must retain the existing cadence gate, exact fixture and route, frozen assets, and all rejected windows. Do not substitute the instrumented CPU values or infer a private-runtime speedup from the low historical samples.
