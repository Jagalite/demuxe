<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research, batch 17 — D71–D73

## Scope and result

Three new destination/subcase screens were executed with real synthetic media. They are not three new codec algorithms and are not production integrations.

- **D71:** already-independent AVC pictures can be reordered into a new forward-running native presentation that displays the source in reverse, including reversed variable frame durations.
- **D72:** six original VP9 pictures can preserve a known sparse timeline through MSE when their durations are explicit. A whole-file duration is not equivalent to complete coded-frame coverage.
- **D73:** coded-frame dimensions and native display dimensions are different boundaries. In a conflicting-metadata case the same source displayed at different widths through direct playback and MSE.

Repository lineage was read at `ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e` (the Shaka integration commit). No repository change, maintained player execution, or Shaka execution occurred. Tests used Chromium 144.0.7559.96 and FFmpeg 7.1.5; exact environment and commands are retained in `evidence/`. Hardware acceleration, CPU/energy savings, total process memory, and physical scanout are unmeasured. All new media tests are video-only.

The original and clean-directory staged replay each pass **116 consistency assertions**. These include expected rejection/failure observations, not 116 successful playback improvements. All **796 fixture files** match between runs; most files are small fragments belonging to a much smaller set of authored sources. Natural frame-callback counts changed by one on reverse playback; they do not certify complete physical presentation.

## D71 — Compressed-only reverse views of independently decodable video

### Question and mechanism

For an explicitly requested reverse preview of a source whose every picture is already an independent AVC IDR, can a new compressed presentation be authored without first decoding and retaining every picture?

The authored VFR forward-reference source has 48 distinct 160×96 pictures, a fixed codec configuration, and a 16,000-tick timebase. It was constructed from an encoded donor without changing its packet payloads. Its authoritative frame durations repeat `[400,1200,800,1600]` ticks: 25/75/50/100 milliseconds, totaling three seconds. Reversing the presentation requires reversing both picture order and each picture's associated duration. Merely reversing packets while leaving the old duration sequence changes the request.

The constructor reuses the source initialization and the exact original coded packet bytes, writes one-sample movie fragments in reverse order, and assigns increasing presentation timestamps from the reversed durations. The media element plays the resulting view forward. This is not a negative playback-rate implementation, an instantaneous reversal of the original media element, or an arbitrary predictive-video reverse decoder.

### Execution and references

The candidate payload is **93,279 compressed bytes**. The constructed reverse MP4 is **99,240 bytes**; the original encoded donor is 100,392 bytes because its fragment/footer metadata differs. The authored VFR forward reference, like the reverse candidate, is 99,240 bytes. No compression or file-size optimization is claimed from that incidental difference.

Every candidate packet hash equals the corresponding source packet in reverse order. Independently decoding the new presentation with FFmpeg produces **1,105,920 YUV bytes**, exactly equal to the complete forward decoded frame array reversed by frame index.

Each browser endpoint establishes its own forward-source picture references. Direct Blob playback and MSE each match **all 48 reversed picture identities and all 48 expected presentation timestamps**, plus three return-seek checks. Both reach EOF at exactly three seconds. Pixel equality is within each browser endpoint, not a claim that browser RGB and host RGB share an exact color reconstruction.

Natural-speed playback also reaches EOF. In the original run each reverse route yields 47 callbacks plus the explicitly captured initial picture; in the replay each yields 46 callbacks plus that initial picture. Callback delivery is not guaranteed to observe every displayed picture. The all-picture evidence is therefore the per-picture seek oracle and complete host decode, not a proof of smooth physical reverse scanout.

### Controls

A wrong-forward-order view matches **0/48** requested reversed pictures at the principal queries. Reversed pictures assigned the old duration order match only **12/48** requested pictures and **24/48** timestamps. Both remain structurally playable, showing why successful decode and EOF alone are insufficient.

The restricted constructor rejects a tested predictive source, wrong source identity, an invalid permutation, zero durations, and a truncated packet. The predictive fixture has 45 non-IDR packets. These are bounded guards, not proof that a small NAL-type check validates arbitrary AVC: in-band configuration changes, fields, extension layers, and untrusted configuration provenance remain outside the contract.

### Decision and next gate

**Pursue only an existing all-independent source consumer.** The adapter does not retain an application decoded-frame cache, but it still reads, indexes, copies/materializes compressed data and does not measure browser-internal memory. Encoding a normal predictive movie into all-IDR video to enable the trick is not part of the proposal.

The closest existing repository work is R085, which decodes/cache/reverses bounded closed GOPs. That is the necessary broader fallback, not something this restricted representation replaces. First inspect the maintained reverse/preview owner, then test bounded source reads, source replacement, subtitles/audio semantics, and complete cost against the cheapest correct existing approach.

Evidence: `reverse_manifest.json`, `browser_reverse_direct.json`, `browser_reverse_mse.json`, `verification.json`.

## D72 — Preserve sparse-video durations instead of guessing a constant frame rate

### Question and mechanism

Does a source's declared overall duration make native MSE preserve every intended picture hold? What is the smallest truthful duration representation for the tested destination?

Six original independent VP9 packets are placed at known source-authored times with durations **125,375,250,750,125,1125 milliseconds**, totaling **2.75 seconds**. The primary constructor uses a BlockGroup and explicit BlockDuration for each packet. Alternative controls retain identical packet payloads/timestamps but omit sample duration information or replace it with a fixed 125 ms DefaultDuration.

All variants contain the same 2.75-second Segment Duration. All decoded host picture bytes and all six packet hashes are identical across the variants. This does not make their presentation durations equivalent.

### Outcomes

| Representation | File bytes | MSE duration after EOF declaration | MSE coverage before EOF | Playback |
|---|---:|---:|---|---|
| Explicit duration on every picture | 13,320 | 2.75 s | `[0,2.75]` | Nine witnesses and EOF pass |
| No picture durations | 13,281 | 1.688 s | `[0,0.813]`, `[1.5,1.688]` | Seek/playback stalls |
| Fixed 125 ms default | 13,289 | 1.75 s | `[0,0.875]`, `[1.5,1.75]` | Seek/playback stalls |
| Explicit duration only on the last picture | 13,288 | 2.75 s | `[0,2.75]` | Nine witnesses and EOF pass |
| Every explicit duration plus fixed default | 13,328 | 2.75 s | `[0,2.75]` | Nine witnesses and EOF pass |

**39 additional container bytes** separate the primary complete-duration representation from the duration-omitting control. No coded picture is modified. This is an admission/correctness result, not a performance percentage.

Every variant already works through direct whole-file Blob playback at the nine checked picture/timestamp positions and reaches EOF at 2.75 seconds. The opportunity is therefore the controlled MSE destination, not mandatory rewriting of a direct route that works.

Only the last duration also suffices for this fully supplied fixture, adding seven bytes. That does not establish correct early playback before the final packet arrives or a general last-packet rule. FFprobe additionally reports the last-only duration as the first packet's inferred duration; its packet-duration summaries are not an independent authority for all implied sample intervals. The original authored timing list remains authoritative.

### Additional diagnostics and limitations

Setting MediaSource.duration to 2.75 while open, then declaring EOF, does not repair the missing coverage; the resulting duration falls back to 1.688 and playback remains incorrect. An attempt to set duration after EOF throws InvalidStateError because the source is not open. That API misuse is retained as a diagnostic, not presented as a scientific repair candidate or a universal duration-override claim.

All main test appends are supplied before playback. This does not establish progressive startup, network-jitter handling, eviction behavior, or any A/V interaction. Whole-file packet hashes and reported file duration are insufficient witnesses for a sparse MSE timeline.

### Decision and next gate

**Regression-first, not another mux subsystem.** R112 already reports maintained truthful duration signaling for its normal VP9/Opus profile. Add this distinct video-only, variable-duration case to the maintained duration/admission tests; locate an actual incorrect owner before proposing a production fix. Keep unchanged direct playback as the cheapest correct option where applicable, and do not build a competing streaming owner alongside Shaka.

Evidence: `duration_manifest.json`, `browser_duration_direct.json`, `browser_duration_mse.json`.

## D73 — Resolve geometry at the boundary that actually presents it

### Question and experiment

Can one generic width/height pair describe both compressed pictures and an already transformed native video surface? Which metadata decides the native geometry when the codec and container disagree?

Ten AVC wrapper variants use the same **48 compressed packets**. They vary three independently controlled declarations: SPS sample-aspect ratio 1:1 or 2:1, MP4 pasp ratio 1:1 or 2:1, and track display width 160 or 320. Two coherent variants additionally request 90-degree rotation. The unrotated host YUV bytes remain identical across all ten variants.

These are controlled conflict tests. The intended test geometry comes from a known authoring contract; there is no general claim that SPS or container fields should always win for an arbitrary file.

### Results

Each of ten variants is checked at four times through direct playback and MSE. Within a given route, variants producing the same dimensions also match that route's coherent picture reference at every checked time.

The clearest distinction is:

| Input condition | `requestVideoFrameCallback` dimensions | Native display dimensions |
|---|---|---|
| Square, unrotated | 160×96 | 160×96 |
| Coherent 2:1 samples, unrotated | 160×96 | 320×96 |
| Coherent 2:1 samples, rotated | 160×96 | 96×320 |

Using coded callback dimensions as a second presentation geometry would therefore lose or double-apply aspect/rotation operations. HTML's natural dimensions already account for the format's presentation geometry.

A separate conflict differentiates endpoints: **SPS 1:1, pasp 1:1, track width 320** displays at **160×96 through direct playback but 320×96 through MSE**. Changing the SPS ratio to 2:1 without changing those container values yields the same endpoint difference. In the tested set, non-square pasp and track dimensions are relevant; the color-metadata precedence observed in earlier experiments cannot simply be reused for geometry.

A geometry admission check against the known authoring contract accepts 12 of the 20 endpoint/variant combinations and rejects eight. This is not a universal conflict-resolution policy. It is an executable example of requiring the destination's actual geometry to match the request.

Coherent square, coherent anamorphic, and rotated-anamorphic references complete natural playback and three-second EOF through both routes. Same-geometry direct and MSE RGB hashes still differ at the common positions; this screen does not isolate their cross-endpoint rendering discrepancy. Geometry equivalence is not full cross-endpoint color equivalence.

The patch constructor rejects unsupported ratio/rotation values and truncation. The static scope excludes dynamic aspect changes, fractional/asymmetric sample ratios, cropped/clean-aperture interactions, HDR, subtitle coordinates, input mapping, and multiple display scales.

### Decision and next gate

**Pursue explicit coded-versus-presented geometry in the existing route contract.** Native playback should receive coherent metadata and should not be rescaled again merely because a lower-level callback still reports coded dimensions. Validate that display/crop/subtitle owners consume the correct coordinate space; reject unresolved conflicts rather than guessing user intent.

This is a qualification finding, not a measured optimization or an automatic aspect-repair algorithm. Any production change needs a traced maintained owner, dynamic lifecycle tests, and the declared picture-fidelity boundary.

Evidence: `geometry_manifest.json`, `browser_geometry_direct.json`, `browser_geometry_mse.json`.

## Reproducibility and retained limitations

Scripts, encoded/decoded authored fixtures, command logs, raw outcomes, explicit negative controls, and a staged fresh-directory replay are included. The original and replay each pass the same 116 named consistency assertions. Natural callback observation counts are explicitly different; no physical smoothness claim follows. Reproduction was split into bounded tool calls; two combined shell invocations exceeded their external wall-time budget, and their partial logs were retained before completing the remaining groups. There is no omitted completed experimental failure hidden by an all-green summary.

The tests use the installed headless browser with default software/hardware selection and make no claim to know its actual GPU path. The browser page is not a maintained Demuxe runtime. Whole-file source/fixture preparation, host oracles, and instrumentation are not an implementation performance benchmark.

## Sources and research lineage

- R085, pinned: https://github.com/Jagalite/demuxe/blob/ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e/research/items/R085.out-of-order-gop-decode-and-reverse-presentation/README.md
- R112, pinned: https://github.com/Jagalite/demuxe/blob/ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e/research/items/R112.supply-known-webm-durations-to-prevent-parser-holdback/README.md
- ISO BMFF MSE byte-stream requirements: https://www.w3.org/TR/mse-byte-stream-format-isobmff/
- WebM MSE byte-stream requirements: https://www.w3.org/TR/mse-byte-stream-format-webm/
- Matroska duration/geometry elements: https://www.matroska.org/technical/elements.html
- HTML video natural dimensions: https://html.spec.whatwg.org/multipage/media.html#dom-video-videowidth
- FFmpeg h264_metadata controls: https://ffmpeg.org/ffmpeg-bitstream-filters.html#h264_005fmetadata
