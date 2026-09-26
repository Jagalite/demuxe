<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC + external WebVTT / MP4 row

The 36-second fixture uses `h264-vtt/index.mp4` and its required `captions.vtt`; the MP4 SHA-256 is `281e8a213c4a2371c942d4b4aa880646e4425e644b64389e2eb7644bc17df11b`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL inputs; MediaBunny received the same MP4 bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-vtt-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto and Demuxe Software through marked video, stereo audio, supplied WebVTT subtitle text, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi lacked the required subtitle text; AVPlayer failed stream analysis on open. The archive passed integrity verification, preserving both failed outcomes. Auto selected `native-direct` for the local URL.

The [published MediaBunny player screen](result.json) opened and played the MP4, but its controls offered no way to supply the required external WebVTT. The captured control inventory and [player image](h264-vtt-subtitle.png) retain this limitation. MediaBunny is **Failed** for the full row and receives no CPU value.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the three correctness-passing cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-vtt-cpu-20260926/result.json) and [request log](../official-player-row-h264-vtt-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video with WebVTT | 13.71% | 14.11% | 13.32% | **13.71%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 14.28% | 14.89% | 14.28% | **14.28%** | Accepted |
| Demuxe Software | 36.07% | 34.18% | 35.84% | **35.84%** | Accepted |

All nine windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 2.01%, 1.76% and 1.61%. The near-native plain-video and Auto medians are consistent with the verified `native-direct` route. Whole-browser totals do not isolate subtitle rendering costs. Movi, AVPlayer and MediaBunny received no CPU windows because they failed the full correctness requirement.
