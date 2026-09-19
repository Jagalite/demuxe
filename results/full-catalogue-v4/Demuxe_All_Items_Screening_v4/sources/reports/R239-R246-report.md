# Demuxe — R239–R246 execution report

**Run date:** 18 September 2026  
**Definition source:** The exact eight hypothesis titles and mechanisms in this conversation.  
**Scope:** Isolated native, browser and mathematical/component tests. No production source, route registry, PR or commit changed.

## Decision summary

| ID | Original hypothesis | Verdict | Decisive evidence |
|---|---|---|---|
| R239 | Extract an AV1 operating point before decoding | PROMISING — actual AV1 extraction and browser destination | 120→30 retained pictures; two native decoders and all 30 browser-observed frames matched. 60→15 fps over the same two seconds; 95 identical AAC packets. |
| R240 | Extract a native 2D view from multiview HEVC | BLOCKED — MV-HEVC fixture and browser HEVC destination | Ordinary valid HEVC failed the browser destination; actual multiview extraction was not executed. |
| R241 | Reconstruct gain-map HDR using browser-decoded component images | BLOCKED — actual Ultra HDR/GPU reconstruction prerequisites | No available WebGPU/WebGL2 and no local libultrahdr runtime/conforming fixture. No toy gain-map transform counted. |
| R242 | Keep decoder sessions continuous across transport and mux boundaries | BLOCKED — WebCodecs runtime unavailable; production audit not performed | VideoDecoder is undefined on the permitted origin. No substitution with MSE or native FFmpeg flush. |
| R243 | Cache inverse-transform results for recurring residual blocks | INCONCLUSIVE UTILITY — exact synthetic kernel, no convincing cache advantage | 160,000 output-sample comparisons passed, including forced collisions and buffer clearing. Synthetic recurrence only. |
| R244 | Recompute video effects only where the input actually changed | CORRECT CPU MODEL, SLOWER PROTOTYPE — GPU implementation untested | 0 mismatches in 96 frames plus 150 stress frames; 97.28% fewer blur pixels, but full 32.93 ms vs dirty 108.14 ms. |
| R245 | Factor a multichannel filter bank into fewer actual filters | PROMISING NATIVE DSP COMPONENT — exact factorable case only | 16 filter paths→2; exact integer oracle; float error 2.6e-18. Native median 16.48→8.23 ms against shared-FFT baseline. |
| R246 | Make parallel audio quantization deterministic without shared random state | PROMISING REPRODUCIBILITY COMPONENT — native and browser workers; no speed claim | Three published Philox KATs; 163,952 Node-worker output comparisons and 49,152 actual browser-worker comparisons, all exact. |

**QA: 61/61 top-level assertions passed.** These assertions include expected negative controls and accurate blocker/provenance reporting. They are not eight successful playback routes or 61 independent media files.

The useful separation is one bounded browser media route (R239), two promising computational components (R245/R246), two correct-but-unproven/unhelpful optimization prototypes (R243/R244), and three blocked full hypotheses (R240–R242).

## Environment and evidence levels

The container started without prior mounted lab files or a Demuxe checkout. This package supplies a fresh standalone Playwright/injected-byte harness using the established about:blank testing boundary; it is **not** the maintained production qualification harness or a matching Demuxe Wasm build. Chromium 144.0.7559.96, FFmpeg 7.1.5, libaom 3.12.1, GCC 14.2, Node 22.16.0 and Python 3.13.5 were inventoried in `results/environment.json`.

On the actual permitted origin, `VideoDecoder`, `ImageDecoder` and `AudioDecoder` were undefined, WebGPU was absent, and WebGL2 context creation returned null. `VideoFrame`, ordinary HTML video, Canvas-independent frame copying, MediaSource and ordinary Blob workers were available. No origin override, experimental API flag, administrator-policy change, network navigation workaround or GPU-enabling flag was used. Public source retrieval through the container also failed with DNS resolution errors; documentation was reviewed through the web tool, not treated as installed code.

Browser results below establish behavior in this one headless software environment. They do not identify a physical hardware decoder or demonstrate cross-browser, display, acoustic or deployment compatibility. Host CPU measurements do not predict Wasm cost.

## R239 — Extract an AV1 operating point before decoding

### Executed construction

The lab driver uses the installed libaom SVC API to author a **real** 160×96, 120-frame, 60 fps AV1 sequence with one spatial layer and three temporal layers. Actual frame OBU counts were 30 at temporal ID 0, 30 at ID 1, and 60 at ID 2. The encoder produced operating-point masks `0x107`, `0x103` and `0x101`.

A fixture-scoped parser extracts temporal ID 0, retains its coded frame OBUs, and rewrites the sequence header to advertise one available operating point. The IVF timing is changed from 60 ticks/second with every fourth picture retained to 15 ticks/second with sequential picture indices; presentation timestamps remain the same. The picture payload is not decoded and re-encoded by the extractor. This is not a general-purpose parser for arbitrary AV1 headers.

Both libdav1d and libaom decoded the full stream to 120 pictures and the extracted stream to 30. **All 691,200 Y/U/V samples in the extracted result matched the corresponding full-stream pictures, independently with each decoder.** Both produced the same SHA-256 for the extracted planes. AV1 IVF bytes fell from 49,448 to 9,447; these are fixture packaging sizes, not a universal bandwidth estimate.

The lab then muxed each video with the same generated audio into ordinary MP4. All **95 AAC packet payloads and PTS/DTS/duration records matched** between outputs. Both browser media elements reached EOF at 2.000 seconds, emitted the test tone within analyser-bin resolution, and produced images after three requested seeks. Audio observation is not a sample-exact physical-output or A/V synchronization audit.

A separate presentation-synchronized observer constructed `VideoFrame` objects inside frame callbacks during half-rate playback and compared actual I420 bytes against the independent native result. **All 30 distinct pictures and 691,200 bytes were compared with zero mismatches.** Half-rate playback was used to make observation reliable, not as a performance result. The normal-rate functional run also completed, but callback counts and instrumented drops are not being used to infer speed.

### Controls and boundaries

Truncating an OBU was rejected. More importantly, removing a required base-layer reference while retaining valid initialization still returned decoder success but produced **246,269 mismatched samples**. This establishes why generic packet dropping is not equivalent to valid operating-point extraction.

An initial seeked-only snapshot observer produced one mismatching capture (22,613 bytes) and lacked presentation-frame identity. A second pre-presentation attempt hit `InvalidStateError`. Those are retained as harness diagnostics, not silently erased or attributed to a decoder defect. The final observer binds its capture to the actual frame callback and compares complete bytes. `results/r239-browser-exact-initial.json` and `source/superseded-observer.py.txt` retain the earlier evidence/method. The exact-byte playback result does not retroactively prove every initial seek capture was correct.

**Verdict:** A useful bounded route experiment for intentionally requested lower cadence on a suitably scalable source. No arbitrary AV1 frame-dropping rule, automatic quality downgrade, WebCodecs route, or whole-player CPU improvement is admitted.

## R240 — Extract a native 2D view from multiview HEVC

The first browser HEVC gate was executed with a locally generated ordinary Main-profile HEVC MP4. The file decoded successfully through host FFmpeg, but browser playback failed with `DEMUXER_ERROR_NO_SUPPORTED_STREAMS` and zero decoded frames. The installed x265 reported version 4.1+1-1d117be; its `num-views` parameter probe returned -1. No conforming marked-eye MV-HEVC fixture was available in this fresh container.

**Verdict: BLOCKED.** The actual base-view extraction, eye identification, configuration reconstruction and stereo-reference comparison were **not** performed. A normal HEVC file was used only to test the destination, not relabeled as a successful MV-HEVC experiment.

## R241 — Reconstruct gain-map HDR using browser-decoded component images

The permitted browser exposed no GPU context. The container had no discoverable libultrahdr runtime and no conforming Ultra HDR fixture with a pinned decoded reference. Consequently the browser-component decoding plus HDR reconstruction experiment could not be executed as defined.

**Verdict: BLOCKED.** No made-up gain-map carrier, generic multiplication shader or unrelated tone mapper was substituted for the actual Ultra HDR route. This is not a format failure or a claim about browsers outside this harness.

## R242 — Keep decoder sessions continuous across transport and mux boundaries

The required `VideoDecoder` object was unavailable on the permitted opaque/insecure origin. The normative specification does distinguish flushing from batch completion and requires a key chunk after a decoder flush, but that documentation is not runtime evidence for this binary.[S2]

**Verdict: BLOCKED.** No continuous-versus-flushed WebCodecs experiment was run. Native FFmpeg drains and MSE operations were not counted as substitutes. The Demuxe production source was not audited in this run, so there is no claim that current production batching is wrong.

## R243 — Cache inverse-transform results for recurring residual blocks

A standalone bounded 4×4 integer-transform/cache prototype was built in native C++. The transform arithmetic was checked against an independent Python wide-integer oracle for 8- and 10-bit predictions, coefficient values in [-512,512], forced hash collisions, clipping and buffer clearing. **160,000 output-sample comparisons had zero mismatches; no coefficients remained uncleared.** A separate ASan/UBSan smoke run completed with empty stderr.

The cached item is the residual block, not final prediction-added pixels. Actual coefficients and declared bit depth participate in the key and full key equality is checked. Zero/DC-only cases bypass the cache in both constructions. Capacity was 256 entries.

No real encoded-corpus transform trace or actual FFmpeg decoder hook was available. Performance tests therefore use explicitly synthetic distributions, not purported real hit rates. Seven measured runs per construction followed one warmup, with rotated order and 200,000 blocks per run:

| Synthetic trace | Cache hits | Baseline median | Cache median | Cache/baseline |
|---|---:|---:|---:|---:|
| unique | 0/200,000 | 9.372 ms | 15.218 ms | 1.624× |
| 75pct_pool | 104,861/200,000 | 10.178 ms | 18.947 ms | 1.862× |
| all_pool | 160,777/200,000 | 13.203 ms | 13.015 ms | 0.986× |

The unique and mixed workloads were slower. Even the deliberately repetitive pool was only approximately tied within visibly variable samples. Splitting a transform from an optimized production SIMD implementation could introduce further cost.

**Verdict:** Synthetic kernel correctness is supported; utility is **inconclusive and not a demonstrated performance win**. First obtain representative production transform traces before investing in this cache. No full decoder speed or production hit-rate claim follows.

## R244 — Recompute video effects only where the input actually changed

A CPU model retained intermediate blur, pointwise-color and subtitle-composite surfaces. Actual changed pixels were discovered by comparing consecutive source arrays. Damage was expanded by the 3×3 blur footprint; color-parameter changes, subtitle changes and an explicit seek reset invalidated the appropriate outputs.

The 96-frame 256×144 trace was compared against full recomputation for **3,538,944 final pixels with zero mismatches**. Another 150 randomized edge/discontinuity/parameter cases also matched. A repeated identical input required no additional effect evaluation. Omitting the blur halo generated **116,265 mismatches**, so the control detected the dependency error.

Blur work fell from **3,538,944 to 96,175 pixels**, a **97.28% reduction**, but the actual CPU prototype was slower: **32.93 ms full recomputation versus 108.14 ms incremental**, approximately **3.28×**. Eight measured runs per construction followed warmup, with rotated order; the timing includes damage discovery, retained copies and the same reset event. Pixel-area reduction is emphatically not a speedup measurement.

**Verdict:** Correct dependency propagation in this model; **no performance win for this implementation**. A GPU implementation receiving cheap trustworthy damage metadata could behave differently, but it was not tested and must not inherit this result as a GPU speedup.

## R245 — Factor a multichannel filter bank into fewer actual filters

A synthetic four-input/four-output FIR bank was authored with an exact rank-two constant factorization across the complete impulse responses. A separate integer direct-convolution oracle and the factored construction agreed for all **2,196 samples**. Clipping the intermediate mix deliberately invalidated equivalence, producing **2,195 differing samples**. Perturbing one filter coefficient was rejected by the supplied-factor equality check.

For the floating implementation, the baseline is a **uniform-partitioned matrix convolver that already shares each input FFT across outputs**. It is not 16 isolated FFT pipelines. The candidate mixes four inputs to two, runs two independent filter paths, then mixes to four outputs. Partition size, input length, output length, zero initial state and full tails are identical. No impulse-response normalization is silently applied.

At 1,024-tap kernels, 256-sample partitions and 32,768 input samples, **135,164 output samples** differed by at most **2.6e-18**, below the predetermined absolute tolerance of **1e-12**. An independent direct time-domain check including the complete effect tail had maximum error **2.17e-18**. Floating equality is tolerance-qualified, not bit identity.

Nine measured batches followed warmup, alternating order; each recorded figure averages four complete render sessions. Median CPU per session was **16.48→8.23 ms**, a **50.1% decrease** in this native NumPy/FFT component. Input/output mixing and tail processing are included. Cached kernel setup is excluded from repeated render timings and reported separately in `r245.json`. Timing variability is retained in the raw samples; no confidence interval or browser speed forecast is asserted.

**Verdict:** The strongest optimization candidate in this batch, but only for a verified exact factorization. This does not discover a useful factorization for arbitrary room responses, allow approximate audio silently, or measure Demuxe/Wasm/realtime-device behavior.

## R246 — Make parallel audio quantization deterministic without shared random state

A JavaScript Philox4x32-10 implementation was checked against **three published Random123 known-answer vectors** and an independently implemented vectorized Python integer oracle.[S5] The counter contains absolute sample-index low/high words, stable channel identity and separate draw identity; the key is the render seed. Two draws generate the explicitly specified unshaped triangular dither. Input is exact Q8 in output-LSB units, with a declared rounding and saturation rule.

Cases span zero, the **2^32 boundary**, and **2^48+9**, two stable channel identities, fractional half-LSB inputs and output clipping boundaries. Four Node workers exercised reverse/shuffled jobs, native worker termination followed by replay, and output-slot reordering. **163,952 output comparisons were exact**. A negative per-chunk index reset produced **21,206 mismatches**.

Four actual Blob Web Workers in the permitted browser executed **192 jobs / 49,152 output comparisons**, again with **zero mismatches**. These are actual worker executions, not a serial simulation. They do not constitute browser audio playback or a speed benchmark.

A 262,144-draw statistical smoke test observed mean 0.0003343, variance 0.1665214 (ideal triangular variance 1/6), and cross-channel correlation 0.0021863. These bounded checks are not full RNG statistical certification or a cryptographic claim.

**Verdict:** Useful deterministic parallel-preparation component. No speed improvement is claimed. This defines a new qualified dither realization, not byte equality to an existing unspecified dither engine; noise shaping and stateful filters remain outside the profile. Lossless integer playback is untouched.

## What should move forward

R239 merits integration work around the explicit reduced-cadence contract and supported scalable sources. R245 merits profiling on genuinely factorable application graphs and a maintained runtime. R246 is useful for deterministic render/restart behavior even without a speed claim.

R243 needs actual recurrence data before more cache engineering. R244 needs a cheaper damage source or different execution model before any performance promotion. R240, R241 and R242 need their missing runtime/fixture/source-audit prerequisites, not replacement tests under the same IDs.

## Reproduction and files

Run `bash reproduce.sh` from this directory on a compatible environment. It requires the listed installed compiler/libraries, FFmpeg, NumPy/SciPy, Node, Chromium and Python Playwright. The scripts do not install dependencies, navigate around origin restrictions or edit a production checkout. A different browser may expose different APIs; this report records this run only.

`results/summary.json` is the machine-readable decision map. `results/qa.json` names all assertions. The agent catalog binds each ID to its exact title and output contract. Original source scripts, generated fixtures, command logs and raw measurements are packaged together. Regenerable executables and shared libraries are excluded from the evidence archive.

## Primary references reviewed

[S1] AV1 bitstream semantics / operating-point exclusion: https://raw.githubusercontent.com/AOMediaCodec/av1-spec/master/07.bitstream.semantics.md . Native encoder API declarations were read from the installed libaom 3.12.1 headers; the fixture driver calls its real SVC controls.

[S2] W3C WebCodecs, especially decoder availability, flush/key-chunk requirements and output observation: https://www.w3.org/TR/webcodecs/ . Source-level rules do not establish runtime availability.

[S3] Apple MV-HEVC base-view description: https://developer.apple.com/videos/play/wwdc2023/10071/ . Concept reference only; no MV-HEVC extraction result here.

[S4] libultrahdr reference implementation: https://github.com/google/libultrahdr and https://raw.githubusercontent.com/google/libultrahdr/main/lib/src/gainmapmath.cpp . Reviewed as references; not installed or executed in this run.

[S5] Random123 Philox known-answer vectors: https://raw.githubusercontent.com/DEShawResearch/random123/main/tests/kat_vectors . Algorithm reference: https://raw.githubusercontent.com/DEShawResearch/random123/main/include/Random123/philox.h . The lab JavaScript and Python implementations are separately written and validated by the vectors.

[S6] Pinned FFmpeg 7.1.1 H.264 inverse-transform reference: https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/h264idct_template.c . The lab kernel is a bounded standalone implementation, not a build of this file or production integration.
