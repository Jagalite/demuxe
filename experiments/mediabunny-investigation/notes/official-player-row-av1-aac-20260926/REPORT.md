<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 8-bit + AAC / MP4 row

The 36-second fixture is `av1-aac/index.mp4`, SHA-256 `872b1baec3b1aa785109144a7163a2edea1ec60fedb51db44ef78ab56988a6cf`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-av1-aac-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-av1-aac-cpu-20260926/result.json) and [request log](../official-player-row-av1-aac-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 14.48% | 13.61% | 12.85% | **13.61%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 14.17% | 14.87% | 13.58% | **14.17%** | Accepted |
| Demuxe Software | 38.81% | 36.61% | 36.72% | **36.72%** | Accepted |
| AVPlayer default | 38.18% | 37.22% | 36.84% | **37.22%** | Accepted |
| MediaBunny official example | 33.54% | 35.48% | 33.43% | **33.54%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.83%, 1.74% and 1.66%. The whole-browser measurements include different audio and presentation paths; they do not isolate AV1 demux or decoder costs. The one-launch design and 1–2-point within-arm spreads require independent confirmation before ranking close player medians. Movi received no CPU window because its correctness screen failed.
