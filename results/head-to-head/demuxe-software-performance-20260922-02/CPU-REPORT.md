# Demuxe forced Software CPU measurements

Browser: `chromium/153.0.8010.53/chrome/headed`. Source revision: `283a8effb99c356f1d6eb8ee8163628bb6fa7493`.
Host: `darwin 25.5.0`, `arm64`, 8 CPUs.
Run window: `2026-09-22T23:14:17.181Z` to `2026-09-23T00:25:06.905Z` UTC.

**45 of 46 fixtures have accepted three-round medians.** The campaign recorded 138 rounds: 136 passed and 2 failed. Both failed rounds were the bounded HLS live fixture; playback stopped advancing before the 20-second measurement window ended. The separate HLS live correctness screen passed its bounded progression check, but no CPU median is reported.

Each round used a five-second warmup followed by a 20-second window. CPU is the summed CDP-listed Chromium process CPU time divided by window time, shown as a percentage of one core. The run verifies player advancement and, for video, cadence from the software canvas submission counter. Audio-only rows do not require a video counter. Renderer submissions do not measure physical display timing; the method excludes the fixture server, external services and physical energy. Full per-round records are in the [campaign report](REPORT.md).

These are descriptive forced-Software measurements. They were run separately from the README auto and competitor CPU campaigns and are not paired comparisons.

| Fixture | Median CPU (% of one core) | Three-round range | Round records |
| --- | ---: | ---: | --- |
| `h264-mp3` | 67.1% | 66.5–69.0% | [R1](demuxe.software.h264-mp3.round-1/result.json) / [R2](demuxe.software.h264-mp3.round-2/result.json) / [R3](demuxe.software.h264-mp3.round-3/result.json) |
| `h264-flac` | 48.9% | 46.5–62.7% | [R1](demuxe.software.h264-flac.round-1/result.json) / [R2](demuxe.software.h264-flac.round-2/result.json) / [R3](demuxe.software.h264-flac.round-3/result.json) |
| `h264-opus` | 48.0% | 41.8–51.1% | [R1](demuxe.software.h264-opus.round-1/result.json) / [R2](demuxe.software.h264-opus.round-2/result.json) / [R3](demuxe.software.h264-opus.round-3/result.json) |
| `h264-pcm16` | 48.5% | 46.0–49.0% | [R1](demuxe.software.h264-pcm16.round-1/result.json) / [R2](demuxe.software.h264-pcm16.round-2/result.json) / [R3](demuxe.software.h264-pcm16.round-3/result.json) |
| `hevc-hvc1` | 49.0% | 44.8–49.6% | [R1](demuxe.software.hevc-hvc1.round-1/result.json) / [R2](demuxe.software.hevc-hvc1.round-2/result.json) / [R3](demuxe.software.hevc-hvc1.round-3/result.json) |
| `hevc-hev1` | 50.6% | 48.1–50.6% | [R1](demuxe.software.hevc-hev1.round-1/result.json) / [R2](demuxe.software.hevc-hev1.round-2/result.json) / [R3](demuxe.software.hevc-hev1.round-3/result.json) |
| `hevc10-aac` | 48.3% | 45.7–50.0% | [R1](demuxe.software.hevc10-aac.round-1/result.json) / [R2](demuxe.software.hevc10-aac.round-2/result.json) / [R3](demuxe.software.hevc10-aac.round-3/result.json) |
| `hevc10-ac3` | 47.8% | 47.6–49.6% | [R1](demuxe.software.hevc10-ac3.round-1/result.json) / [R2](demuxe.software.hevc10-ac3.round-2/result.json) / [R3](demuxe.software.hevc10-ac3.round-3/result.json) |
| `hevc10-eac3` | 47.5% | 43.2–49.2% | [R1](demuxe.software.hevc10-eac3.round-1/result.json) / [R2](demuxe.software.hevc10-eac3.round-2/result.json) / [R3](demuxe.software.hevc10-eac3.round-3/result.json) |
| `hevc10-dts` | 54.2% | 49.1–56.9% | [R1](demuxe.software.hevc10-dts.round-1/result.json) / [R2](demuxe.software.hevc10-dts.round-2/result.json) / [R3](demuxe.software.hevc10-dts.round-3/result.json) |
| `av1-aac` | 45.5% | 45.2–50.9% | [R1](demuxe.software.av1-aac.round-1/result.json) / [R2](demuxe.software.av1-aac.round-2/result.json) / [R3](demuxe.software.av1-aac.round-3/result.json) |
| `av110-opus` | 47.1% | 46.3–47.6% | [R1](demuxe.software.av110-opus.round-1/result.json) / [R2](demuxe.software.av110-opus.round-2/result.json) / [R3](demuxe.software.av110-opus.round-3/result.json) |
| `av1-webm` | 46.1% | 43.3–47.3% | [R1](demuxe.software.av1-webm.round-1/result.json) / [R2](demuxe.software.av1-webm.round-2/result.json) / [R3](demuxe.software.av1-webm.round-3/result.json) |
| `vp9-opus` | 48.8% | 47.7–49.0% | [R1](demuxe.software.vp9-opus.round-1/result.json) / [R2](demuxe.software.vp9-opus.round-2/result.json) / [R3](demuxe.software.vp9-opus.round-3/result.json) |
| `vp910-opus` | 51.5% | 48.3–52.7% | [R1](demuxe.software.vp910-opus.round-1/result.json) / [R2](demuxe.software.vp910-opus.round-2/result.json) / [R3](demuxe.software.vp910-opus.round-3/result.json) |
| `vp8-vorbis` | 48.7% | 48.0–50.3% | [R1](demuxe.software.vp8-vorbis.round-1/result.json) / [R2](demuxe.software.vp8-vorbis.round-2/result.json) / [R3](demuxe.software.vp8-vorbis.round-3/result.json) |
| `h264-ts` | 45.0% | 42.2–47.8% | [R1](demuxe.software.h264-ts.round-1/result.json) / [R2](demuxe.software.h264-ts.round-2/result.json) / [R3](demuxe.software.h264-ts.round-3/result.json) |
| `mpeg2-ac3` | 48.0% | 33.4–62.1% | [R1](demuxe.software.mpeg2-ac3.round-1/result.json) / [R2](demuxe.software.mpeg2-ac3.round-2/result.json) / [R3](demuxe.software.mpeg2-ac3.round-3/result.json) |
| `mpeg2-mp2` | 48.2% | 47.3–57.4% | [R1](demuxe.software.mpeg2-mp2.round-1/result.json) / [R2](demuxe.software.mpeg2-mp2.round-2/result.json) / [R3](demuxe.software.mpeg2-mp2.round-3/result.json) |
| `mpeg4-mp3` | 35.3% | 31.7–42.0% | [R1](demuxe.software.mpeg4-mp3.round-1/result.json) / [R2](demuxe.software.mpeg4-mp3.round-2/result.json) / [R3](demuxe.software.mpeg4-mp3.round-3/result.json) |
| `prores-pcm` | 48.4% | 39.2–58.6% | [R1](demuxe.software.prores-pcm.round-1/result.json) / [R2](demuxe.software.prores-pcm.round-2/result.json) / [R3](demuxe.software.prores-pcm.round-3/result.json) |
| `h264-fmp4` | 54.6% | 52.9–54.9% | [R1](demuxe.software.h264-fmp4.round-1/result.json) / [R2](demuxe.software.h264-fmp4.round-2/result.json) / [R3](demuxe.software.h264-fmp4.round-3/result.json) |
| `h264-silent` | 50.1% | 35.9–54.0% | [R1](demuxe.software.h264-silent.round-1/result.json) / [R2](demuxe.software.h264-silent.round-2/result.json) / [R3](demuxe.software.h264-silent.round-3/result.json) |
| `h264-srt` | 59.1% | 52.6–64.4% | [R1](demuxe.software.h264-srt.round-1/result.json) / [R2](demuxe.software.h264-srt.round-2/result.json) / [R3](demuxe.software.h264-srt.round-3/result.json) |
| `h264-vtt` | 59.1% | 54.8–62.4% | [R1](demuxe.software.h264-vtt.round-1/result.json) / [R2](demuxe.software.h264-vtt.round-2/result.json) / [R3](demuxe.software.h264-vtt.round-3/result.json) |
| `h264-movtext` | 64.2% | 62.4–65.5% | [R1](demuxe.software.h264-movtext.round-1/result.json) / [R2](demuxe.software.h264-movtext.round-2/result.json) / [R3](demuxe.software.h264-movtext.round-3/result.json) |
| `h264-ass` | 54.6% | 51.5–64.2% | [R1](demuxe.software.h264-ass.round-1/result.json) / [R2](demuxe.software.h264-ass.round-2/result.json) / [R3](demuxe.software.h264-ass.round-3/result.json) |
| `hevc-pgs` | 49.2% | 47.8–49.5% | [R1](demuxe.software.hevc-pgs.round-1/result.json) / [R2](demuxe.software.hevc-pgs.round-2/result.json) / [R3](demuxe.software.hevc-pgs.round-3/result.json) |
| `h264-vobsub` | 57.0% | 52.8–59.8% | [R1](demuxe.software.h264-vobsub.round-1/result.json) / [R2](demuxe.software.h264-vobsub.round-2/result.json) / [R3](demuxe.software.h264-vobsub.round-3/result.json) |
| `audio-aac` | 44.0% | 42.9–48.8% | [R1](demuxe.software.audio-aac.round-1/result.json) / [R2](demuxe.software.audio-aac.round-2/result.json) / [R3](demuxe.software.audio-aac.round-3/result.json) |
| `audio-mp3` | 39.3% | 29.2–40.7% | [R1](demuxe.software.audio-mp3.round-1/result.json) / [R2](demuxe.software.audio-mp3.round-2/result.json) / [R3](demuxe.software.audio-mp3.round-3/result.json) |
| `audio-flac` | 34.9% | 32.8–38.0% | [R1](demuxe.software.audio-flac.round-1/result.json) / [R2](demuxe.software.audio-flac.round-2/result.json) / [R3](demuxe.software.audio-flac.round-3/result.json) |
| `audio-opus` | 48.3% | 47.5–49.8% | [R1](demuxe.software.audio-opus.round-1/result.json) / [R2](demuxe.software.audio-opus.round-2/result.json) / [R3](demuxe.software.audio-opus.round-3/result.json) |
| `audio-vorbis` | 39.3% | 37.5–47.0% | [R1](demuxe.software.audio-vorbis.round-1/result.json) / [R2](demuxe.software.audio-vorbis.round-2/result.json) / [R3](demuxe.software.audio-vorbis.round-3/result.json) |
| `audio-pcm16` | 42.2% | 38.0–42.2% | [R1](demuxe.software.audio-pcm16.round-1/result.json) / [R2](demuxe.software.audio-pcm16.round-2/result.json) / [R3](demuxe.software.audio-pcm16.round-3/result.json) |
| `audio-pcm24` | 32.5% | 30.4–37.4% | [R1](demuxe.software.audio-pcm24.round-1/result.json) / [R2](demuxe.software.audio-pcm24.round-2/result.json) / [R3](demuxe.software.audio-pcm24.round-3/result.json) |
| `hls-ts` | 63.2% | 44.4–67.5% | [R1](demuxe.software.hls-ts.round-1/result.json) / [R2](demuxe.software.hls-ts.round-2/result.json) / [R3](demuxe.software.hls-ts.round-3/result.json) |
| `hls-fmp4` | 49.9% | 42.4–64.9% | [R1](demuxe.software.hls-fmp4.round-1/result.json) / [R2](demuxe.software.hls-fmp4.round-2/result.json) / [R3](demuxe.software.hls-fmp4.round-3/result.json) |
| `hls-hevc` | 52.8% | 49.5–66.7% | [R1](demuxe.software.hls-hevc.round-1/result.json) / [R2](demuxe.software.hls-hevc.round-2/result.json) / [R3](demuxe.software.hls-hevc.round-3/result.json) |
| `dash-h264` | 51.3% | 50.0–52.1% | [R1](demuxe.software.dash-h264.round-1/result.json) / [R2](demuxe.software.dash-h264.round-2/result.json) / [R3](demuxe.software.dash-h264.round-3/result.json) |
| `dash-av1` | 66.9% | 58.1–69.5% | [R1](demuxe.software.dash-av1.round-1/result.json) / [R2](demuxe.software.dash-av1.round-2/result.json) / [R3](demuxe.software.dash-av1.round-3/result.json) |
| `hls-live` | — | — | [R1](demuxe.software.hls-live.round-1/result.json) / [R2](demuxe.software.hls-live.round-2/result.json) / [R3](demuxe.software.hls-live.round-3/result.json) |
| `pcm-ass` | 62.1% | 56.7–64.7% | [R1](demuxe.software.pcm-ass.round-1/result.json) / [R2](demuxe.software.pcm-ass.round-2/result.json) / [R3](demuxe.software.pcm-ass.round-3/result.json) |
| `aac-mp4` | 52.4% | 51.2–52.6% | [R1](demuxe.software.aac-mp4.round-1/result.json) / [R2](demuxe.software.aac-mp4.round-2/result.json) / [R3](demuxe.software.aac-mp4.round-3/result.json) |
| `aac-mkv` | 52.0% | 51.7–54.2% | [R1](demuxe.software.aac-mkv.round-1/result.json) / [R2](demuxe.software.aac-mkv.round-2/result.json) / [R3](demuxe.software.aac-mkv.round-3/result.json) |
| `pcm-mkv` | 68.0% | 57.1–68.3% | [R1](demuxe.software.pcm-mkv.round-1/result.json) / [R2](demuxe.software.pcm-mkv.round-2/result.json) / [R3](demuxe.software.pcm-mkv.round-3/result.json) |

The HLS live correctness and CPU records preserve their different outcomes: bounded live-window progression passed; two steady CPU windows were invalid because the playhead stopped. No live CPU figure is inferred from those records.
