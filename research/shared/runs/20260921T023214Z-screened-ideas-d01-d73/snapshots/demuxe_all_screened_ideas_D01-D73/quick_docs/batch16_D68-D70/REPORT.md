<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Focused native-component research: D68–D70

## Summary

**D68: pursue a restricted CAF PCM adapter.** All five source CAF profiles failed browser whole-file decoding. Rewrapping little-endian samples, or reversibly swapping big-endian sample bytes, produced native WAVE playback. All 593,770 checked Float32 output values matched the corresponding browser WAVE references. Float headroom to 1.75 survived at the decoded-buffer boundary.

**D69: pursue a trim-aware CAF Opus adapter.** Sixty-two coded packets containing 21,940 payload bytes were preserved. A source-declared 120-frame priming interval and 23-frame tail trim produced exactly 59,377 stereo output frames. Host CAF decoding itself did not honor those trims; a separately emitted stream-copy file declared 975 frames per packet despite actual 960-frame Opus packets. Both facts are retained, not normalized away in the report.

**D70: pursue native step-highlighting where a native text style is explicitly permitted.** Three timestamped cues matched ten separately authored snapshot-cue states at 23 source-time seeks and eight repeated-time seeks. Natural playback and a 2x playback interval matched too. This verifies the requested text/highlight schedule in native WebVTT, not pixel-equivalence to libass or general ASS typesetting.

All three are standalone component screens, not executions of the maintained Demuxe player. Browser-owned is not synonymous with hardware-accelerated. No CPU, energy, network, total-memory, or complete-owner benefit is measured.

## Environment and repository lineage

The live repository read resolved `main` to `ee7fe7774270fe34fe617cb0dd5adb9d9e9f689e` (“Use Shaka for controlled HLS and DASH playback”). Read-only context also included R010's progressive float-WAVE destination and R144's restricted ASS animation compilation result. The latter's cost result is inconclusive/failed; these new destination tests do not inherit a speed improvement or override that result.

Execution: Linux, Chromium 144.0.7559.96, FFmpeg 7.1.5; Python numpy, Pillow, Playwright. Browser tests run in a non-secure in-memory document with mounted fixture bytes supplied by the harness. They do not use WebCodecs, localhost HTTP delivery, or a Shaka runtime. Tool identities are in `evidence/environment.json`; command output is retained in `evidence/commands.jsonl`.

## D68 — Preserve PCM values while changing only the incompatible representation

### Question and contract

Can finite, packed CAF linear PCM be given to the browser's WAVE endpoint without a general audio decode/re-encode or quantization stage? This extends earlier finite native audio-carrier work with actual CAF chunk/format/byte-order parsing.

Accepted input: source-pinned, finite, known-length, interleaved stereo at 48 kHz, in the five tested packed sample profiles below. CAF channel-layout metadata must be absent or match the tested explicit stereo tag. Uninterpreted semantic chunks, nonfinite Float32 samples, unsupported flags, padded/unpacked sample layouts, bad extents, and other profiles are excluded. The constructor intentionally rejects more files than a general CAF decoder.

The requested Float32 output must equal the corresponding native WAVE reference. Integer-to-Float32 scaling differences between browser and host endpoints are not erased: the host comparison is CAF versus WAVE within the host, and the browser comparison is candidate WAVE versus independently authored WAVE within the browser. The underlying packed integer/float bytes are independently preserved or reversibly reordered.

### Construction and execution

The custom CAF parser validates chunk boundaries, source identity, the description, channel information, edit count, and payload extent. It creates a conventional WAVE header. Little-endian payload bytes are unchanged; big-endian payloads reverse bytes within each sample, not between channels or sample frames. Float input is checked for finite values.

This Python constructor reads/hashes the complete input and materializes output bytes. Float validation visits sample values. The result is **not** a zero-copy or constant-memory claim.

| Profile | Frames | Source CAF bytes | WAVE bytes | Data work | Browser values |
|---|---:|---:|---:|---|---:|
| Float32 little-endian | 59,377 | 475,145 | 475,072 | Same sample bytes | 118,754 exact |
| Float32 big-endian | 59,377 | 475,145 | 475,072 | Reversible byte swap | 118,754 exact |
| Signed24 little-endian | 59,377 | 356,391 | 356,306 | Same sample bytes | 118,754 exact |
| Signed24 big-endian | 59,377 | 356,391 | 356,306 | Reversible byte swap | 118,754 exact |
| Signed16 big-endian | 59,377 | 237,637 | 237,552 | Reversible byte swap | 118,754 exact |

All five output files are byte-identical to the separately authored WAVE references. Host CAF→Float32 and WAVE→Float32 outputs agree exactly in every profile. Browser whole-file CAF decode fails for all five; every output WAVE decodes, completes seeks to 0.83 and 0.19 seconds, produces nonzero analyser output, reaches EOF, and releases its context and object URL. A representative original CAF also fails direct media-element loading. Float32 output preserves a maximum magnitude of 1.75 at the decoded-buffer boundary; no physical-speaker headroom claim is made.

### Falsifiers

Treating the big-endian S24 bytes as little-endian still yields decodable WAVE, but changes 118,273 of the 118,754 channel values. Structural controls reject a wrong packet stride, unsupported flags, truncation, an uninterpreted region chunk, and changed source identity. Mere decoder acceptance is not the oracle.

### Decision and next gate

Pursue a source adapter only if the maintained route does not already supply this representation cheaply. Keep the source description and exact output contract; use the existing native owner. General CAF, markers/regions, arbitrary channel layouts, streaming sources, and exact audible output after seeks are unqualified. R010's separate progressive WAVE result does not automatically qualify this constructor or its lifecycle.

Evidence: `evidence/caf_manifest.json`, `evidence/browser_caf.json`.

## D69 — Translate the packet table, not just the packet bytes

### Question and contract

Can a restricted CAF Opus source become browser-playable Ogg while preserving both coded audio and source-declared priming/end boundaries? This is a separate compressed-packet adapter from D68, not a second count of a PCM wrapper change.

The fixture uses stereo 48 kHz, one-frame 20-ms CELT packets, no unknown codec cookie, no multistream mapping, and a complete variable-size packet table. Source identity and declared packet duration are mandatory. All code lives in `build_caf.py`; host decoders are independent witnesses, not adapter stages.

### Source provenance and an important distinction

One continuous input is encoded both as Ogg and directly as CAF using the same libopus parameters. All 62 coded packets agree. The directly encoded CAF declares 59,520 valid frames, zero priming, and zero tail trimming; its own declaration therefore describes the untrimmed sequence. The adapter does **not** invent missing priming for that source.

A second, explicitly authored CAF fixture keeps those packets and records the original encoder's known 120-frame delay and 23-frame final trim in its packet table. Its valid count is 59,377. Those declarations are the source of truth for the trim-aware experiment, not a heuristic correction inferred from listening or from output duration.

### Construction

The adapter parses every variable-length packet size, checks exact ownership of payload bytes, validates each restricted Opus TOC, and reconciles:

`62 × 960 = 59,377 valid + 120 priming + 23 remainder`.

It emits OpusHead with the declared pre-skip, an OpusTags header, unchanged packets, Ogg checksums, and a last-page granule carrying the source end trim. The simple writer uses one audio packet per page; output size grows from 22,229 CAF bytes to 23,842 Ogg bytes. It is not a bandwidth optimization.

### Results

The untrimmed source becomes 59,520 browser output frames, exactly matching its declaration. The trim-declared source becomes 59,377 frames, all 118,754 channel values exact versus the independently encoded original Ogg browser output. The trimmed native output also equals the declared slice of the untrimmed browser output. Host decoding of the transformed Ogg agrees with the original Ogg and with the source table applied explicitly to complete same-packet host decode.

Direct media-element playback of both transformed Ogg files performs the two selected seeks, produces nonzero signal, and reaches EOF. The CAF sources fail browser decode; the trim-declared CAF also fails direct loading.

### Retained discrepancies and negatives

1. FFmpeg host CAF decoding returns all 59,520 frames for the trim-declared source rather than applying the table's 120/23 boundaries. The reference is therefore not that untrimmed output mislabeled as correct; the declared slice and original Ogg supply independent comparison boundaries.
2. A real FFmpeg stream-copy from the reference Ogg to CAF produces a description of **975 frames per packet**, while the unchanged Opus packets contain 960. The initial strict guard rejected it. It remains in `fixtures/opus_streamcopy.caf`; the working adapter was not relaxed to accept it.
3. Omitting priming yields 59,497 rather than 59,377 output frames. The length oracle rejects it.
4. Inconsistent duration sums, truncation, unknown cookies, and multichannel semantics are rejected.
5. The media element reports 1.239521 s for both the transformed trimmed Ogg and the original reference Ogg. Exact whole-file sample duration is 1.2370208333 s. The approximately 2.5-ms discrepancy was **not** introduced by the new packet writer, but it remains a limit of this destination observation. Live PCM-exact seeking/tail behavior was not recorded.

### Decision and next gate

Pursue the bounded container/packet-table adapter with a maintained demuxer comparison. Do not guess absent source trim, assume a CAF codec cookie is irrelevant, accept a declared duration that contradicts codec packet framing, or equate accurate whole-file decode with sample-exact live seeking. Apple/Core Audio decoding itself was not available or tested.

Evidence: `evidence/caf_manifest.json`, `evidence/browser_caf.json`, original/declared/stream-copy CAF fixtures.

## D70 — Give native text the syllable timeline rather than repainting it in JavaScript

### Question and explicit contract

Can the step-highlight schedule from a restricted `\k` source be expressed by WebVTT inline timestamp objects and native `:future` styling? The source has three lines with three, four, and three syllable groups; its duration is in centiseconds. The converter admits only positive `\k` durations and literal text, with explicit line boundaries. It rejects sweeps (`\kf`, `\K`), movement, zero durations, and mismatched total duration.

The requested output uses a **chosen native caption style**. This is not a promise to preserve arbitrary ASS fonts, placement, outlines, shadows, geometry, or libass pixels. The timing/text contract is compared with separately authored native snapshot cues, not with the candidate's self-reported schedule.

### Actual construction

The source event strings are parsed and checked against a separately spelled-out timeline truth. Three native cues contain escaped literal text inside `<c>` elements, with absolute inline timestamps between syllable groups. The media element applies native styling: current/completed text uses the highlight color; future spans remain white. No application timer changes syllable colors during playback.

The independent reference has ten separate cue intervals, each with the full text and explicit already-highlighted/future classes. Screenshots compare complete 640×360 rendered video elements, using a static authored video backdrop and the same native font/style contract.

### Execution

- All 23 seek queries, including backward seeks and queries either side of boundaries, have pixel-identical output between three-cue candidate and ten-cue reference.
- Eight shifted/repeated queries also match when both outer cue times and inner timestamps are rebased by six seconds.
- Running naturally from 0.23 s and pausing around 1.285 s yields the correct independently referenced highlighted state.
- Running a second interval at 2× playback rate yields the correct state at the observed media time around 2.598 s.
- The video source URL stays unchanged and the presentation reaches EOF; eight object URLs are revoked.

The natural-speed tests do not instrument or certify the exact wall-clock instant of every boundary. Static native/reference comparisons establish requested state at the checked media times, not a complete real-time latency distribution. Audio was not included in this caption fixture; no independent audio/caption synchronization claim follows.

### Falsifiers

- Leaving text outside internal `<c>` elements causes 14/23 screenshot failures: valid timestamp text alone is insufficient for the chosen `:future` selector behavior.
- Moving the internal timestamps by 100 ms causes 6/23 failures.
- Moving only the outer cue start/end while leaving inner times in the original timeline causes 6/8 repeated-output failures.
- Literal `A & <B> waits` remains literal, not interpreted as a supported formatting request.

### Decision and next gate

Pursue this timing-only/native-style profile within the existing subtitle owner. Compare with Shaka's/native text support before adding a new owner. Do not rewrite full ASS files to this representation unless the requested native-style output explicitly permits the styling change. Many richer subtitle effects remain out of scope; R144's opacity-template result and failed cost gate remain separate.

Evidence: `evidence/karaoke_manifest.json`, `evidence/browser_karaoke.json`, representative screenshots.

## Replay and reliability

The original and fresh-directory replay each pass 76/76 consistency assertions, including checks that detect failed candidates. Aggregate analysis is identical. Of 33 main fixture files, 32 are byte-identical. The reference Ogg differs only in its newly generated stream serial and associated page CRC bytes; all packet bytes, page granules, and file length agree. `evidence/replay_ogg_identity.json` documents this rather than claiming every file hash reproduced.

Natural playback capture times and analyser RMS may vary with scheduling; the semantic comparisons and all positive/negative decisions reproduced. No repeated retries were used to erase a scientific failure.

## Retained setup corrections

The initial FFmpeg option used `restricted_lowdelay`; the installed CLI names that mode `lowdelay`. The rejected command/log is retained. The initial stream-copy CAF encountered the strict 960-frame profile guard and remains a substantive negative. The first caption harness inspected `TextTrack.cues` after disabling the track, yielding null; it was corrected to retain nonshowing test tracks in hidden mode. This is a test-harness correction, not a playback capability fix.

## Sources and evidence boundaries

`sources.json` records primary Apple CAF, IETF Opus, W3C WebVTT, Aegisub tag documentation, FFmpeg source, and pinned repository paths. Those sources supply format/API semantics; they do not prove these experimental results. Numerical claims come from the included execution evidence. Own fixtures/scripts are provided; no font files, browser binaries, or external music/video assets are included.
