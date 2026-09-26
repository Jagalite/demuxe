<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC + AC-3 + PGS / MKV row

The 36-second fixture is `hevc-pgs/index.mkv`, SHA-256 `42f67d0251f502de299ad4e67d855704e2a06f438b79eabb565750185e2c5951`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-hevc-pgs-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video, stereo audio, required PGS drawing, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video timed out before initial playback; Movi and AVPlayer lacked the required marked subtitle drawing. The archive passed integrity verification, preserving all failed outcomes. Auto selected `hybrid` for the local URL. The pre-existing README `*` qualification remains; the marked output is a bounded PGS visibility check rather than broad subtitle fidelity proof.

The [published MediaBunny player screen](result.json) passed initial marked video and stereo audio but failed the required PGS drawing check. Its [captured subtitle image](hevc-pgs-subtitle.png) retains the failed marker evidence. MediaBunny is **Failed** for this row and receives no CPU value.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing Demuxe cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-hevc-pgs-cpu-20260926/result.json) and [request log](../official-player-row-hevc-pgs-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 42.05% | 38.01% | 40.60% | **40.60%** | Accepted; 4.04-point range |
| Demuxe Software | 37.29% | 35.12% | 36.41% | **36.41%** | Accepted |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.64%, 1.91% and 1.99%. The whole-browser measurements do not isolate subtitle rendering, audio decoding or demux costs. The Auto range and single correlated launch limit precision. Failed subtitle cells received no CPU windows.
