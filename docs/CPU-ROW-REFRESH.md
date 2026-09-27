<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Comparison table CPU refresh

Each row uses a frozen fixture, fresh correctness qualification, and three
20-second CPU rounds. Beginning with the third row, one Chrome launch covers all
arms and rounds, with fresh contexts per arm and idle checks before each round.
These rounds are correlated; inspect drift and confirm surprising differences
with independent launches. The first two rows below used a separate fresh
launch per round. The
[benchmark protocol](BENCHMARK-PROTOCOL.md) describes the controls.

| README row | Status | Evidence |
| --- | --- | --- |
| H.264 + AAC / MP4 | Complete: 5 pass, Movi fail | [row report](../results/head-to-head/row-h264-aac-mp4-20260925-01/REPORT.md) |
| H.264 + AAC / MKV | Complete: 5 pass, Movi fail | [row report](../results/head-to-head/row-h264-aac-mkv-20260925-01/REPORT.md) |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | Current Auto: default AAC native-direct, AC-3 switch native-transcode; separate 14.0% and 18.1% CPU medians | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier row report](../results/head-to-head/row-h264-dual-audio-20260925-02/REPORT.md) |
| H.264 + PCM24 / MKV | Auto rerun on current player: native-direct, 14.0% CPU median; other arms retain earlier campaign results | [Auto rerun](../results/head-to-head/pcm24-auto-rerun-20260925-01/REPORT.md), [earlier row report](../results/head-to-head/row-h264-pcm24-mkv-20260925-01/REPORT.md) |
| H.264 + PCM24 / MKV + ASS | Current Auto: native-direct-ass passed; CPU withheld after unresolved low window | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC 5.1 / MP4 | Screened stereo output for five arms; Movi failed; matched one-Chrome CPU for the screened arms | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-aac51-20260925/REPORT.md) |
| H.264 + MP3 stereo / MP4 | Four maintained arms passed and Movi failed; MediaBunny screened; matched one-Chrome CPU with Auto outlier and follow-up | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-mp3-confirmed-20260925/REPORT.md) |
| H.264 + AC-3 5.1 / MKV | Current Auto native-transcode, 17.5% CPU; stereo-output screen | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-confirmed-20260925/REPORT.md) |
| H.264 + E-AC-3 5.1 / MKV | Current Auto native-transcode, 19.0% CPU; stereo-output screen | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-20260926/REPORT.md) |
| H.264 + DTS core 5.1 / MKV | Current Auto native-transcode, 19.2% CPU; stereo-output screen | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-dts-20260926/REPORT.md) |
| H.264 + AC-3 stereo / MKV | Current Auto native-transcode, 17.9% CPU | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-stereo-20260926/REPORT.md) |
| H.264 + E-AC-3 stereo / MKV | Current Auto native-transcode, 16.5% CPU; one lower-cadence accepted window | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-stereo-20260926/REPORT.md) |
| H.264 + DTS core stereo / MKV | Current Auto: native-transcode, 18.3% CPU; browser video retained across seeks | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + FLAC stereo / MKV | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured after a FLAC cadence gate correction | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-flac-20260926/REPORT.md) |
| H.264 + FLAC 5.1 / MKV | Four maintained stereo-output screens and one MediaBunny screen measured; discrete 5.1 fidelity unqualified; Movi failed seek audio | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-flac51-20260926/REPORT.md) |
| H.264 + Opus stereo / MKV | Five maintained passes and one MediaBunny screen; six-cell matched CPU; first Chrome launch rejected before measurement by startup readiness gate | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-opus-20260926/REPORT.md) |
| H.264 + PCM16 stereo / MKV | Four maintained passes and one MediaBunny screen; Auto now native-direct, Movi passed but CPU drifted; AVPlayer failed initial playback | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-pcm16-20260926/REPORT.md) |
| H.264 + PCM24 5.1 / MKV | Four maintained stereo-output screens and one MediaBunny screen; Auto now native-direct; AVPlayer failed initial playback; Movi CPU range wide | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-pcm51-20260926/REPORT.md) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc-hvc1-20260926/REPORT.md) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc-hev1-20260926/REPORT.md) |
| HEVC Main 10-bit SDR + AAC / MP4 | Four maintained passes and one MediaBunny screen; Movi failed playback rate; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc10-aac-20260926/REPORT.md) |
| HEVC Main 10 4:2:2 + AAC / MKV | Five maintained passes and one MediaBunny screen; profile fidelity bounded; Movi CPU withheld after a stalled middle round | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc422-aac-20260926/REPORT.md) |
| HEVC Main 10-bit SDR + AC-3 / MKV | Current Auto: native-transcode, 21.0% CPU; independent repeat resolved prior CPU drift | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | Current Auto: native-transcode, 21.5% CPU; independent repeat resolved prior CPU drift | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10-bit SDR + DTS core / MKV | Current Auto: native-transcode, 21.6% CPU; independent repeat resolved prior CPU drift | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| AV1 8-bit + AAC / MP4 | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-av1-aac-20260926/REPORT.md) |
| AV1 10-bit SDR + Opus / MKV | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-av110-opus-20260926/REPORT.md) |
| AV1 + Opus / WebM | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-av1-webm-20260926/REPORT.md) |
| VP9 8-bit + Opus / WebM | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-vp9-opus-20260926/REPORT.md) |
| VP9 10-bit SDR + Opus / WebM | Three maintained passes and one MediaBunny screen; Movi and AVPlayer failed correctness; four viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-vp910-opus-20260926/REPORT.md) |
| VP8 + Vorbis / WebM | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-vp8-vorbis-20260926/REPORT.md) |
| H.264 + AAC / MPEG-TS | Current Auto: native-remux, 18.7% CPU; internal video counter qualified | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| MPEG-2 video + AC-3 / MPEG-TS | Four maintained passes; plain video failed to open and MediaBunny timed out before initial output; four viable CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-mpeg2-ac3-20260926/REPORT.md) |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | Three maintained passes with existing visual-fidelity caveat; plain video and Movi failed, MediaBunny timed out; three viable CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-mpeg2-interlaced-ac3-20260926/REPORT.md) |
| MPEG-2 video + MP2 / MPEG-PS | Demuxe Auto and Software passed; plain video, Movi and AVPlayer failed; MediaBunny rejected the format; two viable CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-mpeg2-mp2-20260926/REPORT.md) |
| MPEG-4 Part 2 + MP3 / AVI | Demuxe Auto and Software passed; plain video, Movi and AVPlayer failed; MediaBunny rejected the format; two viable CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-mpeg4-mp3-20260926/REPORT.md) |
| ProRes + PCM / MOV | Demuxe Auto and Software passed; three maintained players failed; MediaBunny screened marked output with 10-bit and 4:2:2 fidelity unqualified; three CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-prores-pcm-20260926/REPORT.md) |
| H.264 + AAC / fragmented MP4 (single file) | Plain video, Demuxe Auto and Software passed; Movi and AVPlayer failed; MediaBunny screened; four viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-fmp4-20260926/REPORT.md) |
| H.264 video-only / MP4 | All five maintained players passed; MediaBunny screened marked video and silent output; six viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-silent-20260926/REPORT.md) |
| H.264 High 10 + AAC / MKV | Four maintained passes and one MediaBunny screen with 10-bit fidelity unqualified; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-high10-20260926/REPORT.md) |
| MPEG-2 video-only / MPEG-TS | Four maintained passes; plain video failed to open and MediaBunny found no track; four viable CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-mpeg2-video-only-20260926/REPORT.md) |
| H.264 + AAC + embedded SRT / MKV | Current Auto: native-remux-mpv, 18.7% CPU | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC + external WebVTT / MP4 | Plain video and two Demuxe modes passed with supplied VTT; Movi and AVPlayer failed; MediaBunny has no external subtitle input; three viable CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-vtt-20260926/REPORT.md) |
| H.264 + AAC + embedded mov_text / MP4 | Current Auto: native-remux-mpv, 18.3% CPU | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC + styled ASS / MKV | Current Auto: native-remux-mpv, 18.1% CPU | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AC-3 stereo + ASS / MKV | Current Auto: native-transcode-mpv, 3/3 correctness passes and 19.7% CPU | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC + AC-3 + PGS / MKV | Current Auto native-transcode-mpv retained video and marked PGS through seeks; 21.2% CPU | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier native URL retest](AUTO-NATIVE-URL-RETEST.md) |
| H.264 + AC-3 + VobSub / MKV | Current Auto native-transcode-mpv retained video and marked VobSub through seeks; 18.6% CPU | [Auto retest](AUTO-AUDIO-RETEST-E974CBDF.md), [earlier row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-vobsub-20260926/REPORT.md) |
| H.264 + AAC + PGS / MKV (subtitle isolation) | Current Auto: native-remux-mpv, 18.5% CPU; marked bitmap output | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | Current Auto: native-remux-mpv, 18.6% CPU; marked bitmap output | [current-main Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| AAC audio-only / M4A | All five maintained players passed correctness; MediaBunny screened audio-only; five CPU arms measured, Movi CPU withheld after three stalled windows | [row report](../experiments/mediabunny-investigation/notes/official-player-row-audio-aac-20260926/REPORT.md) |
| MP3 audio-only / MP3 | Four maintained players passed; AVPlayer failed seek; MediaBunny screened; focused four-arm CPU follow-up stable, Movi CPU withheld after three stalled windows | [row report](../experiments/mediabunny-investigation/notes/official-player-row-audio-mp3-20260926/REPORT.md) |
| FLAC audio-only / FLAC | All five maintained players passed; MediaBunny screened; five viable CPU arms measured, Movi CPU withheld after three stalled windows | [row report](../experiments/mediabunny-investigation/notes/official-player-row-audio-flac-20260926/REPORT.md) |
| Opus audio-only / Ogg | Four maintained players passed; AVPlayer failed final seek; MediaBunny screened; four viable CPU arms measured, Movi CPU withheld after three stalled windows | [row report](../experiments/mediabunny-investigation/notes/official-player-row-audio-opus-20260926/REPORT.md) |
| Vorbis audio-only / Ogg | Browser audio and both Demuxe routes passed; Movi and AVPlayer failed final seek; MediaBunny screened; only stable Auto CPU median published, other accepted arms drifted | [row report](../experiments/mediabunny-investigation/notes/official-player-row-audio-vorbis-20260926/REPORT.md) |

## Current-main Auto completion pass

The rows below were missing current-protocol Auto CPU or disposition. They use
`main` at `a563f345` and the [Auto retest report](AUTO-MAIN-RETEST-A563F345.md).
Other player columns keep their separate campaigns. A bounded screen is not a
full codec/color-fidelity qualification; blocked fixtures and failed correctness
checks receive no CPU figure.

| README row | Current Auto disposition | Evidence |
| --- | --- | --- |
| PCM16 audio-only / WAV | Pass, `native-direct`, 3.1% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| PCM24 audio-only / WAV | Pass, `native-direct`, 3.4% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | Bounded HDR screen, `native-transcode`, 19.7% CPU from complete repeat; earlier dropped-frame rejection retained | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 + AAC / MP4 (HLG) | Bounded HDR screen, `native-direct`, 16.8% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| AV1 10-bit + Opus / WebM (HDR10) | Bounded HDR screen, `native-direct`, 18.9% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC + TrueHD 7.1 / MKV | Unqualified: no 7.1 authored fixture | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC + DTS-HD MA 7.1 / MKV | Unqualified: no DTS-HD MA fixture | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | Unqualified: no Atmos-authored fixture | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | Unqualified: no qualified profile 5 fixture | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | Unqualified: no qualified profile 8.1 fixture | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC / HLS VOD (TS segments) | Pass, `native-direct`, 15.0% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC / HLS VOD (fMP4 segments) | Pass, `native-direct`, 15.6% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC + AAC / HLS VOD (fMP4 segments) | Pass, `native-direct`; CPU withheld after dropped-frame rejections | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC / DASH VOD (fMP4 segments) | Pass, `shaka-mse`, 17.9% CPU after independent repeat | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| AV1 + Opus / DASH VOD (WebM segments) | Pass, `shaka-mse`, 17.7% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| H.264 + AAC / HLS live (sliding window) | Pass, `shaka-mse`, 18.9% CPU after per-round live-fixture epoch fix | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 + AAC / MKV | Bounded screen, `native-direct`, 19.2% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 + FLAC / MKV | Bounded screen, `native-direct`, 17.4% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 + Opus / MKV | Bounded screen, `native-direct`, 19.8% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 + FLAC + ASS / MKV | Bounded screen, `native-remux-mpv`, 22.5% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 + Opus + ASS / MKV | Bounded screen, `native-remux-mpv`, 23.1% CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | Failed marked audio twice; no CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | Initial playback timed out twice; no CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | Failed marked audio twice; no CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | Failed marked audio twice; no CPU | [Auto retest](AUTO-MAIN-RETEST-A563F345.md) |

The [historical snapshot](HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md) remains
available for provenance and is not numerically combined with refreshed rows.
