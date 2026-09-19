# Demuxe R261–R267 — bounded experiment report

**Date:** 2026-09-18  
**Baseline:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Node 22.16.0, Python 3.13.5, NumPy 2.3.5  
**QA:** **49/49 assertions passed**  
**Production source changes:** none.

The exact R261–R267 cards were recovered from the Demuxe idea thread before execution. The tests below use the smallest decisive probes and keep host-only, browser-tested, blocked, and model-only evidence separate.

## Executive result

| ID | Exact card | Verdict | Key evidence |
|---|---|---|---|
| R261 | Use HTTP to rescue only the verified media ranges blocking playback | **PROMISING** | 2 corrupt 64 KiB chunks repaired; only 8.20% of the 1,599,101-byte source fetched; reconstructed SHA-256 exact; FFmpeg clean; Chromium playback reached 0.759s at 640×360. |
| R262 | Seek across source-authored codec changes using indexed configuration intervals | **PROMISING** | Full bitstream exposes a 320×180→640×360 authored switch at frame 90; indexed second interval starts exactly at byte 280,871; target pixels match the authored interval exactly; non-RAP control emits dependency errors. Decode-to-target median 92.6 ms → 73.2 ms (1.26×). |
| R263 | Play deep-image sequences without flattening them before every operation | **PARTIAL / GPU BLOCKED** | Synthetic deep samples + deferred ROI composition are bit-for-bit equal to eager full-frame flatten for the tested views; CPU proxy 0.498s → 0.034s (14.8×). Chromium exposes no WebGPU/WebGL/WebGL2, so the proposed GPU path was not executed. |
| R264 | Maintain exact global image statistics from changed tiles | **PROMISING** | Exact 256-bin global histogram after every one of 80 tile edits; median 0.725s full recompute → 0.0115s incremental (63.2×). |
| R265 | Repair cached filtered audio by processing only the edit’s correction | **PROMISING** | Exact integer FIR identity `y_new = y_cached + h*Δx`; 6,000 edited samples require a 6,128-sample correction; median 0.0905s full recompute → 0.0011s patch (85.3×). |
| R266 | Expand Snappy backreferences as a dependency graph | **CORRECT, NOT QUALIFIED AS AN OPTIMIZATION** | Both corpora decode exactly, but graph bookkeeping is slower: chain 11.3× sequential time; fan-out 4.1×. Chain corpus has 8,192 dependency levels / width 1; fan-out has 2 levels / width 959. |
| R267 | Measure each stage’s deadline slack before deciding what to optimize | **PROMISING AS DIAGNOSTIC; INTEGRATION NEEDED** | Controlled-delay model finds safe slack of ~270 ms read, ~138 ms process, and ~37 ms append; append is correctly identified as the tightest boundary. |

## R261 — selective verified HTTP rescue

A 6 s H.264/AAC MP4 was split into 64 KiB verification units. Two units were deliberately corrupted locally. A loopback HTTP server supported byte ranges; the rescue client compared each local chunk to a SHA-256 manifest and requested only mismatches.

**Result.** The client requested exactly chunks [8, 16], transferring 131,072 bytes versus 1,599,101 bytes for a full fetch. The repaired file matched the source SHA-256 `cdca628c17b65f13ec3f4fb8cf150509044fbcbdc1ac8b1bbfb612a8ae93b94a` exactly. A tampered rescue response was rejected by hash. The repaired file decoded with FFmpeg and played in Chromium; the corrupt control produced decode errors.

**Boundary.** This is loopback HTTP. It does not qualify WAN behavior, CORS, credentials, cache validators, authorization changes, or manifest distribution/trust.

## R262 — configuration-interval seek

Two independently authored Annex-B H.264 segments were concatenated: 3 s at 320×180 followed by 3 s at 640×360, both with repeated headers and 1 s keyframe cadence. The index records SPS configuration intervals and starts the second interval at its SPS/RAP boundary.

**Result.** FFprobe on the full stream observes the resolution switch at frame 90 and the first 640×360 frame is a keyframe. The indexed second interval begins exactly at the second authored stream boundary (280,871 bytes) and is byte-identical to that authored stream. Frame 30 from the indexed interval is pixel-identical to frame 30 decoded from the authored second segment (`dc278b9cdc52751edf076f9bf98e3815705e8c39081739c9e3a31670fa1fd11f`). Starting at a non-RAP slice emits missing PPS/dependency errors, proving the entry/preroll requirement matters.

FFmpeg's normal output graph fixes the first output geometry across a midstream resolution change, so it was **not** used as the pixel oracle for the changed stream. Configuration truth comes from decoder frame metadata; pixel truth comes from the exact authored second interval.

**Boundary.** Host elementary-stream evidence only. Production indexing also needs container timestamps, edit lists, track identity, and codec-specific preroll; browser `changeType`/MSE integration was not tested here.

## R263 — retained deep samples / deferred composition

Three synthetic 384×384 deep frames with 1–6 samples/pixel were displayed through 36 sparse 96×96 viewports. The eager baseline flattened the full frame for every view; the deferred route composited only the requested deep ROI.

**Result.** Maximum absolute output error was **0.0**. Median CPU time fell from 0.498s to 0.034s (14.8×) for this sparse-viewport workload.

**Blocked gate.** Chromium reports WebGPU=false, WebGL=false, WebGL2=false in this environment. This proves the retained/deferred algorithm on CPU only, not the intended GPU presenter. No OpenEXR/deep-image parser or real deep sequence I/O was exercised.

## R264 — exact incremental image statistics

A 2048×2048 8-bit image was partitioned into 64×64 tiles. Each tile owns an exact 256-bin histogram. Global state is updated by subtracting the old tile histogram and adding the new one.

**Result.** Incremental global histograms matched a full-image recomputation after **every edit**. Final pixel count, sum, mean, percentiles, min, and max all derive from the exact global histogram. Timing was 0.0115s incremental versus 0.725s for full recomputation over the same 80 edits, a 63.2× corpus-level improvement. The no-subtraction negative control drifted immediately.

**Boundary.** 8-bit scalar histogram only. HDR/float statistics need explicit binning/exact-sum/NaN policy, and GPU readback cost is outside this probe.

## R265 — sparse correction for cached linear audio filtering

A 1,200,000-sample integer signal was filtered with a 129-tap FIR. A 6,000-sample edit produced `Δx`; only `h*Δx` was recomputed and added to the cached output.

**Result.** The patched output is exactly equal to a full recomputation. The correction support is 6,128 samples, including the FIR tail; omitting that tail fails the oracle. Median patch time was 1.061 ms versus 90.474 ms full, or 85.3× in this sparse-edit corpus.

**Boundary.** This identity is for linear time-invariant filtering. Nonlinear/stateful effects, adaptive filters, compressors, limiters, reverbs with external state, format changes, and resampling need separate dependency/state analysis.

## R266 — Snappy dependency graph

A raw Snappy subset (literals + COPY_2) was generated in two shapes: a 512 KiB chain-heavy block and a ~60 KiB fan-out block. A conventional optimized sequential decoder is the oracle. The graph path builds token dependencies and executes topological layers with the same overlap-safe copy primitive.

**Result.** Both graph outputs exactly match the sequential decoder and generated source. But the chain has 8,192 levels with width 1, so it is essentially serial. The fan-out case has width 959 after its root literal, demonstrating that parallel structure can exist. On this CPU implementation, graph bookkeeping made decoding 11.3× slower for the chain and 4.1× slower for fan-out.

**Verdict.** Correct representation, but **do not treat it as a CPU optimization** from this evidence. A parallel/GPU executor would need a separate test; full Snappy framing and all copy tag types were not implemented here.

## R267 — deadline slack before optimization

A deterministic three-stage media pipeline model assigns explicit source-read, processing, and append boundaries before each presentation deadline. One middle segment receives a controlled delay at one stage at a time; binary search finds the last delay that does not miss a presentation deadline.

**Result.** Measured safe slack is ~270 ms at read, ~138 ms at process, and ~37 ms at append. The method identifies append as the tightest stage; pushing append past that threshold produces a miss while baseline does not.

**Boundary.** This validates the *measurement method*, not Demuxe's real scheduler. Production qualification requires real timestamps for read/demux/transform/append/presentation, queue depth, browser scheduling, and playback deadlines.

## Recommended follow-through

R261, R262, R264, and R265 have enough bounded evidence to justify **integration-scale experiments**, not automatic production adoption. R263 should remain blocked until a GPU-capable browser environment is available. R266 should stay research-only unless a genuinely parallel executor is proposed. R267 is worth implementing as instrumentation first, because it can tell later optimization work where actual deadline pressure exists.

## Reproduction

`generate_fixtures.sh` builds the media fixtures with FFmpeg. `run_r261_r267.py` runs all seven probes and writes per-experiment JSON, QA, environment, and raw evidence. `run_all.sh` performs both steps. The evidence archive and package-verification file contain SHA-256 checksums for the preserved outputs.