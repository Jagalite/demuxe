<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 High 10 + AAC / MKV row

The 36-second fixture is `h264-high10/index.mkv`, SHA-256 `888be972e5b68d05e189e5ee59b1597a11ed275e91de5b0bada36da26fc20c7c`. The maintained players used frozen `assets-row-refresh-stereo-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-high10-correctness-20260926-01/REPORT.md) passed plain video, Demuxe Auto, Demuxe Software and AVPlayer through marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. Movi timed out near EOF. The archive passed integrity verification, preserving that failed outcome. Auto selected `native-direct` for the local URL.

The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits. The marked output does not qualify full H.264 High 10 fidelity, so the README fidelity asterisks remain and MediaBunny receives one too.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured the five viable or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-h264-high10-cpu-20260926/result.json) and [request log](../official-player-row-h264-high10-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 15.95% | 17.40% | 18.56% | **17.40%** | Accepted; fidelity caveat |
| Demuxe Auto (`native-direct`, URL) | 17.33% | 17.60% | 18.23% | **17.60%** | Accepted; fidelity caveat |
| Demuxe Software | 36.29% | 35.29% | 36.42% | **36.29%** | Accepted; fidelity caveat |
| AVPlayer default | 34.99% | 35.64% | 35.43% | **35.43%** | Accepted; fidelity caveat |
| MediaBunny official example | 33.33% | 32.50% | 37.10% | **33.33%** | Screened; fidelity caveat and 4.60-point range |

All 15 windows had advancing timelines, stable process membership, focus and no reported errors. Idle CPU was 2.08%, 1.57% and 1.76%. Whole-browser totals and the unqualified 10-bit output do not establish a decoder or demux performance ranking. The MediaBunny range also limits precision from this single launch. Movi received no CPU window because its correctness screen failed.
