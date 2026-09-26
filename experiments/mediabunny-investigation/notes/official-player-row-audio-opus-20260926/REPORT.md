<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Opus audio-only / Ogg row

The 36-second fixture is `audio-opus/index.ogg` from frozen `assets-row-refresh-20260926-01`. Maintained players used its local URL; the published MediaBunny example received the same bytes as a local `File`. Browser: headed Chrome 153.0.8010.53 on macOS. The exact fixture hash is retained in both raw results.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-audio-opus-correctness-20260926-01/REPORT.md) passed browser audio, Demuxe Auto, Demuxe Software and Movi through marked stereo output, pause/resume, 1.25× playback, three seeks, EOF and cleanup. AVPlayer failed the `seek-10` position deadline. The archive passed integrity verification. Auto selected `native-direct`.

The [published MediaBunny player screen](result.json) passed marked stereo output, timeline progress, pause/resume, seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× control or independently observable cleanup.

## One-browser-per-row CPU

The [raw CPU run](../official-player-row-audio-opus-cpu-20260926/result.json) measured the five correctness-passing or screened cells in one headed Chrome launch across three rotating rounds, with fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is whole-Chrome process-tree percent of one core, without idle subtraction.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Browser audio | 3.59% | 3.35% | 3.24% | **3.35%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 4.23% | 4.17% | 3.78% | **4.17%** | Accepted |
| Demuxe Software | 11.68% | 11.13% | 11.87% | **11.68%** | Accepted |
| Movi default | 15.81% | 15.21% | 15.73% | — | Rejected: timeline advanced only about 1.5 seconds per 20-second window |
| MediaBunny official example | 42.70% | 45.80% | 47.62% | **45.80%** | Screened |

Idle CPU was 1.82%, 1.47% and 1.74%. Movi's separate correctness pass remains valid, but its CPU cell is withheld. These whole-player figures do not isolate Opus decoding cost, and MediaBunny's local File input differs from the maintained players' local URL input.
