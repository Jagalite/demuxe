<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + FLAC 5.1 / MKV row

The 36-second fixture is `h264-flac51/index.mkv`, SHA-256 `9eafa462a2e46f3a34ed7fcaac201582457e6edaebbd800e64e6d7b800fc35dd`. Host `ffprobe` identified a 48 kHz six-channel FLAC track. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-flac51-correctness-20260926-01/REPORT.md) completed marked video, stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup for plain video, Demuxe Auto, Demuxe Software and AVPlayer. Their formal status is **blocked** because the stereo output screen does not qualify discrete 5.1 channel fidelity. Movi failed its audio check after a seek. The raw archive passed integrity verification. Auto selected `native-direct` for the local URL source. The [published MediaBunny player screen](result.json) completed moving marked video, stereo output, pause/resume, seeks and near-EOF settlement; it remains **Screened** for the 5.1, rate-control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five stereo-screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-flac51-cpu-20260926/result.json) and [request log](../official-player-row-h264-flac51-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 13.84% | 14.60% | 13.96% | **13.96%** | Stereo screened* |
| Demuxe Auto (`native-direct`, URL) | 13.83% | 14.29% | 14.59% | **14.29%** | Stereo screened* |
| Demuxe Software | 35.64% | 35.15% | 35.15% | **35.15%** | Stereo screened* |
| AVPlayer default | 31.36% | 35.41% | 33.17% | **33.17%** | Stereo screened*; 4.05-point range |
| MediaBunny official example | 33.70% | 34.21% | 32.66% | **33.70%** | Stereo screened*; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 210–211 audio-buffer starts per 20-second window. Idle CPU was 1.60%, 1.49% and 1.55%. The whole-browser measurements include different audio and presentation paths; they do not isolate FLAC decoding or establish discrete 5.1 output. AVPlayer's within-launch drift and the one-launch design preclude a precise ranking among its, Software's and MediaBunny's close medians. Movi received no CPU window because it failed correctness.
