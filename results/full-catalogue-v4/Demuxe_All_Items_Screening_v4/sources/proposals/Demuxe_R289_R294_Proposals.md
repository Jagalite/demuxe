# Demuxe — R289–R294 research proposals

Date: 18 September 2026

Status: PROPOSED / NOT TESTED. This document records hypotheses and first experiments, not results. No playback, benchmark, decoder implementation, production change, or current-repository audit was performed in this pass. Existing references to earlier catalogue ranges are left unchanged. IDs, titles, and stable keys below belong together; do not substitute a nearby experiment when testing a card.

## R289 — Share one native decoder across unrelated independent-picture jobs

Stable key: `independent-picture-decoder-service`

**Mechanism.** An active WebCodecs worker accepts independently decodable pictures from multiple authorized files, groups only compatible full decoder configurations, and correlates each output with a job identity. Preserve the original source timestamps and display metadata separately from internal dispatch timestamps. This is a thumbnail/inspection service, not interleaving arbitrary predictive streams or sharing live playback state. Begin with H.264 IDR-only inputs and matching parameter sets, geometry, bit depth, color interpretation, and benign prior-output semantics.

**First experiment.** Request one independently decodable picture from each of several synthetic files. Compare one persistent service, per-job decoder construction, and a small bounded decoder pool. Do not wait to fill a batch or delay an interactive job purely for utilization. Include cancellation, duplicate original timestamps, configuration changes, a failed input, and stale outputs after a generation change.

**Oracle.** Exact frame/job identity and source mapping; decoded-plane equality against independent decoding with the same qualified implementation. Compare complete presentation separately. Missing, swapped, or silently discarded output fails. Browser-owned decoding is not proof of hardware acceleration.

**Measure.** First-job latency, completion distribution, decoder constructions, peak retained frames, full CPU/memory cost, and behavior during concurrent playback. Count scheduler overhead and the cost of releasing or copying output frames.

**Reject.** Incompatible configurations, reliance on fake key labels, output-discard interactions, starvation, excessive serial queuing, or no advantage over an already efficient bounded pool. Audit existing sharing before implementation.

**Distinction.** R118 shares one decoded picture with several consumers. This proposal decodes different independent pictures through a common service. It does not require the deliberately coordinated reference banks proposed in R136.

**Primary sources.**
- https://www.w3.org/TR/webcodecs-avc-codec-registration/
- https://www.w3.org/TR/webcodecs/

## R290 — Compose exact motion-copy chains before reconstructing pixels

Stable key: `symbolic-motion-copy-composition`

**Mechanism.** In a controlled software decoder, represent eligible predictions as mappings to immutable anchor pixels or reconstructed patches. For a pure-copy picture, F_t(p) = F_(t-1)(g_t(p)); compose the maps across several pictures instead of copying full intermediate planes. This is a pull-back coordinate map, not an estimate of physical motion. Syntax and reference bookkeeping still advance normally.

**First scope.** Restricted progressive MPEG-2 I/P video, one forward reference, no coded residual in eligible blocks, and motion that is an integer sample displacement on every affected plane. Integer luma motion alone is insufficient when chroma is subsampled. No bidirectional averaging, fractional interpolation, or unmodeled filtering. Unsupported blocks are eagerly reconstructed as materialized leaves or cause a conservative fallback.

**First experiment.** Prepare a synthetic scroll/moving-region sequence and request selected exact frames inside its GOP. Compare ordinary reconstruction, dependency-aware reconstruction without map composition, and composed maps. Then test changing block boundaries and edge behavior; preserve every intermediate boundary operation rather than merely summing motion vectors.

**Oracle.** Exact requested decoded planes and correct ongoing reference behavior against a pinned independent decoder. All displayed frames must still be supplied during continuous playback. The strongest initial use is sparse exact access, not dropping visible frames.

**Measure.** Parsing, map creation, map fragmentation, retained leaves, output gathers, materialization, and total seek latency. Include first-visit preparation.

**Reject.** Coordinate fragmentation or dependent features destroy useful composition; maps consume more memory/work than planes; an unsupported prediction is approximated; or only an artificial baseline shows a gain. Bound map complexity and materialize when the bound is reached.

**Distinction.** R132 omits unrelated dependency branches; this keeps the dependence but composes its operations. R152 shares unchanged tiles; this can follow exact moved content across several generations.

**Primary source.**
- https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/mpeg12dec.c

## R291 — Disable in-loop filtering only after proving it is a no-op

Stable key: `certified-noop-deblocking-rewrite`

**Mechanism.** Prepare a valid H.264 derivative that disables deblocking for an entire admitted picture/slice region only when the original filter provably cannot alter any affected sample. Begin with conservative structural conditions on all luma/chroma edge thresholds and quantizer information; do not infer safety from visual smoothness. Keep coded prediction and residual meaning unchanged while rebuilding affected headers, alignment, escaping, lengths, and offsets.

**First scope.** Progressive eight-bit 4:2:0, CAVLC, one slice per picture, controlled quantizers and offsets, ordinary I/P prediction. First prove all affected thresholds make filtering an identity. Do not generalize one low quantizer value to uninspected blocks or chroma edges.

**First experiment.** Generate eligible and near-ineligible fixtures. Transform only certified pictures, retain the original when eligibility is unknown, and independently check complete decoded sequences, including later references and seeks. A near-boundary fixture with one potentially active edge must be rejected by the structural gate.

**Oracle.** Byte-exact decoded planes for all pictures, not merely the edited picture. Correct container sample lengths/timing and legal bitstream parsing. Retain a source-bound record of the eligibility proof.

**Measure.** Source analysis and rewriting, derivative bytes, browser decode/presentation behavior, and repeat-view break-even. Compare with existing decoder fast paths: FFmpeg already returns early when relevant thresholds are zero.

**Reject.** Any pixel/reference mismatch, incomplete proof, substantial preprocessing with no reuse, or existing decoder optimizations leave no meaningful saving. This is not an approximate skip-loop-filter mode or generic profile relabeling.

**Primary sources.**
- https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/h264_loopfilter.c
- https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavcodec/h264_slice.c

## R292 — Compile a decoder kernel for a repeatedly used Huffman codebook

Stable key: `source-specialized-huffman-kernel`

**Mechanism.** For a controlled MJPEG software path with demonstrably reused validated Huffman tables, generate a bounded Wasm kernel specialized to those tables and the admitted scan layout. Evaluate trusted templates for inlined decisions or table-specialized constants while retaining a correct general escape path. The source bitstream remains unchanged.

**First experiment.** Baseline sequential grayscale JPEGs sharing tables. Compare the same decoder with its ordinary prederived lookup tables, a specialized kernel, and native ImageDecoder where qualified. Require identical symbols, consumed bits, quantized coefficients, and reconstructed output. Exercise long codes, byte stuffing, restart boundaries, truncation, table changes, invalid tables, and first-frame behavior.

**Safety and lifecycle.** Untrusted tables are bounded data, never arbitrary supplied instructions. Limit code size, compilation budget, cache entries, and input-derived loops; validate generated modules and obey deployment compilation policy. Wasm module validity does not establish correctness or resource safety of the generator. Fall back when compilation is unavailable, too costly, or a table is not reused.

**Measure.** Kernel construction, validation/compilation, first frame, steady state, compiled-code retention, full decoder cost, and break-even count. Compare against an optimized table-driven decoder, not a naive binary-tree traversal.

**Reject.** Lookup machinery already captures the useful specialization, instruction/cache cost rises, tables change too often, or total work grows. No guaranteed speedup from replacing loads with branches.

**Distinction.** R226 changes legal source Huffman coding to suit a decoder; this changes a controlled decoder to suit the unmodified source. R145 selects broad build-time profiles; this specializes runtime codebooks.

**Primary sources.**
- https://raw.githubusercontent.com/libjpeg-turbo/libjpeg-turbo/main/src/jdhuff.h
- https://raw.githubusercontent.com/libjpeg-turbo/libjpeg-turbo/main/src/jdhuff.c
- https://webassembly.github.io/spec/core/valid/index.html

## R293 — Seek inside authenticated encrypted media without decrypting the whole file

Stable key: `authenticated-random-access-media-source`

**Mechanism.** Implement a logical plaintext range reader over a deliberately prepared, independently authenticated segmented source. Use an existing reviewed construction such as Tink AES-GCM-HKDF Streaming, not a new cryptographic scheme. An authorized caller supplies the key and associated-data context. The adapter retrieves and authenticates complete necessary ciphertext segments, then exposes only the requested plaintext ranges to the existing demux/remux path.

**First experiment.** Encrypt a synthetic MP4 through a pinned reference implementation. Validate browser or Wasm adapter output against official/reference vectors and exact plaintext bytes for startup, distant seeks, straddling ranges, and final short segments. Benchmark against sequential processing of the same encrypted object and a plaintext range-reader baseline.

**Negative controls.** Corrupt tags, wrong keys/context, segment substitution, reordering, truncation, cancellation, and stale source identity must not publish unauthenticated or misattributed bytes. Authentication failure is not EOF. Verification of requested segments does not authenticate unread media or establish whole-file completeness. A trusted external identity/version policy is still needed against whole-object rollback.

**Measure.** Extra segment bytes, authentication latency, worker transfers, bounded plaintext cache, repeated seeks, and total time to correct output. Small media reads may require substantially larger authenticated segment reads.

**Reject.** Required APIs/builds are unavailable, authentication is deferred until after publication, segment/nonce derivation differs from the referenced scheme, memory cannot be bounded, or the deployment cannot protect/resolve the authorized key appropriately. Tink streaming objects are treated as immutable; edits create a new correctly encrypted object.

**Distinction.** R159 keeps encrypted codec samples encrypted while remuxing toward authorized browser media decryption. This is authorized outer storage encryption that yields verified source bytes before demuxing. It is not DRM extraction or a bypass around a content-decryption module.

**Primary sources.**
- https://developers.google.com/tink/streaming-aead
- https://developers.google.com/tink/streaming-aead/aes_gcm_hkdf_streaming
- https://www.w3.org/TR/webcrypto/

## R294 — Parallelize a nonlinear peak-release envelope using composable summaries

Stable key: `max-decay-envelope-prefix-scan`

**Mechanism and declared output.** For finite nonnegative magnitudes p_n and a fixed 0 <= a <= 1, define e_n = max(p_n, a*e_(n-1)). Each block maps incoming state to outgoing state as F(e) = max(A*e, B). Consecutive blocks compose as (A2*A1, max(A2*B1, B2)). The operation is associative over real arithmetic and can support a parallel prefix over block summaries.

**First experiment.** Independent workers compute local summaries; prefix composition supplies true incoming states; workers produce their assigned envelope intervals. Compare every result with a straightforward sequential implementation of this exact recurrence. Test impulses across boundaries, long decay tails, initial nonzero state, a=0, a=1, ties, tiny numbers, and irregular job sizes. NaN/infinity policy must be explicit.

**Numerical contract.** Real-arithmetic equivalence is not bit-identical floating-point equivalence. Begin with exact-arithmetic small cases and a higher-precision numerical oracle, then declare a tested tolerance for practical floating implementations. Do not assume per-step rounded fixed-point multiplication retains the same compact composition law.

**Potential uses.** Offline envelope indexing, many-channel peak displays, or the specifically defined detection stage of an opt-in dynamics processor. This does not establish a complete limiter or true-peak detector.

**Measure.** Both local passes, summary storage, composition, transfers, output production, latency, and active channel count against optimized sequential/vectorized processing of the same recurrence.

**Reject.** Numerical error exceeds contract, intermediate underflow breaks requirements, extra passes dominate, or the target effect has a different recurrence. Do not silently replace FFmpeg/Web Audio compressor semantics: FFmpeg compand uses different attack/decay updates.

**Distinction.** R245 relies on linear-system corrections. This uses a closed compositional form for a nonlinear maximum operation.

**Primary implementation contrast.**
- https://raw.githubusercontent.com/FFmpeg/FFmpeg/n7.1.1/libavfilter/af_compand.c

## Shared execution rules

Every card begins with capability and eligibility checks. Missing browser capabilities are BLOCKED, not failed media. Exact pictures, exact bytes, and numerical-tolerance outputs are different contracts. Persist negative controls and source/version/configuration identities. Native host, Wasm component, browser route, and complete Demuxe session evidence remain separate. Do not bypass origin, authorization, content-security, or administrative restrictions. All preprocessing, compilation, synchronization, copies, and cleanup belong in full-cost comparisons.
