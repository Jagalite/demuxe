# Demuxe D21–D25: local-agent handoff

## Entry gate

Read REPORT.md, verify checksums.sha256, then inspect evidence/verification.json and relevant raw results. Reconcile with the current checkout and D01–D20 before assigning permanent R-identities. Main was read at 01611bdaa2d9a21903bd2f1086fe0d786df6d5d1; it was not executed or changed. Preserve local modifications. These isolated components must not be promoted merely because their negative-control checks pass.

No research item should be rewritten as globally passed. R140 needs actual RTP/JPEG construction, R103 needs wider independent-subframe parsing, R198 needs PGS event lifetime ownership, and R344's original region solver is not implemented here. D22 targets a different destination from R008's retained presenter.

## D22: source-authoritative orientation before pixels

Inspect the actual extraction of AVC display-orientation SEI and MP4 track matrices. The prototype receives a static 90-degree fixture contract, independently confirmed by FFprobe. It is not a general extractor of changing orientation. Establish source-bound intervals and a clear precedence policy. Do not double-apply a rotation on a destination that understands both signals; do not map only the first SEI and ignore later changes. Existing non-identity matrices and arbitrary angles currently reject.

Retain both direct and MSE controls, explicit color tags, wrong-sign and unrotated negatives, and same-time raw pixel comparisons. Add static 180/270-degree and reflected cases only under explicit geometry rules. Verify subtitle coordinates, hit-testing/pointer coordinates, dimensions, rotation during source replacement, and presentation on the real target browsers. Software-filter/export semantics differ from display-only orientation. Benchmark only after the actual route and requested semantics match.

## D21: JPEG tables belong to a source configuration, not merely a table ID

The 16-frame case uses complete self-authored baseline JPEGs, then removes their DQT/DHT segments. This is a table reconstruction kernel, not a complete RTP/JPEG receiver. Source descriptors bind table/scan hashes and epoch; their authority must come from the source/trusted parsing workflow. An attacker-supplied hash accompanying attacker-supplied bytes is not authentication.

The wrong-table negative decodes into wrong pixels. Cache exact table contents, geometry and source/configuration identity, not just table IDs or codec name. Validate actual supported marker/profile syntax, restart markers and source fragments. Check cancellation and frame ownership before publication. Add one actual camera/transport fixture with known metadata and an independent original image oracle before testing FPS or player routing.

Avoid claiming zero copy: the Python candidate builds a full JPEG output. A production Blob/view-based constructor requires its own ownership and complete cost tests.

## D23: explicitly selected source channels are not a downmix

The candidate only supports the included six-channel 24-bit/48kHz STREAMINFO-only constant/verbatim layout. It copies original channel subframe payloads, changes the declared independent channel count, and updates checksums. It does not decode sample values, but it does read and CRC-check all source frame bytes.

Keep preserve-surround and downmix requests rejected. Do not expose source channels 0/1 as an automatic "stereo downmix". Actual channel layout/order must remain explicit. Extend fixed/LPC/residual parsing with exact sample and malformed-input controls; test true decorrelated stereo, altered block sizes, metadata blocks, source configuration changes and independent source files before generalization.

The output PCM MD5 is cleared as unknown. Preserve construction provenance or calculate a correct digest when the consumer requires it. Unknown must not be reported as verified. Compare against actual decode-select-reencode only for the same requested channels and numerical representation. The current byte reduction is not an end-to-end CPU measurement.

## D24: native PNG destination with an unresolved cost case

The input is a PGS-grammar RLE bitmap payload plus a resolved RGBA palette, width and height. The test does not parse a complete PGS stream or its palettes/presentation timelines. Add actual PGS object assembly, YCbCr/color policy, palette updates, forced/clear flags and seek/cancellation lifetimes before an integration route.

Two formatters are provided. The first maps runs to literal/distance-1 DEFLATE; the second reuses the immediately previous identical validated row and symbolically updates Adler-32. Neither expands a full index or RGBA raster. Both retain compressed input/output; the second also retains row descriptors/tokens. Input/output allocations, Python loop cost, browser PNG decode and display work remain real.

Preserve the large output-size penalties. Even after row reuse, conventional PNG is 2.47–8.20 times smaller on these authored samples. Do not adopt as default without comparing complete work with the maintained RLE/span/raster path. Investigating richer symbolic row matching may be useful, but is a separate tested variant, not a performance inference. Bounds must cover actual peak allocations, not just the logical pixel budget.

The generated edge cases include widths around DEFLATE match limits and 4096 pixels, but they are not fuzzing completeness or untrusted-input certification.

## D25: cold seeking, not animation playback or a full region solver

The parser provides validated frame views and a safe-anchor/disposal plan for RGBA8, noninterlaced APNG. The fixtures include a separate static default image and split fdAT chunks. Candidate image data is copied, not recompressed. Timings are represented in original numerator/denominator terms; timed display is not executed.

The cold planner may skip PREVIOUS frames before the target because their changes do not persist. It may replace BACKGROUND-disposed intermediate frames with clears without decoding their image. It must still render the requested target before that target's disposal. A full SOURCE frame with PREVIOUS disposal cannot become a persistent anchor for later frames unless the restored history is independently supplied.

Keep both wrong-disposal/anchor pixel negatives. Expand beyond binary alpha carefully, comparing fractional-alpha rounding, hidden transparent colors, color metadata and composition in the target browser. Do not discard unknown ancillary chunks from arbitrary files just to admit them; this parser rejects unqualified chunks. Add index/decoded-image memory budgets, encoded-byte ownership, remote source reads, and source epoch controls.

Compare against the real software animation decoder and checkpoint implementation under equal retention budgets. Five instead of twelve image decode calls is a work-count observation, not a latency or CPU percentage. Full-file createImageBitmap returned animation frame zero here, not the separate static default poster; preserve that distinction.

## Reporting and next gates

Keep define/fixture/correctness/performance/integration gates separate. Native browser APIs can use software decoders; this headless environment does not establish hardware acceleration or power efficiency. The secure-context probe was administratively blocked and was not worked around. Default-page browser tests remain reproducible without a web server.

The recommended next scope is one actual D22 route and one actual D21 consumer. Use D23/D25 when their explicit operations have users, and keep D24 conditional on a measured cost case. Do not start five large production subsystems at once.

All acceptance runs should preserve original source/output bytes, commands, profile declarations, failures and controls. Include full required tracks, exact relevant timing, configuration changes, seek/cancel/source replacement and cleanup. Only then compare complete equivalent work with both the maintained fallback and an already-compatible browser reference.
