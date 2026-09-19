# Demuxe media/browser frontier — R214–R222 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0.  
**GPU gate:** this headless Chromium exposes neither WebGPU, WebGL nor WebGL2. GPU-oriented cards therefore separate host/browser component correctness from untested GPU execution.

## Outcome summary

| ID | Verdict | Decisive result |
|---|---|---|
| R214 | **PROMISING COMPONENT / GPU BLOCKED** | A 50×8 v210 frame with a partial 6-pixel packing group and 112 bytes of row padding unpacked to all Y/U/V samples with zero error versus FFmpeg. |
| R215 | **PROMISING MODEL / GPU BLOCKED** | Upload-layout admission preserved every visible byte across alignment-stressing RGBA8 layouts, admitted four direct-write-compatible cases and rejected a misaligned control. |
| R216 | **PROMISING / STRONG** | Chromium accepted one multi-range fetch for three distant H.264/AAC MP4 regions. Multipart body was ~31.5 KB versus 260.6 KB for one contiguous span; all three clips decoded and cancellation stopped the transfer early. |
| R217 | **PROMISING / STRONG** | Real order-1 FLAC residuals generated 124 exact min/max/sum/energy waveform bins across frame boundaries with zero candidate-side PCM-block materialization. |
| R218 | **PROMISING COMPONENT / GPU BLOCKED** | Browser zlib inflation plus exact None/Sub/Up scan reconstruction reproduced all 5,092 RGBA bytes of a restricted PNG. GPU execution remains unavailable. |
| R219 | **PROMISING COMPONENT** | One shared source FFT feeding four convolutions was numerically identical to four separate analyses and was 1.44× faster in the host NumPy prototype at the same block size/latency. |
| R220 | **PROMISING MODEL** | Scoped 33-bit timestamp unwrapping correctly handled rollover and near-wrap reordering, preserved a 0.5 s A/V offset, and refused unmarked discontinuities/large ambiguous jumps. |
| R221 | **PROMISING PLANNER MODEL / GPU BLOCKED** | Lifetime-guided allocation preserved symbolic outputs with delayed consumers and cut planned texture allocation by 24.7–50.2% in the tested graphs. Actual GPU residency is unmeasured. |
| R222 | **PROMISING / STRONG** | An independent remux record checker verified 232 unchanged compressed packets, codec config, timing/composition offsets and three fragments; five deliberately corrupted records were each rejected. Chromium played 90/90 video frames to EOF. |

**QA: 74/74 assertions passed.**

## R214 — packed v210 without CPU planarization

The fixture deliberately uses width 50, so the last v210 packing group is partial, and FFmpeg emits a 256-byte row stride even though the packed groups require only 144 bytes. The candidate unpacker interpreted the packed 10-bit words directly and recovered 400 Y, 200 U and 200 V samples exactly. Maximum error was zero on all planes. A one-byte-truncated control was rejected.

This proves the packed-buffer interpretation needed by the proposed shader path. It does **not** establish the complete route benefit because no GPU API is available in this browser session.

## R215 — upload operation selected by existing layout

A bounded layout model compared decoder rows against the constraints of a direct texture write and a 256-byte-aligned staging copy. Four layouts were legal for the direct path; an offset-misaligned control was rejected. Every staging reconstruction produced the identical visible RGBA bytes.

The useful observation is structural: an uploader need not blindly normalize every row into a 256-byte staging layout when the destination operation admits the decoder's existing stride. Physical upload cost remains unmeasured here.

## R216 — one request for distant byte ranges

Three independently decodable 0.6-second H.264/AAC MP4 clips were embedded far apart in a 375,274-byte resource. Their useful bytes total 31,212 bytes.

- Three ordinary range requests: **31,212 response-body bytes**, 3 requests.
- One contiguous request spanning all regions: **260,586 bytes**, including **229,374 bytes of gaps**.
- One multipart/byteranges request: **31,577 bytes** in the host test, only 365 bytes of multipart overhead, 1 request.

The independent multipart parser recovered the three requested byte regions exactly, and each extracted MP4 contained both H.264 video and AAC audio and decoded successfully. Chromium itself also issued the multi-range fetch and received HTTP 206 `multipart/byteranges` (~31.5 KB). A separate slow-response test aborted with `AbortError`; the server observed the disconnect after only 49,152 of 7,505,480 bytes had been sent.

This is strong evidence for the transport primitive. Production admission still needs server capability discovery and a bounded multipart parser.

## R217 — exact waveform summaries from first-order FLAC

The 2-second mono fixture was actually encoded as fixed predictor order 1. FLAC's analysis output supplied the real warm-up and Rice residual values for 21 frames / 96,000 samples.

The candidate traversed residuals directly and accumulated waveform summaries into 777-sample bins without materializing PCM blocks. All **124 bins** matched decoded PCM exactly for count, minimum, maximum, sum and integer energy, including bins spanning FLAC frame boundaries.

The relative-prefix summary identity also passed every tested composition, and the energy formula

`E = n*x0^2 + 2*x0*S + Q`

matched decoded PCM for every frame. Reference PCM occupied 192,000 bytes; the final 124-bin summary is about 4,960 bytes in the tested representation.

## R218 — exact restricted PNG scans

A custom 67×19 RGBA8 non-interlaced PNG alternates only filter types None, Sub and Up. Its continuous IDAT zlib payload expands to 5,111 bytes including filter bytes.

Chromium's native `DecompressionStream('deflate')` inflated the IDAT payload. The restricted scan reconstruction then generated **5,092 RGBA bytes with zero differences** versus Pillow's independent PNG decode. Sub was reconstructed as four independent byte-prefix scans and Up against the preceding reconstructed row.

Average, Paeth, interlaced, wrong-bit-depth and oversized-profile controls are outside the admitted profile. WebGPU/WebGL is unavailable, so this test establishes the browser-inflate + exact scan algebra, not GPU performance.

## R219 — shared spectral analysis

The host experiment processed 192,000 float64 samples through four 513-tap impulse responses using identical 2,048-point overlap-save blocks. The separate path recomputed the source FFT four times per block; the candidate computed it once and reused `X` for four `IFFT(X * H_k)` outputs.

The outputs had **0.0 maximum absolute difference**. Median times over seven alternating runs were **17.80 ms separate** versus **12.33 ms shared**, a **1.44×** speedup, with the same 512-sample algorithmic history/latency. This is a host numerical component result, not a browser audio-device benchmark.

## R220 — scoped transport-clock normalization

The model uses a 33-bit 90 kHz modulus and permits automatic epoch selection only when exactly one candidate timestamp lies inside a bounded ±2-second continuity/reordering window. Explicit discontinuities reset the scope.

It passed forward rollover, a late reordered packet straddling rollover, explicit discontinuity, ordinary monotonic timing, and an A/V pair whose 45,000-tick (0.5 s) offset remained unchanged. An unmarked large discontinuity and a roughly half-modulus jump were refused rather than silently normalized.

This validates the policy model. It is not yet wired into a real MPEG-TS parser.

## R221 — GPU intermediate lifetime planning

A fixed graph models color processing, two effects, subtitle composition and a delayed preview consumer. The lifetime allocator only reuses a compatible texture after the previous logical resource's final consumer.

All tested schedules were conflict-free. A symbolic execution verified that the delayed preview still read the exact `effect1` value after unrelated texture reuse, and both final outputs matched the dedicated-resource model.

Planned allocation reductions versus one dedicated resource per logical intermediate were:

- one frame + delayed preview: **24.7%**;
- three frames in flight: **50.2%**;
- preview cancellation: **25.0%**;
- resolution change: **25.5%**.

These are planner/resource-count results. They must not be presented as physical GPU-memory savings until tested on a real GPU implementation.

## R222 — independently checkable remux construction record

A normal H.264/AAC MP4 with B-frames was packet-copy remuxed to fragmented MP4. The construction record contains source/output identities, stream configuration hashes, source/output packet positions, payload hashes, DTS/PTS/duration mappings, composition offsets and top-level fragment structure.

A fresh independent ffprobe parse verified:

- **232/232 packet payloads** correspond exactly (90 video + 142 audio);
- H.264 and AAC configuration hashes match;
- video composition offsets are preserved;
- the output contains **three `moof` fragments**;
- Chromium plays **90 frames** and reaches EOF without a media error.

Five mutated records were then checked:

1. wrong source byte offset → `packet_offset_mismatch`;
2. swapped sample hashes → `payload_hash_mismatch`;
3. wrong composition/timing field → `output_timing_mismatch`;
4. changed codec configuration → `codec_config_mismatch`;
5. stale source identity → `source_identity_mismatch`.

All five were rejected. This is the strongest result in the batch for making Demuxe's increasingly unusual remux constructions independently auditable.

## Evidence boundary

R214, R215, R218 and R221 cannot establish GPU speed, physical memory use or presentation behavior in this environment because WebGPU, WebGL and WebGL2 are unavailable. R219 is a NumPy host prototype. R220 and R221 are policy/planner models rather than integration into Demuxe production code. R216 and R222 include real Chromium behavior. R217 operates on real FLAC residual data rather than a synthetic predictor-only model.