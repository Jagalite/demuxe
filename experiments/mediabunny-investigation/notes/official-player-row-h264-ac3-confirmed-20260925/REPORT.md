<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AC-3 5.1 / MKV row

The exact 36-second fixture was `h264-ac3/index.mkv`, SHA-256 `7a2abe9de1d631b0bf07dbeedc79c57fc49b03636f8aa27c353026b9e0113726`. This is the release-supplement fixture used by both correctness and CPU; an older snapshot has different bytes and was excluded. The audio stream is AC-3 5.1(side). Browser: Chrome 153.0.8010.53 on macOS.

## Correctness

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-ac3-correctness-20260925-01/REPORT.md) failed plain video at initial playback and Movi near EOF. Demuxe Auto, Demuxe Software, and AVPlayer completed bounded playback checks but remained **blocked for full fidelity**: stereo output was observed from a six-channel encoded source, while six discrete output channels were not independently qualified. Its integrity verification passed.

The [confirmed official MediaBunny player screen](result.json) passed marked moving video, stereo tones near 440/880 Hz, pause/resume, seeks to 6, 1, and 10 seconds, and near-EOF settlement. It remains **Screened*** because six discrete channels, 1.25× playback rate, and cleanup were not qualified. The deployed example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

The [first MediaBunny attempt](../official-player-row-h264-ac3-20260925/result.json) failed the zero-crossing audio oracle. Its captured first AC-3 output buffer contained startup transients, while subsequent audible buffers measured approximately 440/880 Hz. The checker was changed to require 24,000 samples per channel from individual buffers whose own tone estimate matched the independently authored marker. The first failure remains raw evidence of the harness issue; the confirmed screen is the qualified one.

## Matched CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) used **one headed Chrome launch for all six player arms**, fresh contexts, and rotating order across three rounds. A completed macOS startup task gate preceded measurement. Each round began with a 20-second idle observation; each arm then had five seconds of warmup and a 20-second whole-Chrome CPU window. MediaBunny received the local fixture as a `File`; maintained players received the same bytes through the local range server. CPU is percent of one core without idle subtraction. The [raw matched run](../official-player-row-h264-ac3-cpu-matched-20260925/result.json) retains process samples, gates, and request logs.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain native video | 11.26% | 9.39% | 11.33% | 11.26% | Diagnostic; failed correctness |
| Demuxe Auto (`hybrid`) | 36.81% | 36.50% | 36.59% | **36.59%** | Screened* |
| Demuxe Software | 36.64% | 37.58% | 34.68% | **36.64%** | Screened* |
| Movi default | 19.02% | 34.20% | 31.73% | 31.73% | Diagnostic; failed correctness |
| AVPlayer default | 31.19% | 33.14% | 28.01% | 31.19% | Screened*; README CPU withheld |
| MediaBunny official player | 35.91% | 28.41% | 29.68% | 29.68% | Screened*; README CPU withheld |

Every window had stable process IDs and normal timeline progress; the failed-player samples remain diagnostic regardless. Demuxe Auto selected `hybrid` in all rounds and Software selected `software`. Idle whole-Chrome CPU before rounds 1–3 was 1.86%, 1.65%, and 1.68%, with summed idle RSS 992,320, 1,110,992, and 1,067,648 KiB. Summed RSS may double-count shared pages.

AVPlayer and MediaBunny varied enough to warrant a separate launch. The [fresh-Chrome follow-up](../official-player-row-h264-ac3-cpu-followup-20260925/result.json) used the same readiness, idle, warmup, and window gates, with the two arms rotating order. AVPlayer returned **33.60%, 33.34%, and 33.72%**; MediaBunny returned **35.83%, 35.61%, and 36.58%**. Thus the lower MediaBunny median in the six-arm launch did **not** reproduce as a CPU advantage over AVPlayer. Their README CPU cells remain blank; both campaigns are retained. This is whole-player CPU, not AC-3 decoder attribution, and the stereo-output qualification does not establish full 5.1 fidelity.
