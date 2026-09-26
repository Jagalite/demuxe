<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 10-bit SDR + E-AC-3 / MKV row

The 36-second fixture is `hevc10-eac3/index.mkv`, SHA-256 `e5d6035275d2f8a9e590c9e235e8fb8b726fdd621d09326c82dc3a0b2abde72e`. Host `ffprobe` identified stereo 48 kHz E-AC-3. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-hevc10-eac3-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Plain video failed initial playback; Movi timed out near EOF. The archive passed integrity verification. Auto selected `hybrid` for this local URL. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the four viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-hevc10-eac3-cpu-20260926/result.json) and [request log](../official-player-row-hevc10-eac3-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 39.96% | 39.43% | 40.00% | **39.96%** | Accepted |
| Demuxe Software | 35.28% | 35.90% | 37.51% | **35.90%** | Accepted; 2.23-point range |
| AVPlayer default | 36.57% | 36.93% | 37.95% | **36.93%** | Accepted |
| MediaBunny official example | 41.99% | 42.79% | 40.13% | **41.99%** | Screened; fewer lifecycle controls |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 1.60%, 1.56% and 1.58%. These are whole-browser results with different video, audio and presentation paths, not isolated E-AC-3 decode or demux costs. The one-launch design and Software/MediaBunny spreads require independent confirmation for fine differences. Plain video and Movi received no CPU windows because their correctness screens failed.
