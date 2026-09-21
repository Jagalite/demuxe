# Demuxe batch 3 — local-agent handoff

## First actions

Read REPORT.md and evidence/verification.json. Verify checksums.sha256 before changing files. Reconcile D14–D20 with the current Demuxe checkout, the R032/R095/R102/R174 and fidelity/continuity work, and prior D01–D13. Temporary D-identities must not be assigned conflicting R-numbers or counted as wholly new inventions. The reviewed main was `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`; the repository was read, not changed or executed.

Inspect the actual selected plan and data boundaries before implementing anything. Preserve local modifications. Do not promote any result to production correctness or performance merely because all cross-checks pass. Those checks intentionally include successful detection of failed routes and corrupted output contracts.

## D14 — joint track declaration

Locate the exact point where selected audio/video SourceBuffers are created and the first init/media segment is appended. Reserve all required supported lanes before the first initialization commits the presentation. Preserve valid direct playback: the original complete Matroska source already plays in the screen. The opportunity is controlled or track-independent delivery.

Retain late-add versus joint-declaration cases. Both MIME hints can be true while the current graph rejects another track. Do not treat a graph-state-dependent QuotaExceededError as unconditional codec incompatibility or as proof of memory exhaustion. Do not start a retry/eviction loop for the wrong class of quota failure.

Retain the 400 ms wrong-offset negative. Replace the coarse ScriptProcessor/media-clock witness with an independent sample-level output oracle before closing timing correctness. Investigate the 4.025-second tail and the Ogg/WebM whole-file Vorbis length difference. Test source replacement, selected/unselected tracks, cancellation and delayed init data.

## D15 — Opus gain and tail

Inspect OpusHead/dOps/CodecPrivate construction, pre-skip, end trimming, timestamp mapping and channel mapping separately. The whole-file WebM output matched Ogg exactly for the three gains. The MP4 recipe added 792 frames despite preserving the coded payloads and interior output. This is not a universal statement about MP4 Opus.

Do not discard gain metadata or apply it again in a graph because a remux changed containers. Do not infer exact output from compressed-packet hashes. Qualify streaming MSE PCM, seeks and tail on actual destination profiles; decodeAudioData is not that test. Preserve the 108-packet and three-gain fixtures as regression cases.

## D16 — actual constant/verbatim formatter

The Python formatter is an isolated proof of bitstream construction. Do not transplant it as a general FLAC encoder or call it fast. It accepts constructed 48 kHz, fixed-block, integer PCM profiles only; input PCM is fully materialized and scanned. There is no demonstrated elimination of source decoding or silence allocations.

Keep like-for-like bit depth, channel count, sample frames, block size and executable/library consistent in baseline comparisons. The initial S32 FFmpeg control lost source precision; final libFLAC controls fix this. The 3.49×/11.45× output-size penalties against level 0 are reasons to retain the conventional path until measured end-to-end value justifies an alternative.

A next experiment should compare maintained encoders/formatters with actual delivery, memory/copy costs and browser decode, not host executable startup or Python loop timing. Use both difficult-to-compress and ordinary signals and an explicit bounded-silence descriptor only if it exists in the real application.

## D17 — audio-only codec transition

Keep one media element, one audio SourceBuffer and the healthy video SourceBuffer. Observe exact application ownership rather than assuming that an unchanged JavaScript object proves unchanged browser decoder internals. The screen appends the second codec during playback, but before the future presentation boundary.

Require a source-bound boundary, exact timestamp mapping and new initialization after changeType. Test seam PCM, overlap/gap rules, resampling, priming, wrong offsets, cancellation and failed appends. The current 4.021-second presentation fails an exact four-second tail contract; no gapless claim is allowed. This does not implement native/software/native compatibility islands.

## D18 — decoder acceptance versus integrity

Keep structural validation, checksums, content identity and decoded fidelity distinct. The browser accepted all three FLAC integrity negatives. The restricted CRC parser rejected a bad frame CRC, but correctly could not authenticate the altered valid-CRC payload or verify decoded PCM MD5 without decoding.

A trusted source digest needs an authenticated or otherwise trusted origin. A checksum or hash supplied only by the same untrusted payload is not that origin. Preserve the old-source/cancellation publication guards from D12 as well. Scope resource bounds and parsing limits explicitly; the test parser is not an untrusted-media production parser.

## D19 — numerical-contract-aware compressed promotion

Read scripts/promote_s16_flac.py. The scoped transform raises STREAMINFO bit depth to 24, adds eight wasted bits to each constant/verbatim subframe, copies all existing 16-bit sample payload bytes, updates frame CRCs/frame-size metadata, and clears the now-invalid output PCM MD5 to the standards-defined unknown value.

It grows the tested file by 376 bytes, instead of rewriting it as wider verbatim samples. It fixes the explicitly specified S16 / 32768 Float32 convention in this browser profile. It does not preserve the previous browser S16 float output bit for bit, and must not be silently applied to arbitrary playback contracts. Source integer representation, normalized floats and actual rendered output are separate equivalence contracts.

Only admit the exact parsed header/subframe types, rate, channels and inherited-bit-depth syntax. Do not extend it to fixed predictors, LPC, residuals, existing wasted bits or arbitrary midstream changes without proof. Frame CRC does not establish trusted input identity. A contract requiring output STREAMINFO MD5 needs a correct new MD5 or a separately validated construction record; zero is unknown, not verified.

For S32 exact export or analysis, retain an integer-preserving path. Correctly rounded Float32 still cannot represent all the original integers. Do not call this a codec loss or an audible issue without evidence.

## D20 — explicit color propagation

Retain the untagged direct/MSE mismatch as a negative. Propagate authoritative color metadata; do not infer 601 or 709 just from resolution, file extension, a browser default, or which choice makes a test match. Inspect container colr and AVC/HEVC configuration signaling together. Define precedence for contradictory metadata and explicit user overrides.

The authored controls deliberately declare distinct color semantics and preserve every coded picture packet and decoded YUV plane. They demonstrate route consistency for the declared profiles, not the intended color of any arbitrary untagged source. The selected RGB comparisons are canvas-visible results, not physical display/HDR qualification.

Keep the wrong-matrix control. Add range, primaries/transfer, SPS/container disagreement, source replacement and HDR tests. Reuse the explicitly tagged reference when testing D14/D17 video output, while separately gating the audio tails.

## Rerun and reporting

The package contains scripts, fixtures, raw JSON records, commands, checksums and retained early failures/corrections. `bash run_all.sh` creates a new run and archives the previous evidence and fixtures. Do not rerun failed cases merely to obtain a passing table. Record environment changes and distinguish harness mistakes, genuine admission failures and fidelity failures.

Only after integration and correctness should a paired benchmark compare complete equivalent playback against both the actual fallback and the already-compatible native reference. Include startup, transform/mux, copies, retained buffers, decoder/presentation, seek, tail and cleanup. No CPU, energy, hardware-decoding, zero-copy or physical-speaker claim is established here.
