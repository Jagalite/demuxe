<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC / fragmented MP4 (single file) row

The 36-second fixture is `h264-fmp4/index.mp4`, SHA-256 `076643bfb51176a26791f01acd4ec8998a953c00436aa10416a8fb8e9a790ae4`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-fmp4-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto and Demuxe Software through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF; AVPlayer hit its open deadline. The archive passed integrity verification, preserving both failed outcomes. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the four viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-fmp4-cpu-20260926/result.json) and [request log](../official-player-row-h264-fmp4-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 13.47% | 13.62% | 13.73% | **13.62%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 13.97% | 13.56% | 14.94% | **13.97%** | Accepted |
| Demuxe Software | 33.86% | 36.27% | 35.11% | **35.11%** | Accepted |
| MediaBunny official example | 32.25% | 33.12% | 35.46% | **33.12%** | Screened |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.64%, 1.69% and 1.50%. The whole-browser measurements reflect distinct playback paths; they do not isolate fragmentation handling or demux overhead. The near-native plain-video and Auto medians are consistent with Auto's verified `native-direct` route in this row. Movi and AVPlayer received no CPU windows because their correctness screens failed.
