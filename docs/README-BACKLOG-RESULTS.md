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
