<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Research report: progressive and reduced-decode previews

## 1. Research question and current decision

Can Demuxe provide an inexpensive initial hover preview and, when justified, a better result later, without disturbing playback or committing the project to a custom codec implementation?

**Yes at the architectural level, with several viable mechanisms. The custom modern-video decoder remains a separate research hypothesis.** The useful separation is between acquiring fewer encoded samples, reconstructing fewer pixels, using a cheaper existing representation, and presenting an early result before refinement. None requires every other mechanism to succeed.

The recommendation is to build around replaceable providers and truthful result metadata, not a mandatory coarse-to-fine codec. The leading source-video route is independent, indexed random-access extraction, followed by optional temporal refinement. Use authored thumbnails and caches whenever suitable. Retain a selective reconstruction provider only if a narrow implementation beats the best existing provider on the intended browser workload.

This report is a **screen**, not a release gate. Native timing trials are exploratory: they were not preceded by a predeclared whole-player benefit threshold, and they do not include a real Demuxe controller. Full provider correctness, browser performance, and release qualification remain open.

## 2. Provenance, environment and limits

The inspected repository reference was main at `b4fa9ec1e7b86c2768aa5cb220d451d1b54432c7`. Its research process separates screening, correctness, performance, integration, and qualification. This package follows that distinction, but canonical item mapping still needs local reconciliation. Existing full keys and historical decisions must be preserved. No repository source checkout or production path was tested here. Primary references are identified in `sources.json` as S1–S6; repository references are R1–R3.

Native tools: FFmpeg 7.1.5-0+deb13u1, GCC 14, Python 3.13.5, Pillow 12.3.0, NumPy 2.3.5, and scikit-image 0.26.0. The container exposed AMD EPYC 9V74 CPUs and no `/dev/dri` device. Most video timings use one decoder/filter thread. The exact FFmpeg build configuration, CPU report, and browser version are in `results/environment.txt`.

Inputs were generated locally: short 1080p test-pattern H.264, HEVC, VP9, AV1 and MPEG-2 media; a 4K test-pattern JPEG; and a deterministic 4K procedural texture image. The multi-frame H.264/HEVC/VP9 sources are six seconds at 30 fps. The short AV1 input contains one frame and supports only a capability screen. These are not a natural-video, anime, grain, HDR, interlaced, open-GOP, or adversarial-container qualification corpus.

Video CLI timings include process startup, local demux/read work, software decoding, scaling, and output transfer to the Python parent. Filesystem state is warm. They are not browser hover latency. Image timings have different boundaries, explicitly stated below. Physical energy, GPU use, attributable player memory, HTTP transfer, playback interference, Wasm performance, and battery impact were not measured.

## 3. Source review and correction of the original hypothesis

**S1: Byeon et al. (2021), “Fast Thumbnail Extraction for H.264/AVC, HEVC and VP9.”** The method retains required boundary pixels and selected thumbnail samples, using partial transforms/prediction and line buffers. It is not simply DC-only decoding. The authors modified FFmpeg 4.2.2 and evaluated first frames of six 4K sequences; reported extraction-time reductions were 66%, 52%, and 48%, respectively. They acknowledge aliasing. This is supporting literature, not a reproduced Demuxe result. A reusable public implementation was not located in the material examined, and the paper does not establish resumable refinement of an arbitrary video frame.

S2, the current WebCodecs specification, distinguishes image and video interfaces. `ImageDecoderInit` includes best-effort desired output dimensions, and image decoding can request incomplete progressive images. `VideoDecoderConfig` has no equivalent thumbnail-resolution control; coded dimensions are not a resize instruction. A capability object accepting unfamiliar properties is not evidence that a video decoder used them.

The research hypothesis should therefore be **selective reconstruction with preserved dependencies**, not “drop most coefficients and receive a correct tiny picture.” Deliberately approximate output remains possible, but it needs its own quality contract rather than borrowing exact-decoder correctness.

## 4. Experiment A — capability checks must verify actual output

`native_bench.py` requested `-lowres 0`, `1`, and `3`, then inspected decoder output through `showinfo` before any scaling filter. FFmpeg's documentation S3 describes the option, but an accepted command is not sufficient proof of support.

| Installed default decoder | Original decoded dimensions | Requested lowres=3 result |
|---|---:|---:|
| H.264 | 1920×1080 | 1920×1080 |
| HEVC | 1920×1080 | 1920×1080 |
| VP9 | 1920×1080 | 1920×1080 |
| AV1 | 1920×1080 | 1920×1080 |
| MPEG-2 | 1920×1080 | 240×135 |
| JPEG | 3840×2160 | 480×270 |

Modern-video decoders reported a maximum supported low-resolution value of zero and continued at full dimensions. This is a useful negative: do not expose a generic “lowres succeeded” provider just because the process or API returned success. The conclusion is scoped to these installed decoders and inputs, not every proprietary or research implementation.

Evidence: `results/lowres_capabilities.json`, including complete commands, dimensions and stderr. This experiment checked dimensions and actual execution, not reduced-output visual fidelity or a speed benefit for MPEG-2.

## 5. Experiment B — eliminate unneeded frame reconstruction

A six-second, 180-frame source was fully decoded and filtered to its three intra frames. Candidates requested decoder-side keyframe skipping, with and without loop filtering. Output was scaled to 240×135 RGB24. One warmup plus five seeded randomized trials were collected per variant.

| Codec | Full decode, then select | Keyframe-skip candidate | Output comparison |
|---|---:|---:|---|
| H.264 | 677.7 ms | 87.8 ms | Three frames, byte-identical |
| HEVC | 858.6 ms | 94.8 ms | Three frames, byte-identical |
| VP9 | 734.8 ms | 788.8 ms | Candidate returned 180 frames: intended skipping did not occur |

The VP9 result is an **invalid candidate for the requested three-frame workload**, not a useful comparative timing. Ignoring this would have converted an unsupported optimization into a misleading performance result.

Disabling loop filtering changed pixels. It did not produce a meaningful H.264 win in these trials; HEVC showed a small timing difference with changed output. Those variants are retained as negative/quality-changing evidence and are not recommended defaults.

The baseline here deliberately represents an inefficient all-frame thumbnail sweep. It is not the cheapest correct baseline for an indexed single hover. The large ratios establish that unnecessary temporal work can dominate, not that Demuxe beats an optimized player by those ratios.

Evidence: `results/native_keyframe_bench.json`.

## 6. Experiment C — select compressed packets instead of trusting skip flags

### VP9

The generated VP9 source was remuxed to IVF. Known key packets were selected before decode, with a corresponding valid IVF frame count. The source had 180 packets; the selected view had three. Preparation and discovering packet metadata occurred outside timed trials.

Full decode plus selection took **763.0 ms** median. Decoding the selected packets took **96.5 ms**, or **7.91× faster for this batch**. Both returned the same three RGB thumbnails, with matching bytes and stable hashes across seven measured trials after a warmup.

The selected encoded payload was 195,535 bytes rather than 4,625,308 bytes. This is a payload accounting result, **not measured HTTP bandwidth saved**: the experiment read the full local source to prepare the selection. A deployed provider must still pay for indexes, codec configuration, range alignment, transport latency and any missing dependencies.

### H.264 coarse versus exact

From the closed-GOP fixture, a real IDR sample at 2.0 seconds was extracted with SPS/PPS configuration. A separate GOP view covered 2.0–4.0 seconds. A request at 3.5 seconds was tested through the GOP and through FFmpeg's optimized input seeking.

| Operation | Median native wall time | What the image represents |
|---|---:|---|
| Decode isolated IDR | 74.7 ms | 2.0 seconds |
| Decode GOP and select target | 243.4 ms | 3.5 seconds |
| Optimized input seek to target | 234.0 ms | 3.5 seconds |

Each output matched the full-source reference at its **own** represented time. The 3.13× coarse-versus-exact timing difference is not an equal-output acceleration: the earlier result is temporally approximate. This is nevertheless a useful interaction option when the UI permits it and shows truthful timestamps.

The IDR carried 47,124 encoded bytes; the full GOP carried 1,210,042. Neither figure includes every cost of a network preview. Generic intra pictures must not automatically be treated as independently decodable. Production eligibility must validate codec configuration and random-access/dependency semantics.

Evidence: `results/packet_bench.json`. Scope excludes open GOPs, non-IDR recovery, encryption, corrupt indexes and parameter changes.

## 7. Experiment D — actual decoder-scaled JPEG

The same 4K JPEG bytes were decoded in two ways: full-resolution RGB followed by Lanczos resizing to 240×135, or an eighth-scale decode to 480×270 followed by the same target resize. No smaller JPEG was substituted for the reduced-decode candidate.

| Synthetic input | Full decode + resize | Scaled decode + resize | Ratio | SSIM to full route |
|---|---:|---:|---:|---:|
| Chart | 78.31 ms | 6.56 ms | 11.93× | 0.9948 |
| Procedural texture | 101.17 ms | 22.60 ms | 4.48× | 0.9971 |

These in-process timings include decode, resize and output conversion from already-resident compressed bytes. There was one warmup and 20 measurements per method; method order was sequential rather than randomized, a limitation recorded in the results. High SSIM on two synthetic inputs is not a general perceptual guarantee.

This is positive evidence for an existing codec-specific mechanism, but not evidence of the same feature in H.264, HEVC or AV1. Both image routes consumed the same complete compressed JPEG input; reduced reconstruction does not imply reduced source transfer.

Evidence: `results/jpeg_bench.json`.

A separate prepared-asset control prevents over-selling lossy thumbnails. Earlier small quality-85 JPEGs had lower SSIM. A pixel-exact 240×135 PNG control instead decoded in **0.33 ms / 0.79 ms**, with sizes **9,240 / 34,691 bytes**. Higher-quality non-subsampled JPEG alternatives are recorded too. Asset generation, storage and network costs are outside those decode timings. This supports keeping an authored provider; it does not make thumbnail preparation free.

Evidence: `results/authored_control.json`.

## 8. Experiment E — a selective integer-transform prototype

An independent C prototype computes only seven outputs of a 4×4 H.264-style inverse transform: the four bottom-boundary residuals and three additional right-boundary residuals. It still uses all input coefficients and the required intermediate calculations. It does not delete high frequencies.

The full comparator computes all sixteen residuals. For each build, **1,000,000 bounded coefficient blocks** produced **7,000,000 matching boundary residual checks** and the same number of matching clipped prediction-addition checks. There were no mismatches. A separate NumPy implementation checked 1,000 additional cases. An undefined-behavior sanitizer run completed without a reported error.

| Build | Full kernel, 1,048,576 calls | Selective kernel | Ratio |
|---|---:|---:|---:|
| GCC -O3 -march=native | 16.71 ms | 9.54 ms | 1.75× |
| GCC -O3, vectorization disabled | 12.89 ms | 9.76 ms | 1.32× |

The full kernel becoming faster with different compiler flags is itself a warning against extrapolation. These compare our C functions, **not FFmpeg's tuned SIMD implementation**, and include their common loop/checksum overhead. The comparator is not proof that the existing decoder spends this fraction of its time in this kernel.

A negative control sets a non-DC coefficient to 1024 while DC is zero. Correct reconstruction includes a bottom-right residual of -16; DC-only reconstruction gives zero. With prediction 128, the corresponding pixel would be 112 versus 128. This shows why DC-only output cannot claim exact boundary preservation. It does not reject all deliberately approximate thumbnail algorithms.

**What this establishes:** selected residuals can be reproduced without computing every output of this transform, and a bounded native kernel has an observed cost reduction.

**What it does not establish:** CABAC/CAVLC correctness, 8×8 transforms, transform bypass, intra prediction, filtering, chroma, frame-memory reduction, complete-thumbnail quality, Wasm SIMD benefit, or a functioning custom video decoder. It is not a reproduction of the full paper. Reference source S4 documents the integer-transform context; the included experiment is independent tooling.

Evidence: `results/kernel_bench.json`, `results/dc_adverse_control.json`, `scripts/boundary_kernel.c`.

## 9. Experiment F — genuinely progressive output, with retained state

A native libjpeg prototype opened each already-progressive JPEG in buffered mode. It decoded scan one at 480×270, retained the coefficient state, consumed the remaining scans, and produced the final output. The final output matched ordinary final-only decoding of that same progressive JPEG byte-for-byte.

| Input | First usable native output | Final-only total | First + final total | Logical bytes consumed at first output |
|---|---:|---:|---:|---:|
| Chart | 15.98 ms | 33.71 ms | 41.99 ms | 42,055 / 322,313 (13.0%) |
| Texture | 20.48 ms | 86.65 ms | 100.85 ms | 68,389 / 2,060,601 (3.3%) |

There was one warmup plus ten randomized trials. Timers include header/decode/output allocation, but exclude process startup, reading the source file, and the later 240×135 analysis resize. Entire source files were already in memory. The byte counts are decoder cursor positions, not network measurements. Images and raw measurements are retained.

At 240×135, first-pass SSIM relative to final output was 0.9560 / 0.9872. This is genuine refinement of the same image, rather than exchanging a nearby video timestamp for an exact one.

The cost is important: finishing both passes took **24.6% / 16.4% more total time**. Buffered progressive JPEG also retains coefficient storage; a small output surface alone does not prove a small decoder working set. S5 documents this distinction. Actual attributable memory was not measured here.

This is a possible **authored-image provider**, not evidence that ordinary H.264 bytes support progressive JPEG scans. It is not the preferred default when an already-small, suitable thumbnail is available. A multi-pass video provider should likewise prove its total-work and memory behavior, not merely its early-output latency.

Evidence: `results/progressive_bench.json`, `scripts/progressive_jpeg.c`.

## 10. Browser probe and what remains genuinely unknown

Chromium 144.0.7559.96 launched, but localhost navigation failed with `net::ERR_BLOCKED_BY_ADMINISTRATOR`; a separate file-navigation attempt was also blocked. There was no usable hardware device in the container. Consequently **no WebCodecs video/image operation, GPU path, or Demuxe browser integration was measured**.

`results/browser_bench.log` preserves the failure. `results/browser_status.json` distinguishes it from an unsupported codec. The original attempted harness is archived; the continuation script has minor post-attempt cleanup/configuration fixes and is syntax-checked, not browser-executed here. It is diagnostic scaffolding, not a certified test suite.

Remaining uncertainties include isolated WebCodecs initialization, hardware-versus-software routing actually used, GPU scaling/readback, decoder-slot contention with playback, real source indexing/ranges, cancellation during work, stale-result disposal, and cold versus warm latency.

## 11. Multiple paths forward

**Path 1 — authored images, existing image tracks and caches.** Retain as the inexpensive first choice when the asset meets time, size and fidelity requirements. Reuse existing streaming-provider APIs rather than building duplicate manifest parsing. Shaka exposes image-track and thumbnail APIs (S6). Preparation belongs in the cost model when Demuxe must generate the assets itself.

**Path 2 — qualified source keyframe, then temporal refinement.** This is the most direct source-video follow-up. Select only the necessary encoded samples, use an independent decoder, keep the actual timestamp, and refine after dwell only when useful. Share validated source bytes without moving the playback read cursor or consuming protected playback capacity. A coarse thumbnail may be skipped entirely when an exact cached one already exists.

**Path 3 — existing codec-specific reduced reconstruction.** Admit by actual capability and quality evidence, not by a universal option. The JPEG screen is positive; MPEG-2 needs output-quality/performance qualification. Modern-video support remains decoder-specific. This path is useful even if no custom decoder is built.

**Path 4 — selective modern-video reconstruction.** Preserve as a removable, experimental provider. Start with one narrow eligible profile, compare it against the best full-decode-and-scale alternative, and require an end-to-end gain after parser/configuration/init/transfer costs. Do not start a broad codec rewrite to chase a kernel ratio. Its plausible niche is software-fallback thumbnail work where reconstruction remains an important measured cost.

**Path 5 — progressive authored image delivery.** Retain only if earlier first display is worth greater total work or storage/transport complexity for the intended source. Already-small independent thumbnails can beat a large progressive image. First-output latency, finish cost, and memory must be separate acceptance metrics.

A pre-existing low-resolution video representation is another input to the same provider system. It should be evaluated as an alternate representation with synchronization and fetch costs, not described as downscaling the original compressed source.

## 12. Contract that survives deleting the research provider

Separate three concepts: **requested time**, **represented time**, and **spatial fidelity**. A full-quality keyframe at 2 s is still temporally approximate for 3.5 s. A reduced-resolution reconstruction of 3.5 s can be temporally exact. A provider finishing its work does not imply either exact time or full fidelity.

A frame record should carry source revision, request generation, requested/actual timestamps, dimensions, provider identity, temporal/spatial qualification, and whether another update is expected. Preserve the existing one-result API; an optional internal update channel can later emit refinements. Do not require every provider to yield multiple frames or every caller to consume a stream.

Cached exact/finer results should not be replaced by later-arriving coarse ones. Source changes, seeks, cancellation and generation changes must invalidate stale publication. A provider may stop future work cooperatively without claiming it can preempt a hardware operation already executing. Images and decoded frames need explicit ownership/disposal, including shared-cache leases.

Playback isolation is a state invariant, not a promise of zero contention. Enforce an application-level preview queue, concurrency and byte/image budgets. Pause or shed preview work when playback is under pressure. A separate decoder can still compete for compute and memory, so the local continuation must measure the effect.

## 13. Decision and falsifiers

Pursue the provider architecture and an independent source-sample baseline. Keep the selective decoder off by default and uncommitted. Stop the generic lowres-flag shortcut on this tested profile. Keep progressive prepared images optional rather than making them the foundation.

A custom decoder should be stopped or restricted when it loses to the best existing provider after full costs, cannot preserve its declared output contract, materially interferes with playback, or only helps a profile too narrow to justify maintenance. A useful negative should remove a provider, not force a controller redesign.

Suggested future acceptance gates, **not retroactive claims about these exploratory timings**, are in `LOCAL_AGENT.md`. Before more algorithm work, establish real browser baselines and where time is spent. A small kernel improvement is irrelevant if indexing, source transfer or decoder setup dominates; a large CPU saving can still lose on first-use latency or total work.

**Bottom line:** progressive delivery is a robust product direction. Selective reconstruction is a credible research option. They should remain separable.
