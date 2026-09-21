# Demuxe focused research — batch 4: D21–D25

## Outcome

Five isolated component screens were executed. They add a JPEG table-reconstruction case, a static orientation-signaling bridge, compressed channel projection, a bitmap-RLE-to-native-PNG path with a symbolic-history variant, and cold APNG seek construction. These are new scoped questions or advances within existing research families, not five wholly novel mechanisms or five production-qualified routes.

The clearest video-facing result is D22: the tested browser ignored a source's AVC display-orientation SEI, but honored the equivalent static MP4 track matrix. D21 also changed sixteen undecodable abbreviated image frames into browser-decodable images while retaining their compressed scans. D23 and D25 reduce actual output data or requested decoder calls for explicitly narrower operations. D24 worked, but its size penalty remains a meaningful objection even after a second variant improved it.

## Evidence and environment

The live GitHub connector confirmed `Jagalite/demuxe` main at `01611bdaa2d9a21903bd2f1086fe0d786df6d5d1`. Relevant item records were read; no Demuxe source was executed, changed, committed, or pushed. The local work is standalone Python/JavaScript plus authored fixtures.

Runtime: Chromium 144.0.7559.96, FFmpeg 7.1.5, and the installed Pillow/libFLAC tools. Actual versions and browser API availability are in `evidence/environment.json`; host command lines and stderr are in `evidence/commands.jsonl`.

A normal loopback navigation for a secure-context WebCodecs probe was blocked with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. It was not bypassed. The completed browser tests used MSE, `createImageBitmap`, Canvas, and `OfflineAudioContext.decodeAudioData` on the default page. ImageDecoder/AudioDecoder/VideoDecoder WebCodecs execution is not claimed.

There is no hardware-acceleration, energy, CPU, native-overlay, zero-copy, memory-peak, integrated-player, or universal-compatibility result. Host transforms sometimes materialize complete encoded outputs. Pixel readback is used by the oracles and is not evidence of a low-cost production presentation path. Packet counts, byte sizes and decoder-call counts are not performance percentages.

`evidence/verification.json` records **67 passing cross-checks**, including expected failure and wrong-output controls. One of those checks aggregates 54 additional small DEFLATE row-boundary cases, recorded separately. These counts are not experiment counts or support claims.

## D21 — Source-bound reconstruction of abbreviated JPEG frames

**Question.** Can missing JPEG tables be supplied from an authoritative configuration interval, leaving the coded scan intact and assigning image decoding to the browser rather than a software video engine?

**Relationship to prior work.** This is related to R140, which remains blocked on an actual RTP/JPEG fixture and its transport/geometry/table contract. This screen is a narrower JPEG-table reconstruction kernel. It does not complete RTP packet assembly or R140's exact gate.

**Execution.** Sixteen distinct 160 × 96 baseline JPEG pictures were authored: eight at one table configuration and eight at another. Quantization and Huffman table segments were removed. Source descriptors bind the expected table bytes and compressed scan to a configuration epoch. The prototype reinstates the original table segments before the intact remaining JPEG headers and scan. It neither decodes nor recompresses image coefficients.

All sixteen abbreviated JPEGs failed the browser image decoder. All sixteen reconstructed versions decoded and matched the complete-original browser image hashes. FFmpeg decoded original and reconstructed images to identical RGB bytes; every compressed scan was retained byte for byte.

A particularly important negative used valid tables from the previous configuration. It still decoded in the browser, but produced the wrong pixels. Table identifiers alone therefore are not an adequate reuse key in this authored case. Guards rejected the wrong epoch, wrong table content, absent tables and a truncated frame.

**Evidence.** `scripts/jpeg_tables.py`, `scripts/build_first.py`, `evidence/jpeg_host.json`, JPEG records in `evidence/browser_first.json`, and the full/short/restored fixtures.

**Decision.** Pursue a source-defined configuration adapter for actual abbreviated-JPEG consumers. Do not call this real-time MJPEG playback, hardware JPEG decoding, or an arbitrary malformed-JPEG repair system. The descriptors are assumed to be authoritative source records; hashing data received from an untrusted party does not authenticate it. Restart intervals, packet reordering/loss, source epochs, complete RTP/JPEG header synthesis, hostile table syntax and timed frame ownership remain next gates.

## D22 — Translate known static orientation into the browser's presentation metadata

**Question.** Can a source's display-only orientation be expressed at a destination that the browser actually honors, without running a pixel rotation filter?

**Relationship.** R008 already has retained-presenter rotation evidence. This is a different destination boundary: AVC display-orientation SEI versus MP4 `tkhd` matrix, tested through direct media and MSE.

**Execution.** A two-second, 40-picture AVC source carries explicit BT.709 limited-range color signaling. An authored static 90-degree counterclockwise display-orientation SEI was added. FFprobe's decoded-frame metadata reports that rotation. The candidate writes the corresponding track matrix into an otherwise identical copy of that SEI-bearing MP4. A wrong-sign matrix and a no-rotation control were retained.

The SEI-bearing file displayed as 160 × 96 through both tested browser routes: its sampled pictures matched the unrotated base. The matrix-bearing file displayed as 96 × 160. At media times 0.25, 0.75 and 1.35 seconds, both direct and MSE pictures matched an independent array-indexed counterclockwise rotation of the base Canvas pixels exactly. The wrong-sign matrix failed the same comparison. All eight file/route combinations completed the three requested seeks and EOF; this is not an all-frames presentation-quality test.

From the SEI-bearing input to the matrix candidate, only **five byte values changed** in the 36-byte matrix field. All 40 packet hashes and their PTS/DTS/durations/sizes were identical, and all host-decoded raw YUV bytes were identical with autorotation disabled.

The prototype rejects an already non-identity track matrix and an unsupported angle. It receives the known static angle as a fixture contract; it is not a general parser of changing SEI orientation histories.

**Evidence.** `scripts/build_first.py`, `evidence/orientation_host.json`, `evidence/orientation_sei_frames.json`, `evidence/orientation_comparison.json`, probe JSONs, and browser records. The oracle's rotation is performed only for comparison, not in the candidate.

**Decision.** Pursue a narrowly qualified static metadata bridge. Define precedence for container versus codec metadata, prevent double application on destinations that honor both, reject or separately handle time-varying orientation, and cover subtitle/pointer geometry and source replacement. Metadata propagation is not permission to rotate a source according to a guess. There is no arbitrary-angle, reflection, HDR, physical-display or CPU-savings qualification.

## D23 — Select independent FLAC channels without decoding their samples

**Question.** For a request to select two original channels, can the producer copy those channels' coded subframes rather than decoding six channels and re-encoding two?

**Relationship.** This advances a restricted subcase of R103. It does not implement general residual/LPC parsing, decorrelated stereo, arbitrary layouts or the full original four-channel gate.

**Execution.** The input is the pinned six-channel, 24-bit, 48 kHz constant/verbatim FLAC fixture from batch 3. Its SHA-256 is `4dda3107436a418e842f4836a03687facb8a0025027fa0b56b56388b6e57ecf3`; it is included under `inputs/` so no external file is needed. There are 192,000 samples per channel in 188 frames.

The parser validates its narrow frame layout and CRCs, locates complete independent subframe byte ranges, copies source channels 0 and 1, changes the channel declaration and frame/header checksums, and clears the now-invalid output PCM MD5 to the defined unknown value. It does not reconstruct any sample values. It still reads and validates the source; it does not avoid all work on discarded input bytes.

Output size fell from **1,746,608 to 583,524 bytes**. The candidate copied **581,166 sample-payload bytes**. Independent host decoding reproduced all **384,000 selected scalar integer samples** exactly. Browser decoding returned 192,000 stereo sample frames with channel hashes exactly matching the first two channels of the six-channel browser reference.

Choosing the wrong pair or reversing the pair failed the requested-channel comparison. Guards rejected a preserve-surround request, a downmix request, duplicate channel indices and a truncated frame. Two requested source channels are not a stereo mix of all six channels.

**Evidence.** `scripts/channel_projection.py`, `evidence/channel_host.json`, browser audio records, host command logs and the selected-channel fixtures.

**Decision.** Pursue for explicit channel extraction, analysis, or a suitably defined playback request. It must not silently replace full multichannel playback or a downmix. Extend predictive subframe parsing only with independent integer oracles; preserve exact layout meaning and format changes. An unknown output MD5 is not a successful integrity check: retain independent trusted construction evidence or compute a valid new MD5 when required. No source-decoder cost elimination for unrelated codecs or runtime CPU reduction is established.

## D24 — Give RLE subtitle bitmaps to a native PNG decoder without a raster intermediate

**Question.** Can run-length-coded indexed bitmap data be reformatted into a PNG bitstream without expanding it into an index image or an RGBA image in application code?

**Relationship.** This is adjacent to R198 but takes a native PNG destination instead of direct run/span composition. It is not a complete PGS event/demux pipeline. The input bitmap payload uses PGS's RLE grammar; the caller supplies an already-resolved RGBA palette. PGS presentation segments, object assembly, timing, forced state and YCbCr palette conversion are outside this screen.

**First variant.** The parser emits a fixed-Huffman DEFLATE stream from literals and run backreferences. PNG row-filter bytes and Adler-32 are constructed symbolically; the checksum update uses run length and value rather than iterating over an expanded row. PNG palette and alpha chunks carry the supplied palette. The transform never allocates a complete index or RGBA raster.

Three fixtures were tested: a 320 × 96 glyph-like bitmap, a 1920 × 128 repeated-pattern bitmap, and a 73 × 17 noisy bitmap. Host zlib/Pillow output and browser image hashes matched conventional reference PNGs exactly. A palette-only change retained the identical compressed IDAT bytes while changing the delivered colors. Truncation, overflow, missing palette entries, pixel-budget violations and trailing data were rejected.

However, avoiding a raster did not automatically give good compression. The first variant was 23.36× and 57.46× the conventional reference PNG size for the two highly repetitive fixtures.

**Second variant: symbolic previous-row reuse.** Equal validated encoded row descriptions prove equal reconstructed index rows in this profile. The encoder remembers only the preceding row's description and Adler contribution; a repeated row is emitted as DEFLATE history references at distance `width + 1`. No image raster is introduced. Additional generated cases exercised short rows, match-length boundaries and 4096-pixel rows.

| Fixture | Run-only PNG | Symbolic row-reuse PNG | Conventional PNG reference |
|---|---:|---:|---:|
| 320 × 96 glyph-like | 5,652 B | 925 B | 242 B |
| 1920 × 128 repeated pattern | 34,822 B | 4,971 B | 606 B |
| 73 × 17 noisy | 1,335 B | 1,335 B | 541 B |

The improved variant reused 88 and 120 immediately preceding rows in the two patterned fixtures. It retained at most 49/317/61 run tokens in a row for these three cases, rather than a complete bitmap. Encoded input and output are still materialized; these counters do not measure total process or browser memory. All three browser outputs remained identical to the references. All 54 generated row-boundary cases matched an independent host image decoder.

The largest fixture has a 245,760-byte index raster or a 983,040-byte RGBA raster, neither of which the formatter allocates. The browser eventually reconstructs display pixels. This is application-side intermediate avoidance, not end-to-end elimination of pixel work.

**Decision.** Conditional follow-up, not a default replacement. Symbolic row reuse rescued much of the first variant's size penalty, but normal compression was still 2.47×–8.20× smaller. Benchmark complete producer, retained data, decode and presentation work against the maintained subtitle path and a direct span path before choosing an implementation. Repeated arbitrary earlier rows, broader DEFLATE matching, metadata and subtitle lifetime handling remain unexplored.

**Evidence.** `scripts/rle_png.py`, `evidence/rle_host.json`, `evidence/rle_row_reuse.json`, `evidence/row_reuse_edge_cases.json`, browser image records and fixtures. The initial variant and initial browser run are retained.

## D25 — Cold APNG seeks using native PNG subframe views and disposal-aware plans

**Question.** Can seeking decode only the image frames that contribute to the requested displayed result, while leaving their compressed image streams intact?

**Relationship.** This is a bounded alternative within R344, not its complete region-last-writer solver. It combines safe full-canvas anchors with disposal-based elimination and native PNG image decoding. It does not compare against the repository's retained checkpoint implementation or establish a memory-matched speed advantage.

**Execution.** A real 12-frame RGBA8 APNG was authored with separate non-animation default-image data, split fdAT chunks, overlapping transparent SOURCE/OVER regions, NONE/BACKGROUND/PREVIOUS disposal, varying delays including denominator-zero semantics, and a full-canvas SOURCE frame that disposes to PREVIOUS.

A bounded parser validates chunk CRCs, sequence numbers, dimensions and frame counts. Each animation frame's compressed bytes are copied into a standalone PNG view without decompression. The source's non-animation default image is excluded. The cold-seek planner starts from a safe full-canvas source frame. Before the requested target, a PREVIOUS frame need not be decoded because it leaves no persistent change; a BACKGROUND frame can be replaced with its clear operation. The target itself is always rendered.

All **12 targets**, requested in non-monotonic order with a fresh Canvas each time, matched Pillow's independently decoded APNG RGBA output exactly. A separate authored binary-alpha composition oracle also matched Pillow. The final target required **five native PNG decodes rather than twelve** under a naïve full-prefix image-decode count. The adapter still performs indexing, image-wrapper construction, clears and composition; this is not a 58% speed claim.

**Decisive negatives.** Treating a full SOURCE/PREVIOUS frame as a persistent anchor for a later frame produced **19,584 wrong color/alpha components**. Ignoring disposal in another target produced **1,972** wrong components. CRC corruption, sequence gaps with corrected CRC, out-of-bounds geometry with corrected CRC, truncation and frame-budget violations were rejected.

A full-file `createImageBitmap` call returned the first animation picture, not the separate magenta static default image. This destination observation is recorded separately; the initially named `poster` field was renamed to avoid falsely identifying that result as the static poster.

**Evidence.** `scripts/apng_view.py`, `scripts/animation_browser.js`, `evidence/animation_manifest.json`, browser image records, `evidence/apng_default_image_observation.json`, and original/per-frame/oracle fixtures.

**Decision.** Pursue an isolated seek/index adapter for the qualified profile. The exact test uses binary-alpha patches; arbitrary fractional-alpha composition, color metadata, interlace, palette APNGs, region-optimal planning, remote reads, cache ownership and timed animation playback remain unqualified. All candidate bitmaps are closed after use; physical allocation reclamation or a leak-free maintained player is not demonstrated.

## Recommended next experiment order

1. D22: integrate a narrowly guarded, source-authoritative static orientation mapping into a real route and qualify subtitle/pointer geometry. It is the most directly relevant candidate for ordinary video presentation in this batch.
2. D21: test a real abbreviated-frame consumer with transport/configuration provenance before native image decoding and scheduling.
3. D23: identify an actual explicit channel-extraction consumer before adding general FLAC parsing.
4. D25: compare the cold-seek construction with the real animation decoder/checkpoint path at equal memory budgets.
5. D24: retain the working symbolic construction but require a complete cost case before adopting it. Do not mistake avoided application raster allocation for a runtime win.

## Sources and scope anchors

These references justify format/API interpretation; the execution evidence above comes from the bundled files, not from the specifications.

- Repository branch and scoped research records, read through the connected GitHub API at the pinned commit: R140 abbreviated JPEG; R008 display-only operations; R103 independent FLAC subframes; R198 subtitle RLE; R344 APNG seeking. Their current gates remain distinct from this package.
- FFmpeg bitstream-filter documentation, `h264_metadata` display orientation: https://ffmpeg.org/ffmpeg-bitstream-filters.html
- FLAC format, independent channel assignment, subframes and metadata: https://www.rfc-editor.org/rfc/rfc9639.html
- PNG Third Edition, PNG/IDAT and APNG frame/disposal/blend semantics: https://www.w3.org/TR/png-3/
- PGS RLE grammar reference implementation: https://ffmpeg.org/doxygen/trunk/pgssubdec_8c_source.html
- DEFLATE and zlib formats used by the symbolic constructor: RFC 1951 and RFC 1950. The candidate was checked by host zlib, Pillow and the browser rather than trusted from construction alone.

## Reproduction and retained limitations

Read `LOCAL_AGENT_HANDOFF.md`, inspect `evidence/verification.json`, and verify `checksums.sha256`. `run_all.sh` archives old evidence before re-execution and uses the bundled pinned FLAC input. It requires local FFmpeg/FFprobe, libFLAC command-line tooling, Chromium, Playwright, NumPy and Pillow.

The initial secure-context probe failure and the first RLE/browser variants are retained. The only post-screen portability adjustment makes the included FLAC source an `inputs/` path instead of an earlier-session absolute path; its recorded input SHA-256 is unchanged. The browser image suite was rerun after adding the row-reuse variant and correcting the misleading poster-field name. No failed native/WebCodecs run was relabeled as a pass.
