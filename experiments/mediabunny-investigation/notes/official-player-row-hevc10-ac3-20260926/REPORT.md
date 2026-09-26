<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 10-bit SDR + AC-3 / MKV row

The 36-second fixture is `hevc10-ac3/index.mkv`, SHA-256 `2a84b2eed59a97e67ba49388d048b85966959081013555c6146063158c4b6c56`. Host `ffprobe` identified stereo 48 kHz AC-3. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-hevc10-ac3-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video failed initial playback; Movi timed out near EOF. The archive passed integrity verification. Auto selected **`hybrid` for this local URL**. Its older `native-video-mpv-audio` README label came from a different local-File selective-audio campaign and cannot be used as the route for this URL measurement. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the four viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-hevc10-ac3-cpu-20260926/result.json) and [request log](../official-player-row-hevc10-ac3-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 39.60% | 39.34% | 39.37% | **39.37%** | Accepted |
| Demuxe Software | 36.22% | 35.55% | 35.82% | **35.82%** | Accepted |
| AVPlayer default | 37.32% | 35.53% | 36.75% | **36.75%** | Accepted |
| MediaBunny official example | 43.34% | 39.72% | 40.57% | **40.57%** | Screened; 3.62-point range |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.57%, 1.44% and 1.71%. MediaBunny's spread and the one-launch design preclude a precise ranking among close medians. Whole-browser totals include different video, audio and presentation paths and do not isolate AC-3 decode or demux work. Plain video and Movi received no CPU windows because their correctness screens failed.
