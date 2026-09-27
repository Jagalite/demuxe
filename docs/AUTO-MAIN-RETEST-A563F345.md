<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Demuxe Auto README retest on current main

Date: 2026-09-27. Source: `main` at `a563f34571f6d319c8a919045b50920624710b00`. Browser: headed Chrome 153.0.8010.53 on macOS. This campaign retests **Demuxe Auto only**. Other player cells retain their separately qualified evidence.

## Frozen runtime and method

`npm run build:remux` and `npm run build` rebuilt the runtime from this commit. The served snapshot is `build/head-to-head/assets-auto-main-a563f345-20260927-02`, manifest SHA-256 `e062901809327c7544c55b35ca0b749e0df99c8b58ba48fef1d09d70ab027d3f`. Its remux and adaptation WASM SHA-256 values are `cc7a72dd3f114d7d7bb769e652a72aadbccb06fc8e6fea951ab477343d31ff67` and `2e829ff6ef44d6c2f313004bb78714946804d202153b108ee43b9e09cf7bc562`. It uses the latest stereo row fixture catalogue and adds the 15 fixture IDs absent from that catalogue. Shared priority fixture bytes were compared with the prior frozen stereo snapshot. An earlier `-01` snapshot was found to contain older, different media for several shared IDs; its diagnostic runs are retained but **excluded** from all README figures.

The [priority correctness archive](../results/head-to-head/auto-main-a563f345-priority12-correctness-20260927-02/summary.json) passed all 12 cases. The H.264/AC-3/ASS case also passed [repeat 1](../results/head-to-head/auto-main-a563f345-h264-ac3-ass-correctness-repeat1-20260927/summary.json) and [repeat 2](../results/head-to-head/auto-main-a563f345-h264-ac3-ass-correctness-repeat2-20260927/summary.json), after an intermittent failure on the previous commit. Correctness includes marked video/audio, required subtitle markers, pause/resume, rate, seeks, near EOF and cleanup. Route and video owner were inspected after seeks. Every priority route retained `browser-media-element` as the video owner.

CPU runs used one fresh headed Chrome launch **per row**, three 20-second whole-browser-process windows after five seconds of warmup and idle checks, with no fixed idle subtraction. A second independent launch supplied three more windows for the rows with prior DTS/HEVC CPU drift. The percentages below are one-core equivalents. Old software/Hybrid CPU values in the README came from other campaigns and are not matched causal comparisons. Raw CPU samples, per-process roles, frame counters, browser identity and gate outcomes are in each linked `summary.json` archive. Archive integrity was verified separately from playback correctness.

The benchmark originally had no frame counter for the internally owned `<video>` on `native-remux`; it rejected the TS CPU measurement. A narrowly scoped benchmark-only fallback now reads the route's existing `NativePlayer` `getVideoPlaybackQuality()` diagnostics. A [fresh TS correctness run](../results/head-to-head/auto-main-a563f345-h264-ts-correctness-counter-20260927-01/summary.json) and [three CPU windows](../results/head-to-head/auto-main-a563f345-h264-ts-cpu-counter-20260927-01/summary.json) passed using that counter. Production playback code was unchanged.

## Priority results

| Fixture | Current Auto route | Correctness | CPU windows, percent of one core | README CPU |
| --- | --- | --- | --- | --- |
| H.264 + DTS core stereo / MKV | `native-transcode` | Pass | 17.50, 18.71, 19.04; repeat 17.83, 18.39, 18.23 | 18.3% |
| HEVC Main10 + AC-3 / MKV | `native-transcode` | Pass | 21.09, 20.33, 20.75; repeat 21.41, 20.97, 21.43 | 21.0% |
| HEVC Main10 + E-AC-3 / MKV | `native-transcode` | Pass | 21.18, 21.86, 21.68; repeat 20.91, 21.40, 21.84 | 21.5% |
| HEVC Main10 + DTS core / MKV | `native-transcode` | Pass | 20.92, 21.71, 21.57; repeat 21.61, 22.68, 20.88 | 21.6% |
| H.264 + AC-3 stereo + ASS / MKV | `native-transcode-mpv` | Pass in 3 current independent checks | 19.74, 20.02, 18.63 | 19.7% |
| H.264 + PCM24 / MKV + external ASS | `native-direct-ass` | Pass | 10.95, 19.99, 20.54; repeat 20.42, 20.70, 20.28; second repeat 20.35, 19.19, 20.63 | 19.8% from [fresh follow-up](CPU-GAP-CLOSEOUT.md) |
| H.264 + AAC + embedded SRT / MKV | `native-remux-mpv` | Pass | 18.89, 18.40, 18.69 | 18.7% |
| H.264 + AAC + embedded mov_text / MP4 | `native-remux-mpv` | Pass | 19.26, 18.08, 18.27 | 18.3% |
| H.264 + AAC + styled ASS / MKV | `native-remux-mpv` | Pass | 18.21, 18.07, 18.01 | 18.1% |
| H.264 + AAC + PGS / MKV | `native-remux-mpv` | Pass, marked bitmap output | 17.62, 18.59, 18.47 | 18.5% |
| H.264 + AAC + VobSub / MKV | `native-remux-mpv` | Pass, marked bitmap output | 18.55, 19.27, 17.62 | 18.6% |
| H.264 + AAC / MPEG-TS | `native-remux` | Pass with internal video counter | 18.74, 18.28, 19.44 | 18.7% |

The first eleven fixture CPU archives are under `results/head-to-head/auto-main-a563f345-<fixture>-cpu-20260927-02/summary.json`; the independent launches use `-cpu-repeat-20260927-02`, and PCM/ASS has a `-cpu-repeat2-20260927-02` archive. All accepted priority windows reported no dropped frames and kept their selected route. The AC-3/ASS repeat passes improve the current-build evidence but do not prove the older intermittent issue impossible. The PCM/ASS first CPU window used roughly half the renderer/GPU CPU of the other eight despite the same route and normal frame count. The libass overlay reported the same 600 render ticks and two bitmap updates as the next window, but visual output was not separately sampled during CPU measurement. The CPU difference remains unexplained. The subsequent [fresh follow-up](CPU-GAP-CLOSEOUT.md) publishes its independent three-window median of 19.8%; it does not pool or discard this earlier low window.

## Remaining README rows

The [25-row correctness archive](../results/head-to-head/auto-main-a563f345-remaining25-correctness-20260927-01/summary.json) has eight full passes, eight bounded screens, five fixture-preparation blocks and four playback failures. The separate [failure repeat](../results/head-to-head/auto-main-a563f345-specialist-failures-repeat-20260927-01/summary.json) reproduced all four failures. A screen does not qualify HDR transfer/display fidelity, lossless audio fidelity or object audio. Failed and unprepared rows cannot receive a current CPU number.

The five unavailable source contracts are TrueHD 7.1 (the installed encoder supports at most 5.1), DTS-HD MA 7.1 (no encoder or validated sample), E-AC-3 with Atmos objects (the installed encoder cannot author the object metadata), and Dolby Vision profiles 5 and 8.1 (no qualified marked sample or reference output oracle). The four repeatable current-build failures are HDR10/TrueHD/PGS and both Dolby Vision/Atmos/ASS combinations with missing or incorrect marked left/right audio, plus HDR10/DTS-HD/PGS timing out at initial playback. These test sources are bounded synthetic specialist fixtures; their failure must not be generalized to every real-world file with those labels. The previous README screens are retained in their historical report, but they do not qualify the current build.

The fresh [MSE correctness archive](../results/head-to-head/auto-main-a563f345-mse-correctness-counter-20260927-01/summary.json) passed all three DASH/live rows. Their CPU measurements use the harness-visible HTML video playback-quality counter. The eight fully passing cases and eight bounded screens selected these routes:

| Fixture | Current Auto route | Qualification | CPU windows, percent of one core | README CPU |
| --- | --- | --- | --- | --- |
| PCM16 audio-only / WAV | `native-direct` | Pass | 3.02, 3.09, 3.12 | 3.1% |
| PCM24 audio-only / WAV | `native-direct` | Pass | 3.35, 3.28, 3.40 | 3.4% |
| HEVC Main10 + E-AC-3 / MKV (HDR10) | `native-transcode` | Bounded HDR screen | Initial 19.68, 19.34, then 121-drop rejection; fresh repeat 18.86, 19.70, 20.13 | 19.7% from complete repeat |
| HEVC Main10 + AAC / MP4 (HLG) | `native-direct` | Bounded HDR screen | 18.28, 16.67, 16.83 | 16.8% |
| AV1 10-bit + Opus / WebM (HDR10) | `native-direct` | Bounded HDR screen | 18.94, 19.59, 18.78 | 18.9% |
| H.264 + AAC / HLS VOD (TS) | `native-direct` | Pass | 14.67, 15.04, 16.01 | 15.0% |
| H.264 + AAC / HLS VOD (fMP4) | `native-direct` | Pass | 14.63, 15.55, 15.85 | 15.6% |
| HEVC + AAC / HLS VOD (fMP4) | `native-direct` | Pass; corrected-fixture follow-up passed | Original: six windows rejected with 10 drops each; corrected: 15.27, 14.91, 14.47 with zero drops | 14.9% from [fresh follow-up](CPU-GAP-CLOSEOUT.md) |
| H.264 + AAC / DASH VOD | `shaka-mse` | Pass | 17.99, 16.31, 18.33; independent repeat 17.86, 17.32, 19.10 | 17.9% |
| AV1 + Opus / DASH VOD | `shaka-mse` | Pass | 17.74, 18.32, 17.11 | 17.7% |
| H.264 + AAC / HLS live | `shaka-mse` | Pass | 18.91, 19.40, 18.09 | 18.9% |
| HEVC Main10 + AAC / MKV | `native-direct` | Bounded 36-second screen | 19.36, 19.13, 19.20 | 19.2% |
| HEVC Main10 + FLAC / MKV | `native-direct` | Bounded screen; lossless fidelity unqualified | 18.51, 17.31, 17.41 | 17.4% |
| HEVC Main10 + Opus / MKV | `native-direct` | Bounded 36-second screen | 19.78, 20.04, 19.65 | 19.8% |
| HEVC Main10 + FLAC + ASS / MKV | `native-remux-mpv` | Bounded screen; lossless fidelity unqualified | 21.82, 23.65, 22.52 | 22.5% |
| HEVC Main10 + Opus + ASS / MKV | `native-remux-mpv` | Bounded 36-second screen | 23.06, 23.49, 22.52 | 23.1% |

The first 13 CPU archives in this table use `results/head-to-head/auto-main-a563f345-<fixture>-cpu-20260927-03/summary.json`. The screened rows report `blocked` with `screenPassed=true` and, where qualified, `screenMeasured=true`; this is the intended fidelity limitation, not a benchmark failure. All viable video rows above retained `browser-media-element` ownership in the correctness archive. The accepted CPU windows have stable routes and zero counted drops. HEVC HDR and HLS rejected windows remain in their archives. The [HEVC HDR fresh repeat](../results/head-to-head/auto-main-a563f345-hdr10-hevc-cpu-finalharness-20260927-01/summary.json) passed three complete windows at 18.86, 19.70 and 20.13% with zero drops; its 19.7% bounded-screen median uses that launch alone. The initial launch had a separate severe dropped-frame failure, so runtime cadence is not proven perfectly repeatable.

The DASH CPU archives use `results/head-to-head/auto-main-a563f345-<fixture>-cpu-counter-20260927-01/summary.json`; H.264 DASH has an independent `-cpu-counter-repeat-20260927-01` launch. Its pooled six-window median is 17.9%, with a 16.31–19.10% range and no drops. All three MSE rows exposed the harness-visible HTML video counter, so a temporary Shaka diagnostics-counter extension was removed from the final benchmark source. The original [live HLS CPU archive](../results/head-to-head/auto-main-a563f345-hls-live-cpu-counter-20260927-01/summary.json) passed its first window but stalled in rounds two and three: the fixture server keyed its finite sliding playlist to one unchanged URL across all rounds. The benchmark adapter now appends the round to the live URL, giving each fresh context its own server playlist epoch. The [fresh final-harness correctness archive](../results/head-to-head/auto-main-a563f345-live-hevc-correctness-finalharness-20260927-01/summary.json) passed live HLS, and [three final-harness CPU windows](../results/head-to-head/auto-main-a563f345-hls-live-cpu-finalharness-20260927-01/summary.json) passed. The media segments and production player are unchanged.

The [HEVC HLS independent CPU repeat](../results/head-to-head/auto-main-a563f345-hls-hevc-cpu-finalharness-20260927-01/summary.json) reproduced all three dropped-frame rejections. Browser counters advanced by 600 total frames and 10 dropped frames in each 20-second window, while the route stayed `native-direct`. This was a repeatable quality-gate failure, not a missing benchmark counter. The [follow-up](CPU-GAP-CLOSEOUT.md) isolated a fixture-muxing timestamp defect; the corrected fixture passed correctness and three zero-drop CPU windows, yielding the published 14.9% median.

## Outcome

The 12 priority rows passed current-main Auto correctness. Across all 37 rows addressed in this pass, 20 passed full correctness, eight passed bounded specialist screens, five lack qualified fixtures, and four failed current correctness twice. With the [subsequent PCM24/ASS and corrected HEVC HLS follow-up](CPU-GAP-CLOSEOUT.md), twenty-eight have published Auto CPU figures. The historical PCM24/ASS low window remains unexplained and is retained separately from its fresh median. Every correctly playing video row selected browser media element video through its applicable seek and lifecycle checks; unsupported audio or subtitles did not move those rows to Hybrid. This statement applies to the tested fixtures and browser, not to the nine blocked or failed specialist contracts.

The earlier first-snapshot diagnostic material is excluded from the README because its fixture bytes differed from the final snapshot; one interrupted diagnostic CPU directory has no completed manifest. `tests/head-to-head/verify.mjs` passed for all 49 completed `auto-main-a563f345*` archives, including failed and blocked outcomes. The benchmark-only changes add a native remux video counter fallback and reset the live fixture playlist epoch per CPU round. Production routing and playback implementations were not changed.

The HEVC HLS fixture timestamp issue is resolved by the follow-up. Remaining investigations include the historical PCM24/external ASS low-CPU state, qualified specialist bitstreams, and the older intermittent AC-3/ASS subtitle issue. Published values use qualified fresh measurements rather than copied historical figures.
