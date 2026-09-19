# Demuxe media/browser frontier — R159–R171 executed results

**Run date:** 18 September 2026  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0.  
**Scope:** bounded media/container/codec-state and scheduling experiments. No Demuxe production source changes.

## Result summary

| ID | Verdict | Result |
|---|---|---|
| R159 | **INCORRECT naive route / full card BLOCKED** | Per-stream ciphertext packet hashes survive FFmpeg packet-copy, but every CENC signaling/auxiliary box is lost. The original decrypts with the authorized test key; the remux does not. Clear Key EME is unavailable on the permitted non-secure Chromium page. |
| R160 | **PROMISING, bounded** | Eight independently decodable 0.5 s FLAC mini-files concatenate to exactly the whole-file Chrome PCM: 192,000 frames, 2 channels, zero differing float samples. Container overhead grows encoded bytes by 51.5%. |
| R161 | **PROMISING component / browser state blocked** | Copying a 141,108-byte libopus decoder state before a delayed packet allowed speculative PLC + 7 later packets, then rollback/redecode to **bit-exact** uninterrupted PCM. Browser AudioDecoder exposes no equivalent state snapshot here. |
| R162 | **PROMISING component** | A fixed fMP4 fragment was duplicated by patching only `mfhd` sequence and `tfdt`; 10,000 header patches took 19.1 ms median. Chrome played 4 s / 120 decoded frames. |
| R163 | **PROMISING component** | A fragment commit journal recovered all 20 simulated crash phases to exact packet prefixes. A three-fragment recovered file played 3 s / 90 frames to EOF in Chrome. |
| R164 | **PROMISING model component** | A C fixed-predictor/Rice-cost scan produced identical choices serial and parallel; 4 threads reduced median 114.3→45.1 ms (**2.53×**). This is not libFLAC encoder integration. |
| R165 | **PARTIAL — exact mathematical model** | First-order residuals reconstruct every tested signal exactly in reverse from the terminal sample, including 24-bit extremes. No FLAC frame parser/bitstream route was implemented. |
| R166 | **PROMISING** | Replacing 1, 4, 12, or 30 AAC-LC packets always contaminates the first original suffix packet but recovers a permanently bit-exact suffix on the following packet. |
| R167 | **PROMISING, narrow** | Grayscale JPEGs with matching quantization tables can dissolve by interpolating quantized DCT coefficients. Endpoints are exact; intermediate output is roughly 49–51 dB PSNR versus the ideal blend of decoded endpoints. |
| R168 | **CONDITIONAL memory tradeoff** | Independently compressed cold tiles retain exact pixels and use **4.8%** of dense tile bytes, but the tested 5,000-request trace is ~37.7× slower than uncompressed lookup. |
| R169 | **INCONCLUSIVE tradeoff** | Cadence-aware scheduling preserves nominal 23.976/24/25/30-fps refresh cadence exactly under delayed callbacks, but slightly increases instantaneous A/V lag versus deadline catch-up. |
| R170 | **PROMISING model** | With 85 ppm clock drift plus +35/−20 ms latency steps, a separated estimator reduced mean absolute model error to **0.96 ms**, versus **4.70 ms** for one undifferentiated EMA. |
| R171 | **PROMISING tooling model** | A greedy witness set retained all 15 pairwise distinctions across six abstract playback routes and detected all eight injected policy faults using **7/14** candidate cases. Not production `planAdmission` execution. |

## R159 — encrypted MP4 → fMP4 without decrypting

The controlled CENC source contains `encv`/`enca`, `sinf`, `tenc`, `senc`, `saio`, and `saiz`. FFmpeg can packet-copy the file without the key, and ordered packet hashes are identical **within each stream** after the copy. That proves the payload remained ciphertext.

However the resulting fragmented MP4 contains **none** of those protection structures. Passing the test decryption key to the original yields 120 video frames; the remux produces decoder errors because it now advertises ciphertext as ordinary clear H.264/AAC. This closes the naive packet-copy implementation as **incorrect**. A correct protection-preserving muxer still needs to carry sample encryption associations and initialization metadata. Chromium's permitted `about:blank` page is not secure and exposes no EME API, so the authorized browser portion is BLOCKED rather than failed.

## R160 — independent miniature audio files

A deterministic 4 s / 48 kHz stereo source was encoded once as FLAC and again as eight independently initialized 0.5 s FLAC files. `AudioContext({sampleRate:48000}).decodeAudioData()` produced 192,000 frames in both cases; concatenating the eight decoded buffers had **zero differing float samples** versus decoding the one whole file.

The cost is representation overhead: 115,468 bytes whole versus 174,922 bytes across the mini-files. This demonstrates exact random-region units, not a free compression or scheduling win.

## R161 — speculative Opus rollback

A host libopus decoder state was snapshotted immediately before one deliberately delayed packet. The speculative branch decoded PLC for the missing packet and seven following real packets, producing 7,555 samples different from uninterrupted decoding. Restoring the saved decoder bytes and decoding the delayed packet plus suffix produced **zero differences**.

The component is real, but a state snapshot is 141,108 bytes in this build and browser AudioDecoder does not expose internal state copying. It is most plausible inside a maintained software decoder and only before affected output becomes irrevocably committed.

## R162–R163 — specialized fMP4 writing and crash recovery

R162 reused one already-valid one-second `moof+mdat` template four times. Only `mfhd.sequence_number` and `tfdt.baseMediaDecodeTime` were patched. `ffprobe` sees 120 packets over 4 s and Chrome plays all 120 frames to EOF. The result establishes an O(header)-sized construction for a fixed fragment shape; it does not compare against an optimized production muxer.

R163 treats complete `moof+mdat` pairs as journal commits. Crashes were simulated at 15%, 50%, 90%, and 100%-physically-written-before-journal points of every next fragment, plus committed-boundary cases. Recovery truncates to the last journaled byte offset. Every recovered file's packet hashes equal the matching source prefix. This is a transaction model, not a literal power-loss/fsync qualification.

## R164–R166 — codec state and bounded recovery

R164 parallelizes exact integer fixed-predictor/Rice-cost scans across 320 FLAC-sized blocks. All selected predictor/cost results are identical to serial computation; 4-thread speedup is 2.53× in this standalone model. libFLAC may already parallelize at other levels, so this is not an encoder speedup claim.

R165 uses the order-1 identity `r[i] = x[i] - x[i-1]`. Given the final sample, `x[i-1] = x[i] - r[i]` reconstructs the tested sequences exactly in reverse. Smooth, random 24-bit, and extreme-value signals all pass. The missing gate is an actual FLAC bitstream parser and a reason reverse reconstruction beats ordinary forward frame decoding.

R166 is stronger. Four AAC-LC edits replaced 1/4/12/30 encoded packets with same-configuration packets from another source. In all cases, the first original packet after the edit still emitted ~1,020 differing samples because of transform overlap. Starting at the **next** packet, the complete remaining PCM suffix is bit-exact to uninterrupted decoding. For this AAC-LC profile, the measured recovery certificate is therefore one original suffix packet of hidden recovery before safe output.

## R167 — transform-space MJPEG dissolve

Two 256×256 grayscale JPEGs were encoded with matching tables. Their quantized DCT coefficients were interpolated and written as a new JPEG without a pixel-domain blend. Alpha 0 and 1 decode exactly to their endpoints. At alpha 0.25/0.5/0.75, decoded output is 48.8 dB PSNR or better versus the direct linear blend of decoded endpoints.

That validates a narrow transform-space effect. It is not pixel-identical at intermediate alpha and says nothing yet about color subsampling, mismatched tables, or arbitrary MJPEG streams.

## R168 — compressed cold reference tiles

Sixty decoded grayscale frames were split into 900 independently compressed 64×64-or-edge tiles. The compressed store is 166,937 bytes versus 3,456,000 bytes dense, and every tile decompresses exactly.

Under the deterministic 5,000-request trace with a 64-tile uncompressed LRU, the compressed design incurred a median 3262 decompressions and 16.29 ms lookup time versus 0.43 ms for dense references. This is useful when memory pressure dominates and cold accesses are genuinely cold; the tested trace does **not** justify compression as a latency optimization.

## R169–R170 — presentation cadence and clock estimation

R169's model binds frame identity to nominal display cadence rather than whichever media timestamp a delayed callback happens to reach. It removes all cadence-count errors in the tested 23.976/24/25/30-fps cases, but deadline catch-up remains slightly closer to the audio clock. The experiment therefore exposes an explicit policy choice rather than a universal better scheduler.

R170 separates slow clock-rate drift from abrupt output-latency changes. Under known 85 ppm drift, +35 ms and −20 ms delay steps, and noise, the separated model has 2.27 ms p95 error; an undifferentiated EMA reaches 19.60 ms. This supports keeping rate estimation and latency-step estimation as distinct states, but it remains synthetic rather than physical-device evidence.

## R171 — compact route-distinguishing witnesses

The bounded model contains six abstract route classes and 14 candidate source/feature scenarios. Greedy selection finds seven witnesses that preserve every one of the 15 route-pair distinctions. The same seven detect eight deliberately injected policy bugs, including accidental direct-remux admission, FLAC-on-float admission, lossy conversion without permission, and software-filter rejection.

This validates the witness-minimization method on the model, not on Demuxe's actual `planAdmission`. The next useful version should run against the production decision function and historical route regressions.

## Evidence integrity

QA: **25/25 checks passed.** Raw JSON, scripts, fixtures, browser observations and environment details are included in the evidence archive.