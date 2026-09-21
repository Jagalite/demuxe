# Demuxe focused research screen — batch 2 (D08–D13)

## Outcome

Three narrowly scoped metadata transformations passed standalone compatibility screens. A deliberately combined fixture required **all three** transformations: none of the seven incomplete subsets produced a successful MSE presentation. Two additional checks exposed safeguards needed around source replacement and media acceptance.

These are **six related research questions**, not six new codec inventions, six independent compatibility expansions, or six production-qualified routes. D11 reuses D08–D10. D13 was developed from the direct-playback controls. Existing related research is explicitly identified below. Temporary D-labels do not allocate or overwrite repository R-numbers.

Repository main was rechecked at `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`, unchanged from batch 1. These are standalone prototypes, not the maintained Demuxe player. No repository files were changed or pushed.

## Evidence and environment

Execution used FFmpeg 7.1.5 and Chromium 144.0.7559.96 on Linux. The four-second, 160×96, 12 fps AVC reference is a self-authored fixture retained from batch 1. New AAC and fragmented-MP4 fixtures were constructed locally. Each primary A/V fixture contains **48 video packets and 189 audio packets**. These authored edge cases do not establish their prevalence in users' media.

An attempted loopback page navigation was blocked by the browser environment. Browser tests therefore used the allowed in-memory page binding, as in batch 1. Secure-context WebCodecs was unavailable. MSE, native Blob playback, Web Audio capture, whole-file audio decoding, and DecompressionStream were exercised. No network throughput, hardware decoder, GPU/overlay, power, CPU improvement, physical speaker output, or Demuxe integration is qualified.

Evidence distinguishes:

* Host demux/decode checks, exact packet summaries and payload hashes, plus direct parsing of container timing records.
* Four browser presented-frame witnesses per successful video trial, at 0.5, 1.5, 2.5, and 3.5 seconds, with media timestamps checked before full-canvas hashing. This is not all-frame browser fidelity.
* Whole-file browser audio hashes against the appropriate same-source control, separately from streaming output.
* Approximately 1.1-second real media-element audio captures through Web Audio, with distinct 997 Hz left / 1481 Hz right tone witnesses. This confirms requested-channel output in that interval, not sample-exact streaming, seek audio, full EOF audio, or A/V synchronization.

The host and browser decoders may share FFmpeg ancestry; they are not represented as independent algorithm implementations. `evidence/verification.json` records **61 passing cross-check assertions**, including expected failures. Assertions are not experiments.

## D08 — Canonicalize an exactly representable explicit AAC sample rate

**Question.** Can an AAC configuration that writes its sample rate explicitly be expressed using the corresponding standard table index, without changing packets or the requested rate?

**Relation to existing work.** Scoped extension of R119 configuration equivalence and D01; this is not PCE channel-layout conversion. It concerns the sampling-frequency representation of restricted AAC-LC stereo configuration.

**Construction.** Start with a known 48 kHz stereo AAC-LC control (`AudioSpecificConfig` `119056e500`). Replace the frequency index with the explicit representation of **exactly 48000**, yielding `17805dc01056e500`. Preserve all fragment/sample tables and coded payloads. The restricted adapter converts that representation back; the resulting complete file equals the compatible control byte for byte.

**Observed.** The explicit-rate file passes the MSE MIME-support query and append stage, but actual audio-decoder initialization fails. The normalized output passes the four video seek witnesses, EOF, and real streaming left/right tone checks. The normalized whole-file browser output equals the compatible control: **193,024 stereo sample frames**, identical Float32 hash.

Host FFmpeg and browser whole-file audio decoding reject the explicit-rate input, so there is **no original-explicit-versus-adapted decoded-PCM comparison**. The evidence is an exact known-configuration round trip, unchanged moof/mdat bytes, and matching output against the known-compatible control. This limitation must remain explicit.

**Negatives.** Reject 48001 Hz rather than rounding it to 48000. Reject the five tested truncated prefixes. The narrow implementation also excludes other channel layouts, frame-length/dependency/extension features, and unqualified trailing configuration.

**Decision: pursue a bounded admission adapter.** Do not blindly relabel rates. Obtain independent format validation and real explicit-rate files, broaden adversarial checks, then test the actual Demuxe configuration path. Cross-browser streaming PCM, priming/tail, and configuration changes remain open.

Evidence: `component.json`, `manifest.json`, `browser_routes.json`, `browser_audio.json`, `browser_audible.json`; all under `evidence/`.

## D09 — Make existing fragments relocatable by repairing their address metadata

**Question.** For an already-fragmented file that uses absolute sample addressing, can controlled MSE delivery be enabled without unpacking and remuxing every compressed sample?

**Relation.** R009 controlled-fetch pass-through remains distinct from its stopped local-Blob case. R162 already investigates qualified patch programs. This screen adds a concrete two-track, multi-sample absolute-address-to-relative-address conversion.

The MSE ISO BMFF byte-stream note requires movie-fragment-relative addressing. The prototype removes each explicit absolute base from `tfhd`, sets `default-base-is-moof`, and recalculates `trun` offsets. In this authored layout, an eight-byte `free` box preserves each affected region's size. This is a test-specific rewrite, not a generic ISO BMFF parser.

**Observed.** Absolute-addressed input fails MSE append; repaired output plays with the same four browser picture witnesses, EOF, and correct audio-channel tones. **120 byte values change in a 117,490-byte file**. All 237 packet summaries, all mdat payloads, host decoded pictures/PCM, and same-source browser whole-file audio remain unchanged. File size and payload positions stay constant. An intentionally one-byte-wrong sample offset fails the destination check.

**Important negative scope.** The original absolute-addressed file already works through direct Blob playback, including the sampled audio-channel witnesses. This is a candidate for **controlled/selected-fragment MSE workflows**, not a reason to replace an already successful cheaper direct route. No actual network delivery was tested.

**Decision: pursue only where the maintained application really needs MSE/controlled delivery and does not already perform equivalent work.** Validate all referenced sample spans, multiple mdats, auxiliary data, indexes, mixed addressing, overflow, cancellation, and encrypted-media boundaries before broad admission. No zero-copy or CPU-saving claim follows from the small number of changed bytes: the Python prototype copies buffers.

## D10 — Synthesize missing decode-time headers from proven continuity

**Question.** When a sequential fragmented source omits later `tfdt` headers, can exact per-track decode times be derived from a known start and actual sample durations, avoiding a new mux session?

**Relation.** Scoped duration/continuity extension adjacent to R162 and R222, not a generic seek-index reconstruction scheme.

**Construction.** Preserve each track's first decode-time anchor. Remove the six subsequent headers across three fragments and two tracks. Replace their old payload bytes with `0xA5`, so the reconstruction cannot recover the timestamps by reading old hidden values. Derive each next start from the previous start plus the applicable `trun`, `tfhd`, and `trex` durations.

**Observed.** The missing-header presentation fails MSE append. All six inferred headers recreate the compatible control **byte for byte**. The repaired presentation passes the four picture witnesses, EOF, whole-file audio equality, and streaming tone checks.

**Guards.** Reject an unproven source-span plan, a new/unknown continuity epoch, or the tested gapped plan. A production caller must provide an independently trusted, source-bound continuity record; deriving the expected plan from an already damaged candidate would be circular. Fragment sequence numbers alone do not establish continuity. No new seek may invent an initial decode time without its predecessor or a qualified anchor.

**Direct alternative.** As with D09, the unchanged complete local file already passes the direct playback screen. The value is admission to a controlled fragment workflow, not an unconditional replacement of direct playback.

**Decision: pursue the bounded continuity repair.** Test missing durations, discontinuities, multiple trafs/runs, reordered delivery, cancellation, track changes, and arbitrary seeks in the maintained reader before generalization.

## D11 — Require a complete set of repairs before deciding a route is impossible

**Question.** Does a real media presentation require several individually valid repairs before any success appears?

**Relation.** A bounded composition case related to R131/R028 and D07. It is not three additional transformations or a new generic graph planner.

An authored compound file combines explicit AAC sampling rate, absolute fragment addressing, and missing later decode-time headers. AAC initialization resizing correctly relocates any remaining absolute bases before subsequent repair; changing init size without handling those bases would invalidate the experiment.

| Repairs applied | Number of tested subsets | Successful MSE presentations |
|---|---:|---:|
| None | 1 | 0 |
| Any single repair | 3 | 0 |
| Any pair of repairs | 3 | 0 |
| All three repairs | 1 | 1 |

Most incomplete candidates fail append. Address-plus-time repair reaches audio initialization but fails there. The complete candidate passes four timestamp-qualified picture witnesses, EOF, real audio-channel tones, host output comparisons, and whole-file browser audio comparison against its own absolute-addressed compatible control. Coded media remains unchanged.

**Decision: pursue narrowly bounded composition search.** A greedy search that keeps only immediately playable intermediate states misses this example. Preserve intermediate states that satisfy a documented structural invariant, while keeping search depth and candidate count bounded. Do not treat arbitrary failure as evidence for unlimited permutations. All seven incomplete outcomes remain in the evidence.

## D12 — A validated packet still needs a current source owner before publication

**Question.** Can a correctly decompressed, checksum-valid packet finish too late and be published after its source was replaced or cancelled?

**Relation.** R208 cancellation plus D05/R358 packet validation. This extends the commit predicate from validation alone to validation **and** current-source ownership.

The browser actually decompresses a real 2,937-byte AVC packet. Controlled scheduling holds completion before input, after output, or after validation. In source-replacement cases, a new epoch's valid packet finishes before the older job is released.

**Observed.** In three supersession cases and one cancellation-after-validation case, a validity-only publication counter would accept all **2,937 stale bytes**. The epoch/cancellation guard accepts **zero** stale bytes. Each replacement case separately accepts the new 2,937-byte packet with the expected hash. A normal packet passes. A bad-checksum packet fails validation and never commits. Retained chunk references are released in all cases.

**Decision: pursue as adapter correctness work.** These are real decompression plus a simulated publication boundary; no actual Demuxe decoder queue was involved. This does not prove prompt cancellation of native decompression, a total-memory cap, safe epoch reuse, or integration teardown. The 64 KiB cap is only a retained-quarantine limit, not a browser-internal memory bound. Do not present publication counters as measured decode savings.

## D13 — A route needs track-output and timing witnesses, not only video and EOF

**Question.** Can a seemingly successful native presentation, or a packet-preserving remux, violate the requested output while passing a weaker test?

**Relation.** Acceptance/oracle follow-up related to R192/R222 and current head-to-head qualification, not a novel codec mechanism.

### Counterexample A: native-direct video without requested audio

The explicit-rate input passes the four direct-Blob video seek witnesses and reaches EOF. Yet a separate unmuted media-element capture yields **zero signal on both channels**, with no media error reported in that capture. The compatible control and normalized MSE candidate produce their distinct expected channel tones through the same capture harness. The harness mutes only after capturing the audio graph, not at the media element.

The video/EOF-only gate would label the explicit-rate file a pass. An A/V contract must not. This is also why D08's direct video success is not considered a sufficient alternative route.

### Counterexample B: unchanged coded packets, changed audio tail

The host stream-copy remux used to create the absolute-address fixture preserves all coded payloads and FFprobe packet summaries. However, direct parsing finds the audio track's final decode-time end changing from **200,000 to 200,512 ticks** at 48 kHz. Browser whole-file decoded output changes from **193,024 to 193,536 stereo sample frames**: an additional 512 frames, approximately 10.67 ms.

The metadata-only D09/D11 adapters preserve their **own** absolute-addressed source timing and output. They are not incorrectly compared to the shorter-tail control. The complete decoded host PCM hash alone also does not catch this distinction in these fixtures.

**Decision: pursue stronger qualification witnesses.** Check every requested track's actual output and container timing, including tail/priming behavior, in addition to packet identity. For naturally silent material, absence of signal is not itself a failure: the test uses a known non-silent coded witness. One startup tone capture is not complete streaming-audio qualification.

## Recommended next work

1. Advance D08 as the smallest genuinely useful AAC admission case. Keep exact-rate proof and supported-profile guards; do not silently strip or mute audio.
2. Advance D09/D10 only for actual controlled-fragment consumers. Keep native direct as the baseline when it already fulfills the request.
3. Use D11 as one integration fixture for all three boundaries, not as authorization to build a large route-search subsystem.
4. Land D12/D13-style research checks alongside the candidate adapters, so more native-route acceptance does not hide stale output, missing tracks, or timing changes.

No percent closer-to-native or CPU/energy claim is supported. These findings reduce the amount of structural compatibility work that may be needed and strengthen the admission rules; whole-operation performance remains a later gate.

## Reproduction and history

Run `bash run_all.sh` from the package root. Requirements: Python with Playwright, system Chromium, FFmpeg/FFprobe. `CHROMIUM_EXECUTABLE` can select another browser, which constitutes a different test profile. Existing evidence is archived before reruns. `checksums.sha256` verifies the delivered package before rerunning.

The `initial/` evidence preserves the first host explicit-rate decode failure, earlier browser screens before poisoning removed timestamp bytes, and the first cancellation screen before the fresh-replacement control was added. A multi-stage command hit the orchestration timeout during a rerun; the relevant stages were rerun to completion before final verification. The timeout is not classified as a media failure.

## Sources checked

* Demuxe main: `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`.
* `research/ITEMS.md` catalogue reviewed in the preceding batch and available in conversation context. The branch remains unchanged. Unrecovered definitions and items not on this branch prevent a claim of exhaustive novelty.
* `research/items/R009.pass-already-valid-fragmented-media-through-unchanged/README.md`: local native-direct pass is not the controlled-fetch opportunity.
* `research/items/R010.screen-float-preserving-destinations-before-writing-adapters/README.md`: finite WAV is already demonstrated; no new duplicate WAV claim was counted.
* `research/items/R162.compile-a-qualified-mux-configuration-into-a-small-patch-program/README.md`: existing qualified patch-program work.
* W3C ISO BMFF MSE byte-stream note: https://www.w3.org/TR/mse-byte-stream-format-isobmff/ — relative addressing and tfdt requirements.
* FFmpeg MPEG-4 audio configuration implementation: https://ffmpeg.org/doxygen/trunk/mpeg4audio_8c_source.html — explicit/table sample-rate parsing background. The installed decoder's observed rejection is recorded independently of this current-source reference.
* W3C AAC registration: https://www.w3.org/TR/webcodecs-aac-codec-registration/ — description/framing and initialization-versus-output distinctions. No WebCodecs execution is claimed.
