# Demuxe media/browser frontier — R268–R275 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0, libaom 3.12.1, libjxl 0.11.1.  
**Scope:** compressed-audio selection/editing, codec preview surfaces, browser frame-copy behavior, source indexing, and prepared tile decode. No Demuxe production source changes.

## Outcome summary

| ID | Verdict | Decisive result |
|---|---|---|
| R268 | **PROMISING / STRONG, narrow** | Selected one independent AAC-LC SCE from a six-element 5.1 stream; 49,152 decoded samples were bit-exact to both the original mono element and the corresponding full-decode channel while five coded elements/frame were skipped. |
| R269 | **BLOCKED — public pixel surface** | AV1 superres is active (coded/frame geometry 427×360, display 640×360), but public libaom returns only the upscaled 640×360 image and exposes no pre-super-resolution pixel plane for the required fidelity/work comparison. |
| R270 | **PROMISING / STRONG** | Rebuilt only two cut-edge FLAC frames and retained 14 interior coded payloads exactly; 63,828 samples and four seeks were exact after truthful variable-block sample numbering/CRCs. |
| R271 | **PROMISING tradeoff** | One-packet (20 ms) FEC wait improved lost-frame SNR from −6.55 dB PLC to +8.11 dB, but remained lossy; a modeled 60 ms retransmit/rebuffer control was exact. |
| R272 | **PROMISING / STRONG** | `VideoFrame.copyTo({rect})` matched crop-after-full-copy byte-for-byte while transferring 83.38% fewer bytes; transfer-only median was ~0.1 ms vs 0.5 ms. |
| R273 | **PROMISING component** | JPEG XL 1:8 DC progression arrived after 6,926/29,564 bytes (23.43%), at 22.09 dB PSNR versus final; cancellation stopped there and final decode matched FFmpeg exactly. |
| R274 | **PROMISING / STRONG** | Identical WebM Cluster bytes with Cues reached the same 24.033 s frame using 562,306 ranged bytes vs 2,004,098 bytes without Cues. |
| R275 | **PROMISING component / prepared representation** | One 256×256 large-scale AV1 tile matched all 65,536 Y samples of the corresponding full-decode quadrant; selected coded tile was 25.13% of frame bytes and host median decode was 4.57× faster. |

**QA: 72/72 assertions passed.**

## R268 — AAC selective channel-element reconstruction

Six independently encoded mono AAC-LC streams were assembled as six coded channel elements in a 5.1 program configuration. The test deliberately excludes the dependencies that would invalidate independent reconstruction: no SBR, prediction, coupling, or coupled stereo element is admitted.

The selector requested source element 4 (631 Hz), parsed and retained that one coded SCE, and skipped five other coded elements in every one of 48 AAC frames. It did not reconstruct PCM during selection. The resulting mono AAC decoded to 49,152 samples that were bit-for-bit identical both to the original mono source and to the matching channel from the complete six-channel decode.

This establishes a real compressed-domain channel-selection primitive for admitted independent SCEs. It does **not** justify selecting one half of a CPE or bypassing cross-element dependencies.

## R269 — AV1 pre-super-resolution preview

A controlled libaom encode used fixed super-resolution denominator 12. The decoder reports frame/coded geometry 427×360 and display geometry 640×360, confirming that a lower-resolution reconstruction exists internally before display upscaling. However, the public decoder output image is already 640×360.

The exact experiment requires the pre-super-resolution **pixels** so that they can be compared with full decode plus downscale. The public libaom surface available here does not expose those pixels. Therefore the card is **BLOCKED at the required API boundary**, rather than replaced with a misleading lower-resolution re-encode proxy.

## R270 — exact FLAC smart-cut/concat

A five-second 48 kHz mono FLAC was cut at sample 41,737 and 105,565, both inside FLAC frames. Only the two intersecting edge frames were reconstructed; 14 complete interior compressed payloads were retained byte-for-byte.

The first naive build exposed an important correctness issue: putting a short edge frame in a fixed-block-numbered stream decoded linearly but produced wrong seeks. The corrected output rewrites every retained frame header into FLAC variable-block strategy with exact cumulative sample numbers, repairs header CRC-8 and frame CRC-16, and keeps interior subframe payloads untouched.

The final 63,828-sample output is sample-exact to the requested source interval. Four distributed seek checks match a full reference-segment encode exactly, every frame CRC validates, and the standalone result is 24,574 bytes versus the 91,875-byte source. STREAMINFO's whole-stream MD5 is truthfully left unknown rather than reusing a stale digest.

## R271 — Opus FEC-aware scheduling

A 48 kHz mono Opus stream used 20 ms packets with in-band FEC enabled. Packet 60 was treated as lost.

Immediate PLC added no wait but produced −6.55 dB SNR for the lost frame. Waiting exactly one subsequent packet (20 ms) and requesting its in-band FEC improved that lost frame to +8.11 dB. The FEC result was still not exact. A modeled retransmission/rebuffer path that receives the original packet after 60 ms is exact by construction.

This supports an explicit scheduling policy: FEC can buy materially better concealment for one bounded packet of latency, while exactness still requires original coded data. Network retransmission timing was modeled here, not measured from a real transport.

## R272 — ROI `VideoFrame.copyTo`

Chromium created a 640×360 `VideoFrame` from a deterministic RGBA canvas. The requested rectangle was x=112, y=73, 257×149.

`VideoFrame.copyTo()` with that rectangle returned 153,172 bytes, exactly matching the same rectangle cropped from a 921,600-byte full-frame copy: zero differing bytes and maximum error zero. That is an 83.38% reduction in application-visible transfer bytes.

Across the microprobe, median ROI copy time was ~0.1 ms versus 0.5 ms for the full copy. These are copy/transfer timings in this headless runtime only; they are not claims about full render cost, hardware residency, or all pixel formats.

## R273 — JPEG XL DC preview

A 1024×768 JPEG XL image (29,564 bytes) was decoded directly through libjxl's progressive API. At the first `FRAME_PROGRESSION` event, `FlushImage` produced the 1:8 intended-downsampling-ratio DC image after only 6,926 bytes had been consumed—23.43% of the codestream.

The flushed preview measured 22.09 dB PSNR against the final decoded image. A separate cancellation run destroyed the decoder at that exact progression point and consumed no later codestream bytes. Completing the decode yielded RGB bytes identical to FFmpeg's libjxl output.

The result is an actual codec-progressive preview, not a truncated-file heuristic. It is intentionally a lower-fidelity preview and must be labeled as such.

## R274 — virtual WebM Cues

The 30-second VP9 WebM was tested in two same-sized forms. The candidate retained normal Cues; the control replaced only the Cues element with an equal-sized `Void`. All bytes before the Cues—including the Cluster/media region—remain identical.

Seeking native Chromium playback to 24 seconds produced the same 24.033 s media frame in both cases. With Cues, the capped-range server observed 10 requests totaling 562,306 bytes. Without Cues, Chromium made 32 requests totaling 2,004,098 bytes, effectively scanning the whole ~2.00 MB file.

Thus a truthful source-bound Cues layer can materially reduce native browser seek I/O without rewriting media Cluster bytes. A production virtual index still needs immutable source identity and stale-index rejection.

## R275 — AV1 large-scale tile viewport decode

A controlled 512×512 AV1 keyframe was encoded as a prepared 2×2 large-scale-tile representation. The libaom decoder was then asked for one tile at row 1, column 1.

The returned 256×256 tile matched all 65,536 Y samples of the corresponding bottom-right quadrant from a full-frame decode: zero differences. The selected coded tile was 10,126 bytes out of a 40,300-byte frame (25.13%). Across 12 host runs, full decode median was 7.144 ms and selected-tile decode median 1.565 ms, a 4.57× ratio.

This is strong evidence for a **prepared** viewport representation and a decoder capable of tile selection. It is not evidence that arbitrary AV1 can be sparsely decoded, nor a browser/GPU performance claim.

## Evidence boundary

These experiments are sandbox/component evidence, not Demuxe production qualification. R268 is restricted to independently coded AAC elements. R269 is blocked at the public pixel-surface boundary. R271's retransmit timing is modeled. R272 timings cover application-visible copy only. R275 uses a prepared large-scale-tile AV1 stream and host libaom. None of these should become an automatic route until the equivalent production fidelity/cost and cross-browser gates pass.
