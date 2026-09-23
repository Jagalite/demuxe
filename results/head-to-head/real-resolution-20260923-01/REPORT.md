# Real-resolution matched performance screen — 2026-09-23

Five original, synthetic, 36-second fixtures tested the existing routes at 1080p60 and 4K24. This is a bounded playback and CPU screen, not a codec-support or calibrated-fidelity claim. The fixture generator is [`prepare-real-resolution.py`](../../../tests/head-to-head/prepare-real-resolution.py); the frozen [commands](preparation-commands.json), [ffprobe catalogue](fixture-catalogue.json), [asset manifest](assets-manifest.json), and [accepted-round CSV](accepted-rounds.csv) retain the exact inputs and per-round observations. The complete [first correctness screen](../real-resolution-correctness-20260923-01/summary.json), [repeat pass-cell screen](../real-resolution-correctness-20260923-02/summary.json), and [CPU campaign](../real-resolution-performance-20260923-01/summary.json) retain failures, screenshots, route diagnostics, process samples, and exclusions.

## Fixtures and provenance

FFmpeg 8.1.2 generated all media from `testsrc2`, deterministic timeline-color markers, and 440/880 Hz marked stereo where audio is present. The PGS bitmap is original programmatic media; its [independent decoded oracle](../real-resolution-correctness-20260923-01/files/bitmap-oracles/rr-hevc-4k24-truehd-pgs.png) shows the expected magenta block. The command log records every exact FFmpeg argv, including source encodes, remuxes, audio encodes, ProRes encode, ffprobe checks, and packet hashes. No licensed source media was used. Bitrates below are measured container bitrate; exact per-stream packet bitrates and frame-rate fields are in the catalogue.

| Case / file | Video; resolution; rate; pixel format | Audio / subtitle | Duration | Container Mb/s | SHA-256 |
| --- | --- | --- | --- | ---: | --- |
| H.264 + AAC / `h264-1080p60-aac.mp4` | H.264 High; 1920×1080; 60; `yuv420p` | AAC LC stereo / none | 36.000 s | 4.045 | `1bd2b19758a3e038ea083af428b0ed97cc6190e8e7b483d3b51a6c3d061e560e` |
| HEVC + AAC / `hevc-main10-4k24-aac.mkv` | HEVC Main 10; 3840×2160; 24; `yuv420p10le` | AAC LC stereo / none | 36.021 s | 10.916 | `3607f044cdb24bf18727a0125343afcb93e78613cdbbc0eecffe09d881a060b9` |
| HEVC + TrueHD + PGS / `hevc-main10-4k24-truehd-pgs.mkv` | HEVC Main 10; 3840×2160; 24; `yuv420p10le` | TrueHD stereo / embedded PGS | 36.000 s | 11.900 | `1e893af0709e7319c2f2a4049c2a8c9b799b8eb6d7b89c0f52ddc78696302d28` |
| AV1 + Opus / `av1-4k24-opus.mkv` | AV1 Main; 3840×2160; 24; `yuv420p` | Opus stereo / none | 36.008 s | 12.322 | `9b54d82f866d14bfc284137c19d4e128d24b8d2aa70316a587c6e9c288affbd6` |
| ProRes video-only / `prores-proxy-1080p30.mov` | ProRes Proxy; 1920×1080; 30; `yuv422p10le` | none / none | 36.000 s | 12.320 | `061d9158918363e6890bfa1f26e033a918dffcd1dfc67f7d5feae16595a44c57` |

The two HEVC fixtures have the **same video packet hash**, `f439592a351342c44bb846ed7937143eb33266ef36511ff1e03380e13da7249d`, so the AAC versus TrueHD+PGS comparisons preserve the video bitstream. These are synthetic SDR pictures, including the 10-bit HEVC source. Playback checks do not establish HDR, surround, object-audio, color, or subtitle styling fidelity.

The exact measured stream packet bitrates, in video/audio/subtitle order, are: H.264 **3.837/0.192 Mb/s**; HEVC+AAC **10.719/0.192 Mb/s**; HEVC+TrueHD+PGS **10.725/1.103/0.011 Mb/s**; AV1 **12.125/0.192 Mb/s**; ProRes video **12.319 Mb/s**. The catalogue preserves the underlying integer bit/s values.

## Protocol and correctness gate

One fresh, matched campaign ran on macOS 25.5.0/arm64, eight logical CPUs, headed Chromium `153.0.8010.53`, with the same frozen asset snapshot and browser launch profile. The harness rotated lane order by round and measured each lane after the standard five-second warmup for a roughly 20-second process-CPU window. CPU is the sum of CDP-listed browser-process CPU time divided by elapsed wall time, expressed as percent of one core; it excludes the local server and external media services. Summed process RSS is a rough peak and may count shared pages more than once. Caches were not flushed between fresh browser runs.

Correctness was checked **before** CPU: timeline-color video output and continuous progression, marked audio and correct stereo tones when required, independently checked PGS drawing at start and after seeks, pause/resume, playback rate, forward/backward seeks, near EOF, and cleanup. Only the 18 passing cells entered CPU; all **54/54** of their rotated windows passed the existing steady-progression and frame-cadence gate. There were **zero rejected CPU windows and zero observed stalls**. HTML-video lanes reported zero drops in their accepted windows. Retained-frame and Software lanes have no comparable drop counter; their frame submission cadence passed, which does not certify physical display smoothness. The CSV carries each window's presented/expected frames, progression, RSS, route, and backend timers.

## Accepted CPU results

CPU medians, individual rounds and ranges are percentages of **one core**. `D0` means zero reported HTML-video drops in all three rounds; `D?` means no comparable drop counter. Every row passed correctness and had no steady-window stall. RSS is the median of each round's peak summed browser-process RSS, in MiB.

| Case | Lane | Observed route | CPU median | Rounds 1 / 2 / 3 | Min–max | Progression | Drops | RSS MiB |
| --- | --- | --- | ---: | --- | ---: | ---: | --- | ---: |
| H.264 1080p60 | Plain browser | Native Direct | 51.4 | 51.4 / 52.7 / 44.8 | 44.8–52.7 | 1.000–1.001× | D0 | 1,012 |
| H.264 1080p60 | Demuxe Auto | Native Direct | 53.3 | 54.2 / 53.3 / 46.3 | 46.3–54.2 | 1.009–1.012× | D0 | 1,108 |
| H.264 1080p60 | Demuxe Hybrid | Hybrid | 74.3 | 79.2 / 74.3 / 74.3 | 74.3–79.2 | 1.000× | D? | 1,112 |
| H.264 1080p60 | Demuxe Software | Software | 97.1 | 96.7 / 97.8 / 97.1 | 96.7–97.8 | 1.000× | D? | 1,139 |
| H.264 1080p60 | AVPlayer | Custom | 69.1 | 69.1 / 57.9 / 70.1 | 57.9–70.1 | 1.000× | D0 | 1,120 |
| HEVC 4K24 + AAC | Plain browser | Native Direct | 49.6 | 40.9 / 51.0 / 49.6 | 40.9–51.0 | 0.999–1.000× | D0 | 975 |
| HEVC 4K24 + AAC | Demuxe Auto | Native Direct | 44.7 | 40.7 / 44.7 / 49.4 | 40.7–49.4 | 0.998–1.000× | D0 | 991 |
| HEVC 4K24 + AAC | Demuxe Hybrid | Hybrid | 70.5 | 70.5 / 70.6 / 64.1 | 64.1–70.6 | 1.000–1.002× | D? | 1,073 |
| HEVC 4K24 + AAC | Demuxe Software | Software | 125.0 | 126.6 / 122.2 / 125.0 | 122.2–126.6 | 0.999–1.000× | D? | 1,458 |
| HEVC 4K24 + AAC | AVPlayer | Custom | 61.1 | 61.1 / 59.0 / 62.4 | 59.0–62.4 | 0.999–1.000× | D0 | 1,086 |
| HEVC 4K24 + TrueHD + PGS | Demuxe Auto | Hybrid | 65.1 | 65.1 / 69.1 / 61.5 | 61.5–69.1 | 1.000–1.002× | D? | 1,130 |
| HEVC 4K24 + TrueHD + PGS | Demuxe Hybrid | Hybrid | 71.0 | 69.4 / 71.0 / 72.2 | 69.4–72.2 | 1.000× | D? | 1,116 |
| HEVC 4K24 + TrueHD + PGS | Demuxe Software | Software | 127.9 | 128.3 / 127.9 / 113.6 | 113.6–128.3 | 0.999–1.000× | D? | 1,444 |
| AV1 4K24 + Opus | Demuxe Auto | Native Direct | 75.1 | 71.9 / 75.1 / 86.0 | 71.9–86.0 | 1.002–1.005× | D0 | 1,391 |
| AV1 4K24 + Opus | Demuxe Hybrid | Hybrid | 73.7 | 73.5 / 73.7 / 74.7 | 73.5–74.7 | 1.000–1.002× | D? | 1,356 |
| AV1 4K24 + Opus | Demuxe Software | Software | 103.7 | 103.7 / 100.4 / 114.3 | 100.4–114.3 | 0.999–1.001× | D? | 1,306 |
| ProRes 1080p30 | Demuxe Auto | Software | 78.5 | 79.9 / 71.6 / 78.5 | 71.6–79.9 | 1.000–1.001× | D? | 1,153 |
| ProRes 1080p30 | Demuxe Software | Software | 71.3 | 71.3 / 70.1 / 83.9 | 70.1–83.9 | 1.000–1.001× | D? | 1,142 |

**Observed Demuxe decoder/presenter paths:** Native Direct uses the browser media element for video, audio, and presentation. Hybrid uses browser WebCodecs video (`avc1.64002a`, `hev1.2.4.L150.90`, or AV1 as applicable), mpv PCM audio, retained `VideoFrame` presentation, and the mpv subtitle service; the TrueHD+PGS rows used all three owners and validated audio plus subtitles. Software uses FFmpeg video decode through the mpv/Wasm backend, its RGB canvas presenter, and mpv PCM audio where present. Auto ProRes and forced ProRes selected the same Software path. AVPlayer reported `custom`; this harness did not expose a trustworthy internal decoder/presenter breakdown for it. The plain lane is browser native media playback.

## Correctness exclusions — no CPU reported

| Case | Lane | Last observed route | First failure stage |
| --- | --- | --- | --- |
| H.264 1080p60 | Movi | Custom | Near-EOF timeout |
| HEVC 4K24 + AAC | Movi | Custom | Playback-rate progression |
| HEVC 4K24 + TrueHD + PGS | Plain browser | No route established | Initial marked audio/progression timeout |
| HEVC 4K24 + TrueHD + PGS | Movi | Custom | Required PGS drawing absent at startup |
| HEVC 4K24 + TrueHD + PGS | AVPlayer | No route established | Initial marked audio/progression timeout |
| AV1 4K24 + Opus | Plain browser | Native Direct | Marked audio missing/wrong after seek to 6 s; repeated in the pass-cell screen |
| AV1 4K24 + Opus | Movi | Custom | Playback-rate progression |
| AV1 4K24 + Opus | AVPlayer | MSE | Near-EOF timeout |
| ProRes 1080p30 | Plain browser | No route established | Open: no supported source |
| ProRes 1080p30 | Demuxe Hybrid | No route established | Open: no browser video bridge for ProRes |
| ProRes 1080p30 | Movi | Custom | Initial timeline marker incorrect |
| ProRes 1080p30 | AVPlayer | No route established | Open: no supported stream |

These are fixture-specific failures at the stated checks, not broad format-support conclusions. The pass-cell repeat intentionally rechecked all 18 qualifiers and retried plain AV1; it again failed audio after seek. Competitor configurations other than the default lanes were outside this compact campaign.

## Interpretation

1. **Native scaling.** On 1080p60 H.264, Auto's Native Direct median was 53.3% versus plain 51.4%: **+1.9 percentage points, about +3.7% relative**. On 4K24 HEVC, Auto was 44.7% versus plain 49.6%; the 4.9-point apparent improvement is within overlapping round ranges and is not evidence that the wrapper makes decode faster. Both Native Direct paths have small measured wrapper cost relative to the native decode workload. AV1 Auto was 75.1%, but plain AV1 did not pass correctness, so there is no qualified AV1 native-overhead number.
2. **Selective TrueHD+PGS cost.** The 4K selective Auto route kept HEVC in WebCodecs, with TrueHD through mpv PCM and PGS through mpv subtitles. It cost 65.1% versus 44.7% for AAC Auto Native Direct (**+20.4 points**, including the change in video route/presenter), and 49.6% plain HEVC Native Direct (**+15.5 points**). A cleaner, same-video-route control is HEVC+AAC forced Hybrid at 70.5%: the selective Auto median was **5.4 points lower**, while selective forced Hybrid was 71.0%, **0.5 point higher**. With three noisy rounds, this supports **no resolved positive incremental TrueHD+PGS CPU cost beyond Hybrid's baseline**; it does not prove zero cost. Auto saved 62.8 points against forced full Software on the selective file. TrueHD in this fixture is stereo, and the screen does not validate lossless/object fidelity.
3. **Hybrid scaling.** H.264 Hybrid added 21.0 points over Auto at 1080p60; HEVC Hybrid added 25.8 points over Auto at 4K24. This is material but did **not** produce an obvious runaway 4K multiplier in these unlike-codec/frame-rate cases. On AV1 4K24, Hybrid and Auto were 73.7% and 75.1% respectively, with no plain qualified reference. Hybrid diagnostics show `skipCanvas=true`, zero explicit RGB copy time, and only about 0.01–0.04 seconds in the backend render call per 20-second window. This narrows the overhead away from the explicit canvas-copy path; WebCodecs frame transfer/retention, mpv demux/audio, scheduling, and browser presentation are not separately timed here. A single dominant Hybrid cause is **unresolved**.
4. **Software scaling and bottlenecks.** Forced Software HEVC 4K24 used 125.0% of a core with AAC and 127.9% with TrueHD+PGS, against 44.7% Native Direct and 70.5% Hybrid on the AAC video. It remains at approximately 1× progression by using more than one core, and is the clearest expensive path. In each HEVC Software window, the mpv render call accumulated about **5.1 seconds** of wall time and the explicit RGB copy/`putImageData` section about **0.25 seconds**; total browser CPU was about 25 seconds per window. For Software AV1 4K24, the corresponding figures were about 5.0 and 0.25 seconds; for ProRes 1080p30, about 3.9–4.0 and 0.32 seconds. These timers show meaningful render/conversion/presentation work and a small explicit copy section. They do not isolate codec decode from conversion, scaling, synchronization, or process overlap, so a precise percentage breakdown or single dominant substage is not established. ProRes Auto and forced Software were 78.5% and 71.3% on the same Software route; their overlapping ranges do not support a route-policy conclusion.
5. **Planner and next measurements.** Auto's Native Direct choices for H.264, HEVC+AAC, and AV1 were reasonable where qualified. The TrueHD+PGS file is a meaningful route boundary: Native Direct/Remux with mpv subtitle service was not admitted because embedded-file subtitle qualification is still required, so Auto selected Hybrid even though the 4K HEVC decoder stayed browser-native. A focused qualification of native-video plus mpv audio/subtitles could save the measured **roughly 20-point Direct-to-Hybrid gap** if its full correctness and fidelity contract can be met. Other targets are to instrument Hybrid frame handoff versus mpv audio/demux cost, and separate mpv Software decode from RGB conversion/render with dedicated timers. No production route or optimization was changed in this campaign.

The prior small-fixture campaigns are **not** numerically normalized against these results; they used different snapshots and workloads. No HDR calibration, physical display drop measurement, surround/object verification, or release qualification is inferred from these synthetic screens.
