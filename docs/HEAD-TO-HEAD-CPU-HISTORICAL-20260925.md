<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Historical README CPU table, 2026-09-25

Exact table snapshot before the current README CPU cells were cleared for
remeasurement. These values came from several campaigns with different fixtures,
Chrome versions, and measurement conditions. They remain historical evidence and
must not be combined as matched CPU comparisons. Playback statuses, routes, and
qualification details are explained in the [evidence guide](MEDIA-COMPARISON-EVIDENCE.md).
The [current README table](../README.md#representative-head-to-head-media-evidence-default-routes-plus-forced-software)
will be repopulated row by row after qualification under the
[current benchmark protocol](BENCHMARK-PROTOCOL.md).

| Media format | Demuxe (software decode) | Native video | Demuxe (auto) | Movi 0.4.0 (default) | AVPlayer 1.3.1 (default) |
| --- | --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟢 52.4% CPU | 🟠 21.9% CPU | 🟢 (Pass) · 45.1% CPU · native-direct | 🔴 (Fail) · 54.6% CPU (diagnostic) | 🟠 38.0% CPU |
| H.264 + AAC / MKV | 🟢 52.0% CPU | **🟢 (Pass)** · 35.6% CPU† | 🟢 (Pass) · 44.7% CPU · native-direct | 🔴 (Fail) · 55.5% CPU (diagnostic) | 🟠 37.3% CPU |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | 🟢 (Pass) · 65.7% CPU | **🟢 (Pass) · 41.7% CPU** · default AAC | 🟢 (Pass) · 43.6% CPU · native-direct · AC-3 switch: hybrid | 🔴 (Fail) · 56.6% CPU (diagnostic) | 🟢 (Pass) · 59.3% CPU |
| H.264 + PCM24 / MKV | 🟢 68.0% CPU | **🟢 21.2% CPU** | 🟢 (Pass) · 67.6% CPU · hybrid | **🟢 (Pass)** · 40.3% CPU† | 🔴 (Fail) · 52.8% CPU (diagnostic) |
| H.264 + PCM24 / MKV + ASS | 🟢 62.1% CPU | **🟢 45.6% CPU** | 🟢 (Pass) · 65.8% CPU · hybrid | 🔴 (Fail) · 55.4% CPU (diagnostic) | 🔴 (Fail) · 55.3% CPU (diagnostic) |
| H.264 + AAC 5.1 / MP4 | 🟢 (Pass)* · 65.6% CPU† | **🟢 (Pass)\*** · 50.5% CPU† | 🟢 (Pass)\* · 46.2% CPU · native-direct | 🔴 (Fail) · 58.1% CPU (diagnostic) | **🟢 (Pass)\*** · 61.7% CPU† |
| H.264 + MP3 stereo / MP4 | 🟢 67.1% CPU | **🟢 22.0% CPU** | 🟢 (Pass) · 45.2% CPU · native-direct | 🔴 (Fail) · 55.3% CPU (diagnostic) | 🟠 37.5% CPU |
| H.264 + AC-3 5.1 / MKV | 🟢 (Pass)* · 68.8% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 65.5% CPU · hybrid | 🔴 (Fail) · 53.6% CPU (diagnostic) | 🟢 (Pass)* · 61.8% CPU |
| H.264 + E-AC-3 5.1 / MKV | 🟢 (Pass)* · 49.6% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 63.8% CPU · hybrid | 🔴 (Fail) · 57.3% CPU (diagnostic) | **🟢 (Pass)\* · 38.5% CPU** |
| H.264 + DTS core 5.1 / MKV | 🟢 (Pass)* · 65.8% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 67.1% CPU · hybrid | 🔴 (Fail) · 62.5% CPU (diagnostic) | **🟢 (Pass)\* · 60.5% CPU** |
| H.264 + AC-3 stereo / MKV | **🟢 (Pass) · 52.5% CPU** | 🔴 (Fail) | 🟢 (Pass) · 66.6% CPU · native-video-mpv-audio | 🔴 (Fail) · 53.8% CPU (diagnostic) | 🟢 (Pass) · 57.8% CPU |
| H.264 + E-AC-3 stereo / MKV | 🟢 (Pass) · 61.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 64.8% CPU · hybrid | 🔴 (Fail) · 54.6% CPU (diagnostic) | 🟢 (Pass) · 56.8% CPU |
| H.264 + DTS core stereo / MKV | 🟢 (Pass) · 64.0% CPU | 🔴 (Fail) | 🟢 (Pass) · 68.0% CPU · native-video-mpv-audio | 🔴 (Fail) · 64.8% CPU (diagnostic) | 🟢 (Pass) · 60.5% CPU |
| H.264 + FLAC stereo / MKV | 🟢 48.9% CPU | **🟢 23.0% CPU** | 🟢 (Pass) · 44.7% CPU · native-direct | 🔴 (Fail) · 53.6% CPU (diagnostic) | 🟠 35.7% CPU |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)* · 66.1% CPU† | **🟢 (Pass)\*** · 45.0% CPU† | 🟢 (Pass)\* · 46.2% CPU · native-direct | 🔴 (Fail) · 47.2% CPU (diagnostic) | **🟢 (Pass)\*** · 48.6% CPU† |
| H.264 + Opus stereo / MKV | 🟢 48.0% CPU | 🟠 24.9% CPU | 🟢 (Pass) · 46.9% CPU · native-direct | **🟢 (Pass)** · 45.1% CPU† | 🟠 39.8% CPU |
| H.264 + PCM16 stereo / MKV | 🟢 48.5% CPU | 🟠 22.7% CPU | 🟢 (Pass) · 66.5% CPU · hybrid | 🔴 (Fail) · 55.4% CPU (diagnostic) | 🔴 (Fail) · 55.2% CPU (diagnostic) |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)* · 59.5% CPU† | **🟢 (Pass)\*** · 46.0% CPU† | 🟢 (Pass)\* · 65.8% CPU · hybrid | **🟢 (Pass)\*** · 54.6% CPU† | 🔴 (Fail) · 55.1% CPU (diagnostic) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 49.0% CPU | 🟠 23.6% CPU | 🟢 (Pass) · 47.1% CPU · native-direct | 🔴 (Fail) · 53.1% CPU (diagnostic) | 🟠 36.4% CPU |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 50.6% CPU | **🟢 (Pass)** · 36.9% CPU† | 🟢 (Pass) · 47.5% CPU · native-direct | 🔴 (Fail) · 55.3% CPU (diagnostic) | 🟠 35.0% CPU |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 48.3% CPU | **🟢 (Pass)** · 46.2% CPU† | 🟢 (Pass) · 50.0% CPU · native-direct | 🔴 (Fail) · 54.7% CPU (diagnostic) | 🟠 38.7% CPU |
| HEVC Main 10 4:2:2 + AAC / MKV | 🟢 (Pass)* · 71.1% CPU | **🟢 (Pass)\* · 49.9% CPU** | 🟢 (Pass)\* · 49.0% CPU · native-direct | 🟢 (Pass)* · CPU unavailable (three stalled windows) | 🟢 (Pass)* · 67.2% CPU |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🟢 47.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 60.9% CPU · native-video-mpv-audio | 🔴 (Fail) · 54.4% CPU (diagnostic) | 🟠 38.8% CPU |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🟢 47.5% CPU | 🔴 (Fail) | 🟢 (Pass) · 70.2% CPU · hybrid | 🔴 (Fail) · 54.1% CPU (diagnostic) | 🟠 39.1% CPU |
| HEVC Main 10-bit SDR + DTS core / MKV | 🟢 54.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 69.3% CPU · hybrid | 🔴 (Fail) · 61.4% CPU (diagnostic) | 🟠 42.6% CPU |
| AV1 8-bit + AAC / MP4 | 🟢 45.5% CPU | **🟢 22.6% CPU** | 🟢 (Pass) · 42.9% CPU · native-direct | 🔴 (Fail) · 64.0% CPU (diagnostic) | 🟠 40.4% CPU |
| AV1 10-bit SDR + Opus / MKV | 🟢 47.1% CPU | 🟠 25.4% CPU | 🟢 (Pass) · 48.1% CPU · native-direct | 🔴 (Fail) · 63.9% CPU (diagnostic) | 🟠 40.6% CPU |
| AV1 + Opus / WebM | 🟢 46.1% CPU | 🟠 23.6% CPU | 🟢 (Pass) · 45.2% CPU · native-direct | 🔴 (Fail) · 64.4% CPU (diagnostic) | 🟠 39.3% CPU |
| VP9 8-bit + Opus / WebM | 🟢 48.8% CPU | 🟠 23.6% CPU | 🟢 (Pass) · 44.3% CPU · native-direct | 🔴 (Fail) · 51.2% CPU (diagnostic) | 🟠 37.5% CPU |
| VP9 10-bit SDR + Opus / WebM | 🟢 51.5% CPU | 🟠 25.4% CPU | 🟢 (Pass) · 48.1% CPU · native-direct | 🔴 (Fail) · 57.4% CPU (diagnostic) | 🔴 (Fail) · 35.7% CPU (diagnostic) |
| VP8 + Vorbis / WebM | 🟢 48.7% CPU | **🟢 21.9% CPU** | 🟢 (Pass) · 45.3% CPU · native-direct | 🔴 (Fail) · 62.1% CPU (diagnostic) | 🟠 34.7% CPU |
| H.264 + AAC / MPEG-TS | 🟢 45.0% CPU | 🔴 (Fail) | 🟢 (Pass) · 64.8% CPU · hybrid | 🔴 (Fail) · 60.5% CPU (diagnostic) | 🟠 38.8% CPU |
| MPEG-2 video + AC-3 / MPEG-TS | 🟢 (Pass) · 62.7% CPU | 🔴 (Fail) | 🟢 (Pass) · 64.7% CPU · software | 🟢 (Pass) · 58.4% CPU | **🟢 (Pass) · 57.8% CPU** |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | 🟢 (Pass)* · 71.9% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 63.2% CPU · software · visible combing | 🔴 (Fail) · 60.7% CPU (diagnostic) | **🟢 (Pass)\* · 65.2% CPU** |
| MPEG-2 video + MP2 / MPEG-PS | 🟢 48.2% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 61.5% CPU · software | 🔴 (Fail) · 58.5% CPU (diagnostic) | 🔴 (Fail) · 49.5% CPU (diagnostic) |
| MPEG-4 Part 2 + MP3 / AVI | 🟢 35.3% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 62.9% CPU · software | 🔴 (Fail) · 43.0% CPU (diagnostic) | 🔴 (Fail) · 61.3% CPU (diagnostic) |
| ProRes + PCM / MOV | 🟢 48.4% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 70.3% CPU · software | 🔴 (Fail) · 52.9% CPU (diagnostic) | 🔴 (Fail) · 42.3% CPU (diagnostic) |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 54.6% CPU | 🟠 24.0% CPU | 🟢 (Pass) · 45.3% CPU · native-direct | 🔴 (Fail) · 59.3% CPU (diagnostic) | 🔴 (Fail) · 44.7% CPU (diagnostic) |
| H.264 video-only / MP4 | 🟢 50.1% CPU | **🟢 20.8% CPU** | 🟢 (Pass) · 41.6% CPU · native-direct | 🟠 37.4% CPU | 🟠 32.1% CPU |
| H.264 High 10 + AAC / MKV | 🟢 (Pass)* · 71.4% CPU | **🟢 (Pass)\* · 49.3% CPU** | 🟢 (Pass)\* · 46.1% CPU · native-direct | 🔴 (Fail) · 64.6% CPU (diagnostic) | 🟢 (Pass)* · 65.8% CPU |
| MPEG-2 video-only / MPEG-TS | 🟢 (Pass) · 51.8% CPU | 🔴 (Fail) | 🟢 (Pass) · 58.4% CPU · software | 🟢 (Pass) · 43.2% CPU | **🟢 (Pass) · 32.9% CPU** |
| H.264 + AAC + embedded SRT / MKV | 🟢 59.1% CPU | 🔴 (Fail) | 🟢 (Pass) · 66.1% CPU · hybrid | 🔴 (Fail) · 54.7% CPU (diagnostic) | 🔴 (Fail) · 56.5% CPU (diagnostic) |
| H.264 + AAC + external WebVTT / MP4 | 🟢 59.1% CPU | 🟠 23.4% CPU | 🟢 (Pass) · 45.6% CPU · native-direct | 🔴 (Fail) · 55.6% CPU (diagnostic) | 🔴 (Fail) · 39.8% CPU (diagnostic) |
| H.264 + AAC + embedded mov_text / MP4 | 🟢 64.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 66.2% CPU · hybrid | 🔴 (Fail) · 54.7% CPU (diagnostic) | 🔴 (Fail) · 61.9% CPU (diagnostic) |
| H.264 + AAC + styled ASS / MKV | 🟢 54.6% CPU | 🔴 (Fail) | 🟢 (Pass) · 66.8% CPU · hybrid | 🔴 (Fail) · 55.9% CPU (diagnostic) | 🔴 (Fail) · 61.9% CPU (diagnostic) |
| H.264 + AC-3 stereo + ASS / MKV | 🟢 (Pass) · 62.2% CPU | 🔴 (Fail) | 🟢 (Pass) · 61.9% CPU · hybrid | 🔴 (Fail) · 54.3% CPU (diagnostic) | 🔴 (Fail) · 59.5% CPU (diagnostic) |
| HEVC + AC-3 + PGS / MKV | 🟢 49.2% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 69.5% CPU · hybrid | 🔴 (Fail) · 53.9% CPU (diagnostic) | 🔴 (Fail) · 59.4% CPU (diagnostic) |
| H.264 + AC-3 + VobSub / MKV | 🟢 57.0% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 64.9% CPU · hybrid | 🔴 (Fail) · 49.4% CPU (diagnostic) | 🔴 (Fail) · 60.0% CPU (diagnostic) |
| H.264 + AAC + PGS / MKV (subtitle isolation) | 🔴 (Fail) | Not tested | 🟢 (Pass) · 65.2% CPU · hybrid | Not tested | Not tested |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | 🟢 (Pass)* · 70.9% CPU† | Not tested | 🟢 (Pass) · 65.9% CPU · hybrid | Not tested | Not tested |
| AAC audio-only / M4A | 🟢 44.0% CPU | **🟢 15.3% CPU** | 🟢 (Pass) · 33.7% CPU · native-direct | **🟢 (Pass)** · 40.1% CPU‡ | 🟠 20.7% CPU |
| MP3 audio-only / MP3 | 🟢 39.3% CPU | 🟠 15.2% CPU | 🟢 (Pass) · 34.4% CPU · native-direct | **🟢 (Pass)** · 44.0% CPU‡ | 🔴 (Fail) · 40.5% CPU (diagnostic) |
| FLAC audio-only / FLAC | 🟢 34.9% CPU | 🟠 14.5% CPU | 🟢 (Pass) · 33.3% CPU · native-direct | **🟢 (Pass)** · 49.8% CPU‡ | 🟠 18.5% CPU |
| Opus audio-only / Ogg | 🟢 48.3% CPU | **🟢 15.9% CPU** | 🟢 (Pass) · 35.4% CPU · native-direct | **🟢 (Pass)** · 48.7% CPU‡ | 🔴 (Fail) · 43.6% CPU (diagnostic) |
| Vorbis audio-only / Ogg | 🟢 39.3% CPU | **🟢 14.8% CPU** | 🟢 (Pass) · 32.9% CPU · native-direct | 🔴 (Fail) · 43.3% CPU (diagnostic) | 🔴 (Fail) · 42.2% CPU (diagnostic) |
| PCM16 audio-only / WAV | 🟢 42.2% CPU | 🟠 15.9% CPU | 🟢 (Pass) · 33.5% CPU · native-direct | **🟢 (Pass)** · 49.2% CPU‡ | 🔴 (Fail) · 44.0% CPU (diagnostic) |
| PCM24 audio-only / WAV | 🟢 32.5% CPU | 🟠 16.0% CPU | 🟢 (Pass) · 33.7% CPU · native-direct | **🟢 (Pass)** · 43.4% CPU‡ | 🔴 (Fail) · 32.8% CPU (diagnostic) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🟢 (Pass)* · 66.5% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 65.1% CPU · hybrid | 🔴 (Fail) · 53.6% CPU (diagnostic) | **🟢 (Pass)\*** · 44.1% CPU† |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟢 (Pass)* · 68.7% CPU† | **🟢 (Pass)\*** · 53.2% CPU† | 🟡 (Screened)\* · 48.4% CPU · native-direct | 🔴 (Fail) · 53.2% CPU (diagnostic) | **🟢 (Pass)\*** · 66.6% CPU† |
| AV1 10-bit + Opus / WebM (HDR10) | 🟢 (Pass)* · 73.2% CPU† | **🟢 (Pass)\*** · 49.5% CPU† | 🟡 (Screened)\* · 47.2% CPU · native-direct | 🔴 (Fail) · 60.9% CPU (diagnostic) | **🟢 (Pass)\*** · 66.8% CPU† |
| HEVC + TrueHD 7.1 / MKV | 🟢 (Pass)* · 72.4% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 75.1% CPU · hybrid | 🔴 (Fail) · 67.2% CPU (diagnostic) | 🔴 (Fail) · 55.6% CPU (diagnostic) |
| HEVC + DTS-HD MA 7.1 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 77.4% CPU · hybrid | 🔴 (Fail) · 72.8% CPU (diagnostic) | 🟡 (Screened)\* · 77.8% CPU |
| HEVC + E-AC-3 with Atmos metadata / MP4 | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 71.2% CPU · hybrid | 🔴 (Fail) · 57.7% CPU (diagnostic) | 🔴 (Fail) · 69.7% CPU (diagnostic) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 105.9% CPU · software | 🔴 (Fail) · 46.7% CPU (diagnostic) | 🔴 (Fail) · 103.5% CPU (diagnostic) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | 🟢 (Pass)* | 🔴 (Fail) | 🟡 (Screened)\* · 105.9% CPU · software | 🔴 (Fail) · 60.2% CPU (diagnostic) | 🟡 (Screened)\* · 104.6% CPU |
| H.264 + AAC / HLS VOD (TS segments) | 🟢 63.2% CPU | **🟢 (Pass)** · 50.3% CPU† | 🟢 (Pass)\* · 47.0% CPU · native-direct | **🟢 (Pass)** · 66.9% CPU† | **🟢 (Pass)** · 65.0% CPU† |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟢 49.9% CPU | **🟢 (Pass)** · 49.9% CPU† | 🟢 (Pass)\* · 46.4% CPU · native-direct | **🟢 (Pass)** · 67.5% CPU† | **🟢 (Pass)** · 65.7% CPU† |
| HEVC + AAC / HLS VOD (fMP4 segments) | 🟢 52.8% CPU | **🟢 (Pass)** · 50.5% CPU† | 🟢 (Pass) · CPU unavailable | **🟢 (Pass)** · 65.6% CPU† | **🟢 (Pass)** · 65.6% CPU† |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🟢 51.3% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 47.4% CPU · shaka-mse | **🟢 (Pass)** · 66.8% CPU† | **🟢 (Pass)** · 66.5% CPU† |
| AV1 + Opus / DASH VOD (WebM segments) | 🟢 66.9% CPU | 🔴 (Fail) | 🟢 (Pass)\* · 48.0% CPU · shaka-mse | **🟢 (Pass)** · 66.1% CPU† | 🔴 (Fail) · 65.1% CPU (diagnostic) |
| H.264 + AAC / HLS live (sliding window) | 🟢 (Pass)* · 68.1% CPU† | 🔴 (Fail) | 🟢 (Pass) · CPU unavailable | **🟢 (Pass)** · 36.3% CPU† | 🔴 (Fail) · 39.4% CPU (diagnostic) |
| HEVC Main 10 + AAC / MKV | 🟢 (Pass)* · 59.5% CPU† | **🟢 (Pass)\*** · 51.5% CPU† | 🟡 (Screened)\* · 44.5% CPU · native-direct | **🟢 (Pass)\*** · 58.7% CPU‡ | **🟢 (Pass)\*** · 68.0% CPU† |
| HEVC Main 10 + FLAC / MKV | 🟢 (Pass)* · 70.7% CPU† | **🟢 (Pass)\*** · 52.3% CPU† | 🟡 (Screened)\* · 46.6% CPU · native-direct | 🔴 (Fail) · 46.1% CPU (diagnostic) | **🟢 (Pass)\*** · 66.9% CPU† |
| HEVC Main 10 + Opus / MKV | 🟢 (Pass)* · 72.5% CPU† | **🟢 (Pass)\*** · 52.0% CPU† | 🟡 (Screened)\* · 48.1% CPU · native-direct | 🔴 (Fail) · 62.6% CPU (diagnostic) | 🟡 (Screened)\* · 71.0% CPU |
| HEVC Main 10 + FLAC + ASS / MKV | 🟢 (Pass)* · 70.2% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 70.5% CPU · hybrid | 🔴 (Fail) · 45.3% CPU (diagnostic) | 🔴 (Fail) · 62.9% CPU (diagnostic) |
| HEVC Main 10 + Opus + ASS / MKV | 🟢 (Pass)* · 69.8% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 70.0% CPU · hybrid | 🔴 (Fail) · 54.8% CPU (diagnostic) | 🔴 (Fail) · 64.8% CPU (diagnostic) |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | 🟢 (Pass)* · 70.9% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 76.5% CPU · hybrid | 🔴 (Fail) · 75.1% CPU (diagnostic) | 🔴 (Fail) · 57.1% CPU (diagnostic) |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | 🟢 (Pass)* · 67.0% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 78.0% CPU · hybrid | 🔴 (Fail) · 77.1% CPU (diagnostic) | 🔴 (Fail) · 78.9% CPU (diagnostic) |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | 🟢 (Pass)* · 92.1% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 107.8% CPU · software | 🔴 (Fail) · 53.5% CPU (diagnostic) | 🔴 (Fail) · 104.8% CPU (diagnostic) |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | 🟢 (Pass)* · 96.9% CPU† | 🔴 (Fail) | 🟡 (Screened)\* · 107.8% CPU · software | 🔴 (Fail) · 56.4% CPU (diagnostic) | 🔴 (Fail) · 102.5% CPU (diagnostic) |
