<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + MP3 stereo / MP4 row

The exact 36-second fixture was `h264-mp3/index.mp4`, SHA-256 `39bca6ad56ad13b0b74e907c9d6483dc07471f1bfef875403018a22bd0747ada`. The maintained correctness and CPU snapshots contained identical media bytes and frozen Demuxe runtime bytes. Browser: Chrome 153.0.8010.53 on macOS.

## Correctness

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-mp3-correctness-20260925-01/REPORT.md) passed bounded marked-output, lifecycle, and seek checks for plain video, Demuxe Auto, Demuxe Software, and AVPlayer. Movi failed its near-EOF check. The run passed integrity verification. AVPlayer's fresh full pass supersedes the historical partial-playback label for this exact row.

The published MediaBunny example passed moving marked video, stereo tones, pause/resume, seeks to 6, 1, and 10 seconds, and near-EOF settlement in the [confirmed screen](result.json). It remains **Screened** because the example lacks a 1.25× rate control and observable cleanup state. The deployed player script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

The [first attempt](../official-player-row-h264-mp3-20260925/result.json) failed the test's audio frequency estimate. An [instrumented repeat](../official-player-row-h264-mp3-diagnostic-20260925/result.json) found one low-level first MP3 output buffer with extra zero crossings; later buffers measured approximately 440/880 Hz, matching host FFmpeg decode of the fixture. The marked-audio checker now excludes that low-level startup buffer before accumulating its frequency estimate. The failed attempts are retained as harness diagnostics, not counted as player failures.

## Matched CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) used **one headed Chrome launch for all six player arms**, fresh contexts, and a rotated order in three rounds. The macOS startup task gate completed. Each round included a 20-second idle observation; each arm had five seconds of warmup and a 20-second whole-Chrome CPU window. The published MediaBunny example received the local fixture as a `File`; maintained players used the same bytes from the local range server. CPU is percent of one core, without idle subtraction. [Raw samples and gates](../official-player-row-h264-mp3-cpu-matched-20260925/result.json) are retained.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain native video | 14.01% | 13.26% | 12.92% | **13.26%** | Passed |
| Demuxe Auto (`native-direct`) | 14.35% | 14.26% | 8.14% | **14.26%** | Passed; third CPU window low |
| Demuxe Software | 36.19% | 33.57% | 32.92% | **33.57%** | Passed |
| Movi default | 25.75% | 13.22% | 33.02% | 25.75% | Diagnostic; failed correctness; excluded from README CPU |
| AVPlayer default | 34.24% | 33.47% | 34.46% | **34.24%** | Passed |
| MediaBunny official player | 35.45% | 34.73% | 32.68% | **34.73%** | Screened |

All playback windows had stable process IDs, normal timeline progress, and frame activity where observed. The three Auto windows used `native-direct`, selected MP3 audio, and displayed about 604 frames per 20 seconds without reported drops. In round 3, Auto's renderer/GPU/audio CPU together fell from roughly 14 to 8 points; no cause was established. A separate [fresh-Chrome Auto-only follow-up](../official-player-row-h264-mp3-cpu-auto-followup-20260925/result.json) returned **13.88%, 14.06%, and 14.12%**. The matched 8.14% window is retained and the table uses the matched median, not a selectively trimmed average. Small player differences should not be inferred from this row.

Idle whole-Chrome CPU before rounds 1–3 was 1.79%, 1.95%, and 1.38%; summed idle RSS was 999,168, 1,091,616, and 807,792 KiB. There was no monotonic idle CPU trend. Summed RSS can count shared pages twice. The three matched rounds share one launch, and the follow-up only covers Auto; neither establishes independent-launch reproducibility for all six arms. These are whole-player figures, not demux or decoder attribution.
