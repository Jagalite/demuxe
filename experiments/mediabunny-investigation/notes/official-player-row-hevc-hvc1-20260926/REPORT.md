<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 8-bit + AAC / MP4 (`hvc1`) row

The 36-second fixture is `hevc-hvc1/index.mp4`, SHA-256 `e6c59260d28295373d5dede7678b771020bf2c265d1e4960d46a889eb7c048e0`. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-hevc-hvc1-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The raw archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed marked moving video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** because its example has no 1.25× rate control or independently observable cleanup.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-hevc-hvc1-cpu-20260926/result.json) and [request log](../official-player-row-hevc-hvc1-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 14.79% | 13.74% | 15.56% | **14.79%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 14.91% | 15.80% | 15.81% | **15.80%** | Accepted |
| Demuxe Software | 35.13% | 34.50% | 35.73% | **35.13%** | Accepted |
| AVPlayer default | 32.91% | 33.06% | 35.13% | **33.06%** | Accepted |
| MediaBunny official example | 42.78% | 41.00% | 41.05% | **41.05%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 942–944 audio-buffer starts per 20-second window. Idle CPU was 1.68%, 1.54% and 1.63%. The higher MediaBunny whole-browser result includes its audio and presentation implementation; this row does not isolate HEVC demux or decoder cost. The one-launch design requires independent confirmation before treating the observed difference as a stable player ranking. Movi received no CPU window because its correctness screen failed.
