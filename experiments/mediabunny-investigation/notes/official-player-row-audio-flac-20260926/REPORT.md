<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FLAC audio-only / FLAC row

The 36-second fixture is `audio-flac/index.flac`, SHA-256 `e311de41a595b87e571aa7707bd243cdd95e4359f7578c1844a21a0b3e9369d4`. Maintained players used frozen `assets-row-refresh-20260926-01` local URL input; the published MediaBunny example received the same bytes as a local `File`. Browser: headed Chrome 153.0.8010.53 on macOS.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-audio-flac-correctness-20260926-01/REPORT.md) passed browser audio, Demuxe Auto, Demuxe Software, Movi and AVPlayer through marked stereo output, pause/resume, 1.25× playback, three seeks, EOF and cleanup. The archive passed integrity verification. Auto selected `native-direct`.

The [published MediaBunny player screen](result.json) passed marked stereo output, timeline progress, pause/resume, seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× control or independently observable cleanup.

## One-browser-per-row CPU

The [raw CPU run](../official-player-row-audio-flac-cpu-20260926/result.json) measured all six correctness-passing or screened cells in one headed Chrome launch across three rotating rounds, with fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is whole-Chrome process-tree percent of one core, without idle subtraction.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Browser audio | 2.35% | 2.06% | 2.05% | **2.06%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 2.99% | 3.05% | 2.84% | **2.99%** | Accepted |
| Demuxe Software | 9.81% | 10.41% | 10.49% | **10.41%** | Accepted |
| Movi default | 15.85% | 14.42% | 14.48% | — | Rejected: timeline advanced only about 1.5 seconds per 20-second window |
| AVPlayer default | 7.82% | 8.03% | 7.97% | **7.97%** | Accepted |
| MediaBunny official example | 41.80% | 43.11% | 42.88% | **42.88%** | Screened |

Idle CPU was 2.03%, 1.44% and 1.49%. Movi's separate correctness pass remains valid, but its CPU cell is withheld. The different players use different audio paths and input APIs, so these whole-player figures do not isolate FLAC decoding cost.
