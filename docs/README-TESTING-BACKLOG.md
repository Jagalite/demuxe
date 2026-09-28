<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# README testing backlog — 2026-09-28

Inventory of the current 80-row README table, checked against its linked evidence notes. This planning inventory reflects the four-row specialist reset and completed harness validation below; no new current-build qualification or CPU campaign is claimed. Counts are player/row cells, not unique fixtures. Existing results describe their frozen builds, not a fresh qualification of today's working tree.

## Summary

| Lane | Untested | Passing/screened without published CPU | Unqualified | Failed | Partial playback |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native | 4 | 10 | 0 | 35 | 2 |
| Auto | 4 | 4 | 1 | 0 | 0 |
| JSPI | 77 | 1 | 0 | 0 | 0 |
| Asyncify | 77 | 1 | 0 | 0 | 0 |
| Software | 4 | 24 | 0 | 0 | 0 |
| Movi | 4 | 15 | 0 | 55 | 0 |
| AVPlayer | 4 | 14 | 0 | 30 | 0 |
| MediaBunny | 25 | 3 | 0 | 15 | 0 |
| Video.js | 80 | 0 | 0 | 0 | 0 |

There are **279 untested cells** and **72 passing/screened cells without published CPU** (62 green passes and ten yellow screens). Withheld CPU is included in the latter count; it is not necessarily unattempted. The [TrueHD Auto row](BASE-SPECIALIST-TRUEHD-ROW.md) passed a bounded screen but its CPU was withheld after a frame-drop rejection.

## 1. Requalify the four reset specialist rows

All nine player cells in each row below are now **Untested**. The current table
has no Auto or Software failures. The previous Auto tone-check failures and older
Software/competitor outcomes remain historical evidence, not current table labels.

| Fixture | Remaining work |
| --- | --- |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | Fresh Auto/Software specialist screen, then other player lanes |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | Same; check audio at independently verified non-silent source windows |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | Same; retain native parameter-set failures and actual fallback route |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | Same; retain native parameter-set failures and actual fallback route |

Completed in the [specialist harness correction](SPECIALIST-HARNESS-RESET.md):

- Preserved specialist marker metadata during snapshot import; the marked-output
  runner now blocks unmarked or incompletely described specialist fixtures.
- Replaced inappropriate synthetic-tone expectations in the specialist path with
  independently host-decoded reference windows and checks for both output channels.
- Passed 17 Node and five Python checks. The catalogue guard blocked all four
  legacy imports before browser playback; the corrected specialist pilot passed
  all four bounded lifecycle checks. Both archives passed integrity verification.

The pilot used frozen runtime `20b5cd0319a64334c29d36ea7a6c8cdac7c6f4d8`,
with media hashes matching the September 27 failures. It validates the harness,
not today's build: TrueHD/DTS-HD used Hybrid and both Dolby Vision cases used
Software. It supplies no current-build pass or CPU value for the reset table.

Freeze a new runtime and import the matching fixture and specialist catalogues.
Run Auto and forced Software on identical bytes through `specialist-screen.mjs`,
then qualify each other player lane separately. Check reference-window audio,
required subtitles before and after forward/backward seeks, near EOF, visible
video, pause/resume, rate and teardown. Record route and output ownership. Require
authored markers only where fixture metadata declares them. Stereo energy alone
does not establish audio content, channel mapping, losslessness or Atmos fidelity.
Measure CPU only after matching correctness passes, and restore only the cells
supported by fresh evidence. The linked correction includes exact rerun commands.

Also reconcile the Software PGS evidence: the [historical evidence notes](MEDIA-COMPARISON-EVIDENCE.md#historical-campaigns-and-interpretation) still describe H.264/AAC/PGS subtitles disappearing after seek and say the cell remains red, while today's README shows green with 36.0% CPU. Trace the later Software-specific result and retest seek persistence if it does not clearly supersede the failure. An Auto-only pass cannot qualify forced Software.

## 2. Qualify Auto using the remaining validated specialist fixture

The [TrueHD](BASE-SPECIALIST-TRUEHD-ROW.md), [DTS-HD MA](BASE-SPECIALIST-DTSHD-ROW.md), [Atmos](BASE-SPECIALIST-ATMOS-ROW.md) and [Dolby Vision 5](BASE-SPECIALIST-DV5-ROW.md) Auto rows passed fresh bounded playback screens. This last Auto cell
remains Unqualified. Its exact-profile fixture and host references are validated:

- Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV

The [fresh fixture validation](BASE-SPECIALIST-FIXTURES.md) verified all five pinned
sources, derived-file hashes, exact codec/profile/container contracts, full host
decoding and non-silent stereo reference windows. Native-channel PCM references,
base-video frame checksums and actual Dolby Vision RPU side data are retained in
42 hash-verified evidence files. Eight Python regression tests passed.

The source-availability blocker in the [September 27 Auto report](AUTO-MAIN-RETEST-A563F345.md#remaining-readme-rows)
is superseded for bounded screening. Remaining work: freeze a current runtime,
run Auto and Software controls on the remaining exact bytes with the specialist runner,
then measure CPU only for matching correctness-qualified results. The README
still has one Unqualified Auto cell; no browser pass was inferred from host
validation. TrueHD and DTS-HD use repeated short samples, and Dolby Vision uses
authored stereo E-AC-3 audio. Preserve those limits. Physical HDR/Dolby Vision,
losslessness, discrete browser output channels and Atmos objects still need
separate output-fidelity qualification. Do not substitute 5.1 for 7.1, DTS core
for DTS-HD MA, plain E-AC-3 for Atmos, or ordinary HEVC for Dolby Vision. Reconcile
historical Software/competitor results against the same contracts before making
matched comparisons.

## 3. Fill untested lanes

The four reset rows account for four untested cells each in Native, Auto, Software,
Movi and AVPlayer; handle those through section 1. Their JSPI, Asyncify, MediaBunny
and Video.js cells are included in the lane totals below, not additional work.

- **Video.js: all 80 README rows.** Pin the player version and configuration, implement its comparison adapter and run correctness first; measure CPU for viable results. Any configured alternative needs its own label.
- **JSPI and Asyncify: 77 rows each.** The only already-tested rows in each are H.264 + AC-3 stereo / MKV, HEVC Main 10-bit SDR + AC-3 / MKV, and H.264 + AAC / MPEG-TS. Every other README row is untested in both columns. First establish the supported runtime/route scope; prioritize file remux/transcode, then separately qualify admitted private subtitle/audio services. The existing runtime campaign does not qualify private Hybrid/Software or imply all streaming paths use these runtimes. Record an explicit scope limitation where applicable rather than forcing a misleading comparison.
- **MediaBunny: 25 exact rows**, listed below. Retain the official-example input/control contract; inability to express a required stream, subtitle or track action must be recorded accurately.

- PCM16 audio-only / WAV
- PCM24 audio-only / WAV
- HEVC Main 10 + E-AC-3 / MKV (HDR10)
- HEVC Main 10 + AAC / MP4 (HLG)
- AV1 10-bit + Opus / WebM (HDR10)
- HEVC + TrueHD 7.1 / MKV
- HEVC + DTS-HD MA 7.1 / MKV
- HEVC + E-AC-3 with Atmos metadata / MP4
- Dolby Vision profile 5 HEVC + E-AC-3 / MP4
- Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV
- H.264 + AAC / HLS VOD (TS segments)
- H.264 + AAC / HLS VOD (fMP4 segments)
- HEVC + AAC / HLS VOD (fMP4 segments)
- H.264 + AAC / DASH VOD (fMP4 segments)
- AV1 + Opus / DASH VOD (WebM segments)
- H.264 + AAC / HLS live (sliding window)
- HEVC Main 10 + AAC / MKV
- HEVC Main 10 + FLAC / MKV
- HEVC Main 10 + Opus / MKV
- HEVC Main 10 + FLAC + ASS / MKV
- HEVC Main 10 + Opus + ASS / MKV
- HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV
- HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV
- Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV
- Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV

## 4. Complete missing CPU measurements

The following is the complete list of 72 passing/screened cells without a numeric CPU value. A lane listed here needs evidence review and, where necessary, a fresh correctness-qualified CPU campaign. Historical numeric results elsewhere do not automatically qualify publication in this table.

| Exact README row | Lanes without CPU |
| --- | --- |
| H.264 + PCM24 / MKV | Movi |
| H.264 + PCM24 / MKV + ASS | Native, Software |
| H.264 + AC-3 5.1 / MKV | AVPlayer, MediaBunny (screened) |
| HEVC Main 10 4:2:2 + AAC / MKV | Movi |
| HEVC Main 10-bit SDR + AC-3 / MKV | JSPI, Asyncify |
| HEVC Main 10-bit SDR + DTS core / MKV | Software, AVPlayer, MediaBunny (screened) |
| AAC audio-only / M4A | Movi |
| MP3 audio-only / MP3 | Movi |
| FLAC audio-only / FLAC | Movi |
| Opus audio-only / Ogg | Movi |
| Vorbis audio-only / Ogg | Native, Software, MediaBunny (screened) |
| PCM16 audio-only / WAV | Software, Movi |
| PCM24 audio-only / WAV | Software, Movi |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | Software, AVPlayer |
| HEVC Main 10 + AAC / MP4 (HLG) | Native, Software, AVPlayer |
| AV1 10-bit + Opus / WebM (HDR10) | Native, Software, AVPlayer |
| HEVC + TrueHD 7.1 / MKV | Auto (screened; frame-drop rejection), Software |
| HEVC + DTS-HD MA 7.1 / MKV | Auto (screened), Software, AVPlayer (screened) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | Auto (screened), Software |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | Auto (screened), Software |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | Software, AVPlayer (screened) |
| H.264 + AAC / HLS VOD (TS segments) | Native, Software, Movi, AVPlayer |
| H.264 + AAC / HLS VOD (fMP4 segments) | Native, Software, Movi, AVPlayer |
| HEVC + AAC / HLS VOD (fMP4 segments) | Native, Software, Movi, AVPlayer |
| H.264 + AAC / DASH VOD (fMP4 segments) | Software, Movi, AVPlayer |
| AV1 + Opus / DASH VOD (WebM segments) | Software, Movi |
| H.264 + AAC / HLS live (sliding window) | Software, Movi |
| HEVC Main 10 + AAC / MKV | Native, Software, Movi, AVPlayer |
| HEVC Main 10 + FLAC / MKV | Native, Software, AVPlayer |
| HEVC Main 10 + Opus / MKV | Native, Software, AVPlayer (screened) |
| HEVC Main 10 + FLAC + ASS / MKV | Software |
| HEVC Main 10 + Opus + ASS / MKV | Software |

Prioritize the withheld/stalled cases as investigations:

**Explicit CPU-withheld TODOs in the README:**

| Row | Lane | Next check |
| --- | --- | --- |
| HEVC Main 10-bit SDR + AC-3 / MKV | JSPI | Investigate cross-launch variance and cadence rejections; rerun a complete matched campaign. |
| HEVC Main 10-bit SDR + AC-3 / MKV | Asyncify | Investigate cross-launch variance and cadence rejections; rerun a complete matched campaign. |
| HEVC + TrueHD 7.1 / MKV | Auto | Investigate the 77 dropped frames in CPU window 3; run a fresh complete campaign after the cause is understood. |

Add any future `CPU withheld` cell here with its failed gate and evidence before publishing a replacement number. Other blank CPU cells remain listed in the table above.

- **JSPI/Asyncify HEVC Main10 + AC-3:** two retained campaigns contain cadence rejections and unexplained low CPU windows. Reproduce and investigate variability using complete matched pthread/JSPI/Asyncify runs; do not pool favorable windows or keep retrying solely to obtain a passing median. [Runtime CPU evidence](JSPI-ASYNCIFY-PLAYER-CPU.md#retained-hevc-attempt-and-repeat).
- **AVPlayer and MediaBunny H.264 + AC-3 5.1:** apparent CPU ranking reversed in an independent launch. Investigate repeatability before publishing a comparison. [Current evidence notes](MEDIA-COMPARISON-EVIDENCE.md#row-notes).
- **Movi HEVC 4:2:2 and AAC/MP3/FLAC/Opus audio-only:** CPU windows stalled despite earlier correctness passes. Verify sustained progress and the measurement harness, then rerun. [Row refresh index](CPU-ROW-REFRESH.md).
- **Software live HLS:** historical correctness passed but two of three CPU windows stopped advancing. Test sustained sliding-window progression before accepting CPU. [Historical software evidence](MEDIA-COMPARISON-EVIDENCE.md#historical-campaigns-and-interpretation).
- **Auto HEVC + TrueHD 7.1:** two CPU windows passed but the third dropped 77 frames; investigate the intermittent presentation loss before a fresh full CPU campaign. [Row evidence](BASE-SPECIALIST-TRUEHD-ROW.md).

## 5. Close partial playback and qualification limits

- **Native PCM16 and PCM24 WAV:** both remain orange; identify and rerun the failed later lifecycle check. Initial sound is not a full pass.
- **MediaBunny screens:** qualify 1.25× playback and independent teardown if the official example can expose them; the dual-audio row still needs the AC-3 selection/switch contract. Otherwise retain the bounded label.
- **HDR/HLG/Dolby Vision:** use appropriate reference output to validate transfer function, color and physical HDR; ordinary visible frames do not establish fidelity.
- **Surround, TrueHD, DTS-HD and Atmos:** validate channel identity/layout, losslessness where claimed and object/spatial behavior separately from stereo energy checks.
- **Interlaced MPEG-2:** the Auto row records visible combing; qualify deinterlacing/output quality separately from playback success.
- **Historical competitor failures outside the four reset rows:** these are already tested, not missing coverage. Prioritize reruns when the adapter, fixture or pinned player version changes, or when investigating a named configured alternative; do not assign CPU efficiency to failed playback.
- **Cross-browser/device and realistic-duration/resolution coverage:** maintain separate Firefox/Safari/device and long-file/1080p/4K campaigns where claims are needed. The README's bounded Chrome/macOS rows do not qualify those environments.

## Acceptance and suggested order

1. Requalify the four reset specialist rows on a fresh runtime, reconcile the Software PGS evidence discrepancy, and run current Auto/Software controls for the remaining validated base specialist fixture.
2. Run current Software correctness controls and complete the most useful missing CPU rows, especially streaming and ordinary audio.
3. Expand JSPI/Asyncify within their supported route contracts, add Video.js, and fill MediaBunny's gaps.
4. Extend output fidelity, browser/device and long-duration qualification as separate campaigns.

Freeze runtime, harness, media hashes, player versions and browser configuration. Run correctness before CPU. For each accepted CPU cell use three serial 20-second whole-browser windows after five seconds of warmup, with progress, cadence, process continuity and idle checks. Retain rejected windows, routes, ranges and launch identity. Investigate drift with independent launches; compare players only under matched fixture/input contracts, explicitly noting the existing local-File versus local-URL difference. Run CPU without other benchmarks or builds competing for resources. Update only the cells supported by the new evidence.

Sources: [README](../README.md#media-comparison), [evidence notes](MEDIA-COMPARISON-EVIDENCE.md), [row index](CPU-ROW-REFRESH.md), [rerun guide](HEAD-TO-HEAD.md), [specialist reset and harness validation](SPECIALIST-HARNESS-RESET.md).
