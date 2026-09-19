# Demuxe media research — R146–R158 executed pilot report

**Standalone media/browser research. No Demuxe repository edits, commits, or route-admission changes.**

Run recorded on 18 September 2026 UTC (17 September in New York). Runtime provenance is in `results/environment.json` and the actual browser capability probe in `results/browser.json`.

## Executive result

Tests were executed for all thirteen recovered research topics. They do not all reach the same evidence level. R146/R147 combine a native preparation component with a browser sink. R148 has a deliberately small real-bitstream profile. R151/R152 are representation/component experiments. R154/R155 stop at mathematical synthesis models: the intended compressed-AAC implementations are **not tested**. These distinctions are not rolled into a misleading universal “pass” score.

| Card | Topic | Verdict | What was actually established |
|---|---|---|---|
| R146 | JPEG XL → original JPEG | PROMISING — bounded host/browser route | 4/4 JPEGs reconstructed byte-for-byte; original/reconstructed JPEGs give identical Chromium pixels. Native reconstruction, not a Wasm JXL pipeline. |
| R147 | Seekable DEFLATE archive media | PROMISING — indexed component + MSE sink | 100/100 random ZIP-entry reads exact. A selected fragment produces identical pixels to the same MSE destination. First index build inflates the whole entry. |
| R148 | MPEG-2 coefficients → JPEG reconstruction | PARTIAL — restricted real bitstream | 16 DC-only luminance blocks mapped to JPEG with exact 32×32 output. AC, predicted pictures, field transforms and full color remain unsupported. |
| R149 | Image planes through FLAC | FEASIBLE — no compression win here | Both 128×96 RGB images recover exactly from Chrome FLAC decode after nearest-grid recovery at 48 kHz. Resampling breaks the carrier; PNG is smaller. |
| R150 | Recovery-window seek index | PROMISING — actual codec recovery | Four intra-refresh starts each reach a permanently exact suffix after 18 warm-up frames. Earlier outputs differ; conservative admission suppresses 19 frames. |
| R151 | Parsed-coefficient cache | PROMISING — component benchmark | 162 crop/scale requests match across three cache policies. Coefficient caching is faster in this model, but coefficients take twice the decoded grayscale payload space. |
| R152 | Copy-on-write reference tiles | PARTIAL — retained-storage component | All 60 decoded MPEG-2 YUV frames reconstruct exactly from shared immutable tiles. No decoder-internal zero-residual proof or reconstruction-write avoidance implemented. |
| R153 | Branching with shared continuation | PROMISING — random-access continuation | One identical keyframe-starting continuation works after red and green histories, including seeks/EOF. A dependent continuation after wrong history renders incorrectly. |
| R154 | Certify silent intervals | PARTIAL — mathematical model only | 48 long-window coefficient/overlap cases satisfy conservative amplitude bounds. Zero current coefficients with nonzero overlap are not silent. No coded-AAC certifier. |
| R155 | Fused synthesis/resampling | PARTIAL — mathematical model only | Fixed 2:1 composed operator matches five baseline cases within 1.39e-16; counts agree. Dense matrix is 24 MiB; no optimized AAC implementation or speedup claim. |
| R156 | Sparse image-layer presentation | PROMISING — browser composition | All 60 translucent-layer frames match full redraw exactly, including disappearance. Dirty rectangle area is lower; GPU traffic/power/CPU savings were not measured. |
| R157 | Codec-motion-guided interpolation | PROMISING — quality experiment | Actual MPEG-2 decoder vectors reduce mean midpoint error on controlled motion clips. Scene-cut interval is worse than ordinary blending. No runtime speedup claim. |
| R158 | Structure-aware media reduction | PROMISING — reducer/tooling | Known laced-WebM MSE failure reduced from 46,580 to 1,238 bytes. Minimal pair retains host PCM equality, direct decode, MSE-negative and unlaced-positive controls. |

**Bounded evidence QA: 41/41.** These are assertions over the executed pilots and controls, not independent end-to-end playback tests or whole-Demuxe regressions.

## Provenance and environment

The requested identities were recovered from the related idea-generation conversation. No full canonical R146–R158 backlog attachment was found. Each operational test scope is stated here; R158 is tested as failure-preserving media-fixture reduction, not as a bitrate-reduction scheme.

Installed execution: FFmpeg 7.1.5, Chromium 144.0.7559.96 on x86-64 Linux, libjxl 0.11.x, libjpeg, libavcodec ABI 61/libavutil ABI 59, Python/NumPy/SciPy and Playwright. All new media was generated locally; R158 intentionally reuses the supplied R110 synthetic laced-WebM fixture and retests it.

The installed browser administration policy was not changed. Browser experiments use a permitted injected `about:blank` page, Blob media, MSE, image decoding and `decodeAudioData`. `VideoDecoder`, `AudioDecoder` and WebGPU are not exposed on this non-secure page. Presence of the `AudioWorkletNode` constructor alone is not treated as a working AudioWorklet deployment. There is no physical GPU/power qualification or real network transport measurement.

Timing is narrowly labeled. R151 compares the same native libjpeg entropy parser and SciPy reconstruction code, with seven rotating-order rounds after warmup. This is not comparison against an optimized full libjpeg/Chrome pipeline. Cache accounting excludes Python object overhead and fixture/oracle arrays. No CPU saving is inferred from fewer dirty pixels, smaller encoded data, or less retained tile payload.

## R146 — JPEG XL reconstruction followed by browser JPEG decode

Used `JxlEncoderAddJPEGFrame`, reconstruction metadata, and the actual installed libjxl reconstruction API. No original JPEG is stored outside the JXL input as a reconstruction shortcut. The reconstructed bytes are emitted by libjxl, then independently decoded by Chromium’s JPEG image path. These public reconstruction APIs explicitly support returning the original JPEG codestream rather than a pixel reconstruction [S1, S2].

| Fixture | JPEG bytes | JXL bytes | Original JPEG recovered |
|---|---:|---:|---|
| gradient_baseline | 6,748 | 2,287 | Exact SHA-256 |
| gradient_progressive | 5,324 | 2,037 | Exact SHA-256 |
| noise_baseline | 64,612 | 54,543 | Exact SHA-256 |
| noise_progressive | 59,416 | 54,437 | Exact SHA-256 |

All four original/reconstructed browser RGBA comparisons have zero changed values. Missing reconstruction metadata, truncation, and non-JPEG input are rejected. A too-small fixed reconstruction output buffer initially failed to make progress; the final pilot uses an explicit 1 MiB bound for these small fixtures. That harness development failure is not a codec-format failure.

This proves the prepared-JPEG recompression/reconstruction route. It does not cover arbitrary pixel-origin JXL, animation, JPEG XL-native browser support, streamed Wasm reconstruction, or reduced browser decoder CPU. Size savings on these two synthetic patterns are not a representative corpus result.

Evidence: `results/r146.json`, `results/browser.json#r146`, `scripts/r146.py`.

## R147 — Random access inside an ordinary ZIP DEFLATE entry

Generated one conventional ZIP-compressed fMP4 entry. The index preserves native zlib inflate-state snapshots at 32 KiB uncompressed intervals; it does not replace the file with independently compressed chunks. A snapshot includes more than a compressed byte position [S3].

The index construction verifies the complete entry CRC and necessarily processes the whole entry once. Afterwards, all 100 random range extractions match the original MP4 byte-for-byte. Mean replayed uncompressed bytes per requested range are **20,912.28**, compared with **213,260.44** for restarting at byte zero for the same requests. This is a replay-work count, not a network or complete-session speedup.

An initialization range plus the fragment at source time 5 seconds was retrieved through the index, reassembled and supplied to MSE. Its sampled output matches the corresponding full-source **MSE** frame exactly. The direct-file-versus-MSE RGB comparison differs (mean RGBA error 5.918/255, maximum 42); it remains visible in the evidence and is not attributed to archive corruption or to a proven color-conversion cause. Byte equality and the same-destination comparison isolate the tested archive operation.

Invalid ranges and a restart at a bare compressed cursor without saved inflate state are rejected. State storage is opaque and process-local; this is not a persistent zran-format index, a browser-native inflater, or a ZIP-bomb-hardened archive service. Original compressed fixture and dictionary/state overhead must be included before any memory claim.

Evidence: `results/r147.json`, `results/browser.json#r147`, `scripts/r147.py`.

## R148 — Actual MPEG-2 coefficient data reused by JPEG

Created a 32×32 MPEG-2 I picture composed of flat 8×8 blocks. The candidate parses actual DC Huffman codes for all 24 luminance/chroma blocks, checks a narrow frame-DCT profile, retains the 16 luminance blocks, accounts for JPEG’s DC level shift and MPEG-2 mismatch control, and writes coefficients through libjpeg’s coefficient API [S4, S5]. The candidate does not reconstruct MPEG pixels before writing JPEG.

All **1,024 luminance samples** match an independent FFmpeg decode exactly. Chromium’s JPEG decode also matches a PNG oracle made from those decoded luminance values exactly. A real nonzero-AC MPEG-2 picture and a truncated picture are rejected rather than silently accepted.

This is a deliberately restricted success, not a general MPEG-2→JPEG bridge. Nonzero AC coefficients, predicted pictures, field DCT, alternate scan, clipping/IDCT differences and full-color reconstruction remain unimplemented. No speedup is claimed from this tiny fixture.

Evidence: `results/r148.json`, `results/browser.json#r148`, `scripts/r148.py`, `scripts/jpeg_coeff.c`.

## R149 — Image data through a lossless audio decoder

Two 128×96 RGB images were serialized as three channel-major planes, giving 36,864 carrier samples each. The integer packing is `int16 = (uint8 - 128) × 128`, encoded as mono 48 kHz FLAC. The native decoded PCM matches exactly.

Chromium `decodeAudioData` at 48 kHz produces floats that are not exact multiples of the ideal scale in every case. Nearest-grid recovery, `round(sample × 256 + 128)`, recovers **every original byte**. The maximum pre-rounding value error is below 0.0039, safely below half a data level on these fixtures. The earlier raw-float equality check was intentionally retained in `browser_initial.json`; the final claim is reversible integer recovery, not bit-identical floating-point PCM.

At a 44.1 kHz context rate, resampling changes both count (36,864→33,868) and values, and the carrier is rejected. Context-rate resampling is part of the documented decoding contract [S6]. No carrier signal is connected to speakers.

| Image | Raw RGB bytes | FLAC bytes | PNG bytes |
|---|---:|---:|---:|
| gradient | 36,864 | 22,507 | 246 |
| noise | 36,864 | 47,591 | 37,033 |

The representation is feasible, but **neither fixture is a compression win over PNG**. Native browser audio decoding is being used as a reversible data-decoding component, not as an established efficient image codec. Secure-context AudioDecoder, GPU reconstruction and continuous video remain untested.

Evidence: `results/r149.json`, `results/browser.json#r149`, `scripts/r149.py`.

## R150 — Recovery windows rather than immediate clean-access assumptions

Encoded six seconds of H.264 with periodic intra refresh, no B frames and one reference frame. Parsed recovery-point SEI directly. Cuts at source packet indices 30, 60, 90 and 120 each advertise `recovery_frame_cnt=18` and `exact_match_flag=1` [S7].

For each cut, a fresh decoder receives source parameter sets plus the remaining compressed packets. `showall` is used to expose imperfect warm-up frames instead of hiding them. Frame hashes are compared with uninterrupted decoding of the same source.

All four cuts have incorrect warm-up frames and first reach a permanently identical suffix at offset **18 frames**. The tested conservative admission rule suppresses through the signaled count, admitting at offset 19. Every admitted suffix is exact. At 30 frames/s, the observed first exact suffix starts 0.6 seconds after the cut; this is a fixture-specific media recovery interval, not a startup-time benchmark.

This supports storing both an access offset and a verified recovery boundary. It does not prove all intra-refresh streams recover in 18 frames, that the advertised flag is sufficient for every decoder, or that Chrome exposes equivalent seeking semantics. Browser routing, other reference structures and corrupt recovery metadata remain separate gates.

Evidence: `results/r150.json`, `scripts/r150.py`; all per-frame comparisons are retained.

## R151 — Parsed coefficients as a cache tier

Used real libjpeg entropy parsing of twelve grayscale JPEGs. The three policies share an identical SciPy inverse-DCT implementation and receive 162 crop/downsample requests under a **512 KiB accounted cache budget**. Every request’s final output hash matches across policies. A separate libjpeg pixel oracle differs by at most one grayscale level due to reconstruction rounding.

| Cache | Misses | Median wall time for all requests |
|---|---:|---:|
| compressed | 12 | 42.67 ms |
| coefficients | 45 | 22.08 ms |
| pixels | 39 | 37.54 ms |

The coefficient tier avoids repeated entropy parsing while allowing a crop to reconstruct fewer blocks. However, one coefficient image takes **153,728 bytes** versus **76,800 bytes** for decoded grayscale pixels. It is not intrinsically a memory-saving tier. All caches share resident fixture/oracle data outside the reported budget; object overhead and process RSS are excluded.

This is evidence of a useful compute tradeoff for this component/workload. It is not a 2× browser decoder speedup, an optimized IDCT comparison, or a generic best-cache policy.

Evidence: `results/r151.json`, `scripts/r151.py`, `scripts/jpeg_coeff.c`.

## R152 — Copy-on-write tiled retained pictures

Decoded a real MPEG-2 I/P clip with a mostly static background. Its Y/U/V planes were divided into corresponding 16×16/8×8 tiles. Tiles are shared only after byte equality with the previous decoded tile is established; a copied tile table plus a new immutable tile implements a COW edit.

All 60 complete planar frames reconstruct byte-exactly, and the edit does not mutate previous references. For the final three retained pictures, unique tile payload is **94,208 bytes**, versus **276,480 bytes** for dense planes, plus **17,280 bytes** of assumed eight-byte pointer tables. Python object/allocator overhead is not included.

This is **postdecode retained-storage sharing**, not the proposed full decoder-internal optimization. Every source picture was still fully reconstructed, read and compared. Inferring unchanged tiles from valid codec dependency/residual state, avoiding reference writes, proving filter-boundary safety, and measuring presentation flattening remain unimplemented.

Evidence: `results/r152.json`, `scripts/r152.py`.

## R153 — Shared continuation and the wrong-history negative

Two alternative one-second H.264 branches, red or green, append the **identical compressed blue continuation** at a clean random-access boundary on one MSE SourceBuffer. Both branches show the continuation, survive backward/forward seeks and reach EOF. The shared continuation SHA-256 is recorded.

A separate negative uses a non-random-access continuation taken from a long-GOP pattern stream after an unrelated green history. MSE accepts the bytes, but output is dramatically different from the same full-source MSE oracle (mean RGBA error **84.25/255**, maximum 255).

The useful result is bounded continuation reuse plus an explicit decoder-history requirement. Matching timestamps and configuration are insufficient. No merge of arbitrary predictive states, seamless audio branch switching, or network prefetch saving is claimed.

Evidence: `results/r153.json`, `results/browser.json#r153`, `scripts/generate_browser.py`.

## R154 — Silence certification: mathematical boundary only

Implemented a long-sine-window IMDCT/overlap model. A conservative bound for the current output interval is `(2/N) × sum(abs(coefficients)) + max(abs(previous_overlap))`. Across 48 generated cases, all observed peaks lie below the bound: eight cases are certified exactly silent, eight have a small bound, and 32 remain unknown. A zero-current-coefficient/nonzero-overlap case produces nonzero samples, disproving the naïve zero-coefficients rule.

Short windows, window transitions, PNS, SBR and unresolved coupling/prediction are deliberately outside the certificate profile. An actual AAC-LC tone/impulse/silence fixture was encoded and decoded as ancillary evidence, but its coded coefficients and overlap state were **not extracted or certified**.

Therefore the intended compressed-AAC silence certifier is **not qualified**. No synthesis skipping or decode speedup was demonstrated.

Evidence: `results/r154.json`, `scripts/r154_r155.py`.

## R155 — Fused synthesis and resampling: mathematical boundary only

Composed the same long-window synthesis/overlap operator with a 31-tap, fixed **2:1 downsampling** operator. Zero, random, impulse, previous-tail and tiny-input cases produce the same 1,024 output samples as the separate operations, with maximum absolute floating-point difference **1.39e-16**. The comparison uses identical centered-filter delay and zero-padding conventions.

The fused dense matrix occupies **25,165,824 bytes (24 MiB)** and took 186.72 ms to prepare in this run. It is not proposed as a competitive decoder implementation. There is no comparison against a fast transform, no real AAC decoder modification and no proof of streaming boundary/future-sample handling.

This verifies linear composition for a restricted model. Actual AAC fusion remains **not tested**, and there is no performance win to report.

Evidence: `results/r155.json`, `scripts/r154_r155.py`.

## R156 — Sparse translucent layers with correct disposal

A browser canvas reconstructs 60 frames from one background and one reusable translucent sprite, including a moving instance, a stationary overlapping instance, and a disappearance interval. The sparse path clears/restores a bounded dirty rectangle and clips redraws; a separate full-canvas redraw is the oracle.

All 60 RGBA frames are identical. Accumulated dirty-rectangle area is **134,624 pixels**, versus **3,686,400 pixels** for full redraw. This is a geometry/work-envelope count—not measured GPU bandwidth, physical updates or CPU time. The no-clear negative leaves ghosts and fails the pixel oracle.

Assets were already decoded; the pilot establishes correct sparse presentation/disposal, not a complete compressed layered-video format or a comparison with an efficient standard video codec.

Evidence: `results/browser.json#r156`, `fixtures/r156_timeline.json`, `scripts/browser_tests.py`.

## R157 — Interpolation guided by real codec motion vectors

Used actual MPEG-2 I/P decoder-exported `AVMotionVector` side data, not the fixture’s known motion as the algorithm input. Native FFI output pixels are independently matched to FFmpeg CLI output. Missing vectors use zero-motion blending; vector-guided bilinear warps construct midpoint pictures. Original 30 fps synthetic frames provide ground truth while the coded input contains every other frame [S8, S9].

| Fixture | Mean absolute luma error, simple blend | Guided interpolation |
|---|---:|---:|
| translation | 32.383/255 | 5.618/255 |
| occlusion | 31.314/255 | 5.742/255 |
| cut | 34.129/255 | 9.921/255 |

The interval crossing the scene cut is a clear counterexample: guided error **54.44/255**, blend **53.28/255**, previous-frame hold **32.83/255**. Averages over mostly translating frames must not conceal that failure. Scene-cut/occlusion decisions and disoccluded-region synthesis remain necessary before a robust interpolator could be claimed.

No exact reconstruction of arbitrary missing pictures or total runtime saving is asserted. This tests a quality mechanism on host software, not a browser GPU implementation.

Evidence: `results/r157.json`, full vectors in `results/r157_*_vectors.json`, `scripts/r157.py`.

## R158 — Structure-aware failure-preserving reduction

Used the previously supplied R110 laced-Opus WebM as an explicitly known incompatibility, then independently reran it in the current browser. The predicate requires: host parsing still yields audio packets; MSE rejects the laced candidate; and the corresponding **unlaced** candidate is accepted. The reducer rewrites valid EBML lengths and removes irrelevant metadata and groups while retaining the target condition.

Seven accepted predicate probes reduce **46,580→1,238 bytes**, and **50→1 laced block**, containing three original codec packets. The minimized file still decodes through the direct browser path. Laced and unlaced minimized files produce identical, nonempty host PCM.

This is a reproducible reducer result, not a new browser vulnerability, a globally byte-minimal testcase, or support for arbitrary codec-aware reduction. Positive-control preservation prevents confusing a generic broken file with the targeted destination distinction.

Evidence: `results/r158.json`, `fixtures/r158_minimal_laced.webm`, `fixtures/r158_minimal_unlaced.webm`, `scripts/r158.py`.

## Scope that remains open

The broad architecture exercise remains independent of production admission. Four narrower results must not be promoted: R148 is not full MPEG reconstruction; R152 does not alter codec reference stores; R154 does not inspect AAC coded coefficients; R155 does not implement an optimized AAC synthesis/resampling decoder. The artifact does not claim those tasks were completed.

Browser claims are limited to the actual named destinations and comparisons. Timing, compression, correctness, retained storage, and dirty geometry are different measures. No supported API, metadata event, successful append, or modeled operator is treated as proof of complete correct playback.

## Sources for mechanism design

These primary references establish the APIs or mathematical/format boundary used; observed results come from the delivered executable evidence.

- [S1] libjxl 0.11.1 encoder API: https://raw.githubusercontent.com/libjxl/libjxl/v0.11.1/lib/include/jxl/encode.h
- [S2] libjxl decoder reconstruction API: https://libjxl.readthedocs.io/en/latest/api_decoder.html
- [S3] Python zlib decompressor copying and incremental API: https://docs.python.org/3/library/zlib.html ; zlib random-access example: https://raw.githubusercontent.com/madler/zlib/v1.3.1/examples/zran.c
- [S4] libjpeg coefficient API: https://github.com/libjpeg-turbo/libjpeg-turbo/blob/main/doc/libjpeg.txt
- [S5] FFmpeg MPEG-1/2 DC VLC tables: https://ffmpeg.org/doxygen/7.1/mpeg12data_8c_source.html
- [S6] Web Audio decodeAudioData: https://www.w3.org/TR/webaudio-1.0/
- [S7] FFmpeg H.264 recovery-point SEI implementation: https://ffmpeg.org/doxygen/7.1/h264__sei_8c_source.html
- [S8] FFmpeg motion-vector layout: https://ffmpeg.org/doxygen/7.1/motion__vector_8h_source.html
- [S9] FFmpeg motion-vector side-data contract: https://ffmpeg.org/doxygen/7.1/frame_8h_source.html

No new external binary fixtures were downloaded. The supplied R110 media is attributed by hash in R158 results.