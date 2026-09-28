<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# README backlog row results

Rows are exercised in README order. Existing cells outside each selected gap retain their original campaigns. Video.js 8.24.1 uses its default HTML5/VHS player, local URL input, no codec plugins, and hidden controls. Its public [Player API](https://docs.videojs.com/player) drives the same bounded checks as the other maintained adapters. The pinned package URL and SHA-256 are captured in each asset manifest.

Demuxe uses the frozen September 28 source candidate based on `7f4407d2` plus captured local changes; this is not a clean release qualification. Private engine additions are separately hashed. JSPI/Asyncify run without isolation headers; a direct-playback bypass exercises neither remux runtime. CPU requires matching correctness, three accepted windows, foreground, stable processes, presentation cadence and cleanup. One gated Chrome launch per row uses fresh contexts for each arm; its three rounds do not establish independent-launch reproducibility.

The forced-remux reference follow-up uses `nativeRemux: 'always'` with the requested
JSPI/Asyncify option. Direct-playback bypasses are rejected in both correctness
and CPU. These values describe the explicitly configured route, not the automatic
policy. Earlier bypass and CPU results remain below as historical evidence.

## Row 1: H.264 + AAC / MP4

[Correctness](../results/head-to-head/backlog-01-aac-mp4-correctness/summary.json) · [CPU](../results/head-to-head/backlog-01-aac-mp4-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 24.0% CPU | All bounded playback checks passed; CPU rounds: 23.96%, 24.33%, 21.90% |
| JSPI | N/A · native-direct bypass | Playback passed via native-direct; requested remux runtime was not exercised. CPU not applicable to this runtime. |
| Asyncify | N/A · native-direct bypass | Playback passed via native-direct; requested remux runtime was not exercised. CPU not applicable to this runtime. |

## Row 2: H.264 + AAC / MKV

[Correctness](../results/head-to-head/backlog-02-aac-mkv-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-02-aac-mkv-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 21.7% CPU | All bounded playback checks passed; CPU rounds: 21.66%, 23.36%, 21.30% |
| JSPI | N/A · native-direct bypass | Playback passed via native-direct; requested remux runtime was not exercised. CPU not applicable to this runtime. |
| Asyncify | N/A · native-direct bypass | Playback passed via native-direct; requested remux runtime was not exercised. CPU not applicable to this runtime. |

## Row 3: Dual-audio H.264 + AAC + AC-3 stereo / MKV

[Correctness](../results/head-to-head/backlog-03-h264-dual-audio-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-03-h264-dual-audio-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 23.5% CPU · default track | All bounded playback checks passed; CPU rounds: 23.60%, 23.53%, 21.91%; alternate audio-track selection was not exercised |
| JSPI | 🟢 (Pass) · CPU pending | All bounded playback checks passed; observed routes: native-direct, native-transcode |
| Asyncify | 🟢 (Pass) · CPU pending | All bounded playback checks passed; observed routes: native-direct, native-transcode |

## Row 4: H.264 + PCM24 / MKV

[Correctness](../results/head-to-head/backlog-04-pcm-mkv-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-04-pcm-mkv-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 17.2% CPU | All bounded playback checks passed; CPU rounds: 8.32%, 17.19%, 23.02% |
| JSPI | N/A · native-direct bypass | Playback passed via native-direct; requested remux runtime was not exercised. CPU not applicable to this runtime.; observed routes: native-direct |
| Asyncify | N/A · native-direct bypass | Playback passed via native-direct; requested remux runtime was not exercised. CPU not applicable to this runtime.; observed routes: native-direct |
| Movi | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Presentation cadence outside declared frame budget; Error: Presentation cadence outside declared frame budget |

## Row 1: H.264 + AAC / MP4 — Forced remux reference

[Correctness](../results/head-to-head/backlog-forced-01-aac-mp4-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-forced-01-aac-mp4-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| JSPI | 🟢 (Pass) · 17.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.47%, 17.08%, 16.74% |
| Asyncify | 🟢 (Pass) · 17.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.05%, 15.95%, 17.46% |

## Row 2: H.264 + AAC / MKV — Forced remux reference

[Correctness](../results/head-to-head/backlog-forced-02-aac-mkv-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-forced-02-aac-mkv-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| JSPI | 🟢 (Pass) · 16.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 16.54%, 16.73%, 16.53%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 17.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.23%, 16.41%, 17.10%; CPU route: native-remux |

## Row 3: Dual-audio H.264 + AAC + AC-3 stereo / MKV — Forced remux reference

[Correctness](../results/head-to-head/backlog-forced-03-h264-dual-audio-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-forced-03-h264-dual-audio-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| JSPI | 🟢 (Pass) · 17.8% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux, native-transcode; CPU rounds: 16.68%, 17.94%, 17.82%; CPU route: native-remux; CPU uses the initial aac track |
| Asyncify | 🟢 (Pass) · 17.2% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux, native-transcode; CPU rounds: 17.22%, 14.70%, 17.31%; CPU route: native-remux; CPU uses the initial aac track |

## Row 4: H.264 + PCM24 / MKV — Forced remux reference

[Correctness](../results/head-to-head/backlog-forced-04-pcm-mkv-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-forced-04-pcm-mkv-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| JSPI | 🟢 (Pass) · 19.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 17.86%, 19.64%, 19.42%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 18.2% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 19.30%, 18.17%, 18.15%; CPU route: native-transcode |

## Row 5: H.264 + PCM24 / MKV + ASS

[Correctness](../results/head-to-head/backlog-05-pcm-ass-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-05-pcm-ass-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Native | 🟢 (Pass) · CPU withheld · host libass | All bounded playback checks passed; CPU withheld: Error: Presentation cadence outside declared frame budget; external ASS uses the documented host libass integration |
| Video.js | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| JSPI | 🔴 (Fail) · forced-remux ref | No qualified route: adapted file audio with external captions or manifests is not qualified |
| Asyncify | 🔴 (Fail) · forced-remux ref | No qualified route: adapted file audio with external captions or manifests is not qualified |
| Software | 🟢 (Pass) · 26.6% CPU | All bounded playback checks passed; CPU rounds: 26.59%, 9.77%, 36.26%; CPU route: software |

## Row 6: H.264 + AAC 5.1 / MP4

[Correctness](../results/head-to-head/backlog-06-h264-aac51-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-06-h264-aac51-screened-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟡 Screened* · 6.1% CPU | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; CPU rounds: 6.13%, 5.43%, 6.06%; CPU route: native-direct |
| JSPI | 🟡 Screened* · 4.9% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-remux; CPU rounds: 4.89%, 5.30%, 4.87%; CPU route: native-remux |
| Asyncify | 🟡 Screened* · 4.9% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-remux; CPU rounds: 4.94%, 4.88%, 4.98%; CPU route: native-remux |

## Row 7: H.264 + MP3 stereo / MP4

[Correctness](../results/head-to-head/backlog-07-h264-mp3-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-07-h264-mp3-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 9.0% CPU | All bounded playback checks passed; CPU rounds: 6.01%, 8.96%, 21.66%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 12.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 6.28%, 12.05%, 18.43%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 14.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 7.11%, 14.12%, 17.75%; CPU route: native-transcode |

MediaBunny row 8 harness correction: the [first screen](../results/head-to-head/backlog-08-h264-ac3-mediabunny-correctness/summary.json) sampled a letterboxed canvas as if video filled it, falsely rejecting its green timeline marker. The corrected screen samples the observed video draw rectangle. The original attempt is retained as harness evidence and does not establish a player failure. Temporary blob scripts are matched by content hash across contexts.

## Row 8: H.264 + AC-3 5.1 / MKV

[Correctness](../results/head-to-head/backlog-08-h264-ac3-correctness/summary.json) · [Supplement 1](../results/head-to-head/backlog-08-h264-ac3-mediabunny-video-region-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-08-h264-ac3-screened-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟡 Screened* · 9.1% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-transcode; CPU rounds: 17.25%, 9.12%, 5.31%; CPU route: native-transcode |
| Asyncify | 🟡 Screened* · 12.5% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-transcode; CPU rounds: 17.53%, 12.47%, 5.55%; CPU route: native-transcode |
| AVPlayer | 🟡 Screened* · 21.8% CPU | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; CPU rounds: 14.80%, 22.59%, 21.77%; CPU route: custom |
| MediaBunny | — Harness error; superseded by corrected screen below | CSS object-fit letterboxing was not accounted for in the marker sample; this does not establish a player failure |

The second MediaBunny row 8 [video-region attempt](../results/head-to-head/backlog-08-h264-ac3-mediabunny-video-region-correctness/summary.json) still omitted CSS `object-fit: contain`. Direct browser inspection confirmed a 320×180 canvas displayed inside a 944×239 element. The final screen accounts for both the drawing rectangle and the centered CSS content box; both earlier marker failures are invalid harness outcomes.

## Row 8: H.264 + AC-3 5.1 / MKV — Corrected MediaBunny canvas geometry

[Correctness](../results/head-to-head/backlog-08-h264-ac3-mediabunny-object-fit-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-08-h264-ac3-mediabunny-object-fit-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| MediaBunny | 🟡 Screened* · 35.5% CPU | Published example with local File input; no library-wide compatibility claim; No playback-rate control or independently observable decoder/AudioContext teardown API; No discrete channel, lossless, spatial-audio, HDR or Dolby Vision fidelity qualification; Canvas draw submissions are not physical presentation or decoder drop counters; CPU rounds: 31.14%, 35.51%, 35.60% |

## Row 9: H.264 + E-AC-3 5.1 / MKV

[Correctness](../results/head-to-head/backlog-09-h264-eac3-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-09-h264-eac3-screened-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟡 Screened* · 18.4% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-transcode; CPU rounds: 18.44%, 19.69%, 17.78%; CPU route: native-transcode |
| Asyncify | 🟡 Screened* · 18.6% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-transcode; CPU rounds: 18.56%, 20.45%, 18.40%; CPU route: native-transcode |

## Row 10: H.264 + DTS core 5.1 / MKV

[Correctness](../results/head-to-head/backlog-10-h264-dts-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-10-h264-dts-screened-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟡 Screened* · 19.3% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-transcode; CPU rounds: 19.42%, 18.54%, 19.30%; CPU route: native-transcode |
| Asyncify | 🟡 Screened* · 19.6% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-transcode; CPU rounds: 21.09%, 19.57%, 8.98%; CPU route: native-transcode |

## Row 11: H.264 + AC-3 stereo / MKV

[Correctness](../results/head-to-head/backlog-11-h264-ac3-stereo-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |

## Row 12: H.264 + E-AC-3 stereo / MKV

[Correctness](../results/head-to-head/backlog-12-h264-eac3-stereo-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-12-h264-eac3-stereo-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · 17.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 17.02%, 17.76%, 16.40%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 17.7% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 17.20%, 18.21%, 17.71%; CPU route: native-transcode |

## Row 13: H.264 + DTS core stereo / MKV

[Correctness](../results/head-to-head/backlog-13-h264-dts-stereo-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-13-h264-dts-stereo-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · 17.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 17.86%, 16.85%, 18.26%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 18.3% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 19.36%, 18.29%, 17.10%; CPU route: native-transcode |

## Row 14: H.264 + FLAC stereo / MKV

[Correctness](../results/head-to-head/backlog-14-h264-flac-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-14-h264-flac-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Presentation cadence outside declared frame budget |
| JSPI | 🟢 (Pass) · 18.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 18.49%, 16.11%, 18.00%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 18.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.09%, 18.60%, 18.66%; CPU route: native-remux |

## Row 15: H.264 + FLAC 5.1 / MKV

[Correctness](../results/head-to-head/backlog-15-h264-flac51-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-15-h264-flac51-screened-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟡 Screened* · 23.5% CPU | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; CPU rounds: 20.77%, 23.48%, 23.75%; CPU route: native-direct |
| JSPI | 🟡 Screened* · 19.0% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-remux; CPU rounds: 20.27%, 18.97%, 18.97%; CPU route: native-remux |
| Asyncify | 🟡 Screened* · 18.2% CPU · forced-remux ref | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; observed routes: native-remux; CPU rounds: 17.89%, 18.22%, 19.19%; CPU route: native-remux |

## Row 16: H.264 + Opus stereo / MKV

[Correctness](../results/head-to-head/backlog-16-h264-opus-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-16-h264-opus-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 25.0% CPU | All bounded playback checks passed; CPU rounds: 25.01%, 25.02%, 23.37%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 16.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 15.58%, 18.84%, 16.52%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 17.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 18.55%, 17.63%, 16.53%; CPU route: native-remux |

## Row 17: H.264 + PCM16 stereo / MKV

[Correctness](../results/head-to-head/backlog-17-h264-pcm16-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-17-h264-pcm16-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 21.5% CPU | All bounded playback checks passed; CPU rounds: 21.48%, 21.15%, 21.98%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 17.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 18.96%, 16.22%, 17.49%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 18.7% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 17.46%, 19.23%, 18.70%; CPU route: native-transcode |

## Row 18: H.264 + PCM24 5.1 / MKV

[Correctness](../results/head-to-head/backlog-18-h264-pcm51-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-18-h264-pcm51-screened-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟡 Screened* · 22.9% CPU | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.; CPU rounds: 22.91%, 23.41%, 21.03%; CPU route: native-direct |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: native-transcode: PlayerError: Error: FFmpeg error -1094995529: Decoded multichannel speaker layout is unavailable |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: native-transcode: PlayerError: Error: FFmpeg error -1094995529: Decoded multichannel speaker layout is unavailable |

## Row 19: HEVC Main 8-bit + AAC / MP4 (hvc1)

[Correctness](../results/head-to-head/backlog-19-hevc-hvc1-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-19-hevc-hvc1-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Presentation cadence outside declared frame budget |
| JSPI | 🟢 (Pass) · 16.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 16.52%, 15.97%, 15.94%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 17.2% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.59%, 17.19%, 15.84%; CPU route: native-remux |

## Row 20: HEVC Main 8-bit + AAC / MP4 (hev1)

[Correctness](../results/head-to-head/backlog-20-hevc-hev1-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-20-hevc-hev1-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 23.0% CPU | All bounded playback checks passed; CPU rounds: 23.01%, 21.89%, 24.06%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 17.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 16.61%, 17.56%, 17.45%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 15.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 10.10%, 15.89%, 17.88%; CPU route: native-remux |

## Row 21: HEVC Main 10-bit SDR + AAC / MP4

[Correctness](../results/head-to-head/backlog-21-hevc10-aac-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-21-hevc10-aac-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 25.1% CPU | All bounded playback checks passed; CPU rounds: 25.13%, 20.72%, 26.56%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 18.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 18.54%, 7.50%, 18.47%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 18.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 18.38%, 19.78%, 18.93%; CPU route: native-remux |

## Row 22: HEVC Main 10 4:2:2 + AAC / MKV

[Correctness](../results/head-to-head/backlog-22-hevc422-aac-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-22-hevc422-aac-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 25.2% CPU | All bounded playback checks passed; CPU rounds: 24.19%, 25.17%, 27.22%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 19.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 18.95%, 19.02%, 5.48%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 19.2% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 19.04%, 19.21%, 20.25%; CPU route: native-remux |
| Movi | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Playback stalled or reached EOF during measurement |

## Row 23: HEVC Main 10-bit SDR + AC-3 / MKV

[Correctness](../results/head-to-head/backlog-23-hevc10-ac3-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-23-hevc10-ac3-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · 20.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 20.68%, 20.54%, 19.72%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 19.7% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 19.83%, 19.62%, 19.67%; CPU route: native-transcode |

## Row 24: HEVC Main 10-bit SDR + E-AC-3 / MKV

[Correctness](../results/head-to-head/backlog-24-hevc10-eac3-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-24-hevc10-eac3-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · 20.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 20.87%, 21.05%, 20.14%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 19.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 19.91%, 18.82%, 21.05%; CPU route: native-transcode |

## Row 25: HEVC Main 10-bit SDR + DTS core / MKV

[Correctness](../results/head-to-head/backlog-25-hevc10-dts-correctness/summary.json) · [Supplement 1](../results/head-to-head/backlog-25-hevc10-dts-mediabunny-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-25-hevc10-dts-cpu/summary.json) · [CPU 2](../results/head-to-head/backlog-25-hevc10-dts-mediabunny-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · 20.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 20.42%, 18.04%, 20.05%; CPU route: native-transcode |
| Asyncify | 🟢 (Pass) · 21.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode; CPU rounds: 20.97%, 19.00%, 21.51%; CPU route: native-transcode |
| Software | 🟢 (Pass) · 34.5% CPU | All bounded playback checks passed; CPU rounds: 36.78%, 33.87%, 34.46%; CPU route: software |
| AVPlayer | 🟢 (Pass) · 41.4% CPU | All bounded playback checks passed; CPU rounds: 39.38%, 42.10%, 41.40%; CPU route: custom |
| MediaBunny | 🟡 Screened* · 44.1% CPU | Published example with local File input; no library-wide compatibility claim; No playback-rate control or independently observable decoder/AudioContext teardown API; No discrete channel, lossless, spatial-audio, HDR or Dolby Vision fidelity qualification; Canvas draw submissions are not physical presentation or decoder drop counters; CPU rounds: 42.13%, 44.09%, 44.46% |

## Row 26: AV1 8-bit + AAC / MP4

[Correctness](../results/head-to-head/backlog-26-av1-aac-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-26-av1-aac-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 21.8% CPU | All bounded playback checks passed; CPU rounds: 21.76%, 20.50%, 23.50%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 14.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 14.05%, 14.79%, 13.97%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 15.3% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 15.28%, 15.98%, 13.53%; CPU route: native-remux |

## Row 27: AV1 10-bit SDR + Opus / MKV

[Correctness](../results/head-to-head/backlog-27-av110-opus-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-27-av110-opus-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 25.3% CPU | All bounded playback checks passed; CPU rounds: 25.34%, 25.54%, 24.98%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 18.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 19.30%, 17.91%, 18.63%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 18.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 18.40%, 20.05%, 18.56%; CPU route: native-remux |

## Row 28: AV1 + Opus / WebM

[Correctness](../results/head-to-head/backlog-28-av1-webm-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-28-av1-webm-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 24.0% CPU | All bounded playback checks passed; CPU rounds: 23.68%, 24.01%, 24.00%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 16.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 16.64%, 16.36%, 15.33%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 15.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 16.31%, 15.61%, 15.12%; CPU route: native-remux |

## Row 29: VP9 8-bit + Opus / WebM

[Correctness](../results/head-to-head/backlog-29-vp9-opus-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-29-vp9-opus-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 22.6% CPU | All bounded playback checks passed; CPU rounds: 24.32%, 22.46%, 22.58%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 17.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.48%, 16.99%, 18.02%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 17.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.51%, 16.65%, 18.27%; CPU route: native-remux |

## Row 30: VP9 10-bit SDR + Opus / WebM

[Correctness](../results/head-to-head/backlog-30-vp910-opus-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-30-vp910-opus-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 25.5% CPU | All bounded playback checks passed; CPU rounds: 25.53%, 25.80%, 25.51%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 19.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 19.21%, 19.62%, 20.15%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 20.3% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 20.67%, 18.16%, 20.26%; CPU route: native-remux |

## Row 31: VP8 + Vorbis / WebM

[Correctness](../results/head-to-head/backlog-31-vp8-vorbis-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-31-vp8-vorbis-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 22.1% CPU | All bounded playback checks passed; CPU rounds: 22.08%, 22.67%, 20.74%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 14.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 14.03%, 13.71%, 14.48%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 14.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 13.78%, 14.05%, 14.65%; CPU route: native-remux |

## Row 32: H.264 + AAC / MPEG-TS

[Correctness](../results/head-to-head/backlog-32-h264-ts-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: open deadline |

## Row 33: MPEG-2 video + AC-3 / MPEG-TS

[Correctness](../results/head-to-head/backlog-33-mpeg2-ac3-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: open deadline |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe packet-copy AC3 initialization is not qualified; use direc… |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe packet-copy AC3 initialization is not qualified; use direc… |

## Row 34: Interlaced MPEG-2 + AC-3 stereo / MPEG-TS

[Correctness](../results/head-to-head/backlog-34-mpeg2-interlaced-ac3-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: open deadline |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe packet-copy AC3 initialization is not qualified; use direc… |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe packet-copy AC3 initialization is not qualified; use direc… |

## Row 35: MPEG-2 video + MP2 / MPEG-PS

[Correctness](../results/head-to-head/backlog-35-mpeg2-mp2-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: open deadline |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe has no packet-copy video construction contract for mpeg2vi… |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe has no packet-copy video construction contract for mpeg2vi… |

## Row 36: MPEG-4 Part 2 + MP3 / AVI

[Correctness](../results/head-to-head/backlog-36-mpeg4-mp3-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: open deadline |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe has no packet-copy video construction contract for mpeg4; … |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe has no packet-copy video construction contract for mpeg4; … |

## Row 37: ProRes + PCM / MOV

[Correctness](../results/head-to-head/backlog-37-prores-pcm-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: open deadline |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: native-video-mpv-audio: Error: FFmpeg error -1094995529: Video codec has no browser remux packet contract |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: native-video-mpv-audio: Error: FFmpeg error -1094995529: Video codec has no browser remux packet contract |

## Row 38: H.264 + AAC / fragmented MP4 (single file)

[Correctness](../results/head-to-head/backlog-38-h264-fmp4-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-38-h264-fmp4-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 23.9% CPU | All bounded playback checks passed; CPU rounds: 23.94%, 20.98%, 23.94%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 14.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 14.42%, 14.87%, 16.85%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 16.8% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 16.82%, 16.80%, 15.41%; CPU route: native-remux |

## Row 39: H.264 video-only / MP4

[Correctness](../results/head-to-head/backlog-39-h264-silent-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-39-h264-silent-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 18.9% CPU | All bounded playback checks passed; CPU rounds: 18.54%, 21.00%, 18.92%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 14.7% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 14.60%, 15.05%, 14.75%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 14.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 13.97%, 14.29%, 13.91%; CPU route: native-remux |

## Row 40: H.264 High 10 + AAC / MKV

[Correctness](../results/head-to-head/backlog-40-h264-high10-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-40-h264-high10-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 26.5% CPU | All bounded playback checks passed; CPU rounds: 26.52%, 24.89%, 26.56%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 17.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.40%, 18.00%, 5.26%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 16.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 19.40%, 16.12%, 15.96%; CPU route: native-remux |

## Row 41: MPEG-2 video-only / MPEG-TS

[Correctness](../results/head-to-head/backlog-41-mpeg2-video-only-correctness/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: open deadline |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe TS timestamp-repair construction requires H264 with option… |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Demuxe TS timestamp-repair construction requires H264 with option… |

Forced Asyncify companion references select the manifest/hash/export-verified Asyncify mpv binary and require non-isolated ArrayBuffer memory. The companion worker can still expose JSPI APIs; these references do not qualify execution in a JSPI-less browser. The remux worker continues to require both JSPI APIs unavailable. Row 42 retains the initial stricter companion-gate rejection as harness evidence and replaces only that case with a corrected reference screen and matching CPU campaign.

## Row 42: H.264 + AAC + embedded SRT / MKV

[Correctness](../results/head-to-head/backlog-42-h264-srt-correctness/summary.json) · [Corrected case 1](../results/head-to-head/backlog-42-h264-srt-asyncify-reference-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-42-h264-srt-cpu/summary.json) · [CPU 2](../results/head-to-head/backlog-42-h264-srt-asyncify-reference-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| JSPI | 🟢 (Pass) · 5.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 17.92%, 5.91%, 5.21%; CPU route: native-remux-mpv |
| Asyncify | 🟢 (Pass) · 8.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 8.60%, 8.65%, 8.74%; CPU route: native-remux-mpv; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |

## Row 43: H.264 + AAC + external WebVTT / MP4

[Correctness](../results/head-to-head/backlog-43-h264-vtt-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-43-h264-vtt-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 11.1% CPU | All bounded playback checks passed; CPU rounds: 21.60%, 6.44%, 11.15%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 17.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 17.10%, 17.99%, 8.27%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 4.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 14.12%, 4.38%, 4.59%; CPU route: native-remux |

## Row 44: H.264 + AAC + embedded mov_text / MP4

[Correctness](../results/head-to-head/backlog-44-h264-movtext-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-44-h264-movtext-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| JSPI | 🟢 (Pass) · 5.3% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 5.82%, 5.28%, 5.21%; CPU route: native-remux-mpv |
| Asyncify | 🟢 (Pass) · 5.7% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 5.61%, 5.70%, 6.12%; CPU route: native-remux-mpv; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |

## Row 45: H.264 + AAC + styled ASS / MKV

[Correctness](../results/head-to-head/backlog-45-h264-ass-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-45-h264-ass-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| JSPI | 🟢 (Pass) · 13.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 13.47%, 16.94%, 12.59%; CPU route: native-remux-mpv |
| Asyncify | 🟢 (Pass) · 17.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 17.12%, 19.43%, 15.21%; CPU route: native-remux-mpv; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |

## Row 46: H.264 + AC-3 stereo + ASS / MKV

[Correctness](../results/head-to-head/backlog-46-h264-ac3-ass-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-46-h264-ac3-ass-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · CPU withheld · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode-mpv; CPU withheld: Error: Presentation cadence outside declared frame budget |
| Asyncify | 🟢 (Pass) · CPU withheld · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode-mpv; CPU withheld: Error: Presentation cadence outside declared frame budget; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |

## Row 47: HEVC + AC-3 + PGS / MKV

[Correctness](../results/head-to-head/backlog-47-hevc-pgs-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-47-hevc-pgs-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · 6.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode-mpv; CPU rounds: 23.15%, 5.81%, 6.09%; CPU route: native-transcode-mpv |
| Asyncify | 🟢 (Pass) · 7.0% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode-mpv; CPU rounds: 6.98%, 7.00%, 6.60%; CPU route: native-transcode-mpv; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |

## Row 48: H.264 + AC-3 + VobSub / MKV

[Correctness](../results/head-to-head/backlog-48-h264-vobsub-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-48-h264-vobsub-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Marked left/right audio missing or incorrect |
| JSPI | 🟢 (Pass) · CPU withheld · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode-mpv; CPU withheld: Error: Presentation cadence outside declared frame budget |
| Asyncify | 🟢 (Pass) · 6.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-transcode-mpv; CPU rounds: 6.42%, 6.14%, 14.45%; CPU route: native-transcode-mpv; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |

## Row 49: H.264 + AAC + PGS / MKV (subtitle isolation)

[Correctness](../results/head-to-head/backlog-49-h264-aac-pgs-isolation-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-49-h264-aac-pgs-isolation-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| JSPI | 🟢 (Pass) · 17.5% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 4.94%, 17.45%, 19.21%; CPU route: native-remux-mpv |
| Asyncify | 🟢 (Pass) · 19.8% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 19.96%, 19.80%, 18.30%; CPU route: native-remux-mpv; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |
| Software | 🟢 (Pass) · 35.0% CPU | All bounded playback checks passed; CPU rounds: 37.18%, 35.02%, 33.34%; CPU route: software |

## Row 50: H.264 + AAC + VobSub / MKV (subtitle isolation)

[Correctness](../results/head-to-head/backlog-50-h264-aac-vobsub-isolation-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-50-h264-aac-vobsub-isolation-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| JSPI | 🟢 (Pass) · 18.2% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 18.16%, 17.97%, 19.51%; CPU route: native-remux-mpv |
| Asyncify | 🟢 (Pass) · 19.7% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux-mpv; CPU rounds: 19.73%, 19.26%, 19.78%; CPU route: native-remux-mpv; companion mpv uses the verified Asyncify build with JSPI APIs still available; JSPI-less companion execution is not qualified |

## Row 51: AAC audio-only / M4A

The original Video.js attempt received `application/octet-stream` because the adapter omitted `.m4a` from its MIME map. This harness error is retained in the original archive and superseded only for Video.js by the corrected `audio/mp4` screen and matching CPU campaign. Other lanes retain their original matching correctness and CPU evidence.

[Correctness](../results/head-to-head/backlog-51-audio-aac-correctness/summary.json) · [Corrected case 1](../results/head-to-head/backlog-51-audio-aac-videojs-mime-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-51-audio-aac-cpu/summary.json) · [CPU 2](../results/head-to-head/backlog-51-audio-aac-videojs-mime-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 11.3% CPU | All bounded playback checks passed; CPU rounds: 11.25%, 11.36%, 11.27%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 5.8% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 6.23%, 5.52%, 5.79%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 5.9% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 5.86%, 5.53%, 6.38%; CPU route: native-remux |
| Movi | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement |

## Row 52: MP3 audio-only / MP3

[Correctness](../results/head-to-head/backlog-52-audio-mp3-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-52-audio-mp3-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 11.5% CPU | All bounded playback checks passed; CPU rounds: 11.47%, 10.18%, 12.60%; CPU route: native-direct |
| JSPI | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Browser isTypeSupported rejects selected audio mp3 for audio/mp4;… |
| Asyncify | 🔴 (Fail) · forced-remux ref | page.evaluate: PlayerError: No playback route satisfied the source: mpv subtitle service requires inspected finite file subtitles and available assets; This source policy requires controlled remux transport; mpv subtitle service requires inspected finite file subtitles and available assets; Browser isTypeSupported rejects selected audio mp3 for audio/mp4;… |
| Movi | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement |

## Row 53: FLAC audio-only / FLAC

[Correctness](../results/head-to-head/backlog-53-audio-flac-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-53-audio-flac-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 10.1% CPU | All bounded playback checks passed; CPU rounds: 11.35%, 10.11%, 9.83%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 7.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 7.40%, 8.08%, 7.32%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 8.1% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 8.19%, 8.09%, 7.46%; CPU route: native-remux |
| Movi | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement |

## Row 54: Opus audio-only / Ogg

[Correctness](../results/head-to-head/backlog-54-audio-opus-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-54-audio-opus-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Video.js | 🟢 (Pass) · 12.7% CPU | All bounded playback checks passed; CPU rounds: 12.72%, 12.69%, 11.42%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 6.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 6.40%, 6.45%, 6.53%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 6.4% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 6.11%, 6.97%, 6.41%; CPU route: native-remux |
| Movi | 🟢 (Pass) · CPU withheld | All bounded playback checks passed; CPU withheld: Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement; Error: Playback stalled or reached EOF during measurement |

## Row 55: Vorbis audio-only / Ogg

[Correctness](../results/head-to-head/backlog-55-audio-vorbis-correctness/summary.json) · [Supplement 1](../results/head-to-head/backlog-55-audio-vorbis-mediabunny-correctness/summary.json) · [CPU 1](../results/head-to-head/backlog-55-audio-vorbis-cpu/summary.json) · [CPU 2](../results/head-to-head/backlog-55-audio-vorbis-mediabunny-cpu/summary.json)

| Lane | Result | Observation |
| --- | --- | --- |
| Native | 🟢 (Pass) · 2.3% CPU | All bounded playback checks passed; CPU rounds: 2.29%, 2.16%, 2.30%; CPU route: native-direct |
| Video.js | 🟢 (Pass) · 11.1% CPU | All bounded playback checks passed; CPU rounds: 11.06%, 10.99%, 11.32%; CPU route: native-direct |
| JSPI | 🟢 (Pass) · 5.7% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 5.66%, 5.49%, 6.14%; CPU route: native-remux |
| Asyncify | 🟢 (Pass) · 5.6% CPU · forced-remux ref | All bounded playback checks passed; observed routes: native-remux; CPU rounds: 5.60%, 5.45%, 5.66%; CPU route: native-remux |
| Software | 🟢 (Pass) · 10.1% CPU | All bounded playback checks passed; CPU rounds: 10.07%, 9.89%, 10.54%; CPU route: software |
| MediaBunny | 🟡 Screened* · 45.9% CPU | Published example with local File input; no library-wide compatibility claim; No playback-rate control or independently observable decoder/AudioContext teardown API; No discrete channel, lossless, spatial-audio, HDR or Dolby Vision fidelity qualification; Canvas draw submissions are not physical presentation or decoder drop counters; CPU rounds: 46.88%, 45.89%, 41.09% |
