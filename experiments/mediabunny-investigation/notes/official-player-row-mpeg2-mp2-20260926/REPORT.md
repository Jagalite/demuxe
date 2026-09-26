<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MPEG-2 video + MP2 / MPEG-PS row

The 36-second fixture is `mpeg2-mp2/index.mpg`, SHA-256 `99e4a3df8781dcdb1e51b8965871f75424be462849749527ba3e4a5931b90fc6`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-mpeg2-mp2-correctness-20260926-01/REPORT.md) passed Demuxe Auto and Demuxe Software through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video could not open the MPEG-PS source (`NotSupportedError`). Movi lost expected audio after seeking; AVPlayer timed out during a seek. The archive passed integrity verification, preserving all failed outcomes. Auto selected `software` for the local URL. The pre-existing README `*` qualification on Auto is retained.

The [published MediaBunny player screen](result.json) failed at open with `UnsupportedInputFormatError: Input has an unsupported or unrecognizable format.` It is **Failed**, with no CPU measurement.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the two correctness-passing cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-mpeg2-mp2-cpu-20260926/result.json) and [request log](../official-player-row-mpeg2-mp2-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`software`, URL) | 33.86% | 35.09% | 33.24% | **33.86%** | Accepted |
| Demuxe Software | 33.87% | 34.74% | 34.07% | **34.07%** | Accepted |

All six windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.79%, 1.80% and 1.28%. These close whole-browser medians do not establish a meaningful difference between Auto Software and forced Software. The failed players received no CPU windows.
