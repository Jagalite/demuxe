<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC / MPEG-TS row

The 36-second fixture is `h264-ts/index.ts`, SHA-256 `cbec618e3f682859ae0566bf4166c067174a46e7e88265ce78d23f8fa8b4d99c`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-ts-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video could not open the MPEG-TS source (`NotSupportedError`). Movi displayed a stale timeline marker after seeking. The archive passed integrity verification, preserving both failed outcomes. Auto selected `hybrid` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the four viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-ts-cpu-20260926/result.json) and [request log](../official-player-row-h264-ts-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 38.05% | 35.32% | 36.48% | **36.48%** | Accepted |
| Demuxe Software | 34.71% | 37.26% | 36.75% | **36.75%** | Accepted |
| AVPlayer default | 35.42% | 35.20% | 36.71% | **35.42%** | Accepted |
| MediaBunny official example | 34.53% | 34.64% | 34.63% | **34.63%** | Screened |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.62%, 1.65% and 1.61%. The whole-browser measurements include different audio and presentation paths; they do not isolate MPEG-TS demux or decoder costs. Within-launch spreads and a single browser launch do not establish a precise ranking among these close medians. Plain video and Movi received no CPU windows because their correctness screens failed.
