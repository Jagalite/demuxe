<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AC-3 stereo + ASS / MKV row

The 36-second fixture is `h264-ac3-ass/index.mkv`, SHA-256 `83226e6106dbbc0c7e04f72816d27c6e81b7bdb94fe2a8c91f2ea70196b1a00a`. The maintained players used frozen `assets-row-refresh-stereo-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-ac3-ass-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video, stereo audio, required ASS drawing, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video timed out before initial playback; Movi and AVPlayer lacked the required marked subtitle drawing. The archive passed integrity verification, preserving all failed outcomes. Auto selected `hybrid` for the local URL.

The [published MediaBunny player screen](result.json) passed initial marked video and stereo audio but failed the required ASS drawing check. Its [captured subtitle image](h264-ac3-ass-subtitle.png) retains the failed marker evidence. MediaBunny is **Failed** for this row and receives no CPU value.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing Demuxe cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-ac3-ass-cpu-20260926/result.json) and [request log](../official-player-row-h264-ac3-ass-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 36.70% | 38.07% | 35.11% | **36.70%** | Accepted |
| Demuxe Software | 35.27% | 36.07% | 34.70% | **35.27%** | Accepted |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.71%, 1.68% and 1.02%. The within-launch ranges overlap; these whole-browser figures do not isolate AC-3 decoding, subtitle rendering or demux costs. Failed subtitle cells received no CPU windows.
