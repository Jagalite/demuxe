<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + PCM16 stereo / MKV row

The 36-second fixture is `h264-pcm16/index.mkv`, SHA-256 `109a16e282a72d9576898446c3f0e03f97e185de53f08a5e48f09ed3885115e4`. Host `ffprobe` identified two-channel 48 kHz `pcm_s16le`. The maintained players used the frozen `assets-row-refresh-20260926-01` local URL snapshot; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published player script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-pcm16-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and Movi through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. AVPlayer timed out during initial playback. The raw archive passed integrity verification. Auto selected `native-direct` for this URL source; the older README `hybrid` route was stale for the current player snapshot. The [published MediaBunny player screen](result.json) passed marked moving video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** because rate control and independent cleanup are unavailable in its public example.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds with fresh contexts, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-pcm16-cpu-20260926/result.json) and [request log](../official-player-row-h264-pcm16-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 12.52% | 12.94% | 13.02% | **12.94%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 14.17% | 14.46% | 13.06% | **14.17%** | Accepted |
| Demuxe Software | 34.81% | 34.35% | 35.87% | **34.81%** | Accepted |
| Movi default | 27.09% | 33.16% | 33.82% | **33.16%** | Accepted; 6.73-point rise |
| MediaBunny official example | 32.07% | 32.54% | 34.09% | **32.54%** | Screened; fewer lifecycle controls |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. MediaBunny had 942–944 audio-buffer starts per 20-second window. Idle CPU was 1.69%, 1.55% and 1.37%. Movi's rising CPU and the one-launch design preclude a precise rank among its and MediaBunny's close medians. Whole-browser totals include different audio and presentation paths and do not isolate demux or decoder work. AVPlayer received no CPU window because its correctness screen failed.
