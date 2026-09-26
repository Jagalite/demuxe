<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 10-bit SDR + Opus / MKV row

The 36-second fixture is `av110-opus/index.mkv`, SHA-256 `4c2193156b29de1e2d1350cce57952668ef93252c2e8e0ec8bbef0fad45f5e05`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-av110-opus-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-av110-opus-cpu-20260926/result.json) and [request log](../official-player-row-av110-opus-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 18.00% | 18.61% | 17.34% | **18.00%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 17.77% | 18.16% | 17.54% | **17.77%** | Accepted |
| Demuxe Software | 36.72% | 37.62% | 37.08% | **37.08%** | Accepted |
| AVPlayer default | 38.50% | 38.53% | 36.99% | **38.50%** | Accepted |
| MediaBunny official example | 35.78% | 36.69% | 36.31% | **36.31%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.93%, 1.60% and 1.60%. The whole-browser measurements include different audio and presentation paths; they do not isolate AV1 demux or decoder costs. Plain video and Auto are close within a one-launch design, so their small median difference is not a player ranking. Movi received no CPU window because its correctness screen failed.
