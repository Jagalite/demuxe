# Demuxe — R358–R362 executed research batch

**Run date:** 19 September 2026  
**Baseline:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0.  
**Source cards:** exact Project artifact `Demuxe_R358_R362_Proposals.md`.  
**QA:** 33/33 assertions passed. No Demuxe production source changes.

## Decision summary

| ID | Verdict | Decisive result |
|---|---|---|
| R358 | **PROMISING COMPONENT / browser destination proven** | Header-stripping and per-unit zlib normalization recovered all 60 H.264 access units exactly; decoded frames are identical. Chromium `DecompressionStream('deflate')` reproduces the compressed unit exactly and rejects truncation. The recovered MP4 loads at 160×90, 2.0 s, readyState 4. |
| R359 | **BLOCKED — WebCodecs unavailable** | The admitted I/P AVC source itself plays as ordinary MP4, but accessible Chromium reports `VideoDecoder === undefined`; administrator policy blocks local/secure navigation. No software→browser decoder handoff is claimed. |
| R360 | **PROMISING COMPONENT** | Targets 12, 21, 30 match independent frame hashes. A tuned coalesced-restart workload reconstructs 53 frames versus 31 for in-flight retargeting, a 41.5% work reduction. Host-process proxy median is 137.64 ms vs 68.83 ms (~2.00×), with process-start overhead included. |
| R361 | **BLOCKED — WebGPU unavailable; CPU oracle passes** | Exact 10-bit histograms, percentile thresholds, LUT generation and output application pass on random/constant/alternating controls. Reusing the prior frame's LUT fails a scene-cut negative control. `navigator.gpu` is unavailable, so the GPU-resident dependency chain is untested. |
| R362 | **PROMISING / STRONG bounded-preview component** | For 12 OVER/NONE full-canvas frames, 8 suffix frames are enough to certify ≤1/255 component error. Observed max error 0.0037853699 is below the 0.0037853699 bound and 0.0039215686 tolerance. Exact opaque overwrite, uncovered-pixel rejection and floating underflow controls all pass. |

## R358 — Unwrap Matroska track compression before choosing a decoder

A two-second 160×90 H.264 source was encoded as a single closed I/P GOP with AUD-delimited access units. Sixty access units are retained as the independent oracle. Two ContentEncoding component profiles were then exercised separately:

1. **Header stripping:** a five-byte common prefix is removed from each unit and restored by the normalizer.
2. **Per-unit zlib:** each unit is independently zlib-wrapped and later recovered.

Both paths reproduce every access-unit byte exactly; concatenated recovered H.264 is byte-identical to the source and FFmpeg `framemd5` output is identical. Truncated and checksum-corrupted zlib units are rejected. A missing header prefix visibly fails byte identity instead of being silently accepted.

Chromium's `DecompressionStream('deflate')` independently recovered a real compressed access unit byte-for-byte and rejected a truncated one. Recovered H.264 was packet-copied into ordinary MP4 and Chromium loaded it successfully at 160×90, duration 2.0 s, readyState 4.

The 60 small zlib-wrapped units totaled 40,030 bytes versus 39,450 raw bytes, so this fixture shows **capability, not compression savings**. This test does not author a real Matroska ContentEncoding container because the installed muxer does not expose that construction path. Lacing, codec-private compression, multiple encodings and actual Matroska integration remain unqualified.

## R359 — Start with a bounded software prefix while browser decoding warms up

The source profile gate is valid: the same two-second I/P AVC MP4 loads in Chromium. However, the only accessible browser context reports:

- `VideoDecoder`: unavailable;
- `VideoFrame`: available;
- `navigator.gpu`: unavailable;
- `isSecureContext`: false.

Attempts to navigate to localhost or a local file are blocked by administrator policy. Because the card specifically requires a browser decoder branch and explicit ownership handoff, substituting HTML `<video>` or a second software decoder would not prove the mechanism. R359 is therefore **BLOCKED**, not failed.

## R360 — Retarget in-flight decoding instead of restarting a forward scrub

The fixture is one 60-frame closed GOP with I/P pictures and unique presentation order. Independent FFmpeg target extractions for frame ordinals 12, 21 and 30 exactly match the uninterrupted decode hashes.

For a coalesced interaction schedule where the first burst commits target 21 and a later update commits target 30, restarting from the GOP entry reconstructs 22 + 31 = **53 frames**. Keeping the intact decode sequence alive and changing only the committed output target reconstructs **31 frames**, a **41.5% reduction**.

A host-process proxy measured 137.64 ms median for the two restart decodes versus 68.83 ms for the single continued decode, ~2.00×. This includes FFmpeg process startup and therefore is not an in-process decoder speed forecast.

Explicit eligibility controls reject backward targets, source-epoch changes, configuration changes, duplicate timestamps, discarded outputs, and cases where a later keyframe would make restart cheaper. A still-retained earlier output may be reused without restarting.

## R361 — Keep frame-adaptive analysis and rendering on one GPU timeline

The exact CPU reference was implemented for a declared 10-bit per-frame contrast operation: 1% and 99% histogram ranks select endpoints; a deterministic integer LUT maps the frame to [0,1023]. Random, constant and alternating-extreme planes all satisfy histogram totals and LUT invariants.

A scene-cut negative control deliberately applies frame N-1's LUT to frame N and produces different output, proving that per-frame ownership matters.

The actual optimization cannot be executed in this browser because `navigator.gpu` is false. No GPU timing, readback saving, shader cost or end-to-end presentation claim is made.

## R362 — Stop replaying alpha-animation history when its remaining contribution is bounded

The test uses normalized premultiplied RGBA and the exact source-over identity `C_out = c + (1-alpha) C_in`. Twelve full-canvas OVER/NONE frames use alpha 128/255 over an arbitrary valid older canvas.

Walking backward, the conservative transmittance product falls below 1/255 after the last **8 of 12 frames**. Replaying only that suffix over transparent black yields maximum component error **0.0037853698977132755**; the independently computed bound is **0.003785369897713334**, below the requested **0.00392156862745098** tolerance.

The exact and approximate contracts remain separate:

- a true alpha=1 overwrite makes all older history exactly irrelevant;
- an uncovered pixel retains transmittance 1 and therefore prevents bounded-history elision;
- an unassociated RGB value under alpha 0 becomes zero after explicit premultiplication;
- floating-point underflow of a very long transmittance product is explicitly rejected as proof of exact zero.

Pure composition median time fell from 0.1230 ms for all 12 frames to 0.0845 ms for the certified 8-frame suffix (~1.46×), matching the 33.3% reduction in compositing work. Image decoding, APNG container indexing and rectangle planning are not included in that microbenchmark.

## Overall

R358 demonstrates that outer track representation can be reversed without touching codec payload semantics, but real Matroska ContentEncoding integration remains the next gate. R360 is the strongest exact-work-elimination result in this batch. R362 provides a clean bounded-error contract with explicit exact-mode separation. R359 and R361 are platform-blocked in this managed Chromium and should be rerun only where the required browser APIs are genuinely available.