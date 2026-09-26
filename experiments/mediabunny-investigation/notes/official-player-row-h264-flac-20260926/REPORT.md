<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + FLAC stereo / MKV row

The 36-second fixture is `h264-flac/index.mkv`, SHA-256 `c047e96323a4d4951b8b778eb01fc22444a0141646c7a7b949d7075d4719c64c`. Its FLAC audio is stereo at 48 kHz. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same file bytes through the published player's file chooser. Browser: Chrome 153.0.8010.53 on macOS. The published player script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-flac-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video, stereo audio, pause/resume, 1.25× playback, seeks, EOF and cleanup. Movi timed out near EOF. All five reported no remaining surfaces after cleanup. Auto selected `native-direct` for the local URL source. The [published MediaBunny player screen](result.json) passed marked moving video, audible stereo, pause/resume, three seeks and near-EOF settlement. It remains **Screened** because its public example lacks a 1.25× control and independent decoder/AudioContext cleanup observation.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened players in one headed Chrome launch, three rotating rounds, fresh contexts per arm, a 20-second idle check before each round, and 5-second warmup plus 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-flac-cpu-20260926/result.json) and [request log](../official-player-row-h264-flac-cpu-20260926/requests.jsonl) retain process samples and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 13.57% | 12.92% | 13.21% | **13.21%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 14.12% | 13.73% | 12.85% | **13.73%** | Accepted |
| Demuxe Software | 35.31% | 34.67% | 33.83% | **34.67%** | Accepted |
| AVPlayer default | 33.74% | 35.51% | 32.60% | **33.74%** | Accepted; 2.91-point range |
| MediaBunny official example | 34.53% | 32.18% | 33.09% | **33.09%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 210 audio-buffer starts in each 20-second window, consistent with the fixture's roughly 96 ms FLAC packets. Idle CPU was 1.92%, 1.60% and 1.63%. The observed whole-browser spread includes different audio and presentation paths and does not isolate demux or decoder cost. The one-launch design and AVPlayer's range also preclude a precise ranking among its, Software's and MediaBunny's close medians.

An initial CPU attempt [was retained](../official-player-row-h264-flac-cpu-gate-rejected-20260926/result.json). Its MediaBunny window advanced with 604 video draws and 210 audio starts, but a generic gate required 400 audio starts in 20 seconds. The experimental gate now requires at least five starts per second and positive audio-start progress in each sampled interval. The complete three-round run above was collected after that correction; none of the rejected attempt's CPU values appear in the table. Movi received no CPU windows because its correctness screen failed.
