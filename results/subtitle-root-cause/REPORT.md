# Native A/V + mpv subtitle CPU attribution (2026-09-23)

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local. Linked full Chrome traces remain local-only; the index records their paths and hashes.

## Qualification

Chrome 153.0.8010.53, 960×540 player, 3 s warmup, 12 s requested steady window (about 14.4 s sampled), fresh Chrome per trial with one persistent profile per series, alternating subtitle-off/on order. CPU is summed CDP Chrome-process CPU time divided by wall time; 100% is one logical core. The same fixture bytes, route, profile, video-frame, audio-byte, drop-frame, and visible-static-cue gates apply within each pair. Other Playwright Chromes/builds were excluded at every sample and a test-only exclusivity guard rejected interrupted trials. Two external benchmark executors were temporarily paused for the measurement block and resumed afterward.

**Limit:** macOS `ANECompilerService` was observed consuming about one core and had been running about 44 minutes when discovered. The host therefore cannot be certified fully uncontended. Browser-process CPU also drifted substantially between fresh runs. These data support a repeatable renderer-process increase but do **not** establish a precise whole-Chrome saving from a production change. Rejected trials, including dropped-frame runs, remain in the raw JSON.

The selected route was `native-direct-mpv`: browser owns video/audio, mpv owns subtitles, browser plus subtitle service own their respective demux, and the mpv service reports zero A/V chains. There were one subtitle worker, one I/O worker, four Wasm pthread workers, and a 64 MiB Wasm heap. Steady SRT requests were about 60/s with zero changed bitmaps and zero bitmap bytes. Subtitle source reads/seeks did not rise during steady playback. The checkout advanced from `15193773` to its documentation-only descendant `1c97db3f` during the campaign; the production subtitle code was not edited.

## Process ownership

Three accepted SRT 60 Hz pairs in [raw results](20260923-srt-60hz-exclusive/result.json.zst) gave the following pair means, in logical-core CPU percentage points:

| Process/type | Off | On | Paired delta |
|---|---:|---:|---:|
| All Chrome processes | 33.52 | 38.27 | +4.76 (individual deltas −6.35, +3.85, +16.78) |
| Renderer processes | 3.86 | 10.75 | +6.89 (+5.74 to +8.10) |
| Browser process | 26.17 | 23.03 | −3.14 (−14.08 to +7.33) |
| GPU process | 2.76 | 3.73 | +0.97 |
| Audio/network/storage utilities | 0.72 | 0.76 | +0.04 |

Six further host-gated accepted SRT 60 Hz pairs in [series 1](20260923-clean-srt-02/result.json.zst) and [series 2](20260923-clean-srt-retry/result.json.zst) had positive renderer deltas (+3.00 to +9.60), making nine of nine accepted SRT renderer comparisons positive. Whole-Chrome deltas crossed zero.

Darwin renderer thread CPU snapshots in [full-service runs](20260923-srt-thread-full/result.json.zst) put the mean paired increase on `CrRendererMain` (+2.20), `Compositor` (+0.94), and the six `DedicatedWorker thread` threads combined (+3.06). The worker-thread increase cannot be assigned precisely to the subtitle worker, I/O worker, and four pthreads with the available mapping. The same sampling found worker +1.01 in [RPC-only](20260923-srt-thread-rpc-only/result.json.zst), worker about zero in [host-only](20260923-srt-thread-host-only/result.json.zst), worker +0.40 in [postMessage with no reply](20260923-srt-post_without_reply-final/result.json.zst), and worker +2.61 in the accepted [mpv without output](20260923-srt-thread-mpv-no-output/result.json.zst) pair.

## Causal controls

The table shows **paired on-minus-off CPU deltas**, averaged over accepted pairs (except single-pair rows). `Worker` is the sampled `DedicatedWorker thread` delta where available. The `mpv render RPCs/s` column counts host requests which enter the mpv worker path, not actual C function entries; the worker can retry `_subtitle_service_render` inside one RPC, and its iteration count was not captured. Single-pair rows are directional screens only.

| SRT variant | Pairs | Whole Chrome Δ | Renderer Δ | Worker Δ | GPU Δ | Requests/s | mpv render RPCs/s | Changed bitmaps/s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Full 60 Hz | 3 | +4.76 | +6.89 | +3.06* | +0.97 | 60.05 | 60.05 | 0 |
| Full 30 Hz | 1 | −1.76 | +4.06 | — | +0.77 | 28.21 | 28.21 | 0 |
| Full 15 Hz | 1 | +4.49 | +1.32 | — | −0.74 | 14.44 | 14.44 | 0 |
| Full 10 Hz | 3 | −1.50 | +0.76 | — | −0.43 | 9.85 | 9.85 | 0 |
| Full 5 Hz | 1 | −0.47 | +1.17 | — | +0.22 | 4.93 | 4.93 | 0 |
| Full 1 Hz | 1 | −3.09 | +1.21 | — | +0.32 | 1.03 | 1.03 | 1.03 |
| Static attached canvas, no callbacks | 1 | −2.79 | −0.51 | — | −0.36 | 0 | 0 | 0 |
| 60 Hz callback only | 2 | +4.21 | +2.80 | — | +0.91 | 0 | 0 | 0 |
| 60 Hz host tick, no worker message | 3 | +5.59 | +4.06 | ~0* | +1.56 | 60.01 | 0 | 0 |
| 60 Hz postMessage, no reply | 2 | −0.43 | +2.70 | +0.40 | +0.21 | 60.09 | 0 | 0 |
| 60 Hz worker RPC, immediate reply | 3 | +4.89 | +3.10 | +1.01* | −0.08 | 59.99 | 0 | 0 |
| 60 Hz mpv call, output suppressed | 3 | +9.03 | +7.33 | +2.61* | +0.99 | 60.01 | 60.01 | 0 |
| 60 Hz full service, canvas detached | 1 | −7.17 | +7.15 | — | +0.60 | 60.17 | 60.17 | 0 |

`*` Worker figures come from separate thread-sampled pairs of the same variant, rather than the CPU pairs in the row. See [60 Hz](20260923-srt-60hz-exclusive/result.json.zst), [10 Hz](20260923-srt-10hz-exclusive/result.json.zst), [cadence sweep](20260923-srt-sweep-30hz/result.json.zst), [callback-only](20260923-srt-callback-only-exclusive/result.json.zst), [host-only](20260923-srt-host-only-exclusive/result.json.zst), [RPC-only](20260923-srt-rpc-only-exclusive/result.json.zst), [mpv without output](20260923-srt-mpv-no-output-exclusive-02/result.json.zst), and [canvas detached](20260923-srt-host_detached-final/result.json.zst). At 1 Hz the worker returned one visually identical replacement bitmap per request, so that row does not represent a zero-upload state. The naive [invalidation-only run](20260923-srt-sweep-invalidation/result.json.zst) failed because it never painted the first cue and is excluded.

The existing Chrome [off](20260923-trace-srt-off/trace.json.gz), [60 Hz](20260923-trace-srt-on60/trace.json.gz), and [10 Hz](20260923-trace-srt-on10/trace.json.gz) traces show approximately 720 message-handling and style/layout scheduling events over six seconds at 60 Hz, and approximately 120 at 10 Hz. Trace collection inflated CPU and is used only for event attribution.

## Format check

Accepted full-service renderer deltas: SRT 9/9 positive; [ASS](20260923-clean-ass-04/result.json.zst) +2.57/+4.58 in its latest two pairs (four accepted across the clean series); [VobSub](20260923-clean-vobsub-03/result.json.zst) +7.26/+6.83/+4.81; [mov_text](20260923-movtext-clean-control/result.json.zst) +5.68/+5.29/+7.41 in three new pairs. The [ASS RPC-only control](20260923-ass-rpc-control/result.json.zst) gave +4.57/+4.23 renderer points; the one accepted [VobSub RPC-only pair](20260923-vobsub-rpc-control/result.json.zst) gave +4.00. A second VobSub on trial was rejected for 83 dropped frames. The previous mov_text near-zero whole-Chrome observation did not reproduce; new 60 Hz whole-Chrome deltas were +23.38/+16.24/+22.07, driven substantially by the browser process. At [10 Hz](20260923-movtext-10hz-thread/result.json.zst), its renderer deltas were +2.02/+1.42, while browser deltas remained variable (+7.92/+1.80). The browser delta was concentrated on a Chrome `ThreadPoolBackgroundWorker`, but its task is not identified.

## Conclusion and work boundary

The repeatable **renderer** increase arises from the always-running host callback and geometry/style path, host↔worker RPC/response dispatch, and additional worker-side mpv block/render activity. It occurs with no changed output, no steady subtitle source I/O, and zero mpv A/V chains. A static canvas alone is insufficient, and removing the canvas while the service runs leaves the renderer increase. The exact share of Wasm pthread wakeups versus the subtitle worker and mpv locking is unresolved; the measured worker-thread aggregate cannot identify each worker. Browser-process CPU drift, including a mov_text-specific rise in this series, prevents a reliable whole-player saving claim.

The smallest plausible production target is to avoid unnecessary steady render requests and accompanying host work when no subtitle output can change, while preserving mpv as the subtitle engine. Test-only 60→10 Hz SRT reduced the **renderer** delta from +6.89 to +0.76 points in separate matched series, but no repeatable whole-Chrome improvement was established. The 10 Hz static-cue result does not qualify cue boundaries, animated ASS, rapid bitmap events, seeks, pause/resume, resize, visibility, source replacement, or teardown. Do not productionize this scheduler from these data.

`requestVideoFrameCallback`, video-time-change scheduling, and dynamic-cue correctness sweeps were not completed after the host-contamination finding. Actual `_subtitle_service_render` entry count, per-pthread wake counts, and browser `ThreadPoolBackgroundWorker` task identity also remain unmeasured. These are explicit limits on the mechanism and any production estimate.

Do not spend production effort on BGRA conversion, cropped bitmap transport, text extraction removal, or geometry caching based on this campaign: accepted steady windows had zero bitmap bytes, earlier text extraction was at most about 21 ms/8 s, overlay reading below 2 ms, and cached-geometry test variants did not isolate a compelling whole-player saving. No production subtitle code was changed.
