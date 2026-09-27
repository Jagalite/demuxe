<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe Auto audio and subtitle retest

Date: 2026-09-26. Source: `main` at `e974cbdf49f3586694b8907d0c82c9c5de762f8d`. Browser: headed Chrome 153.0.8010.53 on macOS. Only the **Demuxe Auto** README cells were retested; the other player cells keep their earlier evidence.

## Runtime and method

The snapshot `build/head-to-head/assets-audio-auto-e974cbdf-20260926-01` preserves the frozen media from `assets-row-refresh-stereo-20260926-01`. Its Demuxe JavaScript came from committed `e974cbdf`; the remux engine was rebuilt from the same source. The snapshot manifest SHA-256 is `32cd6bf8dba2a0d66854f3e4cef31aed079d0984d7d82bc00a5d9a79f2f98f82`. Served remux and adaptation WASM SHA-256 values are `cc7a72dd3f114d7d7bb769e652a72aadbccb06fc8e6fea951ab477343d31ff67` and `2e829ff6ef44d6c2f313004bb78714946804d202153b108ee43b9e09cf7bc562`. The fixture bytes match the parent snapshot. This isolated the test from unrelated working-tree edits.

The [13-case Auto correctness archive](../results/head-to-head/audio-auto-e974cbdf-correctness-20260926-01/summary.json) passed 12 cases and failed one ASS subtitle-output check. Both the [passing ASS repeat](../results/head-to-head/audio-auto-e974cbdf-ass-repeat-20260926-01/summary.json) and [failing ASS repeat](../results/head-to-head/audio-auto-e974cbdf-ass-repeat2-20260926-01/summary.json) are retained. A [selected-AC-3 dual-audio check](../results/head-to-head/audio-auto-e974cbdf-dual-ac3-20260926-01/summary.json) passed. `tests/head-to-head/verify.mjs` reported archive integrity for all four archives; integrity does not change the failed playback outcomes.

Correctness checked marked video/audio, pause and resume, rate, seeks to 6, 1 and 10 seconds, near EOF, and cleanup. Subtitle cases also required marked subtitle output. The 5.1 inputs were screened through stereo output; discrete surround fidelity is unqualified. Bitmap subtitle checks establish marker visibility, not full subtitle fidelity.

For CPU, each fixture used one fresh headed Chrome launch, Auto only, with three 20-second whole-process windows after five-second warmups and idle checks. These percentages are one-core equivalents, with no fixed idle subtraction. Every listed CPU window passed the benchmark gate and retained its route before and after measurement. Each fixture's raw CPU data is under `experiments/mediabunny-investigation/notes/auto-audio-e974cbdf-<fixture>-cpu-20260926/result.json`. The two variable rows have separately retained `-cpu-repeat-20260926` launches. These Auto-only runs are **not matched** to the older README player campaigns; old and new numbers cannot establish a causal CPU reduction or a player ranking.

## Results

| README fixture | Auto route through seeks | Correctness | CPU windows (%) | README CPU |
| --- | --- | --- | --- | --- |
| H.264 + AC-3 5.1 | `native-transcode` | Pass* | 17.00, 17.51, 17.51 | 17.5% |
| H.264 + E-AC-3 5.1 | `native-transcode` | Pass* | 19.50, 19.03, 18.97 | 19.0% |
| H.264 + DTS core 5.1 | `native-transcode` | Pass* | 19.20, 18.60, 19.65 | 19.2% |
| H.264 + AC-3 stereo | `native-transcode` | Pass | 18.29, 17.73, 17.92 | 17.9% |
| H.264 + E-AC-3 stereo | `native-transcode` | Pass | 16.81, 16.49, 15.93 | 16.5% |
| H.264 + DTS core stereo | `native-transcode` | Pass | 14.05, 18.16, 14.80; independent repeat 19.45, 19.00, 18.69 | Withheld: launch drift |
| HEVC Main10 SDR + AC-3 | `native-transcode` | Pass | 5.66, 5.81, 5.61; independent repeat 5.58, 16.78, 22.14 | Withheld: repeat drift |
| HEVC Main10 SDR + E-AC-3 | `native-transcode` | Pass | 19.36, 6.36, 5.97; independent repeat 20.71, 21.38, 20.27 | Withheld: two CPU bands |
| HEVC Main10 SDR + DTS core | `native-transcode` | Pass | 6.24, 6.04, 6.29; independent repeat 20.50, 21.60, 17.44 | Withheld: repeat drift |
| H.264 + AC-3 + ASS | `native-transcode-mpv` | **Intermittent failure:** required ASS drawing missing in two of three correctness runs | 20.01, 19.50, 18.27 | Withheld: correctness |
| H.264 + AC-3 + VobSub | `native-transcode-mpv` | Pass* | 20.33, 18.62, 17.19 | 18.6% |
| HEVC + AC-3 + PGS | `native-transcode-mpv` | Pass* | 21.17, 17.66, 21.90 | 21.2% |
| Dual-audio H.264 + AAC + AC-3: default AAC | `native-direct` | Pass; AC-3 switch and AAC return passed | 13.99, 15.19, 13.25 | 14.0% |
| Same dual-audio file: selected AC-3 | `native-transcode` | Pass, including seeks | 18.76, 18.11, 16.70 | 18.1% |

The dual-audio switch selected stream 2 (AC-3) on `native-transcode`, then stream 1 (default AAC) on `native-direct`. The selected-AC-3 CPU case starts with that track selected, so its window does not measure the switch operation itself.

The ASS failures occurred at initial marked subtitle drawing on `native-transcode-mpv`; the one passing run also passed the later seek and EOF checks. The three accepted CPU windows cannot qualify a route that failed required output twice, so the README omits its CPU figure. The H.264/E-AC-3 stereo second window presented 568 rather than roughly 605 frames in 20 seconds, although it passed the existing cadence gate; retain that caveat when interpreting its median. The four repeated rows kept the same browser version and routes, yet their CPU changed substantially. A single median would hide this instability.

## Interpretation

The current FLAC24 transcoding route kept browser-media-element video for all nine single-audio, subtitle-free fixtures. The two bitmap subtitle rows also kept browser video with the mpv subtitle service. Dual-audio switched between native direct AAC and native transcoded AC-3 without a Hybrid route. The ASS case reached the same native split route but failed required subtitle visibility intermittently, so it needs a focused startup fix or qualification before restoring a passing cell.

Do not read the lower new numbers as measured savings versus the historical Hybrid or native-video/mpv-audio cells: those were different launches, asset builds and campaigns. The independent-launch drift also shows why route correctness and CPU publication need separate gates.
