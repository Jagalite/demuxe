<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + Opus stereo / MKV row

The 36-second fixture is `h264-opus/index.mkv`, SHA-256 `a3b082c96df7220d8bb541d57007a07ece48531075e194a3148f33acfd0d7b4b`. Host `ffprobe` identified stereo Opus at 48 kHz. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The official MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

All five players in the [maintained screen](../../../../results/head-to-head/row-h264-opus-correctness-20260926-01/REPORT.md) passed marked video and stereo audio, pause/resume, 1.25× playback, seeks, EOF and cleanup. The archive passed integrity verification. Demuxe Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo output, pause/resume, seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× rate control and cleanup was not independently observable.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured all six cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-opus-cpu-20260926/result.json) and [request log](../official-player-row-h264-opus-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 14.69% | 14.09% | 14.34% | **14.34%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 15.05% | 15.18% | 14.09% | **15.05%** | Accepted |
| Demuxe Software | 35.01% | 33.18% | 36.36% | **35.01%** | Accepted; 3.18-point range |
| Movi default | 28.20% | 30.16% | 33.17% | **30.16%** | Accepted; 4.97-point rise |
| AVPlayer default | 35.33% | 33.26% | 35.47% | **35.33%** | Accepted |
| MediaBunny official example | 35.22% | 35.76% | 33.23% | **35.22%** | Screened; fewer lifecycle controls |

All 18 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 1004–1008 audio-buffer starts per 20-second window. Idle CPU was 1.69%, 1.98% and 1.67%. Movi's rising CPU and the one-launch design preclude a precise rank among close medians. Whole-browser totals include each player's different audio and presentation paths and do not isolate demux or decoder work.

The first CPU launch [was retained](../official-player-row-h264-opus-cpu-startup-rejected-20260926/result.json) with no player windows. Chrome's startup observation ran for 155.5 seconds but did not report a completed hardware-key task, so the run was rejected before CPU measurement. The complete launch above passed that readiness gate; no values from the rejected attempt were used.
