<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MPEG-2 video-only / MPEG-TS row

The 36-second fixture is `mpeg2-video-only/index.ts`, SHA-256 `ffed2c71c683d7b18d0ea407eb37484523e61be768103f709116e359e294773a`. The maintained players used frozen `assets-row-refresh-stereo-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-mpeg2-video-only-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software, Movi and AVPlayer through marked video, intentional silence, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video could not open the MPEG-TS source (`NotSupportedError`). The archive passed integrity verification, preserving that failed outcome. Auto selected `software` for the local URL.

The [published MediaBunny player screen](result.json) failed at open with `Error: No audio or video track found.` It produced no video draws or audio starts and received no CPU measurement.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the four correctness-passing cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-mpeg2-video-only-cpu-20260926/result.json) and [request log](../official-player-row-mpeg2-video-only-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`software`, URL) | 31.56% | 30.68% | 31.93% | **31.56%** | Accepted |
| Demuxe Software | 31.15% | 32.81% | 28.29% | **31.15%** | Accepted; 4.52-point range |
| Movi default | 30.62% | 29.98% | 32.51% | **30.62%** | Accepted |
| AVPlayer default | 25.99% | 25.67% | 23.30% | **25.67%** | Accepted |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.87%, 1.66% and 1.42%. These whole-browser results do not isolate decoder or demux costs, and the Demuxe Software range limits close ranking claims. Plain video and MediaBunny received no CPU windows because their correctness screens failed.
