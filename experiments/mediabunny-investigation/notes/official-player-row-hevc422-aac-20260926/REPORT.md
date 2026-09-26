<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC Main 10 4:2:2 + AAC / MKV row

The 36-second fixture is `hevc422-aac/index.mkv`, SHA-256 `a8acabf0d496f80ba57b6235548daa98591dada3a1e8882e0988a70ac46faf61`. Host `ffprobe` identified HEVC Rext `yuv422p10le`, 320×180. This case is in frozen `assets-row-refresh-stereo-20260926-01`, not the general row snapshot. The maintained players used its local URL; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

All five players in the [maintained screen](../../../../results/head-to-head/row-hevc422-aac-correctness-20260926-01/REPORT.md) passed marked video and stereo audio, pause/resume, 1.25× playback, three seeks, EOF and cleanup. The archive passed integrity verification. Demuxe Auto selected `native-direct` for the local URL. The `*` remains because this bounded marked-video screen does not establish full 4:2:2/profile fidelity. The [published MediaBunny player screen](result.json) passed moving marked video, stereo audio, pause/resume, seeks and near-EOF settlement. It remains **Screened*** for profile fidelity, rate control and independent cleanup limits.

## One-browser-per-row CPU

The [row runner](../../benchmark/official-player-row-cpu.mjs) measured all six cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-hevc422-aac-cpu-20260926/result.json) and [request log](../official-player-row-hevc422-aac-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain video | 17.73% | 18.49% | 17.75% | **17.75%** | Accepted* |
| Demuxe Auto (`native-direct`, URL) | 18.57% | 20.41% | 18.30% | **18.57%** | Accepted*; first two differ |
| Demuxe Software | 36.85% | 37.15% | 38.52% | **37.15%** | Accepted* |
| Movi default | 33.61% | 30.21% | 31.86% | — | CPU withheld: round 2 stalled |
| AVPlayer default | 36.59% | 37.62% | 37.86% | **37.62%** | Accepted* |
| MediaBunny official example | 43.14% | 41.39% | 40.83% | **41.39%** | Screened*; fewer lifecycle controls |

Seventeen windows had advancing timelines, stable process membership, focus and no reported errors. Movi's second window had stable process membership and focus but advanced only 14.85 seconds in a 20.00-second window; the CPU gate rejected it. Its two accepted windows do not constitute a three-round steady-playback result, matching the earlier concern that this player can stall on this profile. Idle CPU was 2.01%, 1.65% and 1.86%. These are whole-browser results with different audio and presentation paths, not isolated HEVC demux or decoder costs. Profile fidelity remains unqualified, and one-launch differences need independent confirmation.
