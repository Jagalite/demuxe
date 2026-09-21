# Demuxe batch 2 — local-agent handoff

## Mission

Reconcile D08–D13 with the actual Demuxe checkout before allocating IDs or implementation work. Read REPORT.md, evidence/verification.json, environment.json, component.json, and the relevant browser logs. These are six scoped questions, three of which are metadata adapters. D11 reuses those adapters; D13 derives from controls. Do not count assertions, subsets, witnesses, or repeated runs as new experiments.

Reviewed main remains `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`. No application code was loaded into these tests and nothing was pushed. Preserve existing local changes. Check the actual current research directory, outside-branch R367–R393 records, and missing-definition recovery queue before any ID assignment.

Verify the delivered checksums before running `bash run_all.sh`. Reruns archive evidence under runs/ and produce a new environment profile. These Python parsers intentionally accept fixture-specific layouts; do not transplant them into production as general MP4 parsers.

## Per-question work

### D08 — explicit AAC sample rate

Adjacent identity: R119 canonicalize equivalent decoder configurations; D01 is the PCE sibling, not the same test.

Locate the actual AudioSpecificConfig/ESDS construction and admission boundary. Restrict the first candidate to AAC-LC, exactly table-representable sampling rate, stereo, known GA flags and validated extension syntax. No nearest-rate substitution. Preserve the ES_ID, stream type, bitrate/buffer descriptors, channel meaning, sample tables, packet bytes, PTS/DTS, and source epoch. Validate descriptor lengths and all container offsets affected by init resizing.

The explicit-rate source is authored from a known-compatible configuration; the adapter restores that control exactly. Both host and browser whole-file audio reject the explicit representation, so do not invent an original decoded-PCM equality result. Obtain independent ASC validation and real-world fixtures. Measure actual streaming output through seeks and tail, not only decodeAudioData. Do not accept video-only native direct as an alternative: the explicit fixture produced silent audio under that path.

### D09 — absolute-to-relative fragment addressing

Adjacent identities: R009 controlled-fetch opportunity and R162 patch-program work.

First determine whether the current reader already rewrites these fields. Only implement for a consumer that genuinely requires controlled MSE fragment delivery; direct playback of the original complete file already works in the screen.

Validate tfhd flags, bases, every trun, all sample sizes/durations, referenced byte spans, multiple mdats, signed offset overflow, auxiliary data and indexes. The output must be structurally valid, not merely tolerated by Chromium. Preserve payloads and timeline. The fixture-specific equal-size free-box reservation is not mandatory architecture. Encryption, mixed addressing, separate data resources, large boxes and unknown layouts are not qualified.

### D10 — inferred tfdt

Adjacent identities: R162 and R222 construction verification.

Carry per-track start and exact integer durations only within a trusted source/continuity epoch. Require a source-bound predecessor/anchor and an independently verified sequence of source ranges. Do not build the expected continuity list from a candidate that may already have a gap. mfhd sequence numbers are not sufficient proof. Reject missing duration, new track, discontinuity, reordering, unknown source identity, integer overflow or seek without an anchor.

The screen removes six headers and poisons their former payloads. Reconstruction uses accumulated duration and produces the complete original file exactly. Retain this non-circular control. Then test seek/cancellation, out-of-order network delivery and source replacement in the real component.

### D11 — three-barrier composition

Adjacent identities: R131/R028 and D07.

Retain all eight subsets. Only the full set passes the screen. Update still-absolute fragment bases when init resizing shifts bytes; the tested order does this before rebasing. Consider order independence only when each transform's preconditions and offsets are satisfied, not by blindly permuting byte patches.

Permit temporarily unplayable but structurally justified intermediate states. Bound search families, depth, validation cost and fixture count. Require exact requested output, not just parser acceptance, before cost ranking. Do not turn this small fixture into a new large subsystem prematurely.

### D12 — current-source publication token

Adjacent identities: R208, R358 and D05.

Make commit conditional on complete validation AND a still-current source/configuration generation AND absence of cancellation. Check at the final publication boundary, not only when work begins. The new-source valid packet should be allowed to finish before the older job resumes. Keep cancellation-before-input, after-output, after-validation, normal and malformed controls.

This package exercises browser decompression and a simulated commit counter, not the application decoder queue. Integrate there before claiming correctness. Measure retained bytes across jobs, input buffers, transient joined output and native internals separately. Do not call the 64 KiB quarantine limit a complete native-memory bound, or call discard-on-completion prompt cancellation.

### D13 — output-contract witnesses

Adjacent identities: R192/R222 and comparison qualification.

Require actual output for each requested track. The authored explicit-rate native direct fixture reaches video EOF with no captured audio and no media error; the known non-silent tone witness catches it. Do not treat real silence as a failure in general media. The ScriptProcessor test tap is a research capture mechanism, not a production audio-owner recommendation.

Verify actual container timing and browser output length beyond FFprobe packet hashes. The authored control stream-copy remux keeps all packet summaries and payload hashes yet shifts final audio end by 512 ticks and increases browser decoded length by 512 sample frames. D09/D11 must compare with their own absolute-addressed compatible control, not the shorter-tail source. Qualify priming/trim/seek audio directly in the maintained route.

## Shared reporting rules

No hardware-decoding, physical-speaker, zero-copy, runtime CPU, energy, complete streaming fidelity, or production compatibility claim follows from these results. Retain direct-route alternatives. Record browser/OS/build, actual selected route, all source/output hashes, precise feature contract and negative controls. Successful isolated probes do not close integrated correctness or performance stages.

After integration, benchmark equivalent complete playback against both the actual fallback and already-compatible native reference. Include transform/read/copy work, decoder and presentation costs, memory, cleanup, startup and tail. Use predeclared worthwhile thresholds and paired repeat measurements. Do not compare a video-only output against a full A/V baseline.
