<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + E-AC-3 5.1 / MKV row

The exact 36-second fixture is `h264-eac3/index.mkv`, SHA-256 `9cf3a03129c0deedcb67ce685cc12b496ffe201047c036ff9056a74e0ed81f71`. The maintained players used a snapshot rebuilt from Demuxe commit `d7a3f7eb` with the frozen fixture bytes; the MediaBunny example received the same bytes as a local `File`. Browser: headed Chrome 153.0.8010.53 on macOS for the maintained correctness and CPU campaigns. The official MediaBunny correctness screen used headless Chrome of the same version. Its deployed example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-eac3-correctness-20260926-01/REPORT.md) failed plain video at initial marked audio/video output and Movi near EOF. Demuxe Auto, Demuxe Software and AVPlayer passed bounded output, pause/resume, rate, three seeks and EOF. All three remain **limited for full fidelity**: the E-AC-3 input has six channels but their checked output was stereo. Auto selected `hybrid` on this URL-based harness source; the new native-video/mpv-audio split requires a local inspected File. All five arms reported zero workers after cleanup.

The [published MediaBunny player screen](result.json) passed moving marked video, stereo tones at approximately 440/880 Hz, pause/resume, seeks to 6, 1 and 10 seconds, and near-EOF settlement. It remains **Screened*** because the example exposes no 1.25× rate control, cleanup was not independently observable, and discrete six-channel output was not qualified. The maintained and MediaBunny fixture hashes match.

## One-browser-per-row CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) used one headed Chrome launch across six arms and three rotating rounds, fresh contexts per arm, a completed macOS startup task observation, 20-second pre-round idle checks, five seconds of warmup and 20-second whole-Chrome CPU windows. CPU is percent of one core with no idle subtraction. The [raw CPU result](../official-player-row-h264-eac3-cpu-20260926/result.json) and [request log](../official-player-row-h264-eac3-cpu-20260926/requests.jsonl) retain the gates, process samples and source access.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain native video | 11.65% | 9.48% | 11.77% | 11.65% | Diagnostic; failed correctness |
| Demuxe Auto (`hybrid`) | 32.78% | 33.98% | 36.50% | **33.98%** | Stereo-screened* |
| Demuxe Software | 35.85% | 36.35% | 34.93% | **35.85%** | Stereo-screened* |
| Movi default | 23.48% | 33.35% | 32.55% | 32.55% | Diagnostic; failed correctness |
| AVPlayer default | 32.83% | 33.42% | 32.74% | **32.83%** | Stereo-screened* |
| MediaBunny official example | 35.87% | 34.23% | 36.44% | **35.87%** | Stereo-screened*; fewer lifecycle controls |

All 18 windows had advancing timelines, stable process membership, focus and no reported errors. The three pre-round idle CPU samples were 1.71%, 1.52% and 1.61%. The Auto range widened to 3.72 core-percentage points, and Movi's failed-cell CPU moved by 9.87 points. These are correlated rounds within one Chrome launch, not independent-launch reproducibility. The player input and presentation interfaces differ, and the numbers cannot isolate E-AC-3 decoder cost or establish multichannel fidelity. Failed-cell CPU is not an efficiency comparison.
