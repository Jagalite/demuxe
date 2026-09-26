<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# VP9 8-bit + Opus / WebM row

The 36-second fixture is `vp9-opus/index.webm`, SHA-256 `2fe5b8881ee89e11f1a3fa39f2ad7ce234165df30cf60e67641dca4bdba4da1a`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-vp9-opus-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-vp9-opus-cpu-20260926/result.json) and [request log](../official-player-row-vp9-opus-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 13.97% | 13.98% | 13.29% | **13.97%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 14.26% | 14.06% | 13.81% | **14.06%** | Accepted |
| Demuxe Software | 36.61% | 38.56% | 36.00% | **36.61%** | Accepted; 2.56-point range |
| AVPlayer default | 35.27% | 34.86% | 34.79% | **34.86%** | Accepted |
| MediaBunny official example | 34.18% | 35.06% | 33.28% | **34.18%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.73%, 1.61% and 1.59%. The whole-browser measurements include different audio and presentation paths; they do not isolate VP9 demux or decoder costs. Plain video and Auto are effectively tied at this precision, and the one-launch design does not establish a rank among the close software-presented medians. Movi received no CPU window because its correctness screen failed.
