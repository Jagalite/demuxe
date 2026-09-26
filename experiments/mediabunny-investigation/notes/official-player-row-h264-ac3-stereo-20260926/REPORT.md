<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 + AC-3 stereo / MKV row

The 36-second fixture is `h264-ac3-stereo/index.mkv`, SHA-256 `39ace6a005eb592fe13fe4da7e5f568da0c20a2c73cb051f59a26890044c7d8d`. Host `ffprobe` identified a two-channel, 48 kHz AC-3 track. The fixture came from the frozen `assets-release-auto-fix-20260925-03` catalogue and was copied without changing its hash into a Demuxe snapshot prepared at commit `231c4374`; the routing source last changed in `d7a3f7eb`. The published MediaBunny example received the same bytes as a local `File`; the maintained players used the snapshot's local range-capable URL. Browser: Chrome 153.0.8010.53 on macOS. MediaBunny's deployed example script SHA-256 was `5a8e7a70ce76e71c26f455e1227325deb8c8a4eddbf49663616a302a3d2c4533`.

## Correctness and route

The [maintained five-arm screen](../../../../results/head-to-head/row-h264-ac3-stereo-correctness-20260926-01/REPORT.md) passed Demuxe Auto, Demuxe Software and AVPlayer through marked video/stereo audio, pause/resume, 1.25× playback, seeks to 6, 1 and 10 seconds, EOF and cleanup. Plain video failed initial output; Movi failed near EOF. All five arms reported zero workers after cleanup. Auto selected `hybrid` **for the local URL harness source**. Its earlier `native-video-mpv-audio` README label came from local-File selective-audio qualification and does not describe this URL comparison. The current split plan still requires an inspected local File.

The [published MediaBunny player screen](result.json) passed moving marked video, stereo tones near 440/880 Hz, pause/resume, the three seeks and near-EOF settlement. It remains **Screened** because the example has no 1.25× rate control and cleanup was not independently observable. The screen used the new catalogue-ID path in the experimental qualification script; that path admits ordinary file-based video/audio fixtures and declines subtitle and adaptive-stream fixtures pending separate checks.

## One-browser-per-row CPU

The [experimental row runner](../../benchmark/official-player-row-cpu.mjs) used one headed Chrome for six arms and three rotating rounds, with fresh contexts per arm. The macOS startup task observation completed before measurement. Each round included a 20-second idle check; each arm had five seconds of warmup and a 20-second whole-Chrome CPU window. CPU is percent of one core, without idle subtraction. The [raw CPU result](../official-player-row-h264-ac3-stereo-cpu-20260926/result.json) and [request log](../official-player-row-h264-ac3-stereo-cpu-20260926/requests.jsonl) retain process samples, gates and source reads.

| Player arm | Round 1 | Round 2 | Round 3 | Median | Use |
| --- | ---: | ---: | ---: | ---: | --- |
| Plain native video | 11.15% | 11.43% | 11.21% | 11.21% | Diagnostic; failed correctness |
| Demuxe Auto (`hybrid`, URL) | 36.64% | 36.51% | 35.45% | **36.51%** | Accepted |
| Demuxe Software | 34.76% | 34.30% | 33.72% | **34.30%** | Accepted |
| Movi default | 21.96% | 32.61% | 31.51% | 31.51% | Diagnostic; failed correctness |
| AVPlayer default | 33.31% | 32.06% | 32.85% | **32.85%** | Accepted |
| MediaBunny official example | 33.53% | 34.68% | 33.77% | **33.77%** | Screened; fewer lifecycle controls |

All 18 windows had advancing timelines, stable process membership, focus and no reported errors. Pre-round idle CPU was 1.74%, 1.76% and 1.62%. Movi's failed-cell CPU moved by more than ten points; none of its samples is a playback-efficiency claim. The other windows are correlated within one Chrome launch. Different URL/File inputs and presentation implementations prevent subsystem attribution, and independent-launch reproducibility was not measured.
