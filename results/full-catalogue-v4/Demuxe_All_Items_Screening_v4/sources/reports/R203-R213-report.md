# Demuxe media/browser frontier — R203–R213 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie); ffmpeg version 7.1.5-0+deb13u1 Copyright (c) 2000-2026 the FFmpeg developers; Python 3.13.5.  
**Scope:** bounded media representation, codec-state, browser delivery, scheduling and observer experiments. No Demuxe production source changes.

## Result summary

| ID | Verdict | Result |
|---|---|---|
| R203 | **PROMISING** | Opus packets 301→151; host PCM bit-exact and Chrome decoded output identical. |
| R204 | **PROMISING — NARROW PROFILE** | MP3 global_gain -4 steps produced 0.500000004 amplitude with spectral payload unchanged. |
| R205 | **PARTIAL / PROMISING PREPARED REPRESENTATION** | Four independent FFV1 worker processes reconstruct exactly; 2.92× wall speedup, but not slices extracted from one FFV1 bitstream. |
| R206 | **PROMISING COMPONENT / NO UPLOAD SPEED WIN** | First 64 JPEG rows available at 0.313 ms vs complete 2.678 ms; stripe WebGL upload median 1 ms vs full 0.8999999999068677 ms. |
| R207 | **PROMISING / STRONG** | 6 verified 16-KiB BEP52 blocks (37.5% of a 256-KiB piece) were enough to play the first fMP4 fragment. |
| R208 | **BLOCKED EXACT / MODEL PASSES** | WebTransport unavailable in the permitted browser context; epoch/cancellation model prevents obsolete late publication. |
| R209 | **PROMISING / STRONG** | Lossy WavPack base plus suffix-only correction becomes sample-exact at the 192000 frame block boundary while omitting 61782 earlier correction bytes. |
| R210 | **PROMISING MODEL** | Reference bookkeeping survives after pixels; safe interleaved peak pixels were 15.2% of retain-all baseline. |
| R211 | **PROMISING** | Exact 10-bit local-offset tiles saved 48.3% payload; wide tiles fall back losslessly. |
| R212 | **PROMISING COMPONENT** | AVX2 over eight independent ADPCM streams is exact and 2.07× faster than scalar in the native benchmark. |
| R213 | **FUNCTIONALLY PROMISING / PERF NEGATIVE HERE** | WebGL2 full-frame comparison matched CPU exactly while reading back 12 bytes instead of 2359296; SwiftShader was much slower than CPU. |

QA: **42/42 bounded checks passed.**

## R203 — Regroup existing Opus frames without re-encoding

301 20-ms Opus packets were repacketized into 151 packets using libopus. Constituent encoded frames were preserved and host 48-kHz decoded PCM is byte-identical. Chromium's 48-kHz `decodeAudioData()` output is also sample-identical, and both original/grouped Ogg presentations seek and advance without media error.

The delivered Ogg writer uses one packet per page, so file size grew from 86,939 to 90,755 bytes despite the lower codec-packet count. This validates packet regrouping, not a bandwidth win or earlier availability. It does not create new random-access points.

## R204 — Edit MP3 coded gain without changing spectral payload

For a bounded MPEG-1 Layer III mono/no-CRC profile, every granule's `global_gain` was reduced by four steps while main-data/spectral payload hashes were left unchanged. Host decoded RMS became **0.500000004×** the original (target 0.5); the maximum sample error versus half-amplitude was 5.31e-08. Chromium measured 0.499999757× after decoding at 48 kHz.

Underflow is explicitly rejected and an MPEG-2 fixture fails this narrow admission profile instead of being patched with the wrong side-information layout. Output is intentionally changed; this is not bit-exact editing.

## R205 — Multicore FFV1 without shared address-space state

A prepared representation split a 640×360 lossless source into four independent 320×180 FFV1 quadrant streams. Four independent FFmpeg processes—no shared address space—decoded the streams and reconstructed all 120 visible BGR frames exactly. Median null-output wall time was 0.666 s sequential versus 0.228 s parallel, **2.92×** faster. Compressed size increased 5.1%.

This is deliberately **PARTIAL**: it proves the no-shared-memory execution model for independently encoded FFV1 regions, not extraction and independent decoding of slices from one existing FFV1 bitstream.

## R206 — Incremental MJPEG stripe decode/upload

libjpeg exposed each 64-row RGB stripe while decoding a 1024×768 JPEG. The first stripe was available at **0.313 ms**, versus 2.678 ms for the complete image. WebGL accepted those stripes through repeated `texSubImage2D()` calls into a texture that remained unpublished until completion. The partial negative-control pixel differed from the final published pixel.

Median full-frame texture upload was 0.900 ms versus 1.000 ms for all stripe uploads, so there is **no standalone upload-speed win** here. The open opportunity is overlap between decode and upload; this pilot did not benchmark an actually overlapped pipeline. The graphics implementation is SwiftShader-class software, not physical-GPU evidence.

## R207 — Verify useful BitTorrent-v2 blocks before a whole piece completes

The 579,704-byte fMP4 was hashed as BEP52-style 16-KiB leaves. The first complete init+media fragment ended at byte 91,196, requiring **6 leaves / 98,304 bytes**, or 37.5% of a 256-KiB logical piece. Each required leaf was verified against the file's SHA-256 Merkle `pieces root`; wrong proof, wrong position, and altered-file controls were rejected.

Only the verified prefix was exposed to MSE. Chromium buffered about one second and presented 13 frames before the remainder of that logical piece was available. This demonstrates earlier useful verification for a clear random-access media prefix; a full peer-protocol/hash-request implementation remains outside the pilot.

## R208 — Make cancellation follow media dependency boundaries

Exact WebTransport testing is **BLOCKED** because `WebTransport` is undefined in the permitted opaque/non-secure browser context. A bounded independent-GOP scheduler model nevertheless validates the critical state rule: after a seek increments the presentation epoch, a deliberately uncancelled old GOP may complete but cannot publish.

The model is not transport performance evidence. Its byte accounting also shows independent speculative streams are not automatically better than a clean HTTP-range abort; scheduling policy matters.

## R209 — Fetch WavPack correction data only when exact output is required

Using installed libwavpack 5.8.1, an 8-second stereo source was encoded in hybrid mode into a 282,458-byte lossy `.wv` base and 123,890-byte `.wvc` correction file. Base-only output is close but intentionally not exact (S16 RMSE 0.983). Base + correction is sample-exact.

At the 192,000-frame / 4-second block boundary, the earlier correction blocks were removed entirely. A file containing only the correction blocks at and after that boundary still decoded the suffix **sample-for-sample exactly**, deferring 61,782 correction bytes. Exact mode therefore has a real block-boundary admission rule; it must never silently claim lossless output when correction data is absent.

## R210 — Retain reference bookkeeping after pixels are no longer needed

A dependency-DAG codec model kept frame metadata after freeing reconstructed pixels. Pixel reads were instrumented, every reconstructed/presented frame matched the retain-all oracle, and freeing a needed reference early triggered the negative control. With decode and presentation interleaved, safe peak pixel storage was 25,920 bytes versus 171,072 bytes for retaining every frame (**15.2%**). All pixels were released after final consumers while all 33 bookkeeping entries remained.

This is a state-lifetime model, not evidence that a browser decoder exposes or can exploit these lifetimes.

## R211 — Exact local-offset storage for high-bit-depth reference tiles

A 10-bit 640×360 plane was divided into 16×16 tiles. If a tile's range was ≤255, it was stored as one 16-bit local minimum plus exact 8-bit offsets; wider tiles fell back to native 16-bit values. **97.4%** of tiles qualified in the controlled smooth source and total payload fell 48.3%. Recovery was exact, as was a downstream integer filter. A 0/1023 checkerboard forced wide fallback for every control tile.

## R212 — Vectorize across independent streams rather than time

A native AVX2 benchmark decoded eight independent IMA-ADPCM state machines in SIMD lanes. All 12,000,000 output samples matched the scalar implementation exactly. Best measured time was 21.76 ms scalar versus 10.49 ms AVX2, a **2.07×** speedup.

This is strong evidence for cross-stream SIMD on this recurrence, not a claim about a complete browser/FFmpeg audio pipeline.

## R213 — Compare whole frames on the graphics side and read back only the witness

WebGL2/float blending compared two complete 1024×576 RGBA textures by drawing one point per pixel into three 1×1 reductions: mismatch count, maximum channel error, and first mismatch position. With 37 injected fault pixels, the graphics result exactly matched the CPU oracle: count 37, maximum error 236, first index 12345. The no-difference control also passed.

Only **12 bytes** of result data were read back instead of a 2,359,296-byte full frame. But SwiftShader took ~411.2 ms versus ~4.1 ms for the JS CPU oracle, so this is a readback/observer mechanism—not a performance win in this environment. Physical-GPU qualification remains open.

## Evidence boundary

Host codec/component results do not automatically predict a Wasm build or browser hardware path. Prepared representations (especially R205), modeled schedulers/state lifetimes (R208/R210), and SwiftShader graphics tests (R206/R213) are explicitly labeled. Missing secure-context APIs are BLOCKED rather than converted into equivalent browser claims.