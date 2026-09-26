<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AAC 5.1 / MP4 row

The exact 36-second fixture was `h264-aac51/index.mp4`, SHA-256 `55955ae5525c3aaa03006a6ddff07b982569e25cc640f01776c0ca9110f936f5`. It contains H.264 High video and AAC LC 5.1 audio. The maintained correctness and CPU snapshots contained identical fixture bytes and the same frozen Demuxe `web/generated/index.js` hash (`67568667d840b3b94cdc0f8a4ed05fe97c3a7ac6e70d6c90fb17728a82c48479`).

## Correctness

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-aac51-correctness-20260925-01/summary.json) ran in Chrome 153.0.8010.53. Plain video, Demuxe Auto, Demuxe Software, and AVPlayer completed bounded playback checks but remained **blocked for full fidelity**: stereo output was observed from a 5.1 encoded source, while six discrete output channels were not independently qualified. Movi failed its near-EOF check; its CPU is diagnostic only. The maintained run passed its [integrity verification](../../../../results/head-to-head/row-h264-aac51-correctness-20260925-01/REPORT.md).

The [official MediaBunny player screen](result.json) used the same fixture bytes and deployed example script SHA-256 `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`. Marked moving video, stereo output near 440/880 Hz, pause/resume, seeks to 6, 1, and 10 seconds, and near-EOF settlement passed. The example lacks a 1.25× rate control and does not expose the six-channel output identity or cleanup state. Its result is **Screened***, with the same discrete-channel limit.

## Matched CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) used **one headed Chrome launch for this row** and a fresh browser context for every arm. It rotated six players across three rounds. Each round started with 20 seconds of idle sampling; every playback arm then had five seconds of warmup and a 20-second whole-Chrome CPU window. The browser launch recorded completion of the macOS startup task gate before any row measurement. The published MediaBunny example received the local fixture as a `File`; the maintained player arms used the same bytes via the local range-capable fixture server. CPU is percent of one core, with no idle subtraction. The [raw matched run](../official-player-row-h264-aac51-cpu-matched-20260925/result.json) retains process samples, memory samples, gates, order, requests, and failures.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain native video | 14.92% | 13.10% | 14.78% | **14.78%** | Screened* |
| Demuxe Auto (`native-direct`) | 14.50% | 14.94% | 14.80% | **14.80%** | Screened* |
| Demuxe Software | 37.93% | 35.14% | 34.90% | **35.14%** | Screened* |
| Movi default | 26.30% | 33.37% | 34.31% | 33.37% | Diagnostic; correctness failed; excluded from README CPU |
| AVPlayer default | 32.30% | 33.43% | 34.82% | **33.43%** | Screened* |
| MediaBunny official player | 37.22% | 37.36% | 36.18% | **37.22%** | Screened* |

All 18 windows had stable process IDs and normal timeline progress. The Movi windows were explicitly marked diagnostic despite their process/clock gates. Idle whole-Chrome CPU before rounds 1–3 was 1.87%, 1.75%, and 1.56%; summed idle RSS was 863,552, 939,312, and 924,544 KiB. There was no monotonic idle CPU trend. Summed RSS can count shared pages twice. The six-arm rounds share one Chrome launch; they are matched within this row but do not prove independent-launch reproducibility. Player presentation and source interfaces differ, so the figures are whole-player observations, not codec or demux attribution.

An earlier [MediaBunny-only run](../official-player-row-h264-aac51-cpu-20260925/result.json) produced 28.80%, 32.98%, and 14.85% across three windows, and a [short unified pilot](../official-player-row-h264-aac51-cpu-pilot-20260925/result.json) preceded the full run. Neither supplies a README CPU figure. The MediaBunny-only spread shows why separate campaign values should not be mixed into this matched row.
