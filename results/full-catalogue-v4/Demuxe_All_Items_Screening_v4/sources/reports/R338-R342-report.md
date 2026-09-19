# Demuxe — R338–R342 executed research results

**19 September 2026 · Exact proposal definitions recovered · 5 cards · 4 decisive passes + 1 blocked gate · no production source changes**

**Demuxe baseline:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`  
**Proposal provenance:** `/Demuxe/Demuxe_R338_R342_Proposals.md`  
**Environment:** FFmpeg 7.1.5, FLAC 1.5.0, Chromium 144.0.7559.96, Python 3.13.5, Node 22.16.0, GCC 14.2.0 on x86-64 Linux.

## Decision summary

| ID | Verdict | Decisive result |
|---|---|---|
| R338 | **BLOCKED — decisive allocator test not executable** | Installed MJPEG decoder advertises `dr1`, but this container lacks libavcodec development headers/pkg-config metadata needed to build a real `get_buffer2` callback. No layout simulation is promoted as proof. |
| R339 | **PROMISING COMPONENT; GPU/SIMD integration untested** | Exact rational composition passes all siting/crop impulse gates. 2D float max error 1.33e-15; final RGB max error 2.22e-15. CPU sparse prototype: 1.883 → 0.161 ms (11.7×), eliminating 1.76 MiB intermediate. |
| R340 | **PROMISING / STRONG, PROFILE-LIMITED** | 32 fixed-order-1 FLAC frames edited by warm-up only; every residual byte unchanged; decoded PCM exactly `source + 300`; browser plays candidate. Native patch: 1.374 ms vs 65.622 ms decode/edit/re-encode (47.7×). |
| R341 | **PROMISING BOUNDED APPROXIMATION** | For `a=.999`, error budget `1e-6` certifies 13,809 samples (287.7 ms at 48 kHz); worst observed error remains below certificate. Replay is 3.3× faster than fixed 1 s and 8.5× faster than BOF in this workload. Near-unit `a=.99999` needs 28.8 s and is an adverse/reject case. |
| R342 | **PROMISING / STRONG FOR SPECIFIED OPERATOR** | 24 edits of 16 samples in a 1,000,000-sample signal recompute only 0.1039% of start positions per interior edit. Peaks, gains and output equal full monotonic-deque rerenders exactly. Including index construction: 5.431 vs 382.200 ms (70.4×). |

**Executed QA:** 41/41 checks passed. R338 remains explicitly blocked; “41/41” means the executed assertions and blocker/audit conditions are internally consistent, not that R338 was qualified.

## R338 — Decode into the layout the next stage already needs

The mandatory first gate was attempted rather than replaced by a neighboring mechanism. `ffmpeg -h decoder=mjpeg` reports **General capabilities: dr1**, so a suitable independent-picture decoder primitive exists in the installed runtime. However, the execution image contains `libavcodec.so.61` without the matching public development headers or pkg-config package. That means a safe test program cannot install a real `AVCodecContext.get_buffer2` callback and inspect ownership/stride behavior against the installed ABI.

The card is therefore **BLOCKED**, not failed. A synthetic “decoder writes into a padded array” benchmark would only prove an array-copy fact and would not prove FFmpeg direct rendering, so it was deliberately not substituted. No performance number is assigned to R338. The next valid run needs matching FFmpeg headers/library ABI and should compare default allocation + current uploader, default allocation + stride-aware uploader, and custom consumer-shaped allocation + the same uploader. If the stride-aware uploader already removes the repack, R338 should be rejected as unnecessary.

Evidence: `results/r338.json`, `results/r338_mjpeg_decoder_help.txt`.

## R339 — Collapse chroma expansion and final resizing into one filter

The mathematical gate was tested first with exact `Fraction` arithmetic. A stored chroma row was expanded onto the source-luma grid and then resized; the composite matrix `K = D U` was compared against the two-stage path for six combinations of chroma siting and fractional crop. Every source impulse and deterministic input matched exactly. Composite rows required at most three source taps in this linear-interpolation profile.

The 2D floating-point pilot used a 320×180 stored chroma plane, expansion to 640×360, and final 426×240 output. The direct composed separable kernel matched the two-stage plane to **1.332e-15 max absolute error**; applying the same fixed YCbCr-like color matrix yielded **2.220e-15** max RGB error. The two-stage path materialized a 1.76 MiB float64 intermediate. Median CPU time was **1.883 ms → 0.161 ms (11.7×)**.

Kernel construction took **11.776 ms**, giving a measured break-even of about **6.8 frames** for this fixed geometry. That matters for resize/crop churn. A negative control inserted clipping between U and D; the direct composition then differed by 2.811, correctly demonstrating that nonlinear/intermediate-quantized pipelines cannot be collapsed under this proof.

This is a CPU sparse-matrix component result. No GPU or production SIMD implementation was executed, and no claim is made for arbitrary scaler kernels, gamma changes, dithering, or opaque browser-decoder output.

Evidence: `results/r339.json`, `scripts/r339.py`.

## R340 — Edit an entire FLAC block by changing only its warm-up samples

A deterministic 3 s mono 48 kHz S16 fixture was encoded with FFmpeg's FLAC encoder forced to **fixed predictor order 1**. `flac -a` reports **32/32 frames** as `type=FIXED order=1`.

The candidate adds integer +300 to each frame's one warm-up sample, leaves every residual byte untouched, rebuilds each frame CRC16, and sets STREAMINFO MD5 to the format-defined unknown value rather than falsely retaining the source decoded-audio hash. Decoding the candidate produces **144,000/144,000 samples exactly equal to `source + 300`**. Candidate size remains **192,607 bytes**, identical to source. `flac -t` accepts the frame CRCs (with the expected warning that the stream MD5 is unset).

The important negative control chooses offset **24,768**: every frame warm-up still fits S16, but at least one interior reconstructed sample would exceed range. Admission rejects it. This demonstrates why validating only the modified warm-ups is insufficient.

A small native C patcher performs a linear frame scan, validates header CRC8 for candidate frames, changes warm-ups, and recomputes CRC16. Complete read/patch/write median was **1.374 ms**. A one-process FFmpeg decode + exact +300 edit + FLAC re-encode under the same forced predictor profile took **65.622 ms**, a **47.7×** lab difference. The original Python CRC reference is intentionally retained in raw evidence and is much slower; it is not the performance result.

Chromium `decodeAudioData` accepts the edited file and returns 3.0 s of audio (resampled by the local AudioContext to 44.1 kHz). A blob-backed `<audio>` element also reports 3.0 s, reaches readyState 4, and advances to **0.303 s** during the playback probe.

Scope is deliberately narrow: mono S16, fixed predictor order 1, constant integer correction, no wasted bits/stereo decorrelation. Order-2 linear-trend editing remains untested.

Evidence: `results/r340.json`, `results/r340_browser.json`, `fixtures/r340*.flac`, `scripts/r340.py`, `scripts/r340_patch.c`.

## R341 — Derive audio-effect preroll from a guaranteed error budget

The executed profile is the proposed first-order filter `y[n] = a y[n-1] + (1-a)x[n]` with bounded `|x| <= 1`. The reset-versus-continuous state error is bounded by `a^N E`. The implementation adds a conservative double-precision rounding allowance `4u/(1-a)` rather than presenting the ideal-arithmetic result as a finite-precision certificate.

Three cases passed over complete post-seek suffixes:

| a | Error budget | Certified preroll | 48 kHz time | Worst observed error |
|---:|---:|---:|---:|---:|
| 0.9 | 1.0e-08 | 175 | 3.65 ms | 1.877e-09 |
| 0.99 | 1.0e-07 | 1,604 | 33.42 ms | 6.747e-09 |
| 0.999 | 1.0e-06 | 13,809 | 287.69 ms | 9.945e-07 |


A Decimal high-precision adversarial replay gives error **9.945e-07**, below the **9.996e-07** certificate. In the `a=.999`, `1e-6` workload, certified replay took **6.013 ms**, versus **19.899 ms** for a fixed one-second warm-up and **50.831 ms** replaying from the beginning.

The method correctly becomes unattractive for a pole very near unity: `a=.99999`, `1e-6` needs **1,381,549 samples / 28.78 s**. That is a rejection/fallback case, not a success to hide.

This is **bounded approximation**, not exact state restoration and not a claim about arbitrary browser DSP, nonlinear effects, coefficient automation, or second-order sections.

Evidence: `results/r341.json`, `scripts/r341.py`.

## R342 — Recompute lookahead gain only where an edit can affect it

The tested operator is exactly the proposal's finite-window sample peak and gain rule, with zero end padding equivalent to truncating the final window. The full reference uses a monotonic deque. The incremental implementation maintains a dynamic max segment tree and, for an edit `[a,b)`, recomputes starts only in `[a-W+1,b)` clipped to the timeline.

Adversarial cases passed exactly: lowering the unique maximum, tied maxima, inserting a louder sample, sign-only edits, beginning and end boundaries, silence, and `W=1`. The long sequential run then applied **24 edits** of **16 samples** to a **1,000,000-sample** signal with `W=1024`. Each interior edit affects **1,039 start positions (0.1039%)**.

After all edits, cached peaks, gains, and output samples are exactly equal to a complete full recomputation. Segment-tree construction took **5.060 ms**; all incremental edits took **0.372 ms**. Including the index build, the candidate cost **5.431 ms** versus **382.200 ms**, or **70.4×** in this sparse-edit workload.

This does not qualify FFmpeg `alimiter` or any limiter with recursive release/attack state. It qualifies only the explicitly specified finite-window operator/envelope stage.

Evidence: `results/r342.json`, `scripts/r342.cpp`.

## Interpretation and implementation order

- **R340** has the sharpest source-preserving construction result and a large native preparation delta, but source eligibility and headroom/integrity policy are narrow gates.
- **R339** is mathematically clean and fast in the CPU pilot; the next meaningful step is a real SIMD/GPU implementation under fixed siting/color semantics.
- **R342** is a strong exact incremental-edit result for the stated operator and is especially attractive for cached interactive previews.
- **R341** is useful only when approximation is explicitly permitted and the certificate is shorter/cheaper than checkpoint restoration.
- **R338** must be rerun in an environment with matching libavcodec development headers. It has no qualified performance result from this pass.

Host/component speedups are not whole-Demuxe or Wasm/browser CPU predictions. No automatic playback route should change on the basis of these results alone.