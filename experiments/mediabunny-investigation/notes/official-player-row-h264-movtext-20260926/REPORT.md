<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC + embedded mov_text / MP4 row

The 36-second fixture is `h264-movtext/index.mp4`, SHA-256 `baf81afff9cc30fc076a42e74368489cbd553b6ab14ca7b4b4b680b50d4d4cf1`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-movtext-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video, stereo audio, required embedded subtitle text, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video and Movi lacked the required subtitle text at initial output; AVPlayer lacked it after seeking. The archive passed integrity verification, preserving all failed outcomes. Auto selected `hybrid` for the local URL.

The [published MediaBunny player screen](result.json) passed initial marked video and audio but failed the required embedded subtitle text check. Its [captured subtitle image](h264-movtext-subtitle.png) and control inventory retain the evidence. MediaBunny is **Failed** for this row and receives no CPU value.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing Demuxe cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-movtext-cpu-20260926/result.json) and [request log](../official-player-row-h264-movtext-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 37.52% | 37.48% | 36.00% | **37.48%** | Accepted |
| Demuxe Software | 35.51% | 36.42% | 33.76% | **35.51%** | Accepted |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.62%, 1.71% and 1.73%. These whole-browser figures do not isolate subtitle rendering or demux costs, and one correlated launch is insufficient for a precise ranking. Failed subtitle cells received no CPU windows.
