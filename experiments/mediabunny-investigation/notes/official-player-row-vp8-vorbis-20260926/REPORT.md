<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# VP8 + Vorbis / WebM row

The 36-second fixture is `vp8-vorbis/index.webm`, SHA-256 `f4eb14fee4aee38606a7b22bd0a2e74e3fe381b570e97b3f9136da3d2533cccc`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-vp8-vorbis-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-vp8-vorbis-cpu-20260926/result.json) and [request log](../official-player-row-vp8-vorbis-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 13.93% | 13.38% | 13.11% | **13.38%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 14.69% | 14.05% | 14.68% | **14.68%** | Accepted |
| Demuxe Software | 33.82% | 36.33% | 34.80% | **34.80%** | Accepted; 2.51-point range |
| AVPlayer default | 38.25% | 34.73% | 35.58% | **35.58%** | Accepted; 3.52-point range |
| MediaBunny official example | 31.78% | 34.29% | 32.76% | **32.76%** | Screened; 2.51-point range |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.68%, 1.59% and 1.57%. The whole-browser measurements include different audio and presentation paths; they do not isolate VP8 demux or decoder costs. Within-launch spreads and the single browser launch preclude a precise ranking among the close software-presented medians. Movi received no CPU window because its correctness screen failed.
