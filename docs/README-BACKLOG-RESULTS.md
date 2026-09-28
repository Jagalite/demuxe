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
