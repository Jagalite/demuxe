# Demuxe — R239–R245 continuity batch rerun

**Run date:** 18 September 2026  
**Baseline:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3` (current `main` at rerun)  
**Environment:** Chromium 144.0.7559.96, FFmpeg/ffprobe 7.1.5, Python 3.13.5, Node 22.16.0, libjpeg 2.1.5.  
**QA:** **49/49 assertions passed.**  
**Production source changes:** none.

> **Provenance:** R239–R245 are the previously preserved **reconstructed continuity batch**, not recovered original experiment cards. This rerun tests those preserved definitions exactly rather than renumbering new ideas as if they were originals.

## Decision summary

| ID | Rerun verdict | Decisive result |
|---|---|---|
| R239 | **PROMISING COMPONENT / TRADEOFF** | 201 Opus audio packets and host/browser decoded output are unchanged. Ogg pages rise 7→203 and file size rises 62,100→67,392 bytes (**+8.52%**). |
| R240 | **PROMISING / STRONG** | One VP9 WebM Cluster becomes 8 while all 120 packet hashes and decoded frames remain identical. Chromium presents 120/120 frames with zero drops. Cost: **+76 bytes**. |
| R241 | **PROMISING CODED-DOMAIN / NOT PIXEL-BIT-EXACT** | **9,216/9,216** transformed JPEG coefficients and transposed quant tables match exactly. Decode-then-rotate differs only from integer-IDCT rounding (MAE **0.0211**, max **2**). |
| R242 | **PROMISING / STRONG — PRIOR PACKAGING FAILURE RESOLVED** | Existing MP4 SPS/VUI + `pasp` patched in place from SAR 1:1→4:3. All **90 VCL NALs**, decoded frames, packet PTS/DTS/durations and file size remain unchanged. Chromium intrinsic geometry changes **320×180→427×180**, with all 90 frames. |
| R243 | **PROMISING / STRONG** | The single type-6 SEI is removed; all 90 VCL NALs, decoded frames and packet timing remain unchanged. File shrinks **689 bytes** and Chromium presents all 90 frames. |
| R244 | **PROMISING PREPARED REPRESENTATION** | Normal MP3 frame 120 has `main_data_begin=168`; reservoir-disabled encode has `0` for every frame. Midstream cut reaches an exact suffix after **2 frames vs 1**, with identical 192-kb/s CBR file size. |
| R245 | **PROMISING / STRONG** | FLAC frames 20–22 are copied byte-for-byte into a bounded file. All 3 packet hashes and **12,288 PCM samples** match exactly; corrected STREAMINFO reports **0.256 s**, and Chromium decodes exactly 12,288 samples. |

## R239 — packet-granular Ogg Opus repagination

A four-second mono Opus fixture contains 201 audio packets in seven source pages. The rerun parser reconstructs Ogg pages with valid lacing, sequence numbers, CRCs and packet-end granule positions, using one audio packet per page after the two Opus header packets.

All 203 packet hashes—including `OpusHead` and `OpusTags`—match. FFmpeg PCM is byte-identical. Chromium `decodeAudioData` returns 192,000 samples at 48 kHz for both files with the same complete float-buffer hash and probe samples.

The cost is real: 62,100→67,392 bytes (+5,292 bytes, +8.52%). This proves a finer delivery representation, not a latency improvement by itself.

## R240 — VP9 WebM cluster surgery

The source is a four-second, 120-frame VP9 WebM with one Cluster. A packet-copy remux produces eight roughly half-second Clusters without recoding the VP9 packets.

All 120 packet hashes and the complete FFmpeg `framemd5` sequence are identical. Chromium presents 120 frames from both files with zero dropped frames. The candidate is only 76 bytes larger.

Cluster splitting remains a parser/delivery boundary optimization. It does not create new keyframes or random-access points.

## R241 — JPEG 90° DCT-domain rotation

A libjpeg coefficient transformer rotates a 64×48 4:4:4 JPEG without reconstructing pixels: block geometry rotates, each 8×8 coefficient block is transposed with the required sign changes, and quantization tables are transposed consistently.

An independent coefficient dump checks all 9,216 quantized coefficients: zero differences, maximum coefficient error zero, and zero quant-table differences. Chromium decodes the result as 48×64.

Rotating the already-decoded RGB source is not pixel-bit-identical to decoding the coefficient-rotated JPEG: MAE is 0.0211 and maximum component difference is 2. This is the expected integer-IDCT rounding distinction. The durable claim is no coefficient requantization/generational transform loss.

## R242 — H.264 aspect metadata with no VCL rewrite

The earlier continuity run validated the SPS/VUI mechanism but rejected a temporary MP4→Annex-B→MP4 packaging route because it disturbed B-frame presentation timing. This rerun removes that artifact.

The H.264 metadata bitstream filter first produces the 4:3 SPS. Because the SPS length is unchanged, the existing MP4 `avcC` SPS is patched in place, and the existing 16-byte `pasp` box is changed from 1:1 to 4:3. No media payload or box offsets move.

The candidate keeps all 90 VCL NAL hashes, all 90 decoded-frame hashes, and every packet PTS/DTS/duration unchanged. Source and candidate are both 116,070 bytes. FFprobe reports SAR 4:3 / DAR 64:27, and Chromium reports 427×180 intrinsic display geometry while presenting all 90 frames with zero drops.

**The prior packaging caveat is resolved for this bounded MP4 fixture.**

## R243 — remove nonessential H.264 SEI

The x264 source contains one type-6 SEI NAL. Removing type 6 leaves 90/90 VCL hashes, complete decoded-frame hashes and packet timing unchanged. The file shrinks from 116,070 to 115,381 bytes (689 bytes). Chromium presents all 90 frames with zero drops.

This does not authorize indiscriminate SEI stripping. HDR/mastering data, timing, orientation and any other requested semantics must remain part of admission.

## R244 — reservoir-independent prepared MP3

Matched six-second stereo Layer III files were encoded at 192 kb/s CBR with and without the LAME bit reservoir. Both are 144,866 bytes and contain 231 frames.

At frame 120 the ordinary stream has `main_data_begin=168`; the prepared representation has zero. Every frame in the prepared file has `main_data_begin=0`, while 230/231 ordinary frames reference reservoir data.

When each file is cut exactly at frame 120, the normal stream reaches a byte-exact PCM suffix after two decoded MP3 frames. The no-reservoir stream reaches the exact suffix after one. This reproduces the prior conclusion: removing the compressed-data back-reference removes one preroll dependency, but synthesis/filterbank state remains.

## R245 — standalone FLAC from original frames

A six-second stereo FLAC is encoded with 4,096-sample frames. Source frames 20–22 are packet-copied into a new FLAC. The STREAMINFO total-sample count is corrected to 12,288 and the MD5 is replaced with the exact bounded PCM signature.

All three compressed frame hashes are unchanged and all three durations remain 4,096 samples. Decoding yields exactly the corresponding 12,288 source PCM samples. `flac -t` passes, FFprobe reports 0.256 s, and Chromium `decodeAudioData` returns exactly 12,288 samples at 48 kHz.

This fixture's mini-file is 18,021 bytes, 7.63% of the stereo six-second source. The percentage is content/channel-dependent; the source-preserving frame extraction is the important result.

## Interpretation

The rerun strengthens the batch rather than overturning it. R239 remains a granularity-versus-overhead tradeoff. R240, R243 and R245 reproduce their source-preserving behavior. R241 remains exactly lossless in quantized DCT space but not under the wrong decoded-pixel oracle. R244 reproduces the one-frame preroll reduction. **R242 is the notable upgrade:** a direct metadata patch eliminates the previous packaging failure and preserves the complete coded/timing path in this fixture.

These remain component/sandbox results, not measured whole-Demuxe performance improvements, cross-browser qualification, or evidence that each mechanism deserves automatic routing.