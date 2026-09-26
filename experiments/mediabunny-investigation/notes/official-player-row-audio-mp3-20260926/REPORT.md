<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MP3 audio-only / MP3 row

The 36-second fixture is `audio-mp3/index.mp3`, SHA-256 `a3e62e9beb342365a95025ee3b8f87ca9549814773a35971e4305eb4edd7d144`. Maintained players used the frozen `assets-row-refresh-20260926-01` local URL; the published MediaBunny player received the same bytes as a local `File`. Browser: headed Chrome 153.0.8010.53 on macOS. Its published player script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-audio-mp3-correctness-20260926-01/REPORT.md) passed browser audio, Demuxe Auto, Demuxe Software and Movi for marked stereo output, pause/resume, rate, seeks, EOF and cleanup. AVPlayer failed its first seek deadline. The archive passed integrity verification. Auto selected `native-direct`.

The [published MediaBunny player screen](result.json) passed marked stereo output, timeline progress, pause/resume, seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× control or independently observable cleanup. The [first rejected attempt](first-attempt-rejected.json) failed before the file was supplied: the file chooser was not ready at `domcontentloaded`. The [experimental qualification script](../../benchmark/official-player-qualification.mjs) now waits for `networkidle` before interacting with the example.

## One-browser-per-row CPU

The [initial six-arm run](../official-player-row-audio-mp3-cpu-20260926/result.json) used one headed Chrome across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. Its Movi windows all failed the playback-progress gate (only about 1.5 seconds advanced per window). Several other arms drifted widely, so the README does not use this run's medians. The [focused four-arm follow-up](../official-player-row-audio-mp3-cpu-followup-20260926/result.json) used the same protocol without Movi. All 12 windows passed their progress gates; MediaBunny recorded 834–835 audio starts per window.

| Player arm | Round 1 | Round 2 | Round 3 | Follow-up median |
| --- | ---: | ---: | ---: | ---: |
| Browser audio | 1.15% | 0.76% | 0.85% | **0.85%** |
| Demuxe Auto (`native-direct`, URL) | 1.29% | 1.70% | 0.97% | **1.29%** |
| Demuxe Software | 2.58% | 2.79% | 3.02% | **2.79%** |
| MediaBunny official example | 9.86% | 10.10% | 10.06% | **10.06%** |

Idle CPU was 1.41%, 1.12% and 0.93%. Percentages are whole-Chrome process-tree CPU relative to one core, with no idle subtraction. Movi's correctness pass remains valid, but its CPU cell is withheld. The original mixed run's high MediaBunny windows did not repeat in the focused follow-up; the cause of the drift is undetermined. These figures describe whole players on this fixture and do not isolate MP3 decoding cost.
