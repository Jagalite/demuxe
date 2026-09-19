# Demuxe — R332–R337 research results

**19 September 2026 · six executed gates · 63/63 QA checks passed · no production source changes**

**Proposal source:** `/Demuxe/Demuxe_R332_R337_Proposals.md` (original continuation cards, exact proposal keys retained in the agent catalog).

## Decision summary

| ID | Verdict | Decisive result |
|---|---|---|
| R332 | **PROMISING COMPONENT / DESTINATION BLOCKED** | 13 real VP9 superframe packets split to 163 byte-identical component frames. 13 hidden alt-ref components had no presentation PTS, while all 150 decoded pictures remained exact. Browser `VideoDecoder` is unavailable. |
| R333 | **ALREADY HANDLED — COMPONENT BOUNDARY** | 24 MPEG-2 pictures stayed progressive and pixel-identical; 8 soft-telecine pictures carried `repeat_pict=2` and doubled the following timestamp step. No duplicate decoded pictures were materialized by the decoder, and a true interlaced control was detected. |
| R334 | **PARTIAL — PER-OUTPUT TIMELINE OWNERSHIP REQUIRED** | One demux pass fanned 616 H.264/AAC packets to full Matroska/NUT/fMP4 plus 4 bounded segments with unchanged payloads and exact decoded audio/video. Matroska and segment packet records matched independent muxers exactly; NUT/MP4 had timestamp-record differences, so naïve tee is not sufficient for the full contract. |
| R335 | **BLOCKED — ENVIRONMENT** | `navigator.gpu` is unavailable on the permitted page; normal localhost navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`. Device-loss recovery cannot be qualified here without bypassing restrictions. |
| R336 | **PROMISING / EXACT COMPONENT** | Four actual SOF3 predictor-4 grayscale JPEGs were entropy-parsed and reconstructed with row/column inclusive prefix sums sample-for-sample identically to FFmpeg. 500 randomized exact recurrence checks passed. |
| R337 | **PROMISING / STRONG REPEATED-QUERY COMPONENT** | All 64 tested 10-bit LUT histograms, sums, squared sums, thresholds and explicit pre-clamp counts matched per-pixel application exactly. The 1,024-bin histogram occupies 8 KiB. |

## R332 — Normalize VP9 superframes at the decoder boundary, not globally

A two-pass libvpx VP9 fixture with alternate references produced 150 IVF packets. 13 packets contained valid two-frame superframe indexes. Independent parsing yielded 163 coded component frames. FFmpeg's pinned-style `vp9_superframe_split` output the same 163 packet payload hashes in the same order.

The hidden member of each superframe was observable in FFmpeg's bitstream-filter trace as a decode-only packet with `PTS=NOPTS`; exactly 13 such packets were seen. The resulting decoded sequence remained 150 pictures and matched the original frame hashes exactly. Corrupted size/index controls were rejected; removing the index marker caused the decoded-output oracle to fail (149 instead of 150 pictures).

This proves the **framing normalization component**, not the browser route: the installed Chromium exposes `EncodedVideoChunk` but not `VideoDecoder`. Splitting would also increase decoder submissions from 150 to 163 in this fixture, so there is no measured cost win yet.

## R333 — Keep soft telecine as progressive pictures plus timing

A progressive MPEG-2 stream was patched at the picture-coding-extension level so 8 of 24 pictures set `repeat_first_field`. Pixel hashes before and after the metadata change are identical. FFmpeg reports every picture as progressive, reports `repeat_pict=2` on exactly those 8 pictures, and advances the next timestamp by twice the nominal 1001/24000-second frame duration.

The important finding is that the tested decoder already preserves the desired representation: **one reconstructed progressive picture plus timing metadata**. It does not synthesize duplicate pictures for the repeat. A deliberately interlaced MPEG-2 fixture is reported as interlaced, providing the rejection control. A Demuxe source search also found no explicit `deinterlace`, `yadif`, or `bwdif` path. This closes the initial component question as **ALREADY_HANDLED**, not as a new optimization.

The raw-stream A/V mux control reached about 1.343 s including AAC timing/priming behavior. That is only a host timing control, not complete Demuxe/browser A/V qualification.

## R334 — Share one demux pass across independent playback and export timelines

An 8-second H.264/AAC source was read once by FFmpeg's tee path and fanned to Matroska, NUT, fragmented MP4, and a 2-second segment muxer. Across each full output, all 240 video and 376 audio packet payload hashes were preserved. Concatenating the four segment outputs also reproduces all source packet payloads in order, and every output decodes to the exact same video-frame and audio-frame hashes as the source.

Failure isolation worked: an `onfail=ignore` `/dev/full` slave failed while the healthy Matroska output completed and decoded normally.

However, the full acceptance contract did **not** pass generically. The tee Matroska packet records and all four segmented Matroska records match independently generated references exactly, but NUT and fragmented MP4 contain timestamp-record differences despite identical packet payloads and decoded output. This is evidence for the proposal's explicit design rule: each consumer needs its own packet wrapper/timeline mapping rather than treating a generic shared mux session as authoritative.

Late subscribers, independent seek cursors, and early independent consumer cancellation were not implemented, so R334 remains partial.

## R335 — Recover the GPU presenter without reopening healthy decoders

The permitted headless page reports no WebGPU, WebGL or WebGL2. A normal localhost page was served and requested without special bypass flags; Chromium blocked navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore a real `GPUDevice.destroy()`/`device.lost` recovery experiment cannot be executed in this environment. No browser-decoder or audio restart behavior is inferred from that blocker.

## R336 — Reconstruct predictor-4 lossless JPEG with two-dimensional prefix sums

The harness authored legal one-component, 8-bit SOF3 JPEGs using predictor selection 4 and a real Huffman-coded residual stream. Four fixtures cover ramps, impulses, random bounded residuals, extreme values and non-power-of-two dimensions. FFmpeg decoded all four to the intended sample planes exactly.

A separate entropy parser then read the actual JPEG Huffman residuals from those files. After adding the 128 initial seed to D[0,0], one inclusive row-prefix pass followed by one inclusive column-prefix pass modulo 256 reproduced every FFmpeg sample exactly. An additional 500 randomized residual-grid cases matched the ordinary sequential recurrence.

Truncated entropy and another predictor selection were rejected by the profile/parser gate. Restarts, point transforms, multiple components and GPU scans remain out of scope. The result establishes the mathematical/bitstream component; it does not claim a speedup over an optimized serial JPEG decoder.

## R337 — Evaluate tone-curve statistics from an exact source histogram

The test plane contains 921,600 exact 10-bit samples. Its 1,024-bin `uint64` histogram is 8,192 bytes. Across 64 monotonic, nonmonotonic, posterizing, inverted, constant and randomized LUTs, mapped histogram bins, integer sums, squared sums and threshold counts all exactly matched applying the LUT to every pixel.

The explicit pre-clamp control also matched: 325,801 high-clipped and 134,699 low-clipped pixels were recovered from source-bin counts using the declared pre-clamp rule. The final maximum output bin was not used as a clipping proxy.

For 250 repeated queries in NumPy, histogram evaluation took 0.886 ms median versus 664.716 ms for repeated per-pixel mapping/scanning (750.2× for this host component benchmark). Building the source histogram took 1.052 ms median. This is not a GPU comparison or rendering-speed claim.

A deliberately spatially rearranged plane with the same histogram returns the same permitted aggregate statistics, demonstrating the method's limitation: it cannot locate highlights, edges, or spatial artifacts. A changed ROI invalidates reuse.

## Evidence boundary

These are standalone host/browser-component results. R332 lacks the target WebCodecs decoder, R335 lacks a permitted WebGPU context, R334 has not implemented the full independent-consumer lifecycle, and R336 has not been integrated into a parallel GPU decoder. Timings are narrow microbenchmarks and must not be promoted to whole-Demuxe improvements.