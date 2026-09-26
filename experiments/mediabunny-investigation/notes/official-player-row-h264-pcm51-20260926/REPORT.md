<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + PCM24 5.1 / MKV row

The 36-second fixture is `h264-pcm51/index.mkv`, SHA-256 `6c37aae089ca67bfb7afdbcbe09fb0b702596f27627b3d2b048442215eed7e35`. Host `ffprobe` identified six-channel 48 kHz `pcm_s24le`. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published player script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-pcm51-correctness-20260926-01/REPORT.md) completed marked video, stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup for plain video, Demuxe Auto, Demuxe Software and Movi. Their formal status remains **blocked** because stereo output does not qualify discrete 5.1 channel fidelity. AVPlayer timed out during initial playback. The raw archive passed integrity verification. Auto selected `native-direct` for this URL source; the older README `hybrid` label was stale for the current player snapshot. The [published MediaBunny player screen](result.json) passed the corresponding moving-video, stereo-audio, pause/resume, seek and near-EOF checks. It remains **Screened** for the multichannel, rate-control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five stereo-screened cells in one headed Chrome launch across three rotating rounds with fresh contexts, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-pcm51-cpu-20260926/result.json) and [request log](../official-player-row-h264-pcm51-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 13.77% | 13.40% | 12.81% | **13.40%** | Stereo screened* |
| Demuxe Auto (`native-direct`, URL) | 14.61% | 13.86% | 13.93% | **13.93%** | Stereo screened* |
| Demuxe Software | 32.34% | 34.82% | 34.91% | **34.82%** | Stereo screened* |
| Movi default | 24.43% | 32.66% | 26.06% | **26.06%** | Stereo screened*; 8.23-point range |
| MediaBunny official example | 34.50% | 32.45% | 37.10% | **34.50%** | Stereo screened*; 4.65-point range |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 943–944 audio-buffer starts per 20-second window. Idle CPU was 1.58%, 1.76% and 1.77%. The wide Movi and MediaBunny ranges and one-launch design preclude a precise CPU ranking. Whole-browser totals include different audio and presentation paths; they do not isolate PCM decoding or establish discrete 5.1 output. AVPlayer received no CPU window because its correctness screen failed.
