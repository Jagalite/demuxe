<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC + styled ASS / MKV row

The 36-second fixture is `h264-ass/index.mkv`, SHA-256 `e22065a4e99a4e95d258d0133817fb4b7201a8db16a6efda4690638cf8b1c661`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-ass-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video, stereo audio, required styled subtitle drawing, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video, Movi and AVPlayer lacked the required marked subtitle drawing. The archive passed integrity verification, preserving all failed outcomes. Auto selected `hybrid` for the local URL.

The [published MediaBunny player screen](result.json) passed initial marked video and audio but failed the required subtitle drawing check. Its [captured subtitle image](h264-ass-subtitle.png) and zero marked-magenta evidence retain the failure. MediaBunny is **Failed** for this row and receives no CPU value.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing Demuxe cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-ass-cpu-20260926/result.json) and [request log](../official-player-row-h264-ass-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 36.89% | 38.57% | 36.41% | **36.89%** | Accepted |
| Demuxe Software | 35.21% | 37.75% | 35.85% | **35.85%** | Accepted |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.69%, 1.84% and 1.74%. The within-launch ranges overlap; these whole-browser figures do not establish a precise CPU ranking or isolate subtitle rendering costs. Failed subtitle cells received no CPU windows.
