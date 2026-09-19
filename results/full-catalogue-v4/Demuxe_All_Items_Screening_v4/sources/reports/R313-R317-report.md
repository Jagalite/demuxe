# Demuxe media/browser frontier — R313–R317 executed results

**Run date:** 18 September 2026  
**Proposal source:** `Demuxe_R313_R317_Proposals.md` from the Demuxe Project.  
**Environment:** Chromium 144 headless; FFmpeg 7.1.5; Python 3.13.5; OpenEXR runtime 3.1.13. No `/dev/dri`, WebGPU, WebGL, `VideoDecoder`, or `ImageDecoder` in the permitted browser page.  
**QA:** **51/51 checks passed.**

## Result summary

| ID | Verdict | Decisive result |
|---|---|---|
| R313 | **PROMISING COMPONENT / GPU BLOCKED** | A directly authored 13×9 B44 EXR used 12 real 14-byte blocks. Demand reconstruction matched FFmpeg on all 117 decoded samples with max error 0; a nearest 4×4 viewport needs one 14-byte block rather than a 234-byte expanded HALF frame. |
| R314 | **EXACT COMPONENT / INITIAL LAYOUT REJECTED / GPU BLOCKED** | LZW dictionary-node reconstruction matched all 18,432 palette indices and Chromium RGBA exactly, but 2,391 phrase descriptors alone are 23,910 B — **1.30×** the complete 18,432-byte index plane, before dictionary storage. |
| R315 | **PROMISING / STRONG** | At a pop-on cut with `OLD` displayed and `NEXT` hidden, a 71-byte logical capsule reproduces every future caption event; a visible-text-only capsule fails immediately at EOC. |
| R316 | **PROMISING / CONDITIONAL REPEATED-QUERY WIN** | Exact symmetric hull kept **46 / 240,000** points. All 885 checked gain queries matched exhaustive scans. Prepared hull queries were **53.6×** faster, but the measured build cost amortizes only after about **1493 queries**. |
| R317 | **EXACT MATHEMATICS / FLOATING IMPLEMENTATION REJECTED** | Rational piecewise-affine summaries passed all 320 randomized exact checks. The double/OpenMP version reached **0.020699** max error, exceeded the predeclared 1e-12 tolerance, changed 1,008,031 samples, and took **22.57 ms vs 10.37 ms** sequential. |

## R313 — B44 demand sampling

The fixture is a real OpenEXR scanline file authored from the OpenEXR B44 packing rules: one HALF `Y` channel, 13×9 dimensions so both axes require edge padding, 12 compressed 4×4 blocks, and negative as well as positive half-float values. The compressed B44 body is 168 bytes versus 234 bytes for the expanded HALF plane.

The candidate implemented the independent 14-byte B44 block unpack and decoded only the block containing a requested sample. Against FFmpeg's full EXR decode on the origin-zero oracle, **0/117 samples differ** and max floating error is zero. A 4×4 nearest-sampling viewport aligned to one B44 block touches 14 compressed bytes, not the full expanded frame.

A second file used data window `(5,7)–(17,15)`. FFmpeg 7.1.5 placed those pixels at absolute coordinates inside its 13×9 output rather than making that file a clean sample oracle; that behavior is recorded instead of being misclassified as a B44 mismatch. Candidate addressing handles the nonzero origin explicitly. No GPU API is available here, so GPU sampling cost/presentation is untested.

## R314 — GIF LZW dictionary jobs

A 192×96 non-interlaced global-palette GIF exercises three code-width transitions, 32 valid `code == next dictionary entry` cases, and phrases up to length 19. The CPU parser constructs parent/final/length/first-index nodes rather than expanding phrases during dictionary construction. Reconstructing the job stream yields **18,432/18,432 exact palette indices** versus Pillow; Chromium's native GIF decode produces the same RGBA checksum.

The important result is negative on the initial layout economics: **2,391 × 10-byte descriptors = 23,910 bytes**, already **29.7% larger than the complete 18,432-byte index image**, before dictionary-node traffic. Truncation, invalid references, stale dictionary generations and output bounds are rejected. With no GPU path to demonstrate compensating compute/ownership savings, the proposed one-invocation-per-phrase form should stop here; a coarser job aggregation would be a different follow-on.

## R315 — CEA-608 state capsule

The controlled SCC source was independently decoded by FFmpeg as `OLD → NEXT → THIRD`. The selected cut occurs after `NEXT` has been loaded into non-displayed memory but before EOC swaps screens, while `OLD` remains visible.

The serialized logical state is 71 JSON bytes in this prototype and contains displayed text, hidden text, pop-on mode and repeated-control suppression state. Restoring it before the original suffix reproduces `NEXT`, then `THIRD`, then clear exactly at the uninterrupted times. A deliberately broken visible-text-only capsule shows blank at the next EOC, proving that hidden memory is not optional. A duplicate EOC split across a boundary also proves that repeated-command suppression state can affect future interpretation.

This is an application-controlled sidecar result, not a standards-compliant standalone caption export and not access to private browser caption state.

## R316 — convex-hull peak cache

For 120,000 synchronized integer sample pairs, the symmetric set contains 240,000 points but its exact integer convex hull contains only **46 vertices**. Eighty-five exact gain-grid/control queries and 800 timed random gain queries all equal exhaustive `max |gᵀz[n]|` scans. Identical, opposite-polarity, collinear, duplicate-extreme and near-collinear integer controls also pass; unequal durations are rejected.

After preparation, 800 hull queries took 4.48 ms versus 239.91 ms for vectorized exhaustive scans (**53.6× query-stage speedup**). Exact Python hull construction cost 439.3 ms, yielding an estimated **~1493 query** break-even in this implementation. This is therefore attractive for many repeated fixed-gain evaluations, not a one-off peak scan.

## R317 — attack/release transfer curves

The exact construction works. Four hand cases and **320 randomized rational comparisons** reproduce the sequential recurrence exactly, and the observed breakpoint count never exceeds the sample-count bound. This confirms the structural claim that a block can be represented by a strictly increasing piecewise-affine transfer curve rather than enumerating 2^N branch histories.

The practical floating implementation fails the initial numerical/performance gate. On 1.5 million samples in 64-sample blocks, average curve complexity is 16.81 breakpoints (max 27). Reassociated double arithmetic eventually changes branch history: max absolute envelope error **0.02069854**, far above the declared `1e-12` tolerance, with 1,008,031 bitwise-different output samples. Four-thread curve build + prefix + local pass takes 22.57 ms versus 10.37 ms for the simple recurrence.

That is a rejection of this floating implementation, not of the exact mathematical representation. A future version would need a separately justified numerical contract or a representation preserving stepwise rounding/branch decisions without erasing the hoped-for efficiency.

## Evidence boundary

R313 and R314 do not contain GPU performance evidence because the browser exposes no usable GPU API. R315 covers the admitted pop-on CEA-608 subset only. R316 is exact for the digital sample-peak contract, not true peak. R317's exact-arithmetic proof and failed double implementation are intentionally reported separately. Host timings do not predict Demuxe Wasm/browser whole-session performance.