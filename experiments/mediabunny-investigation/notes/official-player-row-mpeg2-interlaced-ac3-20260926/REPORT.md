<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Interlaced MPEG-2 + AC-3 stereo / MPEG-TS row

The 36-second fixture is `mpeg2-interlaced-ac3/index.ts`, SHA-256 `7e418266b4d0953fe909195a990dc6a4a11c699c3fcae488f854d53e33964a0c`. The maintained players used frozen `assets-row-refresh-stereo-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-mpeg2-interlaced-ac3-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video could not open the MPEG-TS source (`NotSupportedError`). Movi lost the expected audio after seeking. The archive passed integrity verification, preserving both failed outcomes. Auto selected `software` for the local URL. The existing README `*` and visible-combing caveat remain: the marked-motion screen does not establish correct deinterlacing or image fidelity.

The [published MediaBunny player screen](result.json) identified a duration and showed no error on open, but produced no initial video or audio output before the ten-second checkpoint timed out. It is **Failed**, with no CPU measurement.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the three correctness-passing cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-mpeg2-interlaced-ac3-cpu-20260926/result.json) and [request log](../official-player-row-mpeg2-interlaced-ac3-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`software`, URL) | 32.85% | 33.69% | 33.14% | **33.14%** | Accepted, visual caveat |
| Demuxe Software | 33.99% | 32.81% | 33.66% | **33.66%** | Accepted, visual caveat |
| AVPlayer default | 34.19% | 32.27% | 33.60% | **33.60%** | Accepted, visual caveat |

All nine windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.50%, 1.71% and 1.56%. These whole-browser figures do not establish deinterlacing quality or isolate decoder costs. The medians are too close for a precise player ranking from one launch. Plain video, Movi and MediaBunny received no CPU windows because their correctness screens failed.
