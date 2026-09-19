# Demuxe — R343–R347 independent rerun

**Run date:** 19 September 2026  
**Baseline:** `9abfd1b22300cf273fc0bd1a8290261281c8f3f3`  
**Environment:** Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, Node 22.16.0.  
**Source cards:** exact Project artifact `Demuxe_R343_R347_Proposals.md`.  
**QA:** 44/44 fresh machine-checkable assertions passed. No Demuxe production source changes.

This is an independent rerun, not merely a restatement of the earlier R343–R347 package. The older raw archive was not materializable from the Project surface, so the decisive oracles were reimplemented from the proposal definitions.

## Decision summary

| ID | Verdict | Fresh decisive result |
|---|---|---|
| R343 | **PROMISING COMPONENT / ordinary MP4 proven; WebCodecs/MSE unqualified** | 106/106 AAC AUs are bit-identical after LATM extraction; all payload starts are bit-unaligned. PCM SHA-256 matches. Chromium rejects direct LATM but loads adapted MP4 to readyState 4 at 2.261333 s. |
| R344 | **PROMISING / STRONG COMPONENT** | Backward SOURCE/NONE resolution selected 3/8 images (62.5% fewer), with exact target and continuation. |
| R345 | **EXACT COMPONENT / COLD-PATH PERFORMANCE NEGATIVE** | Fixed-Huffman stream joining yields exact filtered bytes and pixels. Cold parse+splice 0.794 ms vs Pillow decode-stack-encode 0.214 ms; prevalidated splice 0.180 ms. |
| R346 | **EXACT MATH COMPONENT / DENSE MAP REJECTED** | All 256-state maps exact and associative; real Paeth PNG exact. Dense map path is 252.4× slower than sequential CPU reconstruction. |
| R347 | **PROMISING / STRONG REPEATED-QUERY COMPONENT** | Basis output morphing agrees with direct convolution to 4.47e-16 against long-double oracle. Prepared query combine is 39.2× cheaper than re-filtering both bases. |

## R343 — Unwrap AAC-LATM into a browser-decoded audio route

The rerun generated a 48 kHz stereo AAC-LC ADTS source and packet-copied it into LOAS/LATM. An independent bit parser recovered StreamMuxConfig, AudioSpecificConfig and every payload using bit-addressed reads. It recovered **106 access units**, and all payload bytes equal the known ADTS access units. Every payload start is non-byte-aligned; the first begins at bit 61 of its AudioMuxElement, so this is not fixed-header stripping.

Configuration reuse is exercised in 100 AudioMuxElements. A first element falsely claiming `useSameStreamMux=1` is rejected, and truncating the LATM input is rejected. Rebuilt ADTS decodes to PCM SHA-256 `fc14a58f1ff710e12adccee5c2e7e211c667a2b16ccb09e5412a403f375a3832`, identical to the source.

Chromium provides the destination distinction. Direct LATM fails with `PipelineStatus::DEMUXER_ERROR_COULD_NOT_OPEN: FFmpegDemuxer: open context failed`. The adapted ordinary MP4 loads to readyState 4 with no error. The generated fragmented MP4 advertises MSE MIME support but its SourceBuffer append fails, and WebCodecs cannot be independently qualified because localhost/file navigation is blocked by administrator policy while AudioDecoder is unavailable on the allowed insecure about:blank page. Those are **blocked/failed destination gates**, not failures of the LATM extraction itself.

## R344 — Seek through APNG by resolving the last writer of each region

A real 96×64 eight-frame APNG was authored with SOURCE blending and NONE disposal. Frames 5, 6 and 7 overwrite the complete final canvas, so backward unresolved-region analysis discards frames 0–4. The selected-frame reconstruction is byte-exact against full replay and Pillow's decoded APNG target. A transparent SOURCE patch in the selected suffix is preserved correctly, proving that transparency still replaces earlier content rather than acting like OVER.

Continuation from the recovered canvas with a subsequent SOURCE rectangle is exact. An OVER frame is explicitly rejected by the initial-profile planner. Full replay measured 0.338 ms/target; planning plus selected decode measured 0.170 ms. A frame-4 checkpoint baseline is faster still at 0.153 ms but retains a 24576-byte complete canvas.

## R345 — Stack PNG images by joining their compressed scanline streams

Two equal-width grayscale PNGs were encoded as single fixed-Huffman DEFLATE blocks. The token walker validates the streams and observes far fewer coded tokens than output bytes (99 tokens for 2088 filtered bytes in source 1), proving real length/distance backreferences are present.

The splice clears the first final-block marker, inserts a legal aligned empty stored block, appends the second DEFLATE stream, and rebuilds the combined zlib/PNG framing. Inflated filtered bytes equal the exact concatenation, and independent PNG decoding equals the expected vertical pixel stack. The second image's first row uses filter None; an Up-filter boundary is rejected by the eligibility gate.

The joined zlib stream is 271 bytes versus 272 bytes across the two sources. Economics remain weak for cold assembly: 0.794 ms versus 0.214 ms for the tiny baseline. With already validated parse metadata, splice assembly falls to 0.180 ms. This is therefore an exact construction with a possible reuse niche, not a general speed win.

## R346 — Turn Paeth prediction into composable byte-state maps

For a 1,024-byte Paeth row split into 16 chunks, each chunk was represented by the exact terminal-state map for every one of 256 incoming left-byte states. Short chunks were exhaustively checked for all 256 states. Function composition is associative, prefix-derived states reconstruct the complete row exactly, and a separately encoded two-row Paeth PNG decodes to the intended pixels.

The wrong previous row changes output, confirming that the map does not erase vertical dependency. Logical dense-map storage is 4096 bytes for this one row. The cost gate fails decisively: sequential reconstruction is 0.379 ms versus 95.536 ms for dense maps plus local reconstruction, a **252.4× slowdown**. Preserve the algebraic identity, but reject this CPU implementation.

## R347 — Morph convolution effects using reusable basis outputs

Two 256-tap fixed impulse responses were convolved with a 4,096-sample source once. Arbitrary output-time weights then combine the complete basis outputs. The candidate differs from direct time-varying convolution by at most 6.66e-16 in double precision and 4.47e-16 against 600 long-double reference outputs.

An impulse before a later weight change retains its continuing tail exactly. The deliberately wrong construction—moving the weights to the input side—differs by as much as 0.648, demonstrating that the candidate is preserving the declared output-time semantics.

Basis preparation costs 0.2199 ms. Once prepared, one automation query costs 0.0068 ms versus 0.2655 ms for filtering both bases again, about **39.2×** cheaper after preparation. The measured break-even is approximately 0.85 queries on this small fixture. This qualifies repeated bounded-material previews, not arbitrary impulse responses outside the selected basis.

## Overall

R343 and R344 survive independent rerun as practical capability/components. R345 is legal and exact but should not be sold as a cold-path optimization. R346's exact dense-map formulation is computationally unattractive on CPU and should stop here absent a genuinely different parallel model. R347 is the strongest performance result in the batch for repeated automation editing, provided retained basis-output memory is acceptable and the requested impulse response remains inside the declared basis.