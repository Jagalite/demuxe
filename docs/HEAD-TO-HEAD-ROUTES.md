<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Player paths and planned media coverage

Recorded run: **2026-09-19**, **chromium/152.0.7977.83/chrome/headless**. This table describes
the actual paths observed on the generated test fixtures, not a universal routing
policy or a promise about other browsers and media.

Demuxe source snapshot: `a99e793beab78ec6f28cae252562cb844af527c5`, including the captured dirty player diff.
Movi 0.4.0 and libmedia AVPlayer 1.3.1 are the pinned comparison versions.

[Run summary](../results/head-to-head/matrix-01/summary.json) · [rerun guide](HEAD-TO-HEAD.md)

## Default configurations

The four Demuxe auto cells were refreshed with the newly built engines in
[demuxe-original-with-engines-01](../results/head-to-head/demuxe-original-with-engines-01/REPORT.md):
all four passed. Other players and the configured-alternative table retain the
original `matrix-01` evidence. The updated Demuxe snapshot records source revision
`8666434` plus its captured dirty player diff.

Each player cell shows **observed path · correctness result**. Gain means Demuxe CPU reduction against the named player; no comparable performance measurements have been recorded yet.

**Legend:** 🟢 Native-path pass · 🔵 Other-path pass · 🟣 Default failed; tested alternative passed · 🔴 Fail · 🟡 Screen only (fidelity unqualified) · ⚪ Blocked (not tested)

| Media format | Native video | Demuxe (auto) | Movi | AVPlayer | Demuxe CPU gain % vs Native / Movi / AVPlayer |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🟣 Fail; native-first pass | Custom · 🔵 Pass | Not measured / N/A / Not measured |
| H.264 + AAC / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🟣 Fail; native-first pass | Custom · 🔵 Pass | Not measured / N/A / Not measured |
| H.264 + PCM24 / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | Not measured / Not measured / N/A |
| H.264 + PCM24 / MKV + ASS | Native + host ASS · 🟢 Pass | Hybrid · 🔵 Pass | Custom · 🟣 Fail; native-first + host ASS pass | Custom · 🔴 Fail | Not measured / N/A / N/A |

**Not measured** means correctness passed but CPU comparison is pending. **N/A** means one or both configurations failed or were blocked, so a gain would not be a valid comparison. Native video uses the explicit host ASS overlay for the subtitle row.

Purple marks the three original Movi defaults whose tested native-first
configuration passed in `matrix-01`. The ASS alternative includes the explicit
host libass overlay; it is not a pass for Movi's built-in ASS renderer.
Expanded rows have no alternative-path reruns yet and retain their recorded status.

## Configured alternatives

These are separate configurations from the defaults above. ASS uses the same host overlay for Native video, Movi native-first, and Demuxe Native.

| Media format | Native video | Demuxe (Native) | Movi (native-first) | AVPlayer (MSE preference) | Demuxe CPU gain % vs Native / Movi / AVPlayer |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Native · 🟢 Pass | MSE · 🔵 Pass | Not measured / Not measured / Not measured |
| H.264 + AAC / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Native · 🟢 Pass | MSE · 🔵 Pass | Not measured / Not measured / Not measured |
| H.264 + PCM24 / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Not measured / Not measured / N/A |
| H.264 + PCM24 / MKV + ASS | Native + host ASS · 🟢 Pass | Native + host ASS · 🟢 Pass | Native + host ASS · 🟢 Pass | Custom · 🔴 Fail | Not measured / Not measured / N/A |

## Expanded catalogue results

The 56 additional combinations were processed in `expanded-matrix-01` on 2026-09-19, with the explicitly linked follow-up runs:
96 passed, 85 failed, 43 blocked across four default players.
5 combinations could not produce the required fixture; their rows are blocked,
not playback failures. **Screen only** means the bounded playback check succeeded
but discrete surround or reference HDR fidelity remains unqualified. **—** means
no CPU gain measurement. These outcomes are separate from the original `matrix-01`
results above. See [full evidence, blocker reasons and caveats](HEAD-TO-HEAD-CATALOGUE.md).

### First expansion: video and audio combinations

| Media format | Native video | Demuxe | Movi | AVPlayer | CPU gain % |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC 5.1 / MP4 | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + MP3 stereo / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| H.264 + AC-3 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + E-AC-3 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + DTS core 5.1 / MKV | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + FLAC stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| H.264 + FLAC 5.1 / MKV | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| H.264 + Opus stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| H.264 + PCM16 stereo / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| H.264 + PCM24 5.1 / MKV | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🟡 Screen only | Custom · 🔴 Fail | — |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 8-bit + AAC / MP4 (hev1) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + AC-3 / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC Main 10-bit SDR + DTS core / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 8-bit + AAC / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 10-bit SDR + Opus / MKV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| VP9 8-bit + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| VP9 10-bit SDR + Opus / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Unknown · 🔴 Fail | — |
| VP8 + Vorbis / WebM | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |

### Next expansion: containers, subtitles, and audio-only

| Media format | Native video | Demuxe | Movi | AVPlayer | CPU gain % |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MPEG-TS | Custom · 🔴 Fail | Native remux · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| MPEG-2 video + AC-3 / MPEG-TS | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| MPEG-2 video + MP2 / MPEG-PS | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| MPEG-4 Part 2 + MP3 / AVI | Custom · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| ProRes + PCM / MOV | Native · 🔴 Fail | Software · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC / fragmented MP4 (single file) | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 video-only / MP4 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| H.264 + AAC + embedded SRT / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC + external WebVTT / MP4 | Native · 🟢 Pass | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC + embedded mov_text / MP4 | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC + styled ASS / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| HEVC + AC-3 + PGS / MKV | Native · 🔴 Fail | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AC-3 + VobSub / MKV | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| AAC audio-only / M4A | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| MP3 audio-only / MP3 | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| FLAC audio-only / FLAC | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔵 Pass | — |
| Opus audio-only / Ogg | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| Vorbis audio-only / Ogg | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| PCM16 audio-only / WAV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Custom · 🔴 Fail | — |
| PCM24 audio-only / WAV | Native · 🟢 Pass | Native · 🟢 Pass | Custom · 🔵 Pass | Unknown · 🔴 Fail | — |

### Later expansion: HDR, advanced audio, and delivery

| Media format | Native video | Demuxe | Movi | AVPlayer | CPU gain % |
| --- | --- | --- | --- | --- | --- |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | Native · 🔴 Fail | Hybrid · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| HEVC Main 10 + AAC / MP4 (HLG) | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| AV1 10-bit + Opus / WebM (HDR10) | Native · 🟡 Screen only | Native · 🟡 Screen only | Custom · 🔴 Fail | Custom · 🟡 Screen only | — |
| HEVC + TrueHD 7.1 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| HEVC + DTS-HD MA 7.1 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| HEVC + E-AC-3 with Atmos metadata / MP4 | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | ⚪ Blocked (fixture) | — |
| H.264 + AAC / HLS VOD (TS segments) | Native · 🟢 Pass | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC / HLS VOD (fMP4 segments) | Native · 🟢 Pass | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| HEVC + AAC / HLS VOD (fMP4 segments) | Native · 🟢 Pass | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| H.264 + AAC / DASH VOD (fMP4 segments) | Custom · 🔴 Fail | Hybrid · 🔴 Fail | Custom · 🔴 Fail | Custom · 🔵 Pass | — |
| AV1 + Opus / DASH VOD (WebM segments) | Custom · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |
| H.264 + AAC / HLS live (sliding window) | Native · 🔴 Fail | Hybrid · 🔵 Pass | Custom · 🔴 Fail | Custom · 🔴 Fail | — |

### Variants to add to selected combinations

- Video: 720p, 1080p, and 4K; 24/30/60 fps; variable frame rate; B-frames, long GOPs, and interlaced material.
- Audio: stereo, 5.1, and 7.1 channel identification; 44.1/48/96 kHz; multiple tracks, language switching, and nonzero start offsets.
- Subtitles: timing across seeks, forced/default tracks, multiple languages, fonts, styling, and text versus bitmap rendering. Record host overlays separately from built-in support.
- Delivery and lifecycle: local files, HTTP ranges, servers without ranges, interrupted delivery, repeated seeks, end-of-file, live discontinuities, and adaptive rendition changes.
- Environments: record browser, OS, hardware, engine availability, and headed/headless mode separately. Exercise Demuxe automatic, Native, Hybrid, and Software configurations where available, and record the observed path instead of predicting it.

Avoid a full Cartesian product initially: establish small correctness fixtures for each combination, then select passing representative cases for resolution and performance sweeps.

### Before adding or qualifying another row

1. Create a deterministic fixture or obtain a redistributable sample; record provenance, license, generation recipe, hashes, and stream metadata. Do not add unlicensed media to the repository.
2. Add the fixture and player configurations to the runnable matrix, including output checks appropriate to the media. Audio-only, streaming, HDR, and advanced audio require checks beyond the current small SDR video oracle.
3. Screen correctness and record actual routes, failures, and unavailable configurations. HDR color, surround channel fidelity, and Atmos/Dolby Vision behavior require dedicated validation; ordinary playback alone does not establish them.
4. Benchmark only passing comparable configurations on an otherwise idle host, then record CPU values and calculated gains with dated evidence.
5. Update the table with the run reference and limitations. Keep proposed, blocked, failed, and passed cases distinct.

Encrypted/DRM delivery is deferred to a separate authorized test setup; it is not implied by the clear HLS/DASH rows.

## Calculating gain

`CPU gain (%) = 100 × (comparison player CPU − Demuxe CPU) / comparison player CPU`

Positive values mean Demuxe used less CPU; negative values mean more CPU. Each percentage requires passing correctness and comparable repeated performance runs with the same fixture, browser, host, and declared player configurations. Zero CPU cannot be used as a denominator. CPU gain does not describe startup time, memory savings, or image quality.

The recorded run is correctness-only. Performance remains pending; do not infer gains from route names or substitute measurements from older runs. See the [performance rerun procedure](HEAD-TO-HEAD.md).

## What the path labels mean

- **Native direct:** the browser receives the original media URL. For Demuxe this
  is its reported `native-direct` plan; plain video and Movi use the observed active
  HTML video surface. This does not establish hardware decoding or physical fidelity.
- **MSE:** AVPlayer reported its Media Source Extensions path through `isMSE()`.
- **Custom:** the adapter observed a custom path rather than active direct video
  (Movi), or AVPlayer reported non-MSE playback. The current harness does **not**
  distinguish every internal software/WebCodecs decoder stage. Do not read this
  label as proof of a particular decoder or hardware acceleration.
- **Host ASS:** the application adds the same libass overlay for plain video and
  configured Native Demuxe/Movi. It is not built-in ASS support.
- **Failed:** the route was observed, but the complete marked-output/lifecycle
  contract failed. A route label alone does not mean successful playback.
- **Not run / blocked:** no actual route is asserted.

## Findings and limits

Demuxe selected Native direct for all three tested container/audio combinations,
including both MKV fixtures. This browser accepted their original bytes; these
cases therefore did not exercise Demuxe remux, Hybrid, or Software paths.

The automatic Demuxe ASS case was blocked before playback because the prepared
snapshot lacked the required Hybrid/Software engines. Its eventual route cannot
be inferred from this run. Configured Native Demuxe with the explicit host overlay
passed the ASS case.

Movi default AAC MP4/MKV failed near-EOF progression. Its default PCM-only case
passed; adding built-in ASS failed because the requested drawing was absent.
AVPlayer selected custom for PCM even with an MSE preference, then failed audio
with recorded `nbChannels` exceptions. Its MSE preference is not a forced codec
support override.

All fixtures use the same H.264 video packet content at 320×180/30 fps over 36
seconds. Audio is marked stereo; ASS has a known visible drawing. The original four
fixtures do not cover HEVC, AV1, surround layouts, HDR, HLS/DASH, DRM, arbitrary
subtitle styles, or the full compatibility space.

The original tables are a static view of `matrix-01`; the expanded tables identify their separate run. A future run has separate route evidence;
update or create a dated table from that run rather than silently relabeling this
snapshot. The expanded catalogue was executed separately; original results were preserved.
