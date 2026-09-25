# Isolated device-local ProRes presentation proof

**Historical correctness milestone.** The later [real-packet CPU investigation](../prores-real-packet-webgpu/ATTRIBUTION.md) found ProRes WebGPU performance-negative; production registration remains deferred. The results below remain a correctness oracle, not a current optimization recommendation.

This proof keeps the validated FFmpeg 9.0.2 10-bit 4:2:2 ProRes reconstruction
and Demuxe's `WebGPUPresenter` in **one browser worker and one WebGPU device**.
It adds a dormant `planar-u32` buffer-backed input to the existing presenter.
The presenter reads the decoded Y/U/V storage buffer in its fragment shader,
performs range expansion and YUV-to-display conversion on GPU, and renders
to the canvas. It does not create intermediate YUV textures, copy decoded
pixels to the CPU, or create CPU RGB pixels in the presentation path. The
existing texture-view presenter path and production routing are unchanged.

## Display validation

Frames 0, 90, and 179 from the 640×360 fixture and frame 0 from the 642×360
fixture were decoded and displayed. Seven canvas outputs cover BT.709
limited range, a controlled BT.601 interpretation, a controlled full-range
interpretation, and a 638×352 visible crop of the 642×360 frame. The crop
starts at source (2,4), so it also checks nonzero source origin. Reconstruction
still clips the 360-line visible height and the genuine two-pixel right edge.

The displayed RGBA pixels were compared with **FFmpeg 9.0.2 libswscale**
references made from the normal FFmpeg decoder's exact YUV frames. Across all
seven outputs, mean absolute RGB channel error was **0.409–0.862** eight-bit
levels, P99 error **2–3**, maximum **4**, and alpha matched exactly. The
acceptance gate is mean ≤1, P99 ≤3, maximum ≤4 for every output. RGB bytes
do not match exactly because the presenter uses floating-point coefficients
and canvas quantization while swscale uses its own fixed-point conversion.
The validated decoder's Y/U/V samples remain exact 10-bit values in `u32`
storage until the fragment shader reads them; the preferred canvas format is
8-bit BGRA. Validation-only canvas readback occurs **after** the batch's GPU
completion wait.

The original ProRes fixtures have limited range but unspecified matrix,
primaries, transfer, and chroma location in FFmpeg 9.0.2. `prepare.py` creates
a **metadata-only BT.709 companion** of the 642×360 fixture by changing its
ProRes matrix header. FFmpeg reports BT.709/limited for that companion; its
482,816 captured coefficients and entire decoded YUV frame match the original
exactly. The partial-width display cases derive their matrix/range from this
probed metadata. BT.601 and full-range displays are deliberately controlled
interpretations of the same decoded YUV data, compared with references
configured the same way. This proof does not qualify unspecified transfer or
primaries handling, HDR output, or other chroma siting conventions.

The first display comparison exposed a concrete chroma-sampling mismatch:
linear chroma filtering produced errors up to 121 levels against FFmpeg's
4:2:2 RGBA reference. The new buffer-backed path now holds each chroma sample
across its pair of luma pixels, reducing the maximum to four. The existing
texture-view path retains its current filtering.

## Ownership, ordering, and copies

The experiment's retained-frame pool has capacity two. It rejected a third
frame while both surfaces were held, rejected a closed frame as stale, reused
each released buffer for a later PTS, and ignored duplicate closes after
reuse. Earlier canvases still matched their references after the same buffers
were reused. Decoder clear/compute and presenter draws were submitted to the
same queue in order. There were **zero per-frame GPU completion waits** and
one explicit wait after the complete batch of four decodes and seven draws.
After validation, both retained frames were released and destruction removed
the two surface buffers from runtime accounting.

The pool allocated **two 1,848,960 B planar buffers**, or **3,697,920 B**.
Peak tracked runtime buffers were **4,668,784 B**, including coefficient and
metadata inputs and presenter uniforms. Seven canvas outputs account for an
additional **6,430,784 B** at one RGBA8 image each; actual browser swapchain
and driver allocations are opaque. The four decodes uploaded **3,807,904 B**
in 16 `queue.writeBuffer` calls. Presentation required **zero GPU-to-GPU
conversion copies and zero video readbacks**. Seven RGBA canvas readbacks,
covering 6,430,784 B, occurred only in validation.

## Timings and limits

One Chrome 153.0.8010.53 / Apple Metal 3 run, for the whole four-decode,
seven-draw batch:

| Measure | Wall time |
| --- | ---: |
| CPU coefficient repacking | 1.580 ms |
| Decode input upload and command submission on CPU | 2.020 ms |
| Presenter command submission on CPU | 0.720 ms |
| Combined GPU completion wait after final submission | 17.040 ms |
| Decode-to-present batch wall through completion | 21.630 ms |
| Validation-only canvas readback and comparison | 44.390 ms |

The completion wait is a browser wall measurement, **not** a GPU shader
timestamp; it includes queued work and scheduling. The batch uses prepared
coefficients and separate canvases to retain each displayed result. It does
not measure packet parsing, entropy decode, mpv frame selection, continuous
frame pacing, or a production canvas workload. First-use pipeline compilation
can materially change timings. [result.json](result.json) retains per-decode
and per-draw CPU times, hashes, memory counts, color probes, and every display
comparison.

## Recommendation

**Decode to presentation remains entirely GPU-resident.** There is no
buffer-to-texture conversion or synchronous per-frame completion wait to
remove from this path. The minimal next experiment is a bounded worker loop
that consumes real ProRes packets through the existing parser/entropy seam,
retains decoded surfaces by PTS/generation, lets mpv select the frame, and
submits device-local presentation on the same queue. Measure sustained
correctness and pacing before any route registration. Continuous playback is
not implemented or qualified here.

Run `node experiments/prores-presentation-webgpu/run.mjs` from the repository
root. Large generated coefficient, RGB-reference, and metadata-only fixture
assets remain under ignored `build/`.
