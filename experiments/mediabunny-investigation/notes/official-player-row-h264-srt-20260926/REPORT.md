<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC + embedded SRT / MKV row

The 36-second fixture is `h264-srt/index.mkv`, SHA-256 `7ef668ade53656365e494dae9b726eafa84f742c94ad6b27c4099000433ce45c`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-srt-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video, stereo audio, required embedded subtitle text, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video and Movi lacked the required subtitle text at initial output; AVPlayer lacked it after seeking. The archive passed integrity verification, preserving all failed outcomes. Auto selected `hybrid` for the local URL.

The [published MediaBunny player screen](result.json) passed initial marked video and audio but failed the required embedded subtitle text check. The [experimental qualification script](../../benchmark/official-player-qualification.mjs) now accepts subtitle-bearing catalogue files for a bounded check: it captures the player image and subtitle controls, checks the required text token for text subtitles, and checks the marked bitmap region for image/styled subtitles. Its [captured subtitle image](h264-srt-subtitle.png) and empty control inventory support the missing-text result. MediaBunny is **Failed** for this row and receives no CPU value.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing Demuxe cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-srt-cpu-20260926/result.json) and [request log](../official-player-row-h264-srt-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 37.29% | 38.67% | 39.56% | **38.67%** | Accepted |
| Demuxe Software | 38.75% | 33.36% | 37.16% | **37.16%** | Accepted; 5.39-point range |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.85%, 1.66% and 1.62%. The Software range is wider than the median gap; these whole-browser values do not establish a meaningful CPU ranking. Failed subtitle cells received no CPU windows.
