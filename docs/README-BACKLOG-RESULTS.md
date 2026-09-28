<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# README backlog row results

Rows are exercised in README order. Existing cells outside each selected gap retain their original campaigns. Video.js 8.24.1 uses its default HTML5/VHS player, local URL input, no codec plugins, and hidden controls. Its public [Player API](https://docs.videojs.com/player) drives the same bounded checks as the other maintained adapters. The pinned package URL and SHA-256 are captured in each asset manifest.

Demuxe uses the frozen September 28 source candidate based on `7f4407d2` plus captured local changes; this is not a clean release qualification. Private engine additions are separately hashed. JSPI/Asyncify run without isolation headers; a direct-playback bypass exercises neither remux runtime. CPU requires matching correctness, three accepted windows, foreground, stable processes, presentation cadence and cleanup. One gated Chrome launch per row uses fresh contexts for each arm; its three rounds do not establish independent-launch reproducibility.

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
