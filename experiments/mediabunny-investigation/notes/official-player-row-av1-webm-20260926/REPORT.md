<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 + Opus / WebM row

The 36-second fixture is `av1-webm/index.webm`, SHA-256 `0576cd053ae74d89ff860cb0eaa4dd8fac3c84f4c8937581eaa2b3cc6e878e84`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-av1-webm-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-av1-webm-cpu-20260926/result.json) and [request log](../official-player-row-av1-webm-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 15.07% | 14.64% | 14.53% | **14.64%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 15.07% | 15.47% | 15.34% | **15.34%** | Accepted |
| Demuxe Software | 36.17% | 36.89% | 35.83% | **36.17%** | Accepted |
| AVPlayer default | 40.03% | 38.34% | 38.31% | **38.34%** | Accepted |
| MediaBunny official example | 33.61% | 34.88% | 34.96% | **34.88%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.51%, 1.61% and 1.51%. The whole-browser measurements include different audio and presentation paths; they do not isolate AV1 demux or decoder costs. Plain video and Auto are close within a one-launch design, so their small median difference is not a player ranking. Movi received no CPU window because its correctness screen failed.
