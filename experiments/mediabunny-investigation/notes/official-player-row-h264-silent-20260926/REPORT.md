<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 video-only / MP4 row

The 36-second fixture is `h264-silent/index.mp4`, SHA-256 `5041e3ede65ac662eac6d4c279c3a16404d8defa7af61b08e5a6860f7f436d53`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-silent-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software, Movi and AVPlayer through marked video, intentional silence, pause/resume, 1.25× playback, three seeks, EOF and cleanup. The archive passed integrity verification. Auto selected `native-direct` for the local URL.

The [published MediaBunny player screen](result.json) passed moving marked video, pause/resume, seeks, near-EOF settlement and zero audio starts. It remains **Screened** for rate control and independent cleanup limits. The [experimental qualification script](../../benchmark/official-player-qualification.mjs) and [CPU runner](../../benchmark/official-player-row-cpu.mjs) gained a bounded video-only contract: video progress is required and any audio source starts fail. Audio-bearing fixture checks retain their existing marked-stereo requirements.

## One-browser-per-row CPU

The row runner measured all six viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-silent-cpu-20260926/result.json) and [request log](../official-player-row-h264-silent-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 11.53% | 11.78% | 11.36% | **11.53%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 12.06% | 12.11% | 11.45% | **12.06%** | Accepted |
| Demuxe Software | 31.93% | 31.69% | 33.00% | **31.93%** | Accepted |
| Movi default | 32.05% | 32.86% | 29.69% | **32.05%** | Accepted |
| AVPlayer default | 24.51% | 25.48% | 26.29% | **25.48%** | Accepted |
| MediaBunny official example | 31.76% | 31.80% | 28.90% | **31.76%** | Screened |

All 18 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny's CPU windows had zero audio starts. Idle CPU was 1.65%, 1.57% and 1.27%. The near-native plain-video and Auto medians are consistent with the verified `native-direct` route. Whole-browser results do not isolate demux or decoder costs, and the one-launch Movi and MediaBunny ranges limit close ranking claims.
