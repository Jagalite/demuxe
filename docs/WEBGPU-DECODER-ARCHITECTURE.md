# Dormant WebGPU video decoder architecture

No WebGPU codec is registered or selected. This is an internal video component of the existing Hybrid plan, not a public playback mode. Native, Hybrid with WebCodecs, and Software retain their current Auto order and qualification boundaries.

## External decoder bridge

`native/vd_browser.c` is Demuxe's external decoder wrapper at mpv's existing `vd_lavc` selection point. The generic weak hook is in `patches/0005-generic-external-decoder.patch`; the preceding preserved patch and the old `vd_browser` and `web_decoder_*` symbols remain compatible with existing engine builds. The mailbox's legacy offsets and ticket protocol are unchanged. Its appended codec name supports future codecs outside the WebCodecs kind list. `web_decoder_enable(1)` remains legacy copyback, `2` remains WebCodecs retained frames, and `3` is reserved for a qualified device-local GPU decoder. An engine rebuild is required before enabling `3` in a package.

mpv still demuxes, orders packets, seeks, drains, selects video PTS and presentation deadlines, and owns audio and subtitles. The external service receives copied packet bytes, keyframe flag, integer microsecond PTS and duration. On the retained path, mpv receives a 2×2 timing AVFrame; it never receives or reconstructs a GPU surface. The existing copyback replay remains available to legacy clients. A failed retained decoder requires the existing route policy to reopen in Software; it cannot replay GPU pixels into `vd_lavc` within that renderer.

`web/external-video-decoder.js` defines the worker-side lifecycle used by the maintained WebCodecs decoder worker: configure, bounded submit, drain, reset and destroy. The WebCodecs mapping preserves its support check, eight-packet credit, 32-frame output guard, watchdog, generation invalidation, close-on-stale-output and transferred `VideoFrame` ownership. The mailbox service acknowledges each request before mpv reuses its packet bytes.

## Device-local GPU path

`web/webgpu/runtime.js` owns adapter/device acquisition, device-loss invalidation, pipeline cache, role-tagged input/metadata/scratch buffer pools, bounded surface pool, retained-frame references, generation and submission sequencing, diagnostics and cleanup. `web/webgpu/codecs/adapter.js` validates the codec-specific adapter contract. An adapter reports its queued packet count, accepts packet metadata and bytes, provides frames, flushes, resets and destroys itself. It notifies the runtime when output becomes available. No codec-specific shader or bitstream assumption belongs in the shared runtime.

`web/webgpu/mailbox-service.js` implements the same ticketed operations as the WebCodecs service, but runs in the playback worker. A codec adapter and `WebGPUPresenter` use the same GPU device there. GPU textures are never sent through a worker port. A `GPUDecodedFrame` has microsecond PTS/duration, generation, an opaque device-local surface, dimensions, pixel format, color metadata and an idempotent `close()`. The playback worker's existing retained-frame map and mpv selected-PTS/deadline scheduler own that frame until it is replaced, dropped by seek/generation, or destroyed. Decoder output alone never schedules presentation.

`web/video-presenter.js` maps existing WebCodecs presentation to an internal presenter interface; `web/webgl-yuv-presenter.js` keeps the qualified Software WebGL2 implementation lazy loaded. `web/webgpu/presenter.js` accepts three device-local YUV planes, shared retained-frame geometry, color range/matrix metadata and the existing mpv subtitle snapshot. It performs YUV conversion/scaling and overlays the CPU-generated subtitle bitmap on the WebGPU canvas. It does not read decoded video back through Wasm or to the CPU. The shared GPU presenter admits planar 4:2:0, 4:2:2 and 4:4:4 descriptions with BT.601, BT.709 or BT.2020 matrices. Plane views must be `r8unorm` for 8-bit, normalized `r16float` for 10-bit, and high/low code bytes in `rg8unorm` for 12/16-bit. The latter preserves integer precision through color conversion; actual fidelity for a future codec still requires qualification.

## Routing, failures and packaging

`src/internal/webgpu-codecs.ts` is the single internal qualification registry and is empty. `src/internal/external-decoder-selection.ts`, `hybrid-preflight.js`, plan admission and `WasmPlayer` prefer an accepted WebCodecs configuration. They may choose WebGPU only when WebCodecs is rejected or has no usable configuration and this registry contains the selected codec. Unknown support keeps the WebCodecs trial. Once a codec is registered, explicit Hybrid also inspects the source for codec identity; an absent WebCodecs bitstream configuration is recorded as unsupported for that qualified codec. With an empty registry, Auto and public `PLAYBACK_MODES` remain unchanged. The public capability table contains no WebGPU route. Worker diagnostics report `decoderBackend` and dormant WebGPU availability/selection, codec, queue, retained frame, surface, buffer, pipeline, submission and device-loss counters without a performance claim.

Unavailable codecs decline before device acquisition. Device/setup rejection is marked as decoder failure so the existing diagnosed route policy can try Software. The device-loss callback invalidates generations and resources, and a runtime decoder error is reported as a WebGPU decoder failure for explicit reopen. Transport, identity, authorization and unknown non-decoder failures remain terminal.

The beta packager includes only the small shared runtime, presenter, service and registry. It reads registered module and asset paths from the registry and includes future codec files only after qualification. No ProRes/FFV1/DNxHR shader is in the standard package today.

## Adding ProRes later

1. Add a device-local adapter under `web/webgpu/codecs/prores/` implementing the adapter contract and bounded output queue. Use `runtime.acquireBuffer()` and `runtime.acquireSurface()` for reusable resources; release them on reset/destroy.
2. Add ProRes WGSL kernels under that directory and load them through `runtime.loadShader()` so missing assets stay terminal. Produce normalized planar YUV GPU surfaces with accurate bit depth, range, matrix, chroma siting, dimensions, PTS and duration. Keep surfaces on the playback worker's device.
3. After qualification, add one JSON-compatible `prores` entry to `qualifiedWebGPUCodecs` with its module, shader asset paths and device feature requirements, then rebuild the LGPL engine and package. No new public mode is needed.
4. Qualify packet parsing, frame fidelity including color/chroma, long-GOP or slice behavior as applicable, seek/EOF, audio/subtitle sync, device loss, fallback, memory bounds and matched performance. Retain negative results. Registration alone is not qualification.

No ProRes codec, decode shader or performance claim is supplied by this architecture change.
