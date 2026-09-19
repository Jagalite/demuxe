# Demuxe — R363–R366 executed laboratory report

**19 September 2026 · Original proposal IDs preserved · No production changes**

## Executive result

**94/95 executed assertions passed; 1 failed.** R364 was capability-blocked and is not included as a passing experiment. Two analysis components produced exact qualified results with conditional performance benefits. R363 demonstrated actual browser-owned HLS consumption of Blob resources but did not meet complete fidelity or HTTP-deployment qualification.

| ID | Disposition | Decisive observation |
|---|---|---|
| R363 | Partial; not admitted | Four unchanged fMP4 segments loaded through a native Blob-backed HLS playlist; four seeks and EOF worked. HTTP navigation and HLS pixel readback were blocked. Direct-file/MSE pixel equality failed. |
| R364 | Blocked | No WebGPU on the permitted page; zero render bundles executed. |
| R365 | Promising, data-dependent | Exact GIF index/color counts without phrase expansion. Repetitive-image queries 9.45× faster; noise 1.27× slower than fused C decoding/counting. |
| R366 | Promising repeated analysis | 186 exact-rational cases passed. 100 cached fade-energy queries 12.25× faster; build amortizes after about 48.2 queries. |

The failed assertion is **direct-file versus MSE selected-frame RGBA equality**, not a claim that HLS decoding failed. HLS pixels could not be read. Neither successful startup nor matching callback timestamps establishes complete visual/audio equivalence.

## Provenance and environment

The original `Demuxe_R363_R366_Proposals.md` was recovered from the user's Demuxe files and read in full. Its file ID and exact card titles/contracts are in `source/provenance.json`; the operative retrieved text is retained in `source/proposal-contracts.md`. The original raw file could not be materialized, so no original-file byte hash is asserted.

Environment: Chromium 144.0.7559.96, FFmpeg 7.1.5, GCC 14.2, Python 3.13.5, x86-64 Linux. Python packages: {'numpy': '2.3.5', 'Pillow': '12.3.0', 'playwright': '1.57.0'}. This is not a fresh audit of the production repository, a matching Emscripten build, or a browser/device matrix.

Normal localhost navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`. The allowed `about:blank` page exposes MediaSource but no WebGPU, WebGL, VideoDecoder, AudioDecoder, or ImageDecoder. Its native HLS MIME response was `maybe`. That response was followed by a real media test, not treated as playback proof.

## R363 — Expose prepared fragments as a native HLS presentation

### What ran

Generated a finite source with one H.264 Baseline video stream and one AAC audio stream, stable configuration, zero-based declared elementary-stream timelines, 120 video pictures, and four closed-GOP segment entry points. The AAC elementary source includes its coded priming/padding samples; this is not a claim of restoring the pre-encode sine waveform's gapless trim.

A packet-copy HLS mux produced one initialization segment and four media segments. The playlist has `EXT-X-MAP`, four one-second `EXTINF` values, and `EXT-X-ENDLIST`. The MSE and direct Blob routes consume the **same initialization and segment bytes**, without another encode.

Ordered video/audio packet hashes and printed timing records match between HLS and the concatenated fMP4. FFmpeg's HLS demux and direct fMP4 demux decode to identical YUV and float PCM when unintended CLI frame-rate conversion is disabled with `-fps_mode passthrough`.

An immutable, generation-addressed loopback resource provider served correct range bodies, lengths, content ranges, and MIME types to a normal HTTP client. Twelve resource-range checks passed; a stale generation URL was rejected. This does not establish browser delivery because browser HTTP navigation was denied.

### Actual native Blob-HLS probe

No HLS JavaScript library or MSE bridge is used in the HLS branch. The playlist and its initialization/segment resources are Blob URLs, assigned to the video element. All three branches completed four seeks followed by a continuous playback-clock run to EOF and cleanup.

| Route | Reported duration | Seek-picture media times |
|---|---:|---|
| Direct concatenated fMP4 Blob | 4.010667 s | 0.3, 0.966667, 1, 2.7 |
| Window-owned MSE | 4.031999 s | 0.3, 0.966666, 1, 2.7 |
| Native HLS over Blob resources | 4.031999 s | 0.3, 0.966666, 1, 2.7 |

HLS and MSE reported the same four sampled frame times and final duration in this run. HLS `getImageData()` failed on a tainted canvas at all four probes. No origin/CORS bypass was attempted.

### Unresolved correctness differences

The readable direct-file and MSE captures were **not pixel-identical at any of the four sampled times**. The maximum absolute RGBA-component difference was 34 code values, despite corresponding frame timestamps. Explicit BT.709 metadata did not resolve this. Raw captures and per-probe differences are preserved; the cause is not established.

The direct route also reports a duration approximately 21.332 ms shorter than MSE/HLS. Browser audio samples and end trimming were not independently observed. Do not silently equate these routes.

**Verdict:** useful native-HLS/Blob delivery evidence, but **partial and not admitted**. Required HTTP qualification, native-HLS pixel/audio equivalence, full adversarial playlist cases, service-worker behavior, and complete-cost measurements remain open. No HLS performance or battery improvement is assigned.

Initial offset-timeline and untagged-color probes remain in labeled diagnostic directories. They are not included in the final assertion count.

## R364 — Reuse GPU command sequences across changing video frames

The required WebGPU interface is absent on the permitted page, WebGL context creation fails, and `/dev/dri` is absent. A normal localhost attempt is administration-blocked.

**Zero render bundles were constructed or replayed.** No CPU command-list mock substitutes for changing-frame GPU execution. Resource lifetime, external-texture expiration, device loss, bundle invalidation, output equality, and encoding-time savings remain untested.

**Verdict: blocked environment**, not a failed algorithm or a positive component result.

## R365 — Compute GIF color statistics without expanding LZW strings

### Implementation and independent oracles

The candidate parses ordinary GIF LZW codes into parent/suffix/first-symbol/phrase-length records. It increments emitted-entry weights, then propagates those weights in reverse creation order at each clear/end. It does **not** visit each expanded phrase byte and does not allocate the expanded index image.

The C comparison path uses the same validated code parser and immediately counts literals by following each phrase's prefix chain. It is already a fused, no-image-allocation baseline. Both receive the same compressed bytes; timing includes container validation and sub-block gathering. This is a bounded hand-written C component comparison, not a claim to beat every optimized GIF implementation.

Eight named GIF fixtures plus 40 independently Pillow-encoded random images match every index-histogram bin and declared sample count. Named cases additionally verify mapped RGBA counts; seven nontransparent cases compare complete independently decoded FFmpeg RGBA output. The duplicate-palette/transparent case uses Pillow's explicit RGBA interpretation.

Cases exercise 1,447-byte phrases, valid next-entry codes, unusual repeated clears, all code widths from 3 through 12, and 2,813 emissions after a dictionary fills without clearing. Malformed references, invalid palette indexes, truncation, missing END/trailer, over-expansion, unsupported layouts, and checked counter overflow are rejected. Partial results are not published by the wrapper.

The supplementary sanitizer run executed **2004** valid/mutated compressed-input probes: 517 accepted identically and 1487 rejected by both paths, with no ASan/UBSan diagnostics. This is bounded mutation testing, not an exhaustive security proof.

### Complete in-memory query timings

Nine alternating-order trials per variant, five complete queries per timed trial; medians below. Independent image decoding is correctness-oracle work, not part of the candidate timing.

| Fixture | Propagation | Fused expansion/count | Baseline / candidate |
|---|---:|---:|---:|
| Pillow-encoded repetitive 1024×1024 | 0.2132 ms | 2.0142 ms | 9.45× |
| Adversarial long-phrase 1024×1024 | 0.0285 ms | 1.6552 ms | 58.18× |
| Pillow-encoded noise 1024×1024 | 7.6711 ms | 6.0413 ms | 0.79× |
| Literal-dominated 256×256 | 0.3909 ms | 0.4069 ms | 1.04× |
| Full dictionary without clearing | 0.0463 ms | 0.0429 ms | 0.93× |

For the repetitive image, the candidate parsed 22,439 codes, created 22,426 dictionary entries and propagated 18,019 nonzero composite entries instead of walking 1,048,576 expanded literals. The native kernel's dictionary/weight arrays have a 57,344-byte upper bound, excluding its result, compressed input, and wrapper allocations.

**Verdict:** exact and promising for aggregate queries over sufficiently repetitive sources; slower on noise/short phrases. It does not render a GIF, recover positions, support ROI histograms, or replace animation compositing. A playback application that already decodes every image must count any additional analysis pass.

## R366 — Evaluate time-varying audio fades from cached polynomial moments

### Exact arithmetic and declared sample grid

Two fixed-alignment mono integer sources use block-local sample coordinate j. Each gain is a + b*j. A query interval is half-open, and a test ramp's nominated left/right values occur at its first/last included samples; a singleton block is constant. Breakpoints are aligned to prepared blocks. Three source pairs times three polynomial orders yield nine stored moments per block, with the factor of two on off-diagonal pairs.

**186 exact rational comparisons passed** across random, identical, opposite-polarity, fixed delayed-looking, impulsive, silent, and 16-bit-extreme inputs. Tests include irregular/singleton final blocks, a 10^15 absolute origin translated to local coordinates, and a negative control omitting the cross-term factor. A 4,096-sample extreme case demonstrates why blindly using signed 64-bit moment accumulators can overflow.

Unaligned queries, changed source/alignment identity, unsupported polynomial degree, and clipped-output requests are rejected by the tested profile gate. These are component admission checks, not an integrated production cache.

### Floating arithmetic and cancellation

The practical kernel uses compensated extended-precision accumulation and local coordinates. Its contract is `abs(error) <= 1e-12 * max(1, reference_energy)` on the tested normalized inputs and finite gains. The 120 ordinary randomized numerical cases returned the same rounded binary64 energy as the extended-precision direct reference. This observation is not a universal bit-identity theorem.

Opposing sources expose cancellation: for a residual gain of 2^-40, unguarded moment evaluation returned **8.3266727e-17**, versus **1.1173928e-21** from direct extended-precision evaluation. The guard re-evaluated all four sensitive blocks directly and recovered the reference value. It does not clamp unexplained negative energy to zero. The indicator is an engineering bound/heuristic in this bounded prototype, not formal interval certification. A less severe 2^-20 case remains within the declared absolute tolerance without fallback.

### Repeated-query economics

Two 262,144-sample float64 input arrays, 1,024-sample blocks, and four aligned automation intervals per query:

| Quantity | Measured value |
|---|---:|
| Extra moment-index payload | 36,864 B = 36 KiB |
| Common retained source arrays, needed for direct fallback | 4,194,304 B = 4 MiB |
| Moment construction | 13.1354 ms |
| 100 cached guarded queries | 2.4226 ms |
| 100 fused native-C mix-and-energy queries | 29.6665 ms |
| Prepared-query ratio | 12.25× |
| Ratio including build, at 100 queries | 1.91× |
| Approximate break-even | 48.2 queries |

The timed baseline reads already-decoded samples and does not allocate the mixed waveform. Both variants receive the same prepared automation coefficients. The benchmark had zero fallback blocks; sensitive cases are separately tested and their fallback cost must be counted in relevant workloads.

**Verdict:** promising after enough repeated energy queries; not attractive for a few one-off fades. No peak, clipping-count, true-peak, integrated-loudness, browser-conformance, or full waveform-generation result is claimed. Final playback/export still requires rendering the chosen mix.

## Evidence and outstanding gates

See `results/qa.json`, `results/summary.json`, individual `R363.json`–`R366.json`, timing arrays, browser event logs, pixel captures, fixtures and source code. SHA-256 manifests establish package consistency, not authenticity or algorithmic correctness.

R363 requires a readable native-HLS picture/audio oracle and the actual intended delivery configuration. R364 requires an actual WebGPU device. R365 needs production opportunity profiling and a policy for adverse sources. R366 needs integration of cache identity, numerical fallback, and real query counts. No automatic route or fidelity policy was changed.

## Primary references consulted

- GIF89a specification: `https://www.w3.org/Graphics/GIF/spec-gif89a.txt` (LZW and deferred clear behavior).
- RFC 8216: `https://www.rfc-editor.org/rfc/rfc8216.html` (the finite fMP4 HLS subset).
- The original proposal source register also identifies WebGPU and Web Audio specifications. An attempted WebGPU web fetch failed; no GPU execution claim relies on that fetch.