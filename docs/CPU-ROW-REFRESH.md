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
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | Measured in one Chrome: 4 pass, Movi fail; wide within-launch ranges | [row report](../results/head-to-head/row-h264-dual-audio-20260925-02/REPORT.md) |
| H.264 + PCM24 / MKV | Auto rerun on current player: native-direct, 14.0% CPU median; other arms retain earlier campaign results | [Auto rerun](../results/head-to-head/pcm24-auto-rerun-20260925-01/REPORT.md), [earlier row report](../results/head-to-head/row-h264-pcm24-mkv-20260925-01/REPORT.md) |
| H.264 + PCM24 / MKV + ASS | Screened: two Demuxe passes, three failures; CPU withheld for wide drift and unmatched host-ASS reference | [row report](../results/head-to-head/row-h264-pcm24-ass-20260925-01/REPORT.md) |
| H.264 + AAC 5.1 / MP4 | Screened stereo output for five arms; Movi failed; matched one-Chrome CPU for the screened arms | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-aac51-20260925/REPORT.md) |
| H.264 + MP3 stereo / MP4 | Four maintained arms passed and Movi failed; MediaBunny screened; matched one-Chrome CPU with Auto outlier and follow-up | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-mp3-confirmed-20260925/REPORT.md) |
| H.264 + AC-3 5.1 / MKV | Demuxe Auto and Software CPU measured; plain video and Movi failed; AVPlayer/MediaBunny CPU withheld after independent launch reversed ranking | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-confirmed-20260925/REPORT.md) |
| H.264 + E-AC-3 5.1 / MKV | Four stereo-screened arms measured in one Chrome; plain video and Movi failed correctness | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-20260926/REPORT.md) |
| H.264 + DTS core 5.1 / MKV | Four stereo-screened arms measured in one Chrome; plain video and Movi failed correctness | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-dts-20260926/REPORT.md) |
| H.264 + AC-3 stereo / MKV | Three maintained passes and one MediaBunny screen; URL Auto used Hybrid, unlike earlier local-File split; plain video and Movi failed | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-ac3-stereo-20260926/REPORT.md) |
| H.264 + E-AC-3 stereo / MKV | Three maintained passes and one MediaBunny screen; four viable/screened CPU arms; plain video and Movi failed | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-eac3-stereo-20260926/REPORT.md) |
| H.264 + DTS core stereo / MKV | Three maintained passes and one MediaBunny screen; four viable/screened CPU arms; Auto CPU range widened | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-dts-stereo-20260926/REPORT.md) |
| H.264 + FLAC stereo / MKV | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured after a FLAC cadence gate correction | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-flac-20260926/REPORT.md) |
| H.264 + FLAC 5.1 / MKV | Four maintained stereo-output screens and one MediaBunny screen measured; discrete 5.1 fidelity unqualified; Movi failed seek audio | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-flac51-20260926/REPORT.md) |
| H.264 + Opus stereo / MKV | Five maintained passes and one MediaBunny screen; six-cell matched CPU; first Chrome launch rejected before measurement by startup readiness gate | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-opus-20260926/REPORT.md) |
| H.264 + PCM16 stereo / MKV | Four maintained passes and one MediaBunny screen; Auto now native-direct, Movi passed but CPU drifted; AVPlayer failed initial playback | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-pcm16-20260926/REPORT.md) |
| H.264 + PCM24 5.1 / MKV | Four maintained stereo-output screens and one MediaBunny screen; Auto now native-direct; AVPlayer failed initial playback; Movi CPU range wide | [row report](../experiments/mediabunny-investigation/notes/official-player-row-h264-pcm51-20260926/REPORT.md) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc-hvc1-20260926/REPORT.md) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | Four maintained passes and one MediaBunny screen; Movi failed near EOF; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc-hev1-20260926/REPORT.md) |
| HEVC Main 10-bit SDR + AAC / MP4 | Four maintained passes and one MediaBunny screen; Movi failed playback rate; five viable/screened CPU arms measured | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc10-aac-20260926/REPORT.md) |
| HEVC Main 10 4:2:2 + AAC / MKV | Five maintained passes and one MediaBunny screen; profile fidelity bounded; Movi CPU withheld after a stalled middle round | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc422-aac-20260926/REPORT.md) |
| HEVC Main 10-bit SDR + AC-3 / MKV | Three maintained passes and one MediaBunny screen; local URL Auto used Hybrid; plain video and Movi failed correctness | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc10-ac3-20260926/REPORT.md) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | Three maintained passes and one MediaBunny screen; local URL Auto used Hybrid; plain video and Movi failed correctness | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc10-eac3-20260926/REPORT.md) |
| HEVC Main 10-bit SDR + DTS core / MKV | Correctness complete: three maintained passes, two failures, one MediaBunny screen; CPU unmeasured after two Chrome startup-gate rejections | [row report](../experiments/mediabunny-investigation/notes/official-player-row-hevc10-dts-20260926/REPORT.md) |

Remaining CPU cells are pending. The
[historical snapshot](HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md) remains available
for provenance and is not numerically combined with refreshed rows.
