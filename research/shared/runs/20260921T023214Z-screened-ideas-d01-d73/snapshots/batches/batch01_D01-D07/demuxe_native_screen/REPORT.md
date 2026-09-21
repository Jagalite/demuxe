# Demuxe: focused native-route, robustness, and discovery screens

## Result in one paragraph

This batch produced one especially useful, newly scoped AAC admission result: a valid AAC-LC stereo configuration using a Program Config Element was rejected by this Chromium MSE path; a restricted proof-driven rewrite to the equivalent explicit stereo configuration made the same compressed audio/video presentation playable. It also advanced a fragmented-MP4 selected-track projection, strengthened a six-channel FLAC sample-preservation check, ruled out compulsory AVC length-prefix widening on this destination, exposed a streamed-decompression publication hazard, prepared a three-epoch fallback witness, and exercised a tiny real-browser transform-subset search. These are **seven scoped research questions, not seven proven new mechanisms**. Several deliberately extend existing research rather than duplicate it under new R-numbers.

## Provenance and hard limits

Repository reviewed through the GitHub connector: `Jagalite/demuxe`, `main`, commit `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`. The 425-entry item directory and selected current reports were read. A shell `git clone` failed because GitHub DNS/network access was unavailable. **No Demuxe working tree, libmpv/Wasm bridge, or maintained player was executed or modified.** No remote commit or PR was created.

Recorded at `2026-09-20T04:09:39.211707+00:00`. Runtime: `Chromium 144.0.7559.96 built on Debian GNU/Linux 13 (trixie)`; `ffmpeg version 7.1.5-0+deb13u1 Copyright (c) 2000-2026 the FFmpeg developers`. Synthetic visual fixtures are 160×96 at 12 fps, mostly four seconds, with real AVC B-frames and closed GOPs. Browser policy blocks navigation, including localhost/file pages; the allowed in-memory page exposes MSE, browser audio decoding, and DecompressionStream but not secure-context VideoDecoder. The harness supplies local fixture bytes directly rather than bypassing that policy.

All CPU, energy, startup latency, network cost, hardware-decoder selection, physical surround output, and Demuxe integration performance claims remain **unmeasured/unqualified**. MSE acceptance means browser-owned playback, not proven hardware acceleration. Whole-file `decodeAudioData` evidence is not streaming-MSE audio-seek fidelity. FFmpeg and Chromium are different execution paths here but can share upstream codec implementations; their agreement is not proof of implementation-independent decoder correctness.

## Decision table

| Batch label | Lane and scoped question | Decision from this screen |
|---|---|---|
| D01 | Native: prove a restricted AAC PCE equivalent to standard stereo, then rewrite configuration only | Pursue the restricted adapter; actual MSE rejection-to-playback result |
| D02 | Native: suppress an explicitly unselected fMP4 track without moving media payloads | Pursue bounded metadata-view prototype; never silently discard requested audio |
| D03 | Native: admit narrow AVC length prefixes instead of compulsorily widening them | Stop mandatory widening on this profile; keep a destination-aware bypass |
| D04 | Native: retain all six channels and every 24-bit sample through a FLAC destination | Pursue destination qualification; conversion cost still unknown |
| D05 | Robustness: bounded, commit-after-validation compressed-packet unwrapping | Pursue guard; naive early publication fails the integrity contract |
| D06 | Fallback: native prefix / software-only middle / native suffix | Component prerequisites advanced; seamless handoff remains blocked |
| D07 | Exploration: search the smallest passing transform subset using a real media sink | Method screen only; reuses D02 fixtures, not additional route coverage |

## D01 — AAC Program Config Element normalization

**Hypothesis.** Some apparent codec failures are actually configuration-parser restrictions. When an AAC-LC Program Config Element (PCE) proves exactly the ordinary stereo layout, an adapter can express that equivalence in AudioSpecificConfig without decoding/re-encoding audio or touching the video.

**Relationship to prior work.** R119 currently qualifies removal of byte-identical duplicate AVC SPS/PPS entries, not semantic equivalence of AAC channel descriptions. This is a new specific subcase of configuration equivalence, not a claim that the broad concept was absent. It is also adjacent to R343's AAC route work but does not unwrap LATM.

**Execution.** FFmpeg authored a stereo AAC-LC stream at 48 kHz with PCE forced. The parser checked audio object type, sample-frequency agreement, absence of special GA flags/mixdown declarations, exactly one front CPE with tag zero, and absence of other channel element groups. It removed the redundant PCE representation while retaining the trailing configuration extension. The final prototype preserves the original ES_ID, decoder descriptor fields, bitrate/buffer fields, every packet, all packet PTS/DTS/durations, and file length. The ESDS box shrank from 73 to 54 bytes; a 19-byte `free` box retained the original enclosing footprint. **31 byte values changed** in the full combined fixture; no encoded audio/video packet changed.

**Observed.** Original H.264+PCE-AAC fMP4 failed MSE append. The canonicalized fMP4 passed append, timestamp-witnessed seeks, changing video, and EOF. All **48 video packets and 189 audio packets** retained identity and timestamps. Both original and canonicalized media also decoded through browser `decodeAudioData`: **193,536 samples per channel, two channels, 387,072 scalar samples**, bit-identical float32 output to each other and to the FFmpeg reference. This is preservation of the decoded AAC stream, including its existing encoder padding/priming, not losslessness relative to the pre-AAC tone generator.

The key diagnostic is that the *original* PCE audio already worked in whole-file browser audio decoding. The rejection was at the tested MSE/configuration admission path, not a demonstrated inability of the underlying browser to decode those AAC samples.

**Control.** A separately generated multichannel PCE was rejected by the restricted stereo normalizer rather than being relabeled stereo. The exact packet, PCM, and requested channel semantics are separate acceptance conditions.

**Next gate.** Port the bounded parser/rewrite into a research branch; add malformed/truncated PCEs, alternate element tags, sample-rate mismatches, in-band PCE/configuration changes, repeated initialization, and seek/priming cases. Require fail-closed rejection of all unproved layouts. Capture actual streaming-MSE PCM across seeks before widening fidelity claims. Only then benchmark equivalent A/V work including admission/preparation.

Evidence: `pce_component.json`, `browser_pce.json`, the two AAC ffprobe records, `aac_pce_screen.py`.

## D02 — Same-size selected-track fMP4 projection

**Hypothesis.** When audio is explicitly disabled or handled by a separately qualified owner, an unsupported audio track should not force supported video into the software route. A metadata-only view might remove the inactive track from the native parser while preserving media offsets and all media payloads.

**Relationship.** Extension of R059's selected-track ordinary-MP4 view to fragmented initialization plus repeated movie fragments; also adjacent to R013. This is not another claim that selected-track views were just invented.

**Execution and result.** A genuine H.264+ALAC fragmented MP4 failed the tested AVC MSE admission path. Replacing the unselected audio `trak`, its `trex`, and its four `traf` box types with same-size `free` boxes produced a browser-playable video-only view. The coherent variant writes **24 tag bytes**, changes **17 actual byte values**, keeps the **139,818-byte file size**, and retains every complete `mdat` byte unchanged. All 48 selected video packets/timestamps and all 48 host-decoded pictures match. The final browser harness confirmed expected presentation timestamps and matching canvas pixels at 0.5 and 2.5 seconds, then reached EOF.

**Restrictions.** This is **not full A/V playback**: the contract explicitly excludes the ALAC audio. Requested audio cannot be dropped to manufacture a native pass. A hybrid audio owner has not been integrated. Unselected data remains in the file, so this is not redaction or bandwidth reduction. The prototype builds byte arrays; it does not prove a zero-copy runtime implementation.

**Next gate.** Validate track-reference relationships, movie-fragment defaults, indexing, selected-track enable flags, remote range views, and multiple fragment layouts. Reject cross-track dependencies and unsupported addressing profiles until handled. Benchmark against equivalent video-only work, not full audio+video fallback.

Evidence: `browser_projection.json`, `verification.json`, `build_fixtures.py`.

## D03 — Do not widen AVC length prefixes without a demonstrated need

**Hypothesis.** Existing short AVC NAL-length fields may be accepted as-is by the destination; universal conversion to four-byte lengths could add work without unlocking anything.

**Execution.** Authored two-byte and four-byte versions of the same 48-frame AVC stream; 49 NAL units, identical NAL content and timing, B-frame ordering retained. A third fixture deliberately advertised four-byte lengths over two-byte-framed media.

**Observed.** Both valid representations passed MSE append, timestamp-witnessed pixel checks, and EOF. Host decoding retained all 48 exact pictures. The inconsistent description/payload control failed append. The two-byte representation saved only **98 payload bytes** in this tiny fixture; that counter is not a CPU claim.

**Decision.** Stop compulsory widening for this destination/profile. Keep framing validation and let an actual destination restriction justify normalization. The opportunity is avoided processing, not a newly unlocked codec. Other browsers/hardware paths and one-byte framing remain unqualified.

Evidence: `browser_widths.json`, manifest and host frame hashes, `verification.json`.

## D04 — Strengthen six-channel native FLAC to whole-buffer 24-bit exactness

**Hypothesis.** A lossless browser-compatible audio destination can preserve all requested integer audio samples while video remains on an unchanged browser route. That destination should be qualified on more than channel-count/tone identity.

**Relationship.** R057 already qualified six identifiable channel signals at a Web Audio boundary but explicitly did not establish whole-PCM sample exactness. This screen adds a different, stronger boundary check for one 24-bit profile; it does not replace its streaming-channel tests.

**Execution and result.** Generated four seconds of deterministic six-channel, 48 kHz, 24-bit signed integer PCM, including extreme and single-bit values. Host FLAC encoding plus browser decoding recovered **192,000 samples per channel: 1,152,000 scalar samples, exactly**. Channel order is part of the interleaved hash. H.264+FLAC fMP4 also passed MSE seeks/EOF, with unchanged video output at the qualified sample points. A deliberately wrong 44.1 kHz decode context failed the exactness contract and returned 176,399 samples per channel.

**Restrictions.** Whole-file decoded-buffer exactness and MSE playback are separate observations. No claim of six physical speakers, exact streaming audio across seeks, acoustic output, or optimal latency. This is destination feasibility, not a measured existing-player route upgrade. FLAC encoding can cost more than it saves for some workloads; its cost cannot be omitted or compared to an already-native source unfairly.

**Next gate.** Exercise complete maintained-player audio conversion, real music/film fixtures, long-duration drift, unusual speaker layouts, priming, seeks, and repeated playback. Include input decode, FLAC encode, buffering, output decode, and complete playback in the performance denominator.

Evidence: `browser_audio.json`, `manifest.json`, `sixch.i32le`, `verification.json`.

## D05 — Publish decompressed packets only after complete validation

**Hypothesis.** Native decompression can be reused without allowing malformed compressed input or excessive expansion to contaminate downstream media state. A packet-sized quarantine should commit only after stream completion and validation.

**Relationship.** R358 explicitly leaves malformed compression and resource bounds unqualified. This component guard addresses that gap; it does not qualify a full Matroska parser or JSPI bridge.

**Execution.** Compressed a real AVC packet with zlib. Fed browser DecompressionStream valid, bad-checksum, truncated, and 4 MiB expansion fixtures in 7-, 64-, and 4,096-byte input chunk profiles. The script's legacy `bad_crc` filename denotes a zlib Adler-32 checksum error, not a CRC algorithm.

**Observed.** All three valid profiles recovered the exact 2,937-byte packet. The bad-checksum and truncated profiles could emit **all 2,937 bytes before reporting the error**. Immediate forwarding would therefore violate a verify-before-publication contract. All nine negative profiles were rejected by the bounded commit guard and published zero bytes. The accumulated quarantine stayed at or below **65,536 bytes**; the expansion control was cancelled when the next chunk would exceed it.

**Important memory boundary.** This is a cap on accumulated quarantine chunks, not measured total browser/native memory. An oversized output chunk is already visible when checked; input buffers, joined output, internal decompressor allocations, and cancellation latency are additional costs. No claim that native code could not internally allocate or decompress more than this cap. The script does not actually submit invalid bytes to a codec.

**Next gate.** Integrate a real bounded sink and per-track/source aggregate budget, enforce packet atomicity across cancellation/reconfiguration, fuzz checksums/headers/nesting, and measure cancellation plus native memory behavior. Keep transactional publication even where a more incremental decompressor replaces DecompressionStream.

Evidence: `browser_inflate.json`, packet fixtures, `browser_tests.js`.

## D06 — Source-defined compatibility islands, without claiming handoff

**Hypothesis.** Restrict software ownership to independently decodable unsupported epochs and return supported epochs to a browser path instead of leaving the rest of the asset in fallback.

**Relationship.** This is a bounded advancement of existing R116, whose current prerequisite calls for a source-defined supported/unsupported/supported witness. It is not a new name for R116.

**Execution.** Prepared a declared three-epoch video timeline: 12 AVC prefix pictures, 12 MPEG-2 middle pictures, and 24 AVC suffix pictures. The prefix and suffix each play via separate fresh MSE presentations. Host decoding exactly matches the corresponding original AVC picture ranges. Timestamp-witnessed browser captures match the full reference. The MPEG-2 MSE codec query is unsupported here; host software decodes the 12-picture middle. Its source timestamp origin is measured and explicitly mapped in `island_component.json` rather than assumed equal to AVC.

**Useful negative.** An initial high-4:4:4 10-bit AVC candidate unexpectedly played through browser MSE, so it was not a useful *unsupported* middle section. Its result is retained. That observation says nothing about hardware acceleration.

**Not executed.** No single continuous player session, no native→software→native ownership transfer, no stable color owner, and no audio clock or artifact-free transition. Secure-context WebCodecs checks are recorded as blocked. The exact seamless-handoff claim remains **blocked**, even though the fixture and individual destination prerequisites advanced. Separate presentations are not a demonstrated handback.

**Next gate.** Implement only the bounded three-epoch handoff using explicit random-access/configuration boundaries, a stable clock and presentation owner, and frame-ordinal oracles. Verify both transitions, then compare whole-plan cost to all-software playback.

Evidence: `island_component.json`, `browser_islands.json`, `browser_decode.json`; initial candidate logs retained separately.

## D07 — Let a native sink expose minimal repair sets, but not define validity

**Hypothesis.** Small exhaustive transform searches can identify which blockers interact before broad engineering work. An independent structural/semantic validator must prevent browser permissiveness from becoming the sole acceptance oracle.

**Execution.** All eight subsets of the D02 `trak`/`trex`/`traf` patch families were actually submitted to MSE. Only masks 5 and 7 played; single-family removals and the other combinations failed. The smallest browser-accepting subset removes `trak` and repeated `traf` records while retaining `trex`.

**Interpretation.** The retained `trex` refers to a suppressed track. Browser tolerance is not a certificate that such an output satisfies every ISO BMFF constraint. Prefer the fuller coherent three-family patch for subsequent conformance qualification. Do not optimize away required structure because one browser accepts a stale reference.

This experiment **reuses D02's input and observations**. It demonstrates a small search procedure; it is not eight new media combinations, a general route-discovery engine, or an additional independent compatibility win. Equal-cost/fidelity outcomes, source validity, payload identity, and a structural oracle must precede cheapest-plan ranking.

Evidence: `browser_projection.json`, subset results in `verification.json`.

## Validation, harness corrections, and honest stage accounting

The final cross-check records **40 passing assertions**. That includes expected rejection controls and cross-evidence equality, not 40 experiments or a performance qualification. No CPU percentage was calculated.

Two early harness/prototype problems were corrected and retained in evidence. First, canvas reads immediately after `seeked` sometimes observed the prior frame. Final accepted pixel observations wait for a `requestVideoFrameCallback` whose `mediaTime` matches the expected source presentation timestamp. Earlier raw logs remain in `pre_presentation_witness/` and are not accepted pixel evidence. Second, a suffix-only MSE presentation needed an explicit seek into its nonzero buffered interval; waiting for a frame at time zero produced a harness timeout. The final harness starts in the available range.

The first AAC prototype borrowed the entire ESDS from a standard-config fixture. The final version retains original track-specific ES/decoder fields and rebuilds only the ASC and enclosing descriptor lengths. Both initial and final evidence are kept; the final result was rerun after the correction. No acceptance threshold was relaxed to turn a media failure into a pass.

## Suggested ordering

Advance D01 first: it has a concrete admission failure, a small scoped rewrite, unchanged essence, full decoded-audio agreement, and an explicit multichannel guard. In parallel, keep D05 as a correctness prerequisite for native compressed-track adapters. Carry D02 and D04 into the next bounded implementation screens with their semantics/cost restrictions. Retain D03's bypass decision instead of adding a compulsory conversion. Use D06 only as the fixture/contract for a future ownership test; do not promote it to a completed island route. Treat D07 as research tooling, with a stricter validity oracle before automation.

## Source map

All repository references below are pinned to the reviewed commit. The package contains original prototypes, not copied repository runtime code.

- [Research directory](https://github.com/Jagalite/demuxe/blob/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1/research/ITEMS.md)
- [R119: configuration canonicalization](https://github.com/Jagalite/demuxe/blob/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1/research/items/R119.canonicalize-equivalent-decoder-configurations/README.md)
- [R059: selected-track views](https://github.com/Jagalite/demuxe/blob/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1/research/items/R059.construct-a-selected-track-mp4-view-without-remuxing-samples/README.md)
- [R057: native FLAC destination](https://github.com/Jagalite/demuxe/blob/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1/research/items/R057.probe-a-real-six-channel-native-flac-destination/README.md)
- [R358: Matroska compression](https://github.com/Jagalite/demuxe/blob/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1/research/items/R358.unwrap-matroska-track-compression-before-choosing-a-decoder/README.md)
- [R116: compatibility islands](https://github.com/Jagalite/demuxe/blob/01611bdaa2d9a21903bd2f1086fe0d786df6d5d1/research/items/R116.compatibility-islands-use-software-only-for-the-troublesome-section/README.md)
- [W3C ISO BMFF MSE byte-stream note](https://www.w3.org/TR/mse-byte-stream-format-isobmff/)
- [W3C WebCodecs specification](https://www.w3.org/TR/webcodecs/)
