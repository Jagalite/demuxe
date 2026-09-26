<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# VP9 10-bit SDR + Opus / WebM row

The 36-second fixture is `vp910-opus/index.webm`, SHA-256 `dcf96df8ceb7dc1946f7a15df4e72038fe2433467302a8c7193c6beb894ecda1`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-vp910-opus-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto and Demuxe Software through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. AVPlayer failed while analyzing the stream (`ret: -2097152`). The archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the four viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-vp910-opus-cpu-20260926/result.json) and [request log](../official-player-row-vp910-opus-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 17.26% | 16.63% | 15.99% | **16.63%** | Accepted; descending windows |
| Demuxe Auto (`native-direct`, URL) | 17.13% | 17.14% | 17.53% | **17.14%** | Accepted |
| Demuxe Software | 36.35% | 36.76% | 36.30% | **36.35%** | Accepted |
| MediaBunny official example | 35.32% | 33.91% | 34.71% | **34.71%** | Screened; fewer lifecycle controls |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.78%, 1.61% and 1.59%. The whole-browser measurements include different audio and presentation paths; they do not isolate VP9 demux or decoder costs. Plain video declined across rounds, and the one-launch design does not establish a rank between its and Auto's close medians. Movi and AVPlayer received no CPU windows because their correctness screens failed.
