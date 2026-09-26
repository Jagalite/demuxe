<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 10-bit SDR + AAC / MP4 row

The 36-second fixture is `hevc10-aac/index.mp4`, SHA-256 `1bee1acf4d7a98bfd754129f9aab56baa482569f508ffd7ec6d0de8e0cd03c44`. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-hevc10-aac-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi failed the playback-rate progression check. The raw archive passed integrity verification. Auto selected `native-direct` for the local URL. The [published MediaBunny player screen](result.json) passed marked moving video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** because its example has no 1.25× rate control or independently observable cleanup.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-hevc10-aac-cpu-20260926/result.json) and [request log](../official-player-row-hevc10-aac-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 18.43% | 18.47% | 17.77% | **18.43%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 19.99% | 18.48% | 18.01% | **18.48%** | Accepted; first window high |
| Demuxe Software | 37.15% | 36.22% | 38.37% | **37.15%** | Accepted |
| AVPlayer default | 37.77% | 36.61% | 37.43% | **37.43%** | Accepted |
| MediaBunny official example | 40.66% | 41.07% | 42.24% | **41.07%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 942 audio-buffer starts in each 20-second window. Idle CPU was 1.95%, 1.29% and 1.17%. The higher MediaBunny whole-browser result includes its audio and presentation implementation; this row does not isolate HEVC demux or decoder cost. Changing idle values, Auto's first-window spread and the one-launch design require independent confirmation before treating small differences as stable. Movi received no CPU window because its correctness screen failed.
