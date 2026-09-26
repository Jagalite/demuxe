<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MPEG-2 video + AC-3 / MPEG-TS row

The 36-second fixture is `mpeg2-ac3/index.ts`, SHA-256 `3b7dd719dbfb1dc215f7f5294c9bdc3d2bcd349da9fd90166ba1d3958774e514`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-mpeg2-ac3-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software, Movi and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video could not open the MPEG-TS source (`NotSupportedError`). The archive passed integrity verification, preserving that failed outcome. Auto selected `software` for the local URL. The [published MediaBunny player screen](result.json) identified a duration and showed no error on open, but produced zero video draws and zero audio starts before the ten-second initial-output checkpoint timed out. It is **Failed**, with no CPU measurement.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the four correctness-passing cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-mpeg2-ac3-cpu-20260926/result.json) and [request log](../official-player-row-mpeg2-ac3-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`software`, URL) | 32.26% | 33.69% | 34.77% | **33.69%** | Accepted |
| Demuxe Software | 35.94% | 33.91% | 33.52% | **33.91%** | Accepted |
| Movi default | 30.59% | 30.06% | 29.95% | **30.06%** | Accepted |
| AVPlayer default | 35.05% | 34.65% | 33.30% | **34.65%** | Accepted |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.67%, 1.57% and 1.61%. The whole-browser measurements include different demux, decode, audio and presentation paths; they do not isolate MPEG-2 decoder costs. Within-launch drift in the Demuxe measurements and a single browser launch limit precision. Plain video and MediaBunny received no CPU windows because their correctness screens failed.
