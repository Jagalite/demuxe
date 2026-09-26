<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 8-bit + AAC / MP4 (`hev1`) row

The 36-second fixture is `hevc-hev1/index.mp4`, SHA-256 `df4305f098e49101ad3442ca714a0e2ea77ada57900158d45b2543522b65f54f`. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-hevc-hev1-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The raw archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed marked moving video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** because its example has no 1.25× rate control or independently observable cleanup.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-hevc-hev1-cpu-20260926/result.json) and [request log](../official-player-row-hevc-hev1-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 14.24% | 14.66% | 14.73% | **14.66%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 15.05% | 15.82% | 15.08% | **15.08%** | Accepted |
| Demuxe Software | 35.57% | 35.09% | 35.94% | **35.57%** | Accepted |
| AVPlayer default | 34.23% | 34.42% | 35.60% | **34.42%** | Accepted |
| MediaBunny official example | 41.31% | 42.26% | 41.63% | **41.63%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 943–947 audio-buffer starts per 20-second window. Idle CPU was 1.59%, 1.56% and 1.53%. The higher MediaBunny whole-browser result includes its audio and presentation implementation; this row does not isolate HEVC demux or decoder cost. The one-launch design requires independent confirmation before treating the observed difference as a stable player ranking. Movi received no CPU window because its correctness screen failed.
