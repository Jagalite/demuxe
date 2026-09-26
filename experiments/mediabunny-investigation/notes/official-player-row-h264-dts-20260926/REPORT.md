<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + DTS core 5.1 / MKV row

The exact 36-second fixture is `h264-dts/index.mkv`, SHA-256 `3185a295a4103fcf9b44c02541d8ae649bae9d4e265cf871c3e77662904b33a2`. The maintained players used the Demuxe snapshot compiled from commit `d7a3f7eb` with these frozen fixture bytes; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The official MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-dts-correctness-20260926-01/REPORT.md) failed plain video at initial playback and Movi at playback-rate progression. Demuxe Auto, Demuxe Software and AVPlayer passed bounded output, pause/resume, rate, seeks to 6, 1 and 10 seconds, EOF and cleanup. All three remain **limited for full fidelity** because only stereo output was checked from the six-channel DTS source. Auto selected `hybrid` for this URL-based harness source; native-video/mpv-audio split admission currently requires a local inspected File. Each maintained arm reported zero workers after cleanup.

The [published MediaBunny player screen](result.json) passed moving marked video, stereo tones at approximately 440/880 Hz, pause/resume, the same three seeks and near-EOF settlement. It remains **Screened***: the example has no 1.25× rate control, cleanup was not independently observed, and discrete six-channel output was not verified. The two fixture hashes match.

## One-browser-per-row CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) used one headed Chrome launch for six arms across three rotating rounds, with a new context for each arm. It completed the macOS startup task observation, then used 20-second pre-round idle checks, five-second playback warmups and 20-second whole-Chrome CPU windows. CPU is percent of one core, without idle subtraction. [Raw CPU samples and gates](../official-player-row-h264-dts-cpu-20260926/result.json) and the [request log](../official-player-row-h264-dts-cpu-20260926/requests.jsonl) are retained.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain native video | 12.01% | 12.30% | 11.90% | 12.01% | Diagnostic; failed correctness |
| Demuxe Auto (`hybrid`) | 37.20% | 35.42% | 37.05% | **37.05%** | Stereo-screened* |
| Demuxe Software | 37.02% | 37.55% | 37.44% | **37.44%** | Stereo-screened* |
| Movi default | 31.86% | 32.63% | 32.51% | 32.51% | Diagnostic; failed correctness |
| AVPlayer default | 36.69% | 38.04% | 36.91% | **36.91%** | Stereo-screened* |
| MediaBunny official example | 36.91% | 40.35% | 38.51% | **38.51%** | Stereo-screened*; fewer lifecycle controls |

All 18 windows had advancing timelines, stable process membership, focus and no reported errors. Pre-round idle CPU was 1.57%, 1.92% and 1.66%. MediaBunny ranged across 3.44 core-percentage points; its median should not be interpreted as a precise advantage or disadvantage against AVPlayer without an independent launch. These are correlated windows from one browser process. Different player input/presentation interfaces, unverified discrete 5.1 output and failed correctness cells limit any efficiency ranking.
