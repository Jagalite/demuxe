# Quick WebGPU external-texture presenter comparison

**Evidence retention:** Linked trial JSON is committed as lossless zstd archives; the [evidence index](../research-evidence-index-20260925.json) records hashes of the original and archived files. Original raw JSON remains local. Linked full Chrome traces remain local-only; the index records their paths and hashes.

2026-09-24 local time. **No repeatable CPU saving.** Replacing only Hybrid's Canvas2D presenter with WebGPU external-texture rendering removed the observed source-size shared-image allocations and Canvas2D raster passes, but did not reduce whole-Chrome CPU in three fresh matched pairs. This is a test-only result; production routing and presenter code were not changed.

## Controlled change

Both arms use the frozen realistic 1920×1080, 60 fps H.264 + 48 kHz stereo AAC file, SHA-256 `ff9eaa0edcf2984122af9b4f7fe16fdfa088c7bed2c27606f291f23e4eeb5223`, from the preceding attribution work. Canvas backing size and CSS output are 960×540. Chrome is headed `153.0.8010.53` on Apple M1. CPU windows have four seconds of warmup and approximately 20 seconds of measurement, without tracing or screenshots during the window.

- **B:** forced production Hybrid, existing Canvas2D `drawImage(VideoFrame)` presenter.
- **D:** same forced Hybrid, with `importExternalTexture(VideoFrame)`, an external-texture sampling shader, and a `GPUCanvasContext`. Each selected frame imports one external texture, creates a bind group and command encoder, submits one render pass, then follows the existing mpv acknowledgement and retained-frame lifecycle. No GPU completion wait, explicit pixel copy or readback is added.

Order is B/D, D/B, B/D, with a fresh Chrome launch for every arm. Three pairs are a quick screen, not a broad statistical qualification. Preparation clones the frozen runtime. The decoder worker, external decoder wrapper, mpv Hybrid Wasm/module, I/O worker, AudioWorklet, geometry helper and subtitle helper have matching hashes between baseline and candidate. Only the cloned presenter selection, its diagnostic label and the new presenter module differ. Source and patched hashes are recorded in [preparation.json](preparation.json) and [unchanged-runtime.json](unchanged-runtime.json).

The candidate deliberately supports this fixture's unrotated full-canvas geometry and rejects active subtitle surfaces. It does not silently claim general subtitle, HDR, rotation, crop or lifecycle support. Subtitle state is still read by the unchanged scheduler; this fixture has no selected subtitles. The adapter reports Apple / metal-3 and output format bgra8unorm.

## CPU result

Percentages are percentages of one CPU core. Columns are independently medianed; paired differences below are computed before taking medians.

| Presenter | Whole Chrome | Browser | Renderer | GPU | Audio service |
| --- | ---: | ---: | ---: | ---: | ---: |
| Canvas2D | 83.14% | 39.62% | 20.13% | 22.73% | 0.65% |
| WebGPU external texture | 83.52% | 38.86% | 23.26% | 20.70% | 0.53% |

WebGPU minus Canvas2D whole-Chrome differences: **+0.92, +0.37, −0.37 core points**. Median **+0.37 points**, or **+0.45% relative** to Canvas2D. The direction changes, so this does not establish either a whole-player benefit or a small reliable regression.

Paired renderer differences were +2.87, +3.13, +3.68 points; GPU-process differences were −1.36, −2.03, −1.45. Browser differences were −0.40, −0.87, −2.46. These are matched process observations, not isolated subsystem timers. No idle CPU or historical Native value is subtracted from these launches.

## Playback checks and limits

All six windows passed the existing **route, logical cadence, audio continuity, browser error and stable process-set gates**. Both arms remained `hybrid` / `webcodecs`. Each window acknowledged about 1,193–1,197 frames, near 60 fps; WebGPU import and queue-submit counts matched its logical draws exactly. Retained and pending peaks stayed at four and one. Missing retained frames, mpv frame drops, decoder drops, audio underruns and reported GPU validation errors were zero. Audio-consumption versus media-progress differences ranged from −34 to +4.33 ms.

Screenshots taken after measurement show correctly oriented, visible 16:9 video in both arms. They are at slightly different media instants and are qualitative checks, not pixel-equivalence or color qualification. Decoder diagnostics update asynchronously, so frame counts across window boundaries are not exact compositor-drop counts.

**Visible cadence is not fully qualified.** In the separate instrumented trace, WebGPU generated only 273 display draw/swap events versus 358 for Canvas2D, despite similar decoder output and continuing submissions. These counts are not a precise dropped-frame counter, and tracing can affect scheduling; nevertheless, they prevent treating ~60 submitted frames/s as proof of 60 distinct displayed frames/s. The raw CPU windows are useful for the quick screen, but do not prove equivalent visible throughput.

**Trace overhead audit:** both traces enabled `disabled-by-default-v8.cpu_profiler`, creating 11 `v8:ProfEvntProc` threads. Their first-to-last recorded thread CPU-clock spans sum to 3,970 ms for Canvas2D and 3,906 ms for WebGPU during approximately six seconds. These are partial clock spans rather than a complete synchronized CPU window, but demonstrate substantial profiling load. The 273-versus-358 compositor count therefore must not be presented as a demonstrated normal-playback frame-delivery defect. CPU trials did not enable tracing and remain separate from this confound. Any further timing diagnosis should omit this V8 profiling category.

**Follow-up without the V8 profiler:** the eight-second lightweight traces in [the handoff investigation](../hybrid-handoff/light-traces/summary.json.zst) record Canvas2D 474 and WebGPU 479 display draw/swap events, versus Native 482. All have zero `v8:ProfEvntProc` threads. This substantially narrows the earlier cadence concern to the intrusive diagnostic setup; it still is not a per-frame scanout audit.

## Did the suspected intermediate disappear?

Yes: the named source-size image creation and Canvas2D raster sequence disappear in the candidate's separate six-second trace.

| Trace event | Canvas2D | WebGPU external texture |
| --- | ---: | ---: |
| Decoded output callback | 364 | 366 |
| `OnCreateSharedImage`, 1920×1080 | **363** | **0** |
| `DoRasterCHROMIUM` | **362** | **0** |
| GPU deferred request | 1,944 | 1,056 |
| GPU task | 1,211 | 1,045 |
| `WebGPU` GPU command work | 0 | 1,043 |
| Display draw/swap | 358 | 273 |

The decoded-frame trace descriptors in both arms still identify `VideoToolboxVideoDecoder`, NV12, opaque shared-image storage and the same dimensions/color space. This is not a change to decoder selection.

Removing this Canvas2D sequence leaves substantial WebGPU command submission, synchronization and canvas/compositor work. The recorded GPU command-buffer flush thread spans total about 134 ms for Canvas2D and 132 ms for WebGPU in the diagnostic traces; these partial, nested trace timings are not a complete CPU budget. The trace cannot prove every internal WebGPU import is copy-free, nor assign the renderer increase to one API call.

**Interpretation:** the earlier allocation/copy mechanism is real, but eliminating it with this external-texture implementation does not recover the measured presentation tax. The no-draw result removes all visible presentation work; it was an upper bound, not a promised WebGPU saving. This quick result agrees with the earlier inconclusive external-texture prototype and does not support promoting this candidate.

## Reproduction and evidence

```sh
node experiments/hybrid-external-texture/prepare.mjs
ASSETS=build/hybrid-external-texture/assets CASE=h264-1080p60 ARMS=B,D ROUNDS=3 WARMUP=4 SECONDS=20 SCREENSHOTS=1 RESULTS=results/hybrid-external-texture/three-pairs node experiments/hybrid-presentation-matrix/run.mjs
node experiments/hybrid-external-texture/analyze.mjs
ASSETS=build/hybrid-external-texture/assets CASE=h264-1080p60 ARMS=B,D SECONDS=6 HARNESS=results/hybrid-external-texture/three-pairs/h264-1080p60-harness RESULTS=results/hybrid-external-texture/traces node experiments/hybrid-presentation-matrix/trace.mjs
TRACES=results/hybrid-external-texture/traces OUTPUT=results/hybrid-external-texture/traces/forensics.json ARMS=B,D node experiments/hybrid-presentation-matrix/inspect-saved-traces.mjs
```

Preparation requires the existing frozen matrix assets; it does not rebuild production. Use new result directories when repeating rather than overwriting evidence.

- [Raw CPU windows](three-pairs/h264-1080p60-960x540-result.json.zst), [paired analysis and counters](three-pairs/analysis.json.zst).
- [Trace summary](traces/summary.json.zst), [forensic descriptors and event counts](traces/forensics.json.zst), compressed traces [B](traces/B-trace.json.gz) / [D](traces/D-trace.json.gz).
- First-pair screenshots: [Canvas2D](three-pairs/round-1-B.png), [WebGPU](three-pairs/round-1-D.png).
- [Candidate presenter](../../experiments/hybrid-external-texture/presenter.mjs), [preparation script](../../experiments/hybrid-external-texture/prepare.mjs).

**Decision: no demonstrated CPU improvement; keep this presenter experimental.**
