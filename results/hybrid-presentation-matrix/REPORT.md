# Hybrid presentation: forensic explanation of the measured gap

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local.

2026-09-24. Investigation uses existing accepted CPU windows, saved Chrome traces, Demuxe's frozen runtime, and Chromium source matching Chrome **153.0.8010.53**. The user stopped the matrix and requested investigation instead of further extensive testing. No new benchmark results are claimed after that instruction. Production routing and presentation code were not changed.

**Later authorized quick test:** the [external-texture presenter comparison](../hybrid-external-texture/REPORT.md) removed the source-size allocation/raster sequence but did not reduce whole-Chrome CPU in three pairs (+0.37 core-point median). This confirms the extra Canvas2D path exists, while showing that removing it does not by itself recover the no-draw bound. The candidate also had fewer compositor draws in its diagnostic trace, so visible throughput is not fully qualified.

## Finding

**PRESENTATION/COMPOSITOR IS THE MAIN GAP** on the measured H.264 workload. We can now identify a concrete extra path: Chromium's `drawImage(VideoFrame)` implementation creates a temporary `PaintCanvasVideoRenderer`, allocates a source-size RGB shared image, copies/converts the decoded NV12 image into it, and then rasterizes that image into the destination canvas. Native video supplies its decoded shared image to the video compositor without this Canvas2D intermediate.

This is stronger than the earlier observation that drawing activates GPU work. The existing visible Hybrid trace contains **362 allocations at 1920×1080 and 362 raster passes in approximately six seconds**. Native and Hybrid no-draw contain zero of those allocation/raster events. Source code explains why the intermediate is full video size even with a 960×540 canvas, and why its cache is not reused across successive WebCodecs draw calls.

It does **not** establish that allocating the image alone consumes all 24.46 core points. The measured subtraction covers the entire added path: image allocation, GPU copy/conversion, synchronization, raster submission, canvas publication, and composition. The saved traces do not provide an exhaustive additive CPU budget for these pieces.

## Accepted measurements

CPU percentages use one core as 100%. Arm entries are independent medians; differences are medians of within-round subtractions, so subtracting the displayed medians need not reproduce the difference columns.

| Fixture / campaign | Native | Hybrid visible | Hybrid no-draw | Total Hybrid tax | Presentation-associated B−C | Residual C−A |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| H.264 720p30, current matrix, 5 accepted rounds | 42.60% | 69.44% | 50.84% | +25.44 pp | +19.04 pp | +5.09 pp |
| H.264 1080p60, prior frozen-fixture attribution, 5 accepted rounds | 54.77% | 84.96% | 61.20% | +31.12 pp | +24.46 pp | +6.15 pp |

Both campaigns used identical video **and AAC** bytes within their respective A/B/C comparisons, Chrome 153.0.8010.53, a 960×540 output, fresh counterbalanced launches, four-second warmup, and approximately 20-second CPU windows. The cases were collected at different times; their difference is not a paired resolution/fps experiment. Resolution and cadence also change together. The results show the cost at both workloads, but cannot quantify a resolution or frame-rate slope.

| H.264 720p30 arm | Whole Chrome | Browser | Renderer | GPU | Audio service |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native | 42.60% | 27.12% | 4.88% | 9.39% | 0.90% |
| Hybrid visible | 69.44% | 36.44% | 17.70% | 14.79% | 0.71% |
| Hybrid no-draw | 50.84% | 29.07% | 17.14% | 2.80% | 0.77% |

For 720p30, B−C was +17.16 to +21.74 points in all five pairs; B−A was +23.78 to +34.88. Median paired B−A was +57.8% **relative** to Native, distinct from +25.44 **absolute core points**. Native launch variation affected total/residual differences more than B−C. Five same-direction pairs have exact two-sided sign-test p=0.0625; the stable direction is descriptive replication, not a conventional p<0.05 population claim.

The 1080p30 matrix was interrupted by the user, including the attempted restart. Its browser-closed errors are not evidence of a playback defect. Preserve the incomplete raw records, exclude them from CPU comparisons, and do not interpret a leftover `running` record as an active experiment. HEVC, AV1 and output-size cases have route preflights but no accepted complete CPU comparisons in this matrix.

## Decoder evidence corrected

The earlier report said the actual WebCodecs decoder was unexposed. That missed the **arguments** of `MojoVideoDecoder::OnVideoFrameDecoded` in the saved traces. Every sampled output in A, B and C describes the same frame properties:

- NV12, opaque storage, 1920×1080 coded and visible dimensions.
- BT.709 primaries/matrix, BT709_APPLE transfer, limited range.
- A multiplanar shared image with raster/display/scanout access and the explicit producer label `VideoToolboxVideoDecoder`.

Counts are 364 Native, 360 Hybrid visible, and 362 no-draw decoded callbacks. The normalized descriptor is identical across all three arms. This establishes **the same named decoder implementation and shared-image storage class** for these H.264 traces. It is not an inference from `isConfigSupported()` or GPU-process CPU.

Chromium's corresponding `VideoToolboxFrameConverter` creates an IOSurface-backed shared image with that exact label. Its H.264 accelerator disallows platform software decode on non-x86 builds, and the decompression session requires hardware when software is disallowed. On this Apple M1 host, the source supports a hardware-decoding interpretation. A direct per-session VideoToolbox hardware-use property was not captured, so this last step is a source-based inference, not a newly observed session flag. No equivalent claim is made for the unfinished HEVC/AV1 cases.

## Exact extra work

1. **Demuxe calls Canvas2D once per selected frame.** `web/retained-video.js:15` saves the context, fills the output black, applies placement/rotation, calls `drawImage(frame, ...)`, and restores the context. `web/filter-retained-engine-worker.js` uses a worker-owned OffscreenCanvas with `getContext('2d', {alpha:false})`. It does not resize the canvas each frame. Retained mode transfers the `VideoFrame` ownership with `postMessage(..., [frame])`; it does not call `VideoFrame.copyTo()` for these frames. The no-draw arm retains decode, transfer, selection, release and acknowledgement.
2. **Blink chooses the shared-image VideoFrame drawing branch.** `Canvas2DRecorderContext::drawImage` only takes the separate CPU-frame upload/scaling branch when the frame lacks a shared image. Our recorded frames have one. Drawing proceeds through `DrawVideoFrameIntoCanvas`.
3. **Each call constructs a temporary renderer.** `DrawVideoFrameIntoCanvas` declares `PaintCanvasVideoRenderer` as a local object. It cannot retain that renderer's cache across successive calls. This is Chromium behavior reached by the current Demuxe presenter, not a Demuxe frame-queue leak.
4. **The renderer creates an RGB intermediate at coded size.** `UpdateLastImage` constructs `VideoTextureBacking` with `video_frame->coded_size()` and a single-plane 32-bit RGB format, then invokes `CopyVideoFrameToSharedImage(..., use_visible_rect=false)`. For this source, that is 1920×1080 regardless of canvas size. `CopySharedImage` accesses the NV12 source and RGB destination with synchronization; the GPU helper renders the source into the destination. This includes YUV-to-RGB representation conversion. There is no evidence here of a CPU pixel readback.
5. **The intermediate is rasterized into the canvas and published.** The trace shows the raster command sequence, flushes, GPU scheduling and subsequent display submissions. Canvas presentation adds a render target and work before the final compositor. Both Native and visible Hybrid still reach Core Animation; this is not evidence that Hybrid loses all overlay support.
6. **Native takes a different resource path.** Native trace events contain `VideoFrameSubmitter::SubmitFrame` and `VideoResourceUpdater::CreateForHardwareFrame`. In matching Chromium source, the latter supplies the existing shared image as a video resource unless `copy_required` is set. The Native trace lacks the new-image/raster sequence found in Hybrid. Native still pays for presenting video; it avoids the observed Canvas2D intermediate.

The 1920×1080 32-bit intermediate represents about 8.29 MB per frame, or 498 MB/s of nominal image payload at 60 fps. This is a size calculation, **not measured memory traffic, CPU copying or an allocation-bandwidth result**. It explains why canvas pixel count alone need not predict this path's cost: the source-size stage precedes destination scaling. Its CPU cost also includes per-frame commands, image lifecycle and synchronization, not just pixel arithmetic.

## Saved-trace checks

Diagnostic event counts from the original approximately six-second traces; tracing was not active in the CPU trials.

| Event | Native | Hybrid visible | Hybrid no-draw |
| --- | ---: | ---: | ---: |
| Decoded callback | 364 | 360 | 362 |
| Decoder frame release | 362 | 363 | 363 |
| Source-size shared-image creation | 0 | **362** | 0 |
| Canvas raster | 0 | **362** | 0 |
| Raster end/flush | 0 | **362** | 0 |
| GPU deferred request | 29 | **1,922** | 12 |
| GPU task | 0 | **1,188** | 0 |
| Native video-frame submission | **362** | 0 | 0 |
| Display draw/swap | 362 | 358 | 0 |

The traces also contain thread-duration fields. They are partial, nested and instrumentation-dependent: the 362 shared-image creation spans total about 42.6 ms of recorded thread time, far short of the full measured B−C CPU difference. Do not label image allocation itself as a measured 24-point cost, sum nested spans, or convert GPU-process CPU into GPU execution time. No pixel-readback events occur in the recorded categories; their absence and the source branch support a GPU copy/raster explanation, but are not an exhaustive proof against every internal driver operation.

## What is and is not attributed

| Region | Evidence and remaining limit |
| --- | --- |
| WebCodecs/backend | Same named VideoToolbox backend and NV12 shared-image descriptors across A/B/C. A software-decoder switch does not explain the observed presentation subtraction. Decode throughput persists in no-draw. |
| Compressed packets/decoder worker | Preserved in B/C with comparable packet/frame counts; cannot explain the main B−C difference. Still part of residual Hybrid architecture. |
| mpv scheduling/clock | Selection, acknowledgement and audio remain active in C. Pump counts vary with execution timing; no isolated mpv CPU timer exists. |
| Retained-frame transfer/ownership | Transfer and release persist in C; bounded queues and negligible explicit pixel-copy time. Additional browser-side image ownership arises only when drawing. |
| Canvas import/copy/raster | Concrete source-size intermediate and per-frame raster sequence identified by source plus trace. Main newly established mechanism. |
| GPU/compositor | Large matched GPU-process B−C change and extra commands. Final compositor, conversion, driver and synchronization shares are not individually isolated. |
| Polling/runtime/audio | Present in the no-draw residual; the roughly 5–6 net points are not an isolated component sum because C also removes video presentation that Native performs. |
| Browser process | Large idle baseline exists in prior controls. B−C browser changes cannot all be assigned to image conversion. No cross-launch idle subtraction is used. |

## Historical small gaps and scope

The [prior audit](../hybrid-gap/REPORT.md#prior-small-gap-audit) found that the often-cited +3.7% was Demuxe Native versus plain browser Native. The same synthetic 1080p60 campaign showed forced Hybrid about +21 core points over Native. The README dual-audio Auto row used Native while AAC was selected. Other small-fixture studies changed resolution, audio/clock ownership, windows or campaign. These are not controlled contradictions of the current gap.

The strongest explanatory variable established here is **decoded-video resource submission versus VideoFrame-to-Canvas2D materialization**. For the observed shared-image branch, source size sets the RGB intermediate size and cadence sets its invocation frequency; output size affects the later raster stage. Those dependencies follow from source, not a completed scaling benchmark. Different CPU-backed frames can take different Chrome branches, but no low-tax versus high-tax Hybrid workload pair has been established. The stopped matrix cannot decide universality, codec dependence or a numeric resolution/fps law.

This identifies a presentation target for any later optimization discussion. It does not justify a selective-audio production route: AAC has the gap already, AC-3 added no stable cost in the earlier matched experiment, and no alternative presenter was implemented or qualified here.

## Reproducible evidence

- [Offline trace inspector](../../experiments/hybrid-presentation-matrix/inspect-saved-traces.mjs), run with `node experiments/hybrid-presentation-matrix/inspect-saved-traces.mjs`; it never launches Chrome.
- [Extracted descriptors, counts, allocation dimensions and original trace hashes](saved-trace-forensics.json).
- [Exact Chromium source URLs and SHA-256 hashes](chromium-source-manifest.json), pinned to release commit `792bf6722e73a45aa9e47c163b9901bdc17f3230`.
- [720p30 raw windows](h264-720p30-five-rounds/h264-720p30-960x540-result.json.zst), [paired analysis](h264-720p30-five-rounds/analysis.json.zst), [fixture identity manifest](fixtures.json).
- [Prior 1080p60 accepted CPU evidence and trace links](../hybrid-gap/REPORT.md).
- Chromium source: [Canvas2D branch](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/third_party/blink/renderer/modules/canvas/canvas2d/canvas_2d_recorder_context.cc#L2266), [temporary renderer](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/third_party/blink/renderer/platform/graphics/video_frame_image_util.cc#L304), [intermediate allocation and copy](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/media/renderers/paint_canvas_video_renderer.cc#L1667), [GPU copy implementation](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/gpu/command_buffer/service/copy_shared_image_helper.cc#L333), [Native resource handoff](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/media/renderers/video_resource_updater.cc#L803).
- Decoder source: [IOSurface producer label](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/media/gpu/mac/video_toolbox_frame_converter.cc#L47), [H.264 architecture condition](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/media/gpu/mac/video_toolbox_h264_accelerator.cc#L231), [hardware requirement](https://github.com/chromium/chromium/blob/792bf6722e73a45aa9e47c163b9901bdc17f3230/media/gpu/mac/video_toolbox_decompression_session_manager.mm#L193).
