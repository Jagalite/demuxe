<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Demuxe focused research — batch 15: D65–D67

## Scope and result

Three bounded questions were executed, with actual compressed media, host decoding, Chromium playback/image processing, deliberately incorrect controls, and a fresh-directory replay. This is **standalone component research**, not execution of the maintained Demuxe player or its newly added Shaka route.

The repository-lineage snapshot is `ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e` (commit message: “Use Shaka for controlled HLS and DASH playback”). Environment: Chromium 144.0.7559.96, FFmpeg 7.1.5, Python 3.13.5, and Pillow linked to libwebp 1.6.0. The in-memory browser document is not a secure context and does not expose VideoDecoder. These experiments used MediaSource, ordinary media elements, browser image decoding, Canvas, and whole-file AudioContext decoding instead. No administrative browser restrictions were bypassed.

“Native” in this report means browser-owned processing, **not demonstrated hardware acceleration**. CPU, energy, physical/process memory, browser-internal copying, hardware overlay, cross-browser behavior, and complete maintained-player benefit are not measured.

| ID | Question | Disposition |
|---|---|---|
| D65 | Can a requested logical stream be projected from multiplexed Ogg using unchanged pages, without another codec or container conversion? | Pursue the explicit finite single-stream selection capability. An unwrap-only FLAC adapter is unnecessary for this browser profile. |
| D66 | Can compatible source-local video track IDs be mapped to a stable MSE lane without replacing the media element or repeatedly supplying initialization? | Conditional component success. Fresh initialization is already a working simpler baseline; no cost advantage is measured and semantic resets must not be suppressed. |
| D67 | Can lossless animated WebP be sought through native frame views starting at source-proven canvas reset boundaries? | Pursue the tested binary-alpha profile. Fractional-alpha exact presentation fails. |

These are new input/destination subcases and implementation tests of established primitives, not global novelty claims. D65 resembles selected-track projection in a different container. D66 is adjacent to R069, without reopening its stopped reset-suppression profile. D67 follows animated-image seek work (including earlier D25 and R322), but tests WebP framing, reset/disposal conditions, and alpha-dependent presentation failures.

## D65 — Select an Ogg logical stream by retaining its original pages

### Question and boundaries

An initial finite-file probe found that both ordinary raw FLAC and single-stream Ogg FLAC already decode in this browser. Consequently, “unwrap Ogg FLAC because the browser cannot decode it” was not a useful hypothesis here.

The actual experiment instead requests **one selected logical stream from a concurrent two-stream Ogg source**. It is not a mix, a chained-stream concatenation, a surround downmix, a live switch, or an attempt to preserve every source track in the selected output.

Ogg associates each page with a logical-stream serial number and interleaves complete pages. That allows this restricted projection to retain complete original pages, including their existing packet segmentation, granules, and checksums.

### Construction and independent checks

Two independently authored S24 stereo, 48 kHz sources each contain 60,013 frames. FFmpeg encodes FLAC and multiplexes both streams into one 510,419-byte Ogg source. The adapter parses actual Ogg page boundaries and checks CRC, sequence, continuation, BOS/EOS state, caller-supplied source identity, and explicit single-stream selection. It has finite file/page/stream limits; it is not a hardened general-purpose Ogg validator or a proof of every codec's granule semantics.

| Selected logical stream | Retained pages | Retained codec packets | Selected file bytes | Complete output |
|---|---:|---:|---:|---|
| First | 7 | 14 | 243,512 | 60,013 stereo frames exact |
| Second | 7 | 14 | 266,907 | 60,013 stereo frames exact |

Every selected page and packet is unchanged. Complete FFmpeg S32 output matches both the authored source integers and independent selection through FFmpeg's own demuxer. Browser whole-file decoding matches each browser-decoded raw-FLAC reference, totaling **240,052 checked channel values** across both selections. This is endpoint-relative browser equality plus independent integer equality; it is not an assertion that every decoder uses identical Float32 scaling.

The unmodified multiplexed file's whole-file browser decode returns the first stream. Against an explicit request for the second stream, **120,025 of 120,026 values differ**, even though length and format match. The tested media element does not expose an audioTracks selection API.

A separate browser construction builds each selected URL as a Blob of **seven original source-page views**, rather than a new combined application ArrayBuffer. Its materialized byte hash matches the independently constructed selected file. Both views pass two media-element seek-time checks and reach EOF at the expected rounded duration (1.250271 s).

Whole-file PCM equality and media-element lifecycle are separate tests. The media-element run does not independently capture every audible sample or qualify exact audio output after seeks. Blob construction does not prove browser-internal zero-copy behavior. The harness reads and hashes the complete source, including the unselected pages, and retains reference buffers; selected byte size is not a measured network or total-memory saving.

### Decisive controls and next step

Corrupted CRC, truncation, a missing page, missing EOS, wrong source identity, unknown serial, and a mix-all request are rejected. A valid but wrong stream is decodable and is caught only by the requested-output comparison.

Next: identify a real selected-track consumer, inspect existing demux ownership, and compare page projection against the cheapest correct existing selection path. A maintained adapter must bind the user's track choice to the current source and preserve cancellation/source replacement. Do not create an Ogg-to-raw-FLAC converter merely to play a single Ogg FLAC track that already works.

Evidence: [construction](evidence/ogg_manifest.json), [browser decode and lifecycle](evidence/browser_ogg.json), [browser page views](evidence/browser_page_views.json), [initial destination probe](evidence/initial_audio_probe.json).

## D66 — Separate source-local track numbering from playback-lane numbering

### Contract

A and B each contain one second of 160×96 AVC at 20 pictures/s. Their complete visual sample entries and media timescales match; B uses track ID 17 while A uses ID 1. The request is an explicit A→B→A timeline. Each interval begins independently; no predictive state is borrowed between sources.

The candidate validates a caller-known fragment digest, matching visual sample entries/timescale/trex defaults, source-track identity, and the tested fragment-relative addressing form. It then changes the existing tfhd track-ID value from 17 to 1. It does not change the sample payloads, their timing, or their sizes. The application still maps each source interval to the requested presentation timeline explicitly.

This is not a mechanism for suppressing the real seek/reset/source-generation semantics documented in R069. It is not authorization to bypass Shaka or insert a parallel stream owner.

### Results

| Route | Outcome |
|---|---|
| A initialization, then original B track-17 fragment without B initialization | MSE append failure; no completed presentation |
| Correct source initialization at each A/B/A transition | Correct three-second presentation |
| A initialization once, with B's fragment ID mapped to lane 1 | Correct three-second presentation |
| Compatible but wrong source pictures substituted in the middle interval | Reaches EOF, but requested-picture checks fail |

Only **one byte value in the 21,449-byte B fragment** changes. Packet hashes, sizes, PTS, DTS, durations, mdat contents, and complete host-decoded YUV are preserved.

Fresh initialization and mapped continuation each pass all **10 seek picture/dimension/timestamp checks**, including return seeks. Standalone A and B reference runs supply an independently selected source-picture map. In both the original and fresh replay runs, the positive A/B/A presentations provide 60 matching observed picture checks when the initial paused picture and subsequent natural-speed callbacks are combined. Such callbacks are observations, not a general decoder-frame-count or smoothness measurement.

Both positives reach three-second EOF and retain the same MediaSource, SourceBuffer, and media element. This does not prove that the browser retains an internal decoder session or uses hardware acceleration.

The wrong-source negative passes only 6/10 seek checks and displays incorrect middle pictures despite correct duration and EOF. Its natural-speed callback count varies between runs (60 including the initial picture versus 57), but the wrong-source rejection is unchanged. No run was repeated to erase that variation.

Wrong fragment identity, a fragment with an unexpected source ID, and incompatible geometry/configuration are rejected. These are constructor guards; delayed maintained worker callbacks and actual source-generation ownership remain untested.

### Practical disposition

The mapped route is a demonstrated component option, **not a measured improvement over fresh initialization**. Benchmark only if a maintained consumer genuinely encounters repeated harmless ID changes and the cheapest correct current path leaves measurable cost. Fresh initialization remains the baseline. Do not generalize the one-byte rewrite to encrypted tracks, multi-track files, configuration changes, missing decoder prerequisites, or arbitrary source switches.

A setup correction made the authored finite B file's tfra footer and mvhd next-track-ID coherent with track 17. The MSE test does not consume that footer; its fragment data was unchanged. Initial outcome records are retained, and all final finite-file fixtures and runtime tests were regenerated.

Evidence: [construction and guards](evidence/video_manifest.json), [source references/fresh initialization](evidence/browser_video1.json), [mapped and broken routes](evidence/browser_video2.json), [comparisons](evidence/analysis.json), [setup notes](evidence/setup_notes.json).

## D67 — Native image decoding with a source-derived animation seek plan

### Construction

Two actual 64×48 animated WebP sources each contain 12 lossless VP8L patch frames. They include overlapping rectangles, full-canvas replacement, transparent pixels, source-over blending, replacement/no-blend frames, rectangular background disposal, and a full-canvas disposal reset. All frame durations exceed 10 ms; timed animation playback is not qualified by this seek experiment.

The first input has only zero or full alpha. The second is separately authored with intermediate alpha values. The binary source is 1,602 bytes and the fractional-alpha source is 1,594 bytes. These tiny synthetic images are not a representative performance corpus.

The candidate parses actual RIFF/VP8X/ANIM/ANMF metadata, validates the restricted lossless frame geometry and transparent-background profile, and constructs standalone WebP views around **unchanged compressed subchunks**. It refuses unsupported profiles/metadata, mismatched coded geometry, truncated/out-of-bounds data, nonzero reserved frame flags, excessive frame/file/canvas sizes, and invalid target indices.

For a cold seek, the planner can begin at a proven full-canvas replacement, or immediately after a full-canvas disposal-to-background event. It must not treat an arbitrary small patch as an independent starting picture. Within the selected interval, it applies all required disposal and blending operations.

### Positive binary-alpha result

All 12 targets are requested in non-sequential order, each starting with a fresh Canvas and no retained decoded-image cache. The source-native first image also works, so this is **a seek-operation adapter**, not a new format decoder for otherwise unsupported WebP.

All **12 candidate target pictures match exactly**, both as Canvas RGBA and when displayed over black and white backgrounds. The full-page reference is decoded by Pillow/libwebp and, for the binary input, additionally matches an independent NumPy composition of the original authored operations. Thus the expected picture does not depend on the candidate's parsed seek plan.

The twelve cold seeks create and close **27 frame ImageBitmaps**, versus 78 image decodes for a naïve full-prefix-per-target plan. The final target requires frames 9–11 (three images), rather than all twelve. The 27 candidate calls were executed; 78 is the calculated request count for that naive plan, not a separately executed or timed browser baseline. Neither establishes measured CPU, speed, or total-memory savings.

A persistent decoded-frame/checkpoint cache could be cheaper than either cold plan. R322 already contains a different GIF checkpoint result. This screen does not supersede that evidence or establish advantage against the best equal-memory strategy.

### Failed fractional-alpha result and causal follow-up

Only **5/12** fractional-alpha target comparisons are exact. Maximum absolute Canvas RGBA error is **2 of 255**; differences remain visible in the numerical output on black and white backgrounds (maximum one level). The remaining seven targets fail the exact-output contract. Their tolerance was not widened afterward.

The follow-up compares every standalone extracted WebP patch against a PNG generated from its independent host-decoded RGBA. All 12 binary patches agree, but only 6/12 fractional patches agree through the browser. Substituting those PNG patches in the composition improves whole-target equality from 5/12 to **7/12**, not 12/12. Therefore, “the compressed patch bytes were preserved” does not establish exact displayed composition, and changing the image wrapper alone is not a complete repair. The contributions of alpha representation, rounding, decoder conversion, and composition arithmetic are not fully isolated.

Ignoring disposal fails 3/12 binary target checks. Ignoring blend semantics fails 5/12. A timestamp or successful image decode alone cannot detect these wrong pictures.

### Next step

The parser does not establish binary alpha from headers alone: the positive fixture has that property by construction. A production admission rule needs a trustworthy profile assertion or additional alpha qualification rather than assuming every accepted VP8L frame is eligible. Qualify a real binary-alpha WebP preview/seek consumer and compare against a maintained persistent image decoder or checkpoint owner under an equal-memory/full-cost protocol. Preserve the fractional-alpha failure as a separate stop condition. General alpha, ICC/color profiles, lossy VP8 frames, other backgrounds, timed playback, loop lifecycle, selected-range reads, cancellation, and maintained integration remain unqualified.

Evidence: [source/parser/plan](evidence/webp_manifest.json), [browser seeks and controls](evidence/browser_webp.json), [individual-frame comparisons](evidence/webp_frame_decode_comparison.json), [PNG-substitution follow-up](evidence/webp_png_composition.json).

## Replay and interpretation

The original final screens and fresh-directory replay each pass **65/65 consistency assertions**. Assertions include confirming that a negative or unqualified candidate fails; they are not 65 experiments or 65 production passes.

All **95 main-screen fixture hashes** reproduce exactly. The decisions and positive output checks reproduce. Raw aggregate output is not byte-identical: the deliberately wrong-video natural-speed run has a different callback-observation count, recorded above. The initial unwrap probe's separate three fixtures are not part of the 95-file replay set.

See [replay summary](evidence/replay_summary.json), [verification](evidence/verification.json), and [environment](evidence/environment.json). No speed or near-native percentage follows from packet bytes, callback counts, selected view sizes, or image-decode counts alone.

## Primary references and lineage

- [Pinned Demuxe commit: Shaka integration](https://github.com/Jagalite/demuxe/commit/ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e).
- [R069: real reset semantics must remain](https://github.com/Jagalite/demuxe/blob/ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e/research/items/R069.separate-decoder-compatibility-from-per-source-initialization-identity/README.md).
- [R322: GIF disposal checkpoints, separate profile and cost evidence](https://github.com/Jagalite/demuxe/blob/ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e/research/items/R322.animated-image-disposal-checkpoints.report-continuity/README.md).
- [RFC 3533: Ogg logical streams, grouping and page ownership](https://www.rfc-editor.org/rfc/rfc3533).
- [Xiph: FLAC in Ogg mapping](https://www.xiph.org/flac/ogg_mapping.html).
- [W3C: ISO BMFF byte-stream requirements for MSE](https://www.w3.org/TR/mse-byte-stream-format-isobmff/).
- [Google/libwebp: WebP container, animation, blend and disposal semantics](https://developers.google.com/speed/webp/docs/riff_container).
