# Demuxe media/browser frontier — R183–R192 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0 on Linux x86-64.  
**Scope:** bounded media/browser/codec/scheduling experiments. No Demuxe production source changes.

## Result summary

| ID | Verdict | Result |
|---|---|---|
| R183 | **PROMISING, mechanism only** | Independently browser-decoded VP8 color + alpha composed exactly at sampled RGBA points in WebGL; deliberately stale alpha was distinguishable. |
| R184 | **BLOCKED** | No trusted Dolby Vision fixture or HDR display; this Chromium advertises neither hvc1/hev1 nor WebGPU on the permitted page. |
| R185 | **PROMISING** | Progressive JPEG produced an intermediate compositor refinement before final detail; replacing the slow source canceled the stale request cleanly. |
| R186 | **PROMISING, content-dependent** | XOR/checkpoint cache reconstructed decoded frames exactly in both directions and compressed extremely well on coherent motion; random-noise control grew beyond raw. |
| R187 | **PROMISING MODEL / encoder integration untested** | AVC-derived frame motion/partition statistics reduced constrained block-search evaluations ~30.4% for ~0.068% prediction-SSE increase. |
| R188 | **PROMISING MODEL** | Verified-piece-aware scheduling made a verified 3 s fMP4 prefix available at tick 27 vs 111 under the deterministic random/throughput baseline with one failed verification. |
| R189 | **PROMISING MODEL** | A validated future sparse-track DTS lower bound safely released dense packets up to 44.98 s without changing canonical final mux order. |
| R190 | **PROMISING CORRECTNESS / performance unqualified** | Two associative clipped scans reproduced FFmpeg IMA-WAV output exactly for mono/stereo and extreme controls; the portable Python scan was much slower than sequential decode. |
| R191 | **PROMISING MODEL** | Cached affine block transforms reproduced a fixed biquad across reordered clips/seeks to numerical tolerance and accelerated state-only plan/seek queries in the Python model. |
| R192 | **PROMISING TOOLING** | Identity-coded A/V media caught valid-looking wrong playback: video reorder, channel swap, and 0.5 s audio timeline shift, in both host and Chromium oracles. |

## R183 — native color with separately decoded transparency

A three-second VP8 color stream and a separate VP8 grayscale alpha stream were decoded by Chromium, sought independently to 0.5, 1.5 and 2.5 s, uploaded as two WebGL textures, and combined by a fragment shader.

At two spatial samples for every timestamp, the shader's output exactly equaled the browser-decoded color RGB plus the alpha stream's decoded grayscale value: **maximum sampled RGBA difference = 0**. A deliberately stale pairing (color at 1.5 s, alpha at 0.5 s) produced alpha 56 instead of the correctly paired 205 and was therefore detectable.

This validates synchronized two-stream composition, not a performance win. The run used ANGLE/SwiftShader rather than a physical GPU, and it does not show that this is cheaper than native WebM alpha when that representation already exists.

## R184 — browser HEVC base + separate Dolby Vision reshaping

The exact card is **BLOCKED** in this lab. FFmpeg includes `dovi_rpu` and a libplacebo filter, but there is no trusted Dolby Vision fixture or HDR-capable physical display. Chromium returns an empty support string for the tested `hvc1`/`hev1` configurations, and WebGPU is unavailable on the permitted non-secure page.

No synthetic RPU or SDR-only visual approximation was substituted for the intended claim.

## R185 — progressively refine one preview

The controlled progressive JPEG is 196,597 bytes and contains ten scans. Its HTTP response was released in four stages. Chromium compositor screenshots showed a coarse/incomplete presentation before completion and later an intermediate refinement whose mean absolute RGB error to the final image was **7.30 / 255**, before converging to **0** at final detail.

A second probe started the slow image, replaced it before completion with a different complete progressive JPEG, and observed the replacement as the committed image. The abandoned server write ended with a broken pipe, providing a concrete cancellation signal.

One useful implementation detail surfaced: `canvas.drawImage()` did not expose the intermediate refinements in this build, while browser compositor screenshots did. Provisional preview state and final decoded-image state should therefore remain distinct concepts.

## R186 — reversible XOR frame cache

A four-second H.264 fixture was decoded to 120 actual 320×180 grayscale frames. The cache stores a checkpoint every 15 frames plus zlib-compressed XOR deltas; bridge deltas at checkpoint boundaries preserve exact reverse stepping.

All sampled random reconstructions and the complete 119-step backward traversal were **byte-exact**. On this deliberately coherent moving-shape source:

- raw full-frame cache: **6,912,000 bytes**;
- XOR/checkpoint representation: **12,595 bytes**;
- reduction: **99.82%**;
- full reverse traversal: **15.9 ms median**;
- re-decoding the source: **78.5 ms median**;
- raw full-cache pointer/index traversal: **0.01 ms median**.

The negative control matters: random incompressible frames produced a delta cache **1.059× larger than raw**. This is a content-dependent reverse-playback cache, not a universal compact frame format.

## R187 — recover encoder decisions from the source

The pilot encoded a controlled source with x264 first-pass statistics, then used the recovered frame-level motion-bit and intra/partition decisions to choose a constrained search radius in a separate block-matching transcoder model. The model operates on frames decoded from that H.264 source.

Against a ±6 exhaustive search, the hint-driven policy reduced candidate evaluations **30.38%** while increasing total prediction SSE only **0.0685%** on the controlled slow/fast-motion plus scene-change fixture.

This is evidence that source codec decisions can usefully steer later search. It is **not** an AVC→HEVC encoding benchmark: source vectors/partitions were not injected into x265, no HEVC bitrate/quality comparison was produced, and the model's residual proxy is not a complete encoder cost function.

## R188 — schedule verified playable data

A real 12-second fragmented MP4 was divided into 16 KiB hash-verified pieces. The fixture contains twelve one-second fragments; init/fragment byte ranges were mapped to the pieces they require. One early useful piece was deliberately corrupted on its first delivery and rejected by SHA-256 verification.

At equal one-piece-per-tick delivery capacity:

| Policy | 1 s verified/decodable | 3 s | 6 s | all pieces |
|---|---:|---:|---:|---:|
| deterministic random/throughput order | 111 | 111 | 111 | 111 |
| earliest verified-playable region | **9** | **27** | **55** | 111 |

The first three verified fragments form a real prefix that decodes **90 frames**. The measured 4.11× 3-second figure is specific to this deterministic ordering and failed-piece scenario; the durable result is that downloaded byte count and verified decodable media are different scheduling objectives.

## R189 — sparse-track future-time bounds

The mux model contains continuous 30 fps video, 20 ms audio, and sparse timed metadata at 45 and 90 seconds. Before the sparse parser has materialized its next packet:

- strict interleave can prove **0** dense packets safe;
- a 10-second max-delta-style escape can emit **800** packets;
- a validated source-index statement that the next sparse DTS is **>=45 s** safely emits **3,600 packets**, through 44.98 s.

The bound-aware output is an exact prefix of the final canonical mux order. A deliberately false `>=60 s` bound crosses the real 45-second event and fails the prefix oracle.

The key requirement is epistemic, not timeout-based: the bound must come from a validated source/sample index, be scoped to the source/timeline epoch, and be invalidated on seeks/discontinuities.

## R190 — restricted IMA ADPCM through two clipped scans

The tested variant is **IMA ADPCM WAV**. Its state dependencies are split into two associative clipped transitions:

1. step-index state `i' = clip(i + adjust(code), 0, 88)`;
2. after the resulting per-code signed differences are known, predictor state `p' = clip(p + delta, -32768, 32767)`.

Using FFmpeg's exact integer rule `delta = ((2*mag+1)*step)>>3`, the two-scan construction is sample-exact to both a conventional sequential implementation and FFmpeg for:

- mono: **8,164 samples**;
- stereo: **8,136 frames × 2 channels**;
- 25 synthetic controls covering predictor extremes and starting indices 0/1/44/87/88.

The portable Hillis-Steele-style Python oracle took **59.1 ms** for 8,192 nibbles versus **2.38 ms** sequentially. Therefore the algebra is parallelizable and exact; a work-efficient CPU/GPU implementation must still demonstrate a complete-pass speedup after extra scans, synchronization, storage and readback.

## R191 — seekable fixed linear effects via block state transforms

A stable fixed 3 kHz biquad low-pass was expressed as:

`s[n+1] = A s[n] + B x[n]`.

For each 128-sample block the experiment cached an affine state transform `s_out = M s_in + b`. These transforms compose as `(M2,b2) o (M1,b1) = (M2 M1, M2 b1 + b2)`.

On a 260-block reordered/repeated edit timeline:

- complete audio output matched continuous filtering exactly in the implemented double-precision recurrence;
- maximum seek-state error: **2.78e-16**;
- 35 edit-plan final states differed by at most **2.78e-16**;
- transform vs checkpoint seek state differed by at most **6.11e-16**.

State-only benchmark medians in this Python implementation:

- derive 35 plan end states by sample replay: **452.3 ms**;
- compose cached transforms: **9.77 ms** (**46.3×**);
- 300 checkpoint/replay seek-state queries: **248.5 ms**;
- cached prefix-transform queries: **0.507 ms** (**489.6×**).

These ratios are algorithm/model measurements, not browser audio speedups. The card intentionally excludes nonlinear effects, clipping, dynamic compression, parameter automation and arbitrary Web Audio internal state.

## R192 — identity-coded witness media

The four-second fixture carries independent identities in multiple dimensions:

- each video second has an eight-bit visual code: `0xA0, 0xA1, 0xA2, 0xA3`;
- left-channel tones are 320/400/480/560 Hz by second;
- right-channel tones are 900/1000/1100/1200 Hz.

Both FFmpeg-based and Chromium-based oracles accepted the correct file. Three decodable, believable wrong variants were then tested:

1. **video timeline reorder:** codes became `A0, A2, A1, A3`; audio still looked correct;
2. **stereo channel swap:** video remained correct, but the per-channel tones reversed;
3. **0.5 s audio shift:** video remained correct, but time-local audio identities no longer matched their expected epochs.

All three were detected by both host and browser identity checks. This demonstrates why fixtures that merely contain “moving video + audible tone” can accept convincingly wrong playback.

## Evidence integrity

The final QA record contains correctness, negative-control and scope checks for all ten cards. Hardware/secure-context absence is recorded as a blocker rather than converted into a failure. See `results/summary.json` and `results/qa.json` for machine-readable records.