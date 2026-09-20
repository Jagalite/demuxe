# CPU relative to native video

Each player is compared with native video: `100 × (native CPU − player CPU) / native CPU`. Positive means lower CPU; negative means higher. Medians use three matched rounds. Green `(Pass)` means playback passed with no consistent measured CPU difference, or without a valid CPU comparison; native is its own reference. It does not claim proven CPU equivalence. `(Pass)*` means historical playback screening passed, but discrete surround or HDR/color fidelity remains unverified; no CPU gain is claimed. `(Fail)` means default playback correctness failed. N/A means no demonstrated playback result for this scope; it does not imply equal CPU. Green = Pass or lower CPU, orange = higher CPU, red = Fail, white = unavailable playback evidence. Pinned Chrome/macOS shared-host synthetic evidence; renderer counters do not certify equal physical smoothness. Native in the original ASS case includes the host ASS renderer.

| Media format | Native video | Demuxe (auto) | Movi | AVPlayer |
| --- | --- | --- | --- | --- |
| H.264 + AAC / MP4 | 🟢 (Pass) | 🟢 (+7.5%) | 🔴 (Fail) | 🟠 (-64.3%) |
| H.264 + AAC / MKV | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| H.264 + PCM24 / MKV | 🟢 (Pass) | 🟠 (-2.3%) | 🟢 (Pass) | 🔴 (Fail) |
| H.264 + PCM24 / MKV + ASS | 🟢 (Pass) | 🟠 (-72.9%) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC 5.1 / MP4 | 🟢 (Pass)* | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| H.264 + MP3 stereo / MP4 | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-65.3%) |
| H.264 + AC-3 5.1 / MKV | 🔴 (Fail) | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| H.264 + E-AC-3 5.1 / MKV | 🔴 (Fail) | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| H.264 + DTS core 5.1 / MKV | 🔴 (Fail) | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| H.264 + FLAC stereo / MKV | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-56.9%) |
| H.264 + FLAC 5.1 / MKV | 🟢 (Pass)* | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| H.264 + Opus stereo / MKV | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | 🟠 (-59.4%) |
| H.264 + PCM16 stereo / MKV | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + PCM24 5.1 / MKV | 🟢 (Pass)* | 🟢 (Pass)* | 🟢 (Pass)* | 🔴 (Fail) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-56.7%) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| HEVC Main 10-bit SDR + AAC / MP4 | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| HEVC Main 10-bit SDR + AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| HEVC Main 10-bit SDR + DTS core / MKV | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| AV1 8-bit + AAC / MP4 | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-78.2%) |
| AV1 10-bit SDR + Opus / MKV | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-58.6%) |
| AV1 + Opus / WebM | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-76.2%) |
| VP9 8-bit + Opus / WebM | 🟢 (Pass) | 🟢 (+4.8%) | 🔴 (Fail) | 🟠 (-62.1%) |
| VP9 10-bit SDR + Opus / WebM | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| VP8 + Vorbis / WebM | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-61.2%) |
| H.264 + AAC / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| MPEG-2 video + AC-3 / MPEG-TS | 🔴 (Fail) | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) |
| MPEG-2 video + MP2 / MPEG-PS | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| MPEG-4 Part 2 + MP3 / AVI | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| ProRes + PCM / MOV | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / fragmented MP4 (single file) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 video-only / MP4 | 🟢 (Pass) | 🟠 (-8.3%) | 🟠 (-74.1%) | 🟠 (-54.2%) |
| H.264 + AAC + embedded SRT / MKV | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + external WebVTT / MP4 | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + embedded mov_text / MP4 | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC + styled ASS / MKV | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| HEVC + AC-3 + PGS / MKV | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AC-3 + VobSub / MKV | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| AAC audio-only / M4A | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | 🟠 (-28.8%) |
| MP3 audio-only / MP3 | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) |
| FLAC audio-only / FLAC | 🟢 (Pass) | 🟢 (+6.8%) | 🟢 (Pass) | 🟠 (-29.6%) |
| Opus audio-only / Ogg | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) |
| Vorbis audio-only / Ogg | 🟢 (Pass) | 🟠 (-3.5%) | 🟢 (Pass) | 🔴 (Fail) |
| PCM16 audio-only / WAV | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) |
| PCM24 audio-only / WAV | 🟢 (Pass) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | 🔴 (Fail) | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| HEVC Main 10 + AAC / MP4 (HLG) | 🟢 (Pass)* | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| AV1 10-bit + Opus / WebM (HDR10) | 🟢 (Pass)* | 🟢 (Pass)* | 🔴 (Fail) | 🟢 (Pass)* |
| HEVC + TrueHD 7.1 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| HEVC + DTS-HD MA 7.1 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) | ⚪ (N/A) |
| H.264 + AAC / HLS VOD (TS segments) | 🟢 (Pass) | 🟢 (+4.4%) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟠 (-64.5%) |
| HEVC + AAC / HLS VOD (fMP4 segments) | 🟢 (Pass) | 🟢 (Pass) | 🔴 (Fail) | 🟢 (Pass) |
| H.264 + AAC / DASH VOD (fMP4 segments) | 🔴 (Fail) | 🔴 (Fail) | 🔴 (Fail) | 🟢 (Pass) |
| AV1 + Opus / DASH VOD (WebM segments) | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |
| H.264 + AAC / HLS live (sliding window) | 🔴 (Fail) | 🟢 (Pass) | 🔴 (Fail) | 🔴 (Fail) |

## Values, ranges and exclusions

| Media / player | CPU: player / native (% of one core) | Median gain; range | Evidence or reason |
| --- | --- | --- | --- |
| H.264 + AAC / MP4 / Native video | 21.88 / 21.88 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-original-02/video.default.aac-mp4.round-1/result.json) · [round 2](../cpu-baseline-performance-original-02/video.default.aac-mp4.round-2/result.json) · [round 3](../cpu-baseline-performance-original-02/video.default.aac-mp4.round-3/result.json) |
| H.264 + AAC / MP4 / Demuxe (auto) | 20.24 / 21.88 | +7.5%; +6.1 to +9.5% | [round 1](../cpu-baseline-performance-original-02/demuxe.auto.aac-mp4.round-1/result.json) · [round 2](../cpu-baseline-performance-original-02/demuxe.auto.aac-mp4.round-2/result.json) · [round 3](../cpu-baseline-performance-original-02/demuxe.auto.aac-mp4.round-3/result.json) |
| H.264 + AAC / MP4 / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / MP4 / AVPlayer | 37.97 / 21.88 | -64.3%; -75.4 to -58.4% | [round 1](../cpu-baseline-performance-original-02/libmedia.default.aac-mp4.round-1/result.json) · [round 2](../cpu-baseline-performance-original-02/libmedia.default.aac-mp4.round-2/result.json) · [round 3](../cpu-baseline-performance-original-02/libmedia.default.aac-mp4.round-3/result.json) |
| H.264 + AAC / MKV / Native video | — | 🟢 (Pass) | Error: Excessive dropped frames |
| H.264 + AAC / MKV / Demuxe (auto) | — | 🟢 (Pass) | Error: Excessive dropped frames |
| H.264 + AAC / MKV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / MKV / AVPlayer | — | 🟢 (Pass) | Error: Excessive dropped frames |
| H.264 + PCM24 / MKV / Native video | 21.18 / 21.18 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-original-02/video.default.pcm-mkv.round-1/result.json) · [round 2](../cpu-baseline-performance-original-02/video.default.pcm-mkv.round-2/result.json) · [round 3](../cpu-baseline-performance-original-02/video.default.pcm-mkv.round-3/result.json) |
| H.264 + PCM24 / MKV / Demuxe (auto) | 21.67 / 21.18 | -2.3%; -28.4 to -0.2% | [round 1](../cpu-baseline-performance-original-02/demuxe.auto.pcm-mkv.round-1/result.json) · [round 2](../cpu-baseline-performance-original-02/demuxe.auto.pcm-mkv.round-2/result.json) · [round 3](../cpu-baseline-performance-original-02/demuxe.auto.pcm-mkv.round-3/result.json) |
| H.264 + PCM24 / MKV / Movi | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget |
| H.264 + PCM24 / MKV / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + PCM24 / MKV + ASS / Native video | 23.61 / 23.61 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-original-02/video.default.pcm-ass.round-1/result.json) · [round 2](../cpu-baseline-performance-original-02/video.default.pcm-ass.round-2/result.json) · [round 3](../cpu-baseline-performance-original-02/video.default.pcm-ass.round-3/result.json) |
| H.264 + PCM24 / MKV + ASS / Demuxe (auto) | 37.77 / 23.61 | -72.9%; -85.6 to -50.0% | [round 1](../cpu-baseline-performance-original-02/demuxe.auto.pcm-ass.round-1/result.json) · [round 2](../cpu-baseline-performance-original-02/demuxe.auto.pcm-ass.round-2/result.json) · [round 3](../cpu-baseline-performance-original-02/demuxe.auto.pcm-ass.round-3/result.json) |
| H.264 + PCM24 / MKV + ASS / Movi | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| H.264 + PCM24 / MKV + ASS / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC 5.1 / MP4 / Native video | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/video.default.h264-aac51/result.json) |
| H.264 + AAC 5.1 / MP4 / Demuxe (auto) | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.h264-aac51/result.json) |
| H.264 + AAC 5.1 / MP4 / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. · [historical playback](../expanded-matrix-01/movi.default.h264-aac51/result.json) |
| H.264 + AAC 5.1 / MP4 / AVPlayer | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.h264-aac51/result.json) |
| H.264 + MP3 stereo / MP4 / Native video | 21.98 / 21.98 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-pilot-performance-02/video.default.h264-mp3.round-1/result.json) · [round 2](../cpu-baseline-pilot-performance-02/video.default.h264-mp3.round-2/result.json) · [round 3](../cpu-baseline-pilot-performance-02/video.default.h264-mp3.round-3/result.json) |
| H.264 + MP3 stereo / MP4 / Demuxe (auto) | 22.17 / 21.98 | -0.9%; -4.5 to +7.7% | [round 1](../cpu-baseline-pilot-performance-02/demuxe.auto.h264-mp3.round-1/result.json) · [round 2](../cpu-baseline-pilot-performance-02/demuxe.auto.h264-mp3.round-2/result.json) · [round 3](../cpu-baseline-pilot-performance-02/demuxe.auto.h264-mp3.round-3/result.json) |
| H.264 + MP3 stereo / MP4 / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + MP3 stereo / MP4 / AVPlayer | 37.52 / 21.98 | -65.3%; -87.7 to -49.9% | [round 1](../cpu-baseline-pilot-performance-02/libmedia.default.h264-mp3.round-1/result.json) · [round 2](../cpu-baseline-pilot-performance-02/libmedia.default.h264-mp3.round-2/result.json) · [round 3](../cpu-baseline-pilot-performance-02/libmedia.default.h264-mp3.round-3/result.json) |
| H.264 + AC-3 5.1 / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. · [historical playback](../expanded-matrix-01/video.default.h264-ac3/result.json) |
| H.264 + AC-3 5.1 / MKV / Demuxe (auto) | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.h264-ac3/result.json) |
| H.264 + AC-3 5.1 / MKV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. · [historical playback](../expanded-matrix-01/movi.default.h264-ac3/result.json) |
| H.264 + AC-3 5.1 / MKV / AVPlayer | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.h264-ac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. · [historical playback](../expanded-matrix-01/video.default.h264-eac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV / Demuxe (auto) | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.h264-eac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. · [historical playback](../expanded-matrix-01/movi.default.h264-eac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV / AVPlayer | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.h264-eac3/result.json) |
| H.264 + DTS core 5.1 / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. · [historical playback](../expanded-matrix-01/video.default.h264-dts/result.json) |
| H.264 + DTS core 5.1 / MKV / Demuxe (auto) | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.h264-dts/result.json) |
| H.264 + DTS core 5.1 / MKV / Movi | — | 🔴 (Fail) | Error: Playback-rate progression outside bounded tolerance · [historical playback](../expanded-matrix-01/movi.default.h264-dts/result.json) |
| H.264 + DTS core 5.1 / MKV / AVPlayer | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.h264-dts/result.json) |
| H.264 + FLAC stereo / MKV / Native video | 23.01 / 23.01 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.h264-flac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.h264-flac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.h264-flac.round-3/result.json) |
| H.264 + FLAC stereo / MKV / Demuxe (auto) | 23.63 / 23.01 | -3.5%; -4.0 to +2.9% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-flac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-flac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-flac.round-3/result.json) |
| H.264 + FLAC stereo / MKV / Movi | — | 🔴 (Fail) | Error: Audio missing/wrong after seek |
| H.264 + FLAC stereo / MKV / AVPlayer | 35.66 / 23.01 | -56.9%; -58.4 to -44.5% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-flac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-flac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-flac.round-3/result.json) |
| H.264 + FLAC 5.1 / MKV / Native video | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/video.default.h264-flac51/result.json) |
| H.264 + FLAC 5.1 / MKV / Demuxe (auto) | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.h264-flac51/result.json) |
| H.264 + FLAC 5.1 / MKV / Movi | — | 🔴 (Fail) | Error: Audio missing/wrong after seek · [historical playback](../expanded-matrix-01/movi.default.h264-flac51/result.json) |
| H.264 + FLAC 5.1 / MKV / AVPlayer | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.h264-flac51/result.json) |
| H.264 + Opus stereo / MKV / Native video | 24.87 / 24.87 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.h264-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.h264-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.h264-opus.round-3/result.json) |
| H.264 + Opus stereo / MKV / Demuxe (auto) | 24.54 / 24.87 | +3.3%; -1.7 to +9.7% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-opus.round-3/result.json) |
| H.264 + Opus stereo / MKV / Movi | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget |
| H.264 + Opus stereo / MKV / AVPlayer | 39.82 / 24.87 | -59.4%; -63.6 to -59.4% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-opus.round-3/result.json) |
| H.264 + PCM16 stereo / MKV / Native video | 22.69 / 22.69 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.h264-pcm16.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.h264-pcm16.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.h264-pcm16.round-3/result.json) |
| H.264 + PCM16 stereo / MKV / Demuxe (auto) | 22.08 / 22.69 | +1.9%; -3.6 to +5.6% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-pcm16.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-pcm16.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-pcm16.round-3/result.json) |
| H.264 + PCM16 stereo / MKV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + PCM16 stereo / MKV / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + PCM24 5.1 / MKV / Native video | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/video.default.h264-pcm51/result.json) |
| H.264 + PCM24 5.1 / MKV / Demuxe (auto) | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.h264-pcm51/result.json) |
| H.264 + PCM24 5.1 / MKV / Movi | — | 🟢 (Pass)* | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. · [historical playback](../expanded-matrix-01/movi.default.h264-pcm51/result.json) |
| H.264 + PCM24 5.1 / MKV / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. · [historical playback](../expanded-matrix-01/libmedia.default.h264-pcm51/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) / Native video | 23.61 / 23.61 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.hevc-hvc1.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.hevc-hvc1.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.hevc-hvc1.round-3/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) / Demuxe (auto) | 23.31 / 23.61 | +2.5%; -0.7 to +3.7% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.hevc-hvc1.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.hevc-hvc1.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.hevc-hvc1.round-3/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 8-bit + AAC / MP4 (hvc1) / AVPlayer | 36.43 / 23.61 | -56.7%; -57.4 to -49.1% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.hevc-hvc1.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.hevc-hvc1.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.hevc-hvc1.round-3/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hev1) / Native video | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget; Error: Excessive dropped frames |
| HEVC Main 8-bit + AAC / MP4 (hev1) / Demuxe (auto) | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget; Error: Excessive dropped frames |
| HEVC Main 8-bit + AAC / MP4 (hev1) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 8-bit + AAC / MP4 (hev1) / AVPlayer | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget; Error: Excessive dropped frames |
| HEVC Main 10-bit SDR + AAC / MP4 / Native video | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget |
| HEVC Main 10-bit SDR + AAC / MP4 / Demuxe (auto) | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget |
| HEVC Main 10-bit SDR + AAC / MP4 / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 10-bit SDR + AAC / MP4 / AVPlayer | — | 🟢 (Pass) | Error: Presentation cadence outside declared frame budget |
| HEVC Main 10-bit SDR + AC-3 / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC Main 10-bit SDR + AC-3 / MKV / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| HEVC Main 10-bit SDR + AC-3 / MKV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 10-bit SDR + AC-3 / MKV / AVPlayer | — | 🟢 (Pass) | video: no passing matching correctness |
| HEVC Main 10-bit SDR + E-AC-3 / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC Main 10-bit SDR + E-AC-3 / MKV / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| HEVC Main 10-bit SDR + E-AC-3 / MKV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 10-bit SDR + E-AC-3 / MKV / AVPlayer | — | 🟢 (Pass) | video: no passing matching correctness |
| HEVC Main 10-bit SDR + DTS core / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC Main 10-bit SDR + DTS core / MKV / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| HEVC Main 10-bit SDR + DTS core / MKV / Movi | — | 🔴 (Fail) | Error: Playback-rate progression outside bounded tolerance |
| HEVC Main 10-bit SDR + DTS core / MKV / AVPlayer | — | 🟢 (Pass) | video: no passing matching correctness |
| AV1 8-bit + AAC / MP4 / Native video | 22.64 / 22.64 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.av1-aac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.av1-aac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.av1-aac.round-3/result.json) |
| AV1 8-bit + AAC / MP4 / Demuxe (auto) | 23.41 / 22.64 | -4.1%; -8.8 to +0.2% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.av1-aac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.av1-aac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.av1-aac.round-3/result.json) |
| AV1 8-bit + AAC / MP4 / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| AV1 8-bit + AAC / MP4 / AVPlayer | 40.35 / 22.64 | -78.2%; -78.4 to -65.9% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.av1-aac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.av1-aac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.av1-aac.round-3/result.json) |
| AV1 10-bit SDR + Opus / MKV / Native video | 25.39 / 25.39 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.av110-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.av110-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.av110-opus.round-3/result.json) |
| AV1 10-bit SDR + Opus / MKV / Demuxe (auto) | 24.97 / 25.39 | +1.6%; -5.6 to +9.9% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.av110-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.av110-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.av110-opus.round-3/result.json) |
| AV1 10-bit SDR + Opus / MKV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| AV1 10-bit SDR + Opus / MKV / AVPlayer | 40.58 / 25.39 | -58.6%; -62.6 to -42.6% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.av110-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.av110-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.av110-opus.round-3/result.json) |
| AV1 + Opus / WebM / Native video | 23.63 / 23.63 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.av1-webm.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.av1-webm.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.av1-webm.round-3/result.json) |
| AV1 + Opus / WebM / Demuxe (auto) | 23.63 / 23.63 | +0.0%; -11.6 to +1.7% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.av1-webm.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.av1-webm.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.av1-webm.round-3/result.json) |
| AV1 + Opus / WebM / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| AV1 + Opus / WebM / AVPlayer | 39.31 / 23.63 | -76.2%; -80.6 to -60.1% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.av1-webm.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.av1-webm.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.av1-webm.round-3/result.json) |
| VP9 8-bit + Opus / WebM / Native video | 23.59 / 23.59 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.vp9-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.vp9-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.vp9-opus.round-3/result.json) |
| VP9 8-bit + Opus / WebM / Demuxe (auto) | 21.54 / 23.59 | +4.8%; +3.6 to +9.6% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp9-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp9-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp9-opus.round-3/result.json) |
| VP9 8-bit + Opus / WebM / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| VP9 8-bit + Opus / WebM / AVPlayer | 37.48 / 23.59 | -62.1%; -67.0 to -57.3% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.vp9-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.vp9-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.vp9-opus.round-3/result.json) |
| VP9 10-bit SDR + Opus / WebM / Native video | 25.44 / 25.44 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.vp910-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.vp910-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.vp910-opus.round-3/result.json) |
| VP9 10-bit SDR + Opus / WebM / Demuxe (auto) | 25.28 / 25.44 | +0.6%; -1.9 to +1.9% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp910-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp910-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp910-opus.round-3/result.json) |
| VP9 10-bit SDR + Opus / WebM / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| VP9 10-bit SDR + Opus / WebM / AVPlayer | — | 🔴 (Fail) | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1865] [fatal]: analyze stream failed, ret: -2097152 |
| VP8 + Vorbis / WebM / Native video | 21.90 / 21.90 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.vp8-vorbis.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.vp8-vorbis.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.vp8-vorbis.round-3/result.json) |
| VP8 + Vorbis / WebM / Demuxe (auto) | 21.95 / 21.90 | +1.8%; -2.4 to +1.9% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp8-vorbis.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp8-vorbis.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.vp8-vorbis.round-3/result.json) |
| VP8 + Vorbis / WebM / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| VP8 + Vorbis / WebM / AVPlayer | 34.73 / 21.90 | -61.2%; -73.3 to -55.3% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.vp8-vorbis.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.vp8-vorbis.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.vp8-vorbis.round-3/result.json) |
| H.264 + AAC / MPEG-TS / Native video | — | 🔴 (Fail) | page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| H.264 + AAC / MPEG-TS / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| H.264 + AAC / MPEG-TS / Movi | — | 🔴 (Fail) | Error: Seek displayed stale/wrong timeline marker |
| H.264 + AAC / MPEG-TS / AVPlayer | — | 🟢 (Pass) | video: no passing matching correctness |
| MPEG-2 video + AC-3 / MPEG-TS / Native video | — | 🔴 (Fail) | page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| MPEG-2 video + AC-3 / MPEG-TS / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| MPEG-2 video + AC-3 / MPEG-TS / Movi | — | 🟢 (Pass) | video: no passing matching correctness |
| MPEG-2 video + AC-3 / MPEG-TS / AVPlayer | — | 🟢 (Pass) | video: no passing matching correctness |
| MPEG-2 video + MP2 / MPEG-PS / Native video | — | 🔴 (Fail) | page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| MPEG-2 video + MP2 / MPEG-PS / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| MPEG-2 video + MP2 / MPEG-PS / Movi | — | 🔴 (Fail) | Error: Audio missing/wrong after seek |
| MPEG-2 video + MP2 / MPEG-PS / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| MPEG-4 Part 2 + MP3 / AVI / Native video | — | 🔴 (Fail) | page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| MPEG-4 Part 2 + MP3 / AVI / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| MPEG-4 Part 2 + MP3 / AVI / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| MPEG-4 Part 2 + MP3 / AVI / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| ProRes + PCM / MOV / Native video | — | 🔴 (Fail) | Error: Initial displayed timeline marker incorrect |
| ProRes + PCM / MOV / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| ProRes + PCM / MOV / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| ProRes + PCM / MOV / AVPlayer | — | 🔴 (Fail) | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 2238] [fatal]: not has any supported stream to play |
| H.264 + AAC / fragmented MP4 (single file) / Native video | 23.98 / 23.98 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.h264-fmp4.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.h264-fmp4.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.h264-fmp4.round-3/result.json) |
| H.264 + AAC / fragmented MP4 (single file) / Demuxe (auto) | 23.61 / 23.98 | -1.0%; -2.6 to +3.1% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-fmp4.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-fmp4.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-fmp4.round-3/result.json) |
| H.264 + AAC / fragmented MP4 (single file) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / fragmented MP4 (single file) / AVPlayer | — | 🔴 (Fail) | Error: open deadline |
| H.264 video-only / MP4 / Native video | 20.84 / 20.84 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.h264-silent.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.h264-silent.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.h264-silent.round-3/result.json) |
| H.264 video-only / MP4 / Demuxe (auto) | 22.57 / 20.84 | -8.3%; -19.8 to -4.8% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-silent.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-silent.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-silent.round-3/result.json) |
| H.264 video-only / MP4 / Movi | 37.35 / 20.84 | -74.1%; -85.9 to -63.8% | [round 1](../cpu-baseline-performance-catalogue-02/movi.default.h264-silent.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/movi.default.h264-silent.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/movi.default.h264-silent.round-3/result.json) |
| H.264 video-only / MP4 / AVPlayer | 32.13 / 20.84 | -54.2%; -61.6 to -33.5% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-silent.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-silent.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.h264-silent.round-3/result.json) |
| H.264 + AAC + embedded SRT / MKV / Native video | — | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded SRT / MKV / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| H.264 + AAC + embedded SRT / MKV / Movi | — | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded SRT / MKV / AVPlayer | — | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| H.264 + AAC + external WebVTT / MP4 / Native video | 23.44 / 23.44 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.h264-vtt.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.h264-vtt.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.h264-vtt.round-3/result.json) |
| H.264 + AAC + external WebVTT / MP4 / Demuxe (auto) | 23.31 / 23.44 | -0.4%; -1.2 to +7.9% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-vtt.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-vtt.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.h264-vtt.round-3/result.json) |
| H.264 + AAC + external WebVTT / MP4 / Movi | — | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| H.264 + AAC + external WebVTT / MP4 / AVPlayer | — | 🔴 (Fail) | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1483] [fatal]: analyze stream failed, ret: -2 |
| H.264 + AAC + embedded mov_text / MP4 / Native video | — | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded mov_text / MP4 / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| H.264 + AAC + embedded mov_text / MP4 / Movi | — | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded mov_text / MP4 / AVPlayer | — | 🔴 (Fail) | Error: Required subtitle text missing or incorrect |
| H.264 + AAC + styled ASS / MKV / Native video | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| H.264 + AAC + styled ASS / MKV / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| H.264 + AAC + styled ASS / MKV / Movi | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| H.264 + AAC + styled ASS / MKV / AVPlayer | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| HEVC + AC-3 + PGS / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC + AC-3 + PGS / MKV / Demuxe (auto) | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| HEVC + AC-3 + PGS / MKV / Movi | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| HEVC + AC-3 + PGS / MKV / AVPlayer | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| H.264 + AC-3 + VobSub / MKV / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AC-3 + VobSub / MKV / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| H.264 + AC-3 + VobSub / MKV / Movi | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| H.264 + AC-3 + VobSub / MKV / AVPlayer | — | 🔴 (Fail) | Error: Required marked subtitle drawing missing |
| AAC audio-only / M4A / Native video | 15.35 / 15.35 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.audio-aac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.audio-aac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.audio-aac.round-3/result.json) |
| AAC audio-only / M4A / Demuxe (auto) | 15.89 / 15.35 | -3.6%; -5.1 to +9.2% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-aac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-aac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-aac.round-3/result.json) |
| AAC audio-only / M4A / Movi | — | 🟢 (Pass) | Error: Playback stalled or reached EOF during measurement |
| AAC audio-only / M4A / AVPlayer | 20.65 / 15.35 | -28.8%; -44.1 to -26.1% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.audio-aac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.audio-aac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.audio-aac.round-3/result.json) |
| MP3 audio-only / MP3 / Native video | 15.17 / 15.17 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.audio-mp3.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.audio-mp3.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.audio-mp3.round-3/result.json) |
| MP3 audio-only / MP3 / Demuxe (auto) | 14.94 / 15.17 | +1.7%; -4.8 to +5.5% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-mp3.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-mp3.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-mp3.round-3/result.json) |
| MP3 audio-only / MP3 / Movi | — | 🟢 (Pass) | Error: Playback stalled or reached EOF during measurement |
| MP3 audio-only / MP3 / AVPlayer | — | 🔴 (Fail) | Error: seek deadline |
| FLAC audio-only / FLAC / Native video | 14.49 / 14.49 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.audio-flac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.audio-flac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.audio-flac.round-3/result.json) |
| FLAC audio-only / FLAC / Demuxe (auto) | 13.50 / 14.49 | +6.8%; +0.6 to +10.2% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-flac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-flac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-flac.round-3/result.json) |
| FLAC audio-only / FLAC / Movi | — | 🟢 (Pass) | Error: Playback stalled or reached EOF during measurement |
| FLAC audio-only / FLAC / AVPlayer | 18.52 / 14.49 | -29.6%; -30.0 to -10.5% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.audio-flac.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.audio-flac.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.audio-flac.round-3/result.json) |
| Opus audio-only / Ogg / Native video | 15.87 / 15.87 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.audio-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.audio-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.audio-opus.round-3/result.json) |
| Opus audio-only / Ogg / Demuxe (auto) | 15.94 / 15.87 | -2.0%; -9.8 to +2.2% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-opus.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-opus.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-opus.round-3/result.json) |
| Opus audio-only / Ogg / Movi | — | 🟢 (Pass) | Error: Playback stalled or reached EOF during measurement |
| Opus audio-only / Ogg / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| Vorbis audio-only / Ogg / Native video | 14.80 / 14.80 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.audio-vorbis.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.audio-vorbis.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.audio-vorbis.round-3/result.json) |
| Vorbis audio-only / Ogg / Demuxe (auto) | 15.65 / 14.80 | -3.5%; -11.9 to -3.3% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-vorbis.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-vorbis.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-vorbis.round-3/result.json) |
| Vorbis audio-only / Ogg / Movi | — | 🟢 (Pass) | Error: Playback stalled or reached EOF during measurement |
| Vorbis audio-only / Ogg / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| PCM16 audio-only / WAV / Native video | 15.92 / 15.92 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.audio-pcm16.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.audio-pcm16.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.audio-pcm16.round-3/result.json) |
| PCM16 audio-only / WAV / Demuxe (auto) | 15.35 / 15.92 | +0.7%; -3.2 to +29.9% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-pcm16.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-pcm16.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-pcm16.round-3/result.json) |
| PCM16 audio-only / WAV / Movi | — | 🟢 (Pass) | Error: Playback stalled or reached EOF during measurement |
| PCM16 audio-only / WAV / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| PCM24 audio-only / WAV / Native video | 16.01 / 16.01 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.audio-pcm24.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.audio-pcm24.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.audio-pcm24.round-3/result.json) |
| PCM24 audio-only / WAV / Demuxe (auto) | 15.93 / 16.01 | +6.6%; -8.5 to +7.6% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-pcm24.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-pcm24.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.audio-pcm24.round-3/result.json) |
| PCM24 audio-only / WAV / Movi | — | 🟢 (Pass) | Error: Playback stalled or reached EOF during measurement |
| PCM24 audio-only / WAV / AVPlayer | — | 🔴 (Fail) | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1858] [fatal]: open stream failed, ret: -2097152, taskId: 746865b5-81da-47bb-be66-4193ab0f5084 |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) / Native video | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. · [historical playback](../expanded-matrix-01/video.default.hdr10-hevc/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) / Demuxe (auto) | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.hdr10-hevc/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. · [historical playback](../expanded-matrix-01/movi.default.hdr10-hevc/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) / AVPlayer | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.hdr10-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) / Native video | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../expanded-matrix-01/video.default.hlg-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) / Demuxe (auto) | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.hlg-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. · [historical playback](../expanded-matrix-01/movi.default.hlg-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) / AVPlayer | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.hlg-hevc/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) / Native video | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../expanded-matrix-01/video.default.hdr10-av1/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) / Demuxe (auto) | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../demuxe-with-engines-01/demuxe.auto.hdr10-av1/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. · [historical playback](../expanded-matrix-01/movi.default.hdr10-av1/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) / AVPlayer | — | 🟢 (Pass)* | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. · [historical playback](../expanded-matrix-01/libmedia.default.hdr10-av1/result.json) |
| HEVC + TrueHD 7.1 / MKV / Native video | — | ⚪ (N/A) | Fixture preparation failed: Generated channel count mismatch |
| HEVC + TrueHD 7.1 / MKV / Demuxe (auto) | — | ⚪ (N/A) | Fixture preparation failed: Generated channel count mismatch |
| HEVC + TrueHD 7.1 / MKV / Movi | — | ⚪ (N/A) | Fixture preparation failed: Generated channel count mismatch |
| HEVC + TrueHD 7.1 / MKV / AVPlayer | — | ⚪ (N/A) | Fixture preparation failed: Generated channel count mismatch |
| HEVC + DTS-HD MA 7.1 / MKV / Native video | — | ⚪ (N/A) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. |
| HEVC + DTS-HD MA 7.1 / MKV / Demuxe (auto) | — | ⚪ (N/A) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. |
| HEVC + DTS-HD MA 7.1 / MKV / Movi | — | ⚪ (N/A) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. |
| HEVC + DTS-HD MA 7.1 / MKV / AVPlayer | — | ⚪ (N/A) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. |
| HEVC + E-AC-3 with Atmos metadata / MP4 / Native video | — | ⚪ (N/A) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. |
| HEVC + E-AC-3 with Atmos metadata / MP4 / Demuxe (auto) | — | ⚪ (N/A) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. |
| HEVC + E-AC-3 with Atmos metadata / MP4 / Movi | — | ⚪ (N/A) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. |
| HEVC + E-AC-3 with Atmos metadata / MP4 / AVPlayer | — | ⚪ (N/A) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 / Native video | — | ⚪ (N/A) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 / Demuxe (auto) | — | ⚪ (N/A) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 / Movi | — | ⚪ (N/A) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 / AVPlayer | — | ⚪ (N/A) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV / Native video | — | ⚪ (N/A) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV / Demuxe (auto) | — | ⚪ (N/A) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV / Movi | — | ⚪ (N/A) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV / AVPlayer | — | ⚪ (N/A) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. |
| H.264 + AAC / HLS VOD (TS segments) / Native video | 24.18 / 24.18 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.hls-ts.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.hls-ts.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.hls-ts.round-3/result.json) |
| H.264 + AAC / HLS VOD (TS segments) / Demuxe (auto) | 23.32 / 24.18 | +4.4%; +0.2 to +4.4% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.hls-ts.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.hls-ts.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.hls-ts.round-3/result.json) |
| H.264 + AAC / HLS VOD (TS segments) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC / HLS VOD (TS segments) / AVPlayer | — | 🔴 (Fail) | Error: EOF timeline did not settle |
| H.264 + AAC / HLS VOD (fMP4 segments) / Native video | 24.99 / 24.99 | +0.0%; +0.0 to +0.0% | [round 1](../cpu-baseline-performance-catalogue-02/video.default.hls-fmp4.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/video.default.hls-fmp4.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/video.default.hls-fmp4.round-3/result.json) |
| H.264 + AAC / HLS VOD (fMP4 segments) / Demuxe (auto) | 24.44 / 24.99 | +1.6%; -3.7 to +7.4% | [round 1](../cpu-baseline-performance-catalogue-02/demuxe.auto.hls-fmp4.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/demuxe.auto.hls-fmp4.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/demuxe.auto.hls-fmp4.round-3/result.json) |
| H.264 + AAC / HLS VOD (fMP4 segments) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC / HLS VOD (fMP4 segments) / AVPlayer | 40.77 / 24.99 | -64.5%; -73.0 to -61.6% | [round 1](../cpu-baseline-performance-catalogue-02/libmedia.default.hls-fmp4.round-1/result.json) · [round 2](../cpu-baseline-performance-catalogue-02/libmedia.default.hls-fmp4.round-2/result.json) · [round 3](../cpu-baseline-performance-catalogue-02/libmedia.default.hls-fmp4.round-3/result.json) |
| HEVC + AAC / HLS VOD (fMP4 segments) / Native video | — | 🟢 (Pass) | Error: Excessive dropped frames |
| HEVC + AAC / HLS VOD (fMP4 segments) / Demuxe (auto) | — | 🟢 (Pass) | Error: Excessive dropped frames; Error: Presentation cadence outside declared frame budget |
| HEVC + AAC / HLS VOD (fMP4 segments) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC + AAC / HLS VOD (fMP4 segments) / AVPlayer | — | 🟢 (Pass) | Error: Excessive dropped frames |
| H.264 + AAC / DASH VOD (fMP4 segments) / Native video | — | 🔴 (Fail) | page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| H.264 + AAC / DASH VOD (fMP4 segments) / Demuxe (auto) | — | 🔴 (Fail) | page.evaluate: PlayerError: Command timed out |
| H.264 + AAC / DASH VOD (fMP4 segments) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC / DASH VOD (fMP4 segments) / AVPlayer | — | 🟢 (Pass) | video: no passing matching correctness |
| AV1 + Opus / DASH VOD (WebM segments) / Native video | — | 🔴 (Fail) | page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| AV1 + Opus / DASH VOD (WebM segments) / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| AV1 + Opus / DASH VOD (WebM segments) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| AV1 + Opus / DASH VOD (WebM segments) / AVPlayer | — | 🔴 (Fail) | page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / HLS live (sliding window) / Native video | — | 🔴 (Fail) | Error: Playback-rate progression outside bounded tolerance |
| H.264 + AAC / HLS live (sliding window) / Demuxe (auto) | — | 🟢 (Pass) | video: no passing matching correctness |
| H.264 + AAC / HLS live (sliding window) / Movi | — | 🔴 (Fail) | page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC / HLS live (sliding window) / AVPlayer | — | 🔴 (Fail) | Error: Live audio missing/wrong across playlist updates |
