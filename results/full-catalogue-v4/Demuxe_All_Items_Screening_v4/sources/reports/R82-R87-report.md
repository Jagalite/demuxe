# Demuxe media/browser frontier — R82–R87 results

**Run date:** 17 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0.  
**Scope:** media, browser primitives and alternative representations. These are not Demuxe production integrations or route-admission changes.

## Environment boundary

The managed Chromium instance blocks normal HTTPS, localhost HTTP and `file:` navigation by administrator policy. The permitted injected `about:blank` page is an opaque, non-secure context. WebCodecs (`VideoDecoder`/`VideoEncoder`), WebTransport, WebGPU and `AudioContext.audioWorklet` are therefore unavailable in this environment. No secure-context or administrator-policy bypass flags were used. MSE, MediaRecorder, VideoFrame, createImageBitmap, WebSocket and normal media-element playback are available. Headful Chromium under Xvfb exposes WebGL1 through ANGLE/SwiftShader.

Unavailable exact APIs are treated as **BLOCKED/PARTIAL**, not as evidence that the media idea fails.

## Result summary

| ID | Result | What was demonstrated |
|---|---|---|
| R82 | **INCONCLUSIVE / fallback works** | Browser-native H.264 decode → canvas → VP9 MediaRecorder → WebM → MSE works, seeks and reaches EOF. Exact WebCodecs normalization is blocked here, and the fallback showed a ~2-frame timeline offset. |
| R83 | **INCONCLUSIVE / mechanism works** | Native decode → WebGL shader → canvas capture → VP9 MediaRecorder → MSE works with no application pixel readback in the processing path. WebGPU is blocked; SwiftShader and 2–3 missed source callbacks prevent performance qualification. |
| R84 | **PROMISING** | Prepared spatial tiles are independently decodable and can reconstruct the full frame. A single 320×180 tile costs materially less software decode work than the 640×360 full frame. |
| R85 | **PROMISING, bounded concurrency** | Four independent GOPs decoded deliberately out of order can retain 30 frames each and present all 120 frames in strict reverse order using ImageBitmaps. Playing all four simultaneously missed callbacks, so unbounded concurrency is not qualified. |
| R86 | **PROMISING concept / AudioWorklet blocked** | Separate generated PCM and native video clocks can be explicitly rebased at start, seek and rate change with low-ms modeled drift. The permitted fallback used ScriptProcessor; the intended AudioWorklet path remains untested. |
| R87 | **INCONCLUSIVE transport / dependency policy works** | A reliable base + disposable enhancement representation degrades gracefully when enhancement data is dropped. WebTransport is unavailable and local WebRTC cannot gather ICE candidates, so the intended partially reliable transport remains untested. |

## R82 — Browser-side video normalization

The exact proposed WebCodecs path cannot run on the permitted page because `VideoEncoder`/`VideoDecoder` are not exposed. A fallback experiment used browser-native H.264 playback as the decoder, `canvas.captureStream()` as the frame bridge and `MediaRecorder` as the browser encoder.

Three runs produced **89–90 source frame callbacks** from a 90-frame source. Median generated size was **276,085 bytes**, versus **146,513 bytes** for the source. The generated VP9/WebM appended successfully to an MSE `SourceBuffer`, supported a seek to 1.8 s and reached EOF. Median MSE duration was **3.032 s** for the 3.000 s source.

The result is not a transparent normalizer yet. Nearest-frame comparisons usually matched the generated frame to a source frame about **2 frames earlier**, and downscaled RGB mean absolute error was roughly **4–5/255** at the sampled points. This proves a browser-only decode→encode→MSE loop, but also exposes timeline control as a first-class problem. A secure-context WebCodecs test should use explicit input/output timestamps rather than inheriting MediaRecorder's realtime clock.

## R83 — Decode → graphics processing → encode

WebGPU is unavailable in the permitted origin. A headful Xvfb run did expose WebGL1 through:

`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device ...), SwiftShader driver)`

The pilot decoded the H.264 source in a media element, uploaded each presented frame directly to a WebGL texture, ran an RGB-inversion fragment shader, captured the resulting canvas and encoded VP9 through MediaRecorder. The processing path never called `getImageData`; pixel readback was used only after encoding as an oracle.

The generated WebM was accepted by MSE and reached EOF. The final run captured **88/90** source callbacks; repeated pre-oracle runs captured **87, 87 and 88**, so this environment did not sustain a perfect frame-for-frame realtime chain. Nearest-frame transformed-output error was around **4.3–5.1/255 mean absolute RGB** in the final run.

This establishes the pipeline shape, not a GPU performance claim: SwiftShader is software, WebGPU was unavailable, MediaRecorder controls timestamps, and frame retention was imperfect.

## R84 — Spatially selective video

A 4 s, 640×360 H.264 source was represented as four independently encoded 320×180 quadrants. All four tile streams play in Chromium. At three sampled times per tile, the tile output closely matched the corresponding region of the full-frame decode; mean absolute RGB error stayed below **0.97/255** in all twelve comparisons.

Compositing all four decoded tiles back into one 640×360 canvas at 2 s produced **0.509/255 mean absolute RGB error** versus the full-frame source. The largest per-channel error was concentrated in local compression/boundary differences, so this is a near-equivalent prepared representation rather than byte/pixel identity.

Host FFmpeg software-decode medians provide a component-cost screen:

| Input | Decode CPU vs full |
|---|---:|
| top-left tile | 56.6% |
| top-right tile | 55.0% |
| bottom-left tile | 53.1% |
| bottom-right tile | 80.0% |
| average one-tile request | **61.2%** |

All four tile files together are **573,744 bytes** versus **568,338 bytes** for the full file—about 1% aggregate overhead in this fixture. The value therefore comes from requesting only the visible/needed tiles, not from storing all tiles more compactly. Per-tile byte cost varied dramatically with content complexity.

This is strong evidence for prepared spatially selective media: viewport/ROI playback can trade representation complexity for less transport and less decode work when only part of the image is needed.

## R85 — Out-of-order GOP decode and reverse presentation

The four-second source was prepared as four independent one-second closed-GOP clips. They were decoded in deliberate non-timeline order **3 → 1 → 2 → 0**. Each GOP retained exactly **30 ImageBitmaps**, including an explicit initial-frame snapshot plus presentation callbacks.

The retained frames were then drawn without further media seeking or decoding in global order **119 → 118 → ... → 0**. All **120 frame identities were unique and strictly descending**.

Independent GOP encodes remained visually close to the matching full-source regions: sampled mean absolute RGB error was 0 to about **0.57/255**.

A separate stress probe started all four GOP media elements concurrently. Callback counts were **29, 29, 27 and 27** rather than 30 each. Therefore the useful result is bounded independent-region decode plus retained reverse presentation—not a claim that arbitrarily many decoder instances can run concurrently without loss.

This opens more than reverse playback: parallel look-ahead, nonlinear editing previews, instant direction changes inside a retained GOP, and decode scheduling based on future navigation are all worth exploring.

## R86 — Native video with an independent generated-PCM clock

`AudioContext.audioWorklet` is not exposed on the permitted opaque page, so the intended AudioWorklet implementation is blocked. A ScriptProcessor fallback generated a 440 Hz PCM signal whose phase was derived from an explicit media-time mapping. Native video remained on its own media element.

The controller rebased the audio mapping after the first video frame, after a seek to 5 s, and again when playback rate changed to 1.5×. Across three runs, median absolute drift summaries were:

| Phase | median mean-abs drift | median p95/max |
|---|---:|---:|
| initial synchronized playback | **3.39 ms** | 9.51 ms |
| after seek/rebase | **1.31 ms** | 2.78 ms |
| after 1.5× rate rebase | **2.19 ms** | 4.01 ms |

This measures agreement between the two browser clocks/models, not acoustic speaker output. ScriptProcessor is only a fallback feasibility tool. Still, the result weakens the assumption that a second browser audio clock is intrinsically unusable: with explicit synchronization transactions, the modeled drift stayed in the low-millisecond range here.

The next decisive version belongs in a normal secure origin with AudioWorklet, a ring-fed decoded PCM source, output-timestamp compensation and injected stalls.

## R87 — Dependency-aware transport

The exact WebTransport experiment is blocked because `WebTransport` is not exposed in the permitted context. A WebRTC data-channel fallback was also attempted, but both peer connections completed ICE gathering with **no usable candidates** and the channel remained `connecting`.

The dependency policy was therefore tested over real browser WebSockets to a loopback server, with the server intentionally dropping selected messages. Each synthetic frame was split into a 4-bit coarse base and a 4-bit enhancement residual.

With **30% of enhancement frames dropped**:

- all **120 base frames** arrived;
- **84 frames** reconstructed exactly;
- **36 frames** reconstructed from base only;
- **0 frames** were missing;
- base-only quality was about **29.24 dB PSNR**.

Negative control: with every enhancement delivered but base frame 57 dropped, **119 frames** reconstructed exactly and **1 frame was unrecoverable**.

That establishes the media dependency rule and graceful-degradation behavior, but **not** the performance or loss behavior of WebTransport datagrams. The next environment needs actual reliable-stream + datagram transport and induced packet loss/reordering/deadlines.

## What this batch changes

The most interesting result is that R84–R86 are not merely player optimizations. They expose alternative media execution models:

1. **Spatially decomposed media** can make decode and transport proportional to the region actually needed.
2. **Compressed regions can be decoded out of timeline order**, retained, and scheduled independently of presentation direction.
3. **Video and PCM need not originate from the same browser media pipeline** if their clocks are explicitly reconciled.

R82/R83 also show that browser-native decode/graphics/encode loops are feasible with broadly exposed APIs, but MediaRecorder's realtime timestamp ownership makes it a poor oracle for exact normalization. Explicit-timestamp WebCodecs remains the much more interesting version.

R87 supports the representation idea—reliable dependencies plus disposable refinements—but the intended transport primitive was not available here.

## Evidence

- `results/summary.json` — machine-readable verdicts and headline values
- `results/qa.json` — 12 bounded evidence checks
- `results/r82_runs.json` — three normalization runs
- `results/r83_browser.json`, `results/r83_runs.json` — WebGL/MediaRecorder transform runs
- `results/r84.json` — tile decode timings, browser comparisons and composition
- `results/r85_browser.json`, `results/r85_concurrent.json` — out-of-order/reverse and concurrency probe
- `results/r86_runs.json` — three audio/video clock runs
- `results/r87_browser.json`, `results/r87_webrtc_probe.json` — dependency simulation and transport blockers
- `FIXTURES.sha256` — generated media hashes