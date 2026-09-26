<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AAC audio-only / M4A row

The 36-second fixture is `audio-aac/index.m4a`, SHA-256 `0dc79c5f327fe24d80401d6e6f385f4d22b2c8aaef3e2e3678b798adf970f798`. The maintained players used frozen `assets-row-refresh-20260926-01` local URL input; MediaBunny received the same bytes as a local `File`. Browser: Chrome 153.0.8010.53 on macOS. The published example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-audio-aac-correctness-20260926-01/REPORT.md) passed browser audio, Demuxe Auto, Demuxe Software, Movi and AVPlayer through marked stereo tones, intentional absence of video, pause/resume, 1.25× playback, three seeks, EOF and cleanup. The archive passed integrity verification. Auto selected `native-direct` for the local URL.

The [published MediaBunny player screen](result.json) passed marked stereo audio, timeline progress, pause/resume, seeks and near-EOF settlement. It remains **Screened** for rate control and independent cleanup limits. The [experimental qualification script](../../benchmark/official-player-qualification.mjs) and [CPU runner](../../benchmark/official-player-row-cpu.mjs) gained an audio-only contract: tone correctness and continuing audio starts are required; moving-video checks are omitted. The [first-attempt note](qualification-first-attempt.md) preserves the rejected hidden-canvas screenshot attempt, which was a harness error before the successful rerun.

## One-browser-per-row CPU

The row runner measured all six correctness-passing or screened cells in one headed Chrome launch across three rotating rounds, fresh contexts per arm, 20-second idle checks, five-second warmups and 20-second CPU windows. CPU is percent of one core for the whole Chrome process tree, without idle subtraction. The [raw result](../official-player-row-audio-aac-cpu-20260926/result.json) and [request log](../official-player-row-audio-aac-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Browser audio | 2.49% | 2.41% | 2.28% | **2.41%** | Accepted |
| Demuxe Auto (`native-direct`, URL) | 3.18% | 3.17% | 3.21% | **3.18%** | Accepted |
| Demuxe Software | 10.19% | 10.63% | 10.92% | **10.63%** | Accepted |
| Movi default | 15.97% | 14.16% | 15.49% | — | Rejected: timeline advanced only 1.53, 1.52, 1.53 seconds in the 20-second windows |
| AVPlayer default | 10.16% | 9.83% | 9.86% | **9.86%** | Accepted |
| MediaBunny official example | 46.67% | 43.73% | 45.39% | **45.39%** | Screened; 945 audio source starts per window |

Fifteen windows were accepted or screened, and all three Movi windows were rejected for stalled progress despite its separate correctness pass. Idle CPU was 1.68%, 1.76% and 1.85%. MediaBunny's high whole-Chrome CPU reproduced in all three accepted audio-only windows, with stable process membership, focused page, 20.12 seconds of timeline advancement and continuing audio starts. This result is specific to the published player and fixture; it does not identify decoder, buffering or scheduling as the cause. The different players use different audio paths, so the CPU figures are whole-player observations rather than isolated AAC decode costs.
