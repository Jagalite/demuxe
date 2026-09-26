<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MPEG-4 Part 2 + MP3 / AVI row

The 36-second fixture is `mpeg4-mp3/index.avi`, SHA-256 `cb27e85e1abf8ad7c86c5790913d6613ae6f31fb73e3248dcabef78dcd5ea1ec`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-mpeg4-mp3-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video could not open the AVI source (`NotSupportedError`). Movi timed out before initial playback; AVPlayer timed out during a seek. The archive passed integrity verification, preserving all failed outcomes. Auto selected `software` for the local URL. The pre-existing README `*` qualification on Auto is retained.

The [published MediaBunny player screen](result.json) failed at open with `UnsupportedInputFormatError: Input has an unsupported or unrecognizable format.` It is **Failed**, with no CPU measurement.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-mpeg4-mp3-cpu-20260926/result.json) and [request log](../official-player-row-mpeg4-mp3-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`software`, URL) | 33.73% | 35.96% | 33.02% | **33.73%** | Accepted |
| Demuxe Software | 34.45% | 35.00% | 33.24% | **34.45%** | Accepted |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.74%, 1.80% and 1.54%. Within-launch drift exceeds the median difference; these whole-browser results do not establish a meaningful performance difference between Auto Software and forced Software. The failed players received no CPU windows.
