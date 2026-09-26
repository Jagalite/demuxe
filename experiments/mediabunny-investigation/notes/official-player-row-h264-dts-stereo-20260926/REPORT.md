<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + DTS core stereo / MKV row

The 36-second fixture is `h264-dts-stereo/index.mkv`, SHA-256 `8f070aac0d9588cc842ca264be6d5ad53af58cc235a67063db1843822d8517ad`. Host `ffprobe` identified a two-channel, 48 kHz DTS track. It came from the frozen `assets-release-auto-fix-20260925-03` catalogue and retained its hash in the Demuxe snapshot prepared at commit `231c4374`. MediaBunny received the same bytes as a local `File`; the maintained players used the snapshot's local range-capable URL. Browser: Chrome 153.0.8010.53 on macOS. The official MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-dts-stereo-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video/stereo audio, pause/resume, 1.25× playback, seeks to 6, 1 and 10 seconds, EOF and cleanup. Plain video failed initial output; Movi failed playback-rate progression. All five reported zero workers after cleanup. Auto selected `hybrid` **for the local URL source**. Its earlier `native-video-mpv-audio` README label came from local-File selective-audio qualification, which is a different input contract.

The [published MediaBunny player screen](result.json) passed moving marked video, stereo tones near 440/880 Hz, pause/resume, the same three seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× rate control and cleanup was not independently observable. The catalogue-ID screen is limited to ordinary file-based video/audio fixtures and does not qualify subtitles or streaming.

## One-browser-per-row CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) measured the four viable/screened players in one headed Chrome launch across three rotating rounds with fresh contexts per arm. The macOS startup task observation completed before measurement. Each round had a 20-second idle check; each arm had five seconds of warmup and a 20-second whole-Chrome CPU window. CPU is percent of one core, without idle subtraction. The [raw result](../official-player-row-h264-dts-stereo-cpu-20260926/result.json) and [request log](../official-player-row-h264-dts-stereo-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 35.24% | 38.22% | 39.11% | **38.22%** | Accepted; wide range |
| Demuxe Software | 36.57% | 34.38% | 34.61% | **34.61%** | Accepted |
| AVPlayer default | 36.94% | 39.41% | 37.81% | **37.81%** | Accepted |
| MediaBunny official example | 35.55% | 35.89% | 35.14% | **35.55%** | Screened; fewer lifecycle controls |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Pre-round idle CPU was 2.14%, 1.65% and 1.45%. Auto rose by 3.87 core-percentage points from its first to third window while idle fell; AVPlayer ranged by 2.47 points. Those spreads and the one-launch design preclude a precise CPU ranking. Plain video and Movi received no CPU windows because their correctness screens failed. Different URL/File inputs and presentation implementations prevent decoder-level attribution.
