<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + E-AC-3 stereo / MKV row

The 36-second fixture is `h264-eac3-stereo/index.mkv`, SHA-256 `9838ead115d38776bdc553bfd263267be6f0e39fb57ebbfc54c190ad18cf99b6`. Host `ffprobe` identified a two-channel, 48 kHz E-AC-3 track. The frozen fixture came from `assets-release-auto-fix-20260925-03` and retained its hash in the Demuxe snapshot prepared at commit `231c4374`. MediaBunny received the same bytes as a local `File`; the maintained players used the snapshot's local range-capable URL. Browser: Chrome 153.0.8010.53 on macOS. The official MediaBunny example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-eac3-stereo-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video/stereo audio, pause/resume, 1.25× playback, seeks to 6, 1 and 10 seconds, EOF and cleanup. Plain video failed initial output; Movi failed near EOF. All five reported zero workers after cleanup. Auto selected `hybrid` for this URL source.

The [published MediaBunny player screen](result.json) passed moving marked video, stereo tones near 440/880 Hz, pause/resume, the same three seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× rate control and cleanup was not independently observable. The screen used the bounded catalogue-ID path for file-based video/audio fixtures; no subtitle or streaming capability is inferred.

## One-browser-per-row CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) measured the four viable/screened players in one headed Chrome launch across three rotating rounds, with a fresh context per arm. The macOS startup task observation completed before measurement. Each round had a 20-second idle check; each arm had five seconds of warmup and a 20-second whole-Chrome CPU window. CPU is percent of one core, without idle subtraction. The [raw result](../official-player-row-h264-eac3-stereo-cpu-20260926/result.json) and [request log](../official-player-row-h264-eac3-stereo-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Demuxe Auto (`hybrid`, URL) | 34.97% | 34.11% | 36.53% | **34.97%** | Accepted |
| Demuxe Software | 35.41% | 35.40% | 34.38% | **35.40%** | Accepted |
| AVPlayer default | 33.62% | 33.58% | 31.45% | **33.58%** | Accepted |
| MediaBunny official example | 34.44% | 34.62% | 34.14% | **34.44%** | Screened; fewer lifecycle controls |

All 12 windows had advancing timelines, stable process membership, focus and no reported errors. Pre-round idle CPU was 1.59%, 1.53% and 1.62%. Plain video and Movi were tested for correctness but received no CPU windows because they failed. Auto and AVPlayer each moved by more than two core-percentage points across the correlated rounds; these medians do not establish independent-launch reproducibility or a precise ranking. Different URL/File inputs and player presentation implementations prevent decoder-level attribution.
