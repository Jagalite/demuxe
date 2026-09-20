# Cross-player CPU baseline

Positive gain means lower Demuxe CPU; negative means higher Demuxe CPU. Each value is the median of three matched-round reductions, never an average across media formats. A round range crossing zero is directionally inconsistent; three rounds are not a significance test.

Pinned Movi 0.4.0 and AVPlayer 1.3.1; current frozen Demuxe; Chrome headed on this shared macOS host. These versions reproduce the README comparison, not latest-release claims.

36-second synthetic fixtures; 5-second warmup and 20-second scored windows; three rotating orders grouped by fixture, fresh browser per trial. CPU includes CDP-listed Chrome processes, excludes server/external media services/energy. Background processes remain running. Renderer counters differ by path and do not certify physical smoothness. Audio-only results have no video cadence gate. No device, high-resolution, endurance or universal ranking claim.

Original correctness-table outcomes are preserved. Failed, fidelity-blocked, missing-counter, incomplete-round and mismatched-identity cases receive N/A, never zero gain.

| Media | vs Native video | vs Movi | vs AVPlayer |
| --- | --- | --- | --- |
| H.264 + AAC / MP4 | +7.5% | N/A | +42.9% |
| H.264 + AAC / MKV | N/A | N/A | +41.4% |
| H.264 + PCM24 / MKV | -2.3% | N/A | N/A |
| H.264 + PCM24 / MKV + ASS | -72.9% | N/A | N/A |
| H.264 + AAC 5.1 / MP4 | N/A | N/A | N/A |
| H.264 + MP3 stereo / MP4 | -0.9% | N/A | +39.0% |
| H.264 + AC-3 5.1 / MKV | N/A | N/A | N/A |
| H.264 + E-AC-3 5.1 / MKV | N/A | N/A | N/A |
| H.264 + DTS core 5.1 / MKV | N/A | N/A | N/A |
| H.264 + FLAC stereo / MKV | -3.5% | N/A | +33.7% |
| H.264 + FLAC 5.1 / MKV | N/A | N/A | N/A |
| H.264 + Opus stereo / MKV | +3.3% | N/A | +39.3% |
| H.264 + PCM16 stereo / MKV | +1.9% | N/A | N/A |
| H.264 + PCM24 5.1 / MKV | N/A | N/A | N/A |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | +2.5% | N/A | +36.0% |
| HEVC Main 8-bit + AAC / MP4 (hev1) | N/A | N/A | +34.3% |
| HEVC Main 10-bit SDR + AAC / MP4 | N/A | N/A | +33.8% |
| HEVC Main 10-bit SDR + AC-3 / MKV | N/A | N/A | +17.0% |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | N/A | N/A | +16.3% |
| HEVC Main 10-bit SDR + DTS core / MKV | N/A | N/A | +20.7% |
| AV1 8-bit + AAC / MP4 | -4.1% | N/A | +38.9% |
| AV1 10-bit SDR + Opus / MKV | +1.6% | N/A | +35.1% |
| AV1 + Opus / WebM | +0.0% | N/A | +38.6% |
| VP9 8-bit + Opus / WebM | +4.8% | N/A | +42.5% |
| VP9 10-bit SDR + Opus / WebM | +0.6% | N/A | N/A |
| VP8 + Vorbis / WebM | +1.8% | N/A | +39.2% |
| H.264 + AAC / MPEG-TS | N/A | N/A | +36.9% |
| MPEG-2 video + AC-3 / MPEG-TS | N/A | N/A | N/A |
| MPEG-2 video + MP2 / MPEG-PS | N/A | N/A | N/A |
| MPEG-4 Part 2 + MP3 / AVI | N/A | N/A | N/A |
| ProRes + PCM / MOV | N/A | N/A | N/A |
| H.264 + AAC / fragmented MP4 (single file) | -1.0% | N/A | N/A |
| H.264 video-only / MP4 | -8.3% | +37.8% | +29.7% |
| H.264 + AAC + embedded SRT / MKV | N/A | N/A | N/A |
| H.264 + AAC + external WebVTT / MP4 | -0.4% | N/A | N/A |
| H.264 + AAC + embedded mov_text / MP4 | N/A | N/A | N/A |
| H.264 + AAC + styled ASS / MKV | N/A | N/A | N/A |
| HEVC + AC-3 + PGS / MKV | N/A | N/A | N/A |
| H.264 + AC-3 + VobSub / MKV | N/A | N/A | N/A |
| AAC audio-only / M4A | -3.6% | N/A | +27.0% |
| MP3 audio-only / MP3 | +1.7% | N/A | N/A |
| FLAC audio-only / FLAC | +6.8% | N/A | +28.3% |
| Opus audio-only / Ogg | -2.0% | N/A | N/A |
| Vorbis audio-only / Ogg | -3.5% | N/A | N/A |
| PCM16 audio-only / WAV | +0.7% | N/A | N/A |
| PCM24 audio-only / WAV | +6.6% | N/A | N/A |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | N/A | N/A | N/A |
| HEVC Main 10 + AAC / MP4 (HLG) | N/A | N/A | N/A |
| AV1 10-bit + Opus / WebM (HDR10) | N/A | N/A | N/A |
| HEVC + TrueHD 7.1 / MKV | N/A | N/A | N/A |
| HEVC + DTS-HD MA 7.1 / MKV | N/A | N/A | N/A |
| HEVC + E-AC-3 with Atmos metadata / MP4 | N/A | N/A | N/A |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | N/A | N/A | N/A |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | N/A | N/A | N/A |
| H.264 + AAC / HLS VOD (TS segments) | +4.4% | N/A | N/A |
| H.264 + AAC / HLS VOD (fMP4 segments) | +1.6% | N/A | +40.2% |
| HEVC + AAC / HLS VOD (fMP4 segments) | N/A | N/A | N/A |
| H.264 + AAC / DASH VOD (fMP4 segments) | N/A | N/A | N/A |
| AV1 + Opus / DASH VOD (WebM segments) | N/A | N/A | N/A |
| H.264 + AAC / HLS live (sliding window) | N/A | N/A | N/A |

## Per-comparison measurements and exclusions

| Media / comparator | CPU: Demuxe / baseline (% of one core) | Median gain; round range | Evidence or reason |
| --- | --- | --- | --- |
| H.264 + AAC / MP4 / Native video | 20.24 / 21.88 | +7.5%; +6.1 to +9.5% | [raw rounds](../cpu-baseline-performance-original-02/summary.json) |
| H.264 + AAC / MP4 / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / MP4 / AVPlayer | 20.24 / 37.97 | +42.9%; +42.8 to +47.3% | [raw rounds](../cpu-baseline-performance-original-02/summary.json) |
| H.264 + AAC / MKV / Native video | — | N/A | Error: Excessive dropped frames |
| H.264 + AAC / MKV / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / MKV / AVPlayer | 22.08 / 37.28 | +41.4%; +40.4 to +52.1% | [raw rounds](../cpu-baseline-performance-original-02/summary.json) |
| H.264 + PCM24 / MKV / Native video | 21.67 / 21.18 | -2.3%; -28.4 to -0.2% | [raw rounds](../cpu-baseline-performance-original-02/summary.json) |
| H.264 + PCM24 / MKV / Movi | — | N/A | Error: Presentation cadence outside declared frame budget |
| H.264 + PCM24 / MKV / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + PCM24 / MKV + ASS / Native video | 37.77 / 23.61 | -72.9%; -85.6 to -50.0% | [raw rounds](../cpu-baseline-performance-original-02/summary.json) |
| H.264 + PCM24 / MKV + ASS / Movi | — | N/A | movi correctness failed: Error: Required marked subtitle drawing missing |
| H.264 + PCM24 / MKV + ASS / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC 5.1 / MP4 / Native video | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + AAC 5.1 / MP4 / Movi | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + AAC 5.1 / MP4 / AVPlayer | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + MP3 stereo / MP4 / Native video | 22.17 / 21.98 | -0.9%; -4.5 to +7.7% | [raw rounds](../cpu-baseline-pilot-performance-02/summary.json) |
| H.264 + MP3 stereo / MP4 / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + MP3 stereo / MP4 / AVPlayer | 22.17 / 37.52 | +39.0%; +38.4 to +44.3% | [raw rounds](../cpu-baseline-pilot-performance-02/summary.json) |
| H.264 + AC-3 5.1 / MKV / Native video | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + AC-3 5.1 / MKV / Movi | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + AC-3 5.1 / MKV / AVPlayer | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + E-AC-3 5.1 / MKV / Native video | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + E-AC-3 5.1 / MKV / Movi | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + E-AC-3 5.1 / MKV / AVPlayer | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + DTS core 5.1 / MKV / Native video | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + DTS core 5.1 / MKV / Movi | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + DTS core 5.1 / MKV / AVPlayer | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + FLAC stereo / MKV / Native video | 23.63 / 23.01 | -3.5%; -4.0 to +2.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + FLAC stereo / MKV / Movi | — | N/A | movi correctness failed: Error: Audio missing/wrong after seek |
| H.264 + FLAC stereo / MKV / AVPlayer | 23.63 / 35.66 | +33.7%; +32.8 to +34.6% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + FLAC 5.1 / MKV / Native video | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + FLAC 5.1 / MKV / Movi | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + FLAC 5.1 / MKV / AVPlayer | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + Opus stereo / MKV / Native video | 24.54 / 24.87 | +3.3%; -1.7 to +9.7% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + Opus stereo / MKV / Movi | — | N/A | Error: Presentation cadence outside declared frame budget |
| H.264 + Opus stereo / MKV / AVPlayer | 24.54 / 39.82 | +39.3%; +37.8 to +43.4% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + PCM16 stereo / MKV / Native video | 22.08 / 22.69 | +1.9%; -3.6 to +5.6% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + PCM16 stereo / MKV / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + PCM16 stereo / MKV / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + PCM24 5.1 / MKV / Native video | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + PCM24 5.1 / MKV / Movi | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| H.264 + PCM24 5.1 / MKV / AVPlayer | — | N/A | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. |
| HEVC Main 8-bit + AAC / MP4 (hvc1) / Native video | 23.31 / 23.61 | +2.5%; -0.7 to +3.7% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 8-bit + AAC / MP4 (hvc1) / AVPlayer | 23.31 / 36.43 | +36.0%; +35.4 to +37.8% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| HEVC Main 8-bit + AAC / MP4 (hev1) / Native video | — | N/A | Error: Presentation cadence outside declared frame budget; Error: Excessive dropped frames |
| HEVC Main 8-bit + AAC / MP4 (hev1) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 8-bit + AAC / MP4 (hev1) / AVPlayer | 22.45 / 35.02 | +34.3%; +32.6 to +38.0% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| HEVC Main 10-bit SDR + AAC / MP4 / Native video | — | N/A | Error: Presentation cadence outside declared frame budget |
| HEVC Main 10-bit SDR + AAC / MP4 / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 10-bit SDR + AAC / MP4 / AVPlayer | 26.38 / 38.67 | +33.8%; +25.8 to +33.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| HEVC Main 10-bit SDR + AC-3 / MKV / Native video | — | N/A | video correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC Main 10-bit SDR + AC-3 / MKV / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 10-bit SDR + AC-3 / MKV / AVPlayer | 32.22 / 38.83 | +17.0%; +13.0 to +19.6% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV / Native video | — | N/A | video correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC Main 10-bit SDR + E-AC-3 / MKV / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| HEVC Main 10-bit SDR + E-AC-3 / MKV / AVPlayer | 32.89 / 39.13 | +16.3%; +12.9 to +20.3% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| HEVC Main 10-bit SDR + DTS core / MKV / Native video | — | N/A | video correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC Main 10-bit SDR + DTS core / MKV / Movi | — | N/A | movi correctness failed: Error: Playback-rate progression outside bounded tolerance |
| HEVC Main 10-bit SDR + DTS core / MKV / AVPlayer | 33.63 / 42.61 | +20.7%; +17.6 to +24.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| AV1 8-bit + AAC / MP4 / Native video | 23.41 / 22.64 | -4.1%; -8.8 to +0.2% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| AV1 8-bit + AAC / MP4 / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| AV1 8-bit + AAC / MP4 / AVPlayer | 23.41 / 40.35 | +38.9%; +37.3 to +44.1% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| AV1 10-bit SDR + Opus / MKV / Native video | 24.97 / 25.39 | +1.6%; -5.6 to +9.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| AV1 10-bit SDR + Opus / MKV / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| AV1 10-bit SDR + Opus / MKV / AVPlayer | 24.97 / 40.58 | +35.1%; +31.0 to +43.2% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| AV1 + Opus / WebM / Native video | 23.63 / 23.63 | +0.0%; -11.6 to +1.7% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| AV1 + Opus / WebM / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| AV1 + Opus / WebM / AVPlayer | 23.63 / 39.31 | +38.6%; +38.2 to +43.3% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| VP9 8-bit + Opus / WebM / Native video | 21.54 / 23.59 | +4.8%; +3.6 to +9.6% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| VP9 8-bit + Opus / WebM / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| VP9 8-bit + Opus / WebM / AVPlayer | 21.54 / 37.48 | +42.5%; +40.5 to +43.0% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| VP9 10-bit SDR + Opus / WebM / Native video | 25.28 / 25.44 | +0.6%; -1.9 to +1.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| VP9 10-bit SDR + Opus / WebM / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| VP9 10-bit SDR + Opus / WebM / AVPlayer | — | N/A | libmedia correctness failed: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1865] [fatal]: analyze stream failed, ret: -2097152 |
| VP8 + Vorbis / WebM / Native video | 21.95 / 21.90 | +1.8%; -2.4 to +1.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| VP8 + Vorbis / WebM / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| VP8 + Vorbis / WebM / AVPlayer | 21.95 / 34.73 | +39.2%; +36.8 to +40.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + AAC / MPEG-TS / Native video | — | N/A | video correctness failed: page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| H.264 + AAC / MPEG-TS / Movi | — | N/A | movi correctness failed: Error: Seek displayed stale/wrong timeline marker |
| H.264 + AAC / MPEG-TS / AVPlayer | 25.53 / 38.84 | +36.9%; +33.4 to +46.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| MPEG-2 video + AC-3 / MPEG-TS / Native video | — | N/A | video correctness failed: page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| MPEG-2 video + AC-3 / MPEG-TS / Movi | — | N/A | Error: UNQUALIFIED: no established frame presentation counter for this route |
| MPEG-2 video + AC-3 / MPEG-TS / AVPlayer | — | N/A | Error: UNQUALIFIED: no established frame presentation counter for this route |
| MPEG-2 video + MP2 / MPEG-PS / Native video | — | N/A | video correctness failed: page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| MPEG-2 video + MP2 / MPEG-PS / Movi | — | N/A | movi correctness failed: Error: Audio missing/wrong after seek |
| MPEG-2 video + MP2 / MPEG-PS / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| MPEG-4 Part 2 + MP3 / AVI / Native video | — | N/A | video correctness failed: page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| MPEG-4 Part 2 + MP3 / AVI / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| MPEG-4 Part 2 + MP3 / AVI / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| ProRes + PCM / MOV / Native video | — | N/A | video correctness failed: Error: Initial displayed timeline marker incorrect |
| ProRes + PCM / MOV / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| ProRes + PCM / MOV / AVPlayer | — | N/A | libmedia correctness failed: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 2238] [fatal]: not has any supported stream to play |
| H.264 + AAC / fragmented MP4 (single file) / Native video | 23.61 / 23.98 | -1.0%; -2.6 to +3.1% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + AAC / fragmented MP4 (single file) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / fragmented MP4 (single file) / AVPlayer | — | N/A | libmedia correctness failed: Error: open deadline |
| H.264 video-only / MP4 / Native video | 22.57 / 20.84 | -8.3%; -19.8 to -4.8% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 video-only / MP4 / Movi | 22.57 / 37.35 | +37.8%; +26.9 to +43.6% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 video-only / MP4 / AVPlayer | 22.57 / 32.13 | +29.7%; +10.2 to +35.2% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + AAC + embedded SRT / MKV / Native video | — | N/A | video correctness failed: Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded SRT / MKV / Movi | — | N/A | movi correctness failed: Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded SRT / MKV / AVPlayer | — | N/A | libmedia correctness failed: Error: Required subtitle text missing or incorrect |
| H.264 + AAC + external WebVTT / MP4 / Native video | 23.31 / 23.44 | -0.4%; -1.2 to +7.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + AAC + external WebVTT / MP4 / Movi | — | N/A | movi correctness failed: Error: Required subtitle text missing or incorrect |
| H.264 + AAC + external WebVTT / MP4 / AVPlayer | — | N/A | libmedia correctness failed: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1483] [fatal]: analyze stream failed, ret: -2 |
| H.264 + AAC + embedded mov_text / MP4 / Native video | — | N/A | video correctness failed: Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded mov_text / MP4 / Movi | — | N/A | movi correctness failed: Error: Required subtitle text missing or incorrect |
| H.264 + AAC + embedded mov_text / MP4 / AVPlayer | — | N/A | libmedia correctness failed: Error: Required subtitle text missing or incorrect |
| H.264 + AAC + styled ASS / MKV / Native video | — | N/A | video correctness failed: Error: Required marked subtitle drawing missing |
| H.264 + AAC + styled ASS / MKV / Movi | — | N/A | movi correctness failed: Error: Required marked subtitle drawing missing |
| H.264 + AAC + styled ASS / MKV / AVPlayer | — | N/A | libmedia correctness failed: Error: Required marked subtitle drawing missing |
| HEVC + AC-3 + PGS / MKV / Native video | — | N/A | demuxe correctness failed: Error: Required marked subtitle drawing missing |
| HEVC + AC-3 + PGS / MKV / Movi | — | N/A | demuxe correctness failed: Error: Required marked subtitle drawing missing |
| HEVC + AC-3 + PGS / MKV / AVPlayer | — | N/A | demuxe correctness failed: Error: Required marked subtitle drawing missing |
| H.264 + AC-3 + VobSub / MKV / Native video | — | N/A | video correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AC-3 + VobSub / MKV / Movi | — | N/A | movi correctness failed: Error: Required marked subtitle drawing missing |
| H.264 + AC-3 + VobSub / MKV / AVPlayer | — | N/A | libmedia correctness failed: Error: Required marked subtitle drawing missing |
| AAC audio-only / M4A / Native video | 15.89 / 15.35 | -3.6%; -5.1 to +9.2% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| AAC audio-only / M4A / Movi | — | N/A | Error: Playback stalled or reached EOF during measurement |
| AAC audio-only / M4A / AVPlayer | 15.89 / 20.65 | +27.0%; +19.5 to +28.0% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| MP3 audio-only / MP3 / Native video | 14.94 / 15.17 | +1.7%; -4.8 to +5.5% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| MP3 audio-only / MP3 / Movi | — | N/A | Error: Playback stalled or reached EOF during measurement |
| MP3 audio-only / MP3 / AVPlayer | — | N/A | libmedia correctness failed: Error: seek deadline |
| FLAC audio-only / FLAC / Native video | 13.50 / 14.49 | +6.8%; +0.6 to +10.2% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| FLAC audio-only / FLAC / Movi | — | N/A | Error: Playback stalled or reached EOF during measurement |
| FLAC audio-only / FLAC / AVPlayer | 13.50 / 18.52 | +28.3%; +10.1 to +30.7% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| Opus audio-only / Ogg / Native video | 15.94 / 15.87 | -2.0%; -9.8 to +2.2% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| Opus audio-only / Ogg / Movi | — | N/A | Error: Playback stalled or reached EOF during measurement |
| Opus audio-only / Ogg / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| Vorbis audio-only / Ogg / Native video | 15.65 / 14.80 | -3.5%; -11.9 to -3.3% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| Vorbis audio-only / Ogg / Movi | — | N/A | Error: Playback stalled or reached EOF during measurement |
| Vorbis audio-only / Ogg / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| PCM16 audio-only / WAV / Native video | 15.35 / 15.92 | +0.7%; -3.2 to +29.9% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| PCM16 audio-only / WAV / Movi | — | N/A | Error: Playback stalled or reached EOF during measurement |
| PCM16 audio-only / WAV / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| PCM24 audio-only / WAV / Native video | 15.93 / 16.01 | +6.6%; -8.5 to +7.6% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| PCM24 audio-only / WAV / Movi | — | N/A | Error: Playback stalled or reached EOF during measurement |
| PCM24 audio-only / WAV / AVPlayer | — | N/A | libmedia correctness failed: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1858] [fatal]: open stream failed, ret: -2097152, taskId: 746865b5-81da-47bb-be66-4193ab0f5084 |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) / Native video | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) / Movi | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) / AVPlayer | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| HEVC Main 10 + AAC / MP4 (HLG) / Native video | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| HEVC Main 10 + AAC / MP4 (HLG) / Movi | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| HEVC Main 10 + AAC / MP4 (HLG) / AVPlayer | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| AV1 10-bit + Opus / WebM (HDR10) / Native video | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| AV1 10-bit + Opus / WebM (HDR10) / Movi | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| AV1 10-bit + Opus / WebM (HDR10) / AVPlayer | — | N/A | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. |
| HEVC + TrueHD 7.1 / MKV / Native video | — | N/A | Fixture preparation failed: Generated channel count mismatch |
| HEVC + TrueHD 7.1 / MKV / Movi | — | N/A | Fixture preparation failed: Generated channel count mismatch |
| HEVC + TrueHD 7.1 / MKV / AVPlayer | — | N/A | Fixture preparation failed: Generated channel count mismatch |
| HEVC + DTS-HD MA 7.1 / MKV / Native video | — | N/A | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. |
| HEVC + DTS-HD MA 7.1 / MKV / Movi | — | N/A | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. |
| HEVC + DTS-HD MA 7.1 / MKV / AVPlayer | — | N/A | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. |
| HEVC + E-AC-3 with Atmos metadata / MP4 / Native video | — | N/A | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. |
| HEVC + E-AC-3 with Atmos metadata / MP4 / Movi | — | N/A | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. |
| HEVC + E-AC-3 with Atmos metadata / MP4 / AVPlayer | — | N/A | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 / Native video | — | N/A | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 / Movi | — | N/A | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 / AVPlayer | — | N/A | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV / Native video | — | N/A | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV / Movi | — | N/A | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV / AVPlayer | — | N/A | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. |
| H.264 + AAC / HLS VOD (TS segments) / Native video | 23.32 / 24.18 | +4.4%; +0.2 to +4.4% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + AAC / HLS VOD (TS segments) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC / HLS VOD (TS segments) / AVPlayer | — | N/A | libmedia correctness failed: Error: EOF timeline did not settle |
| H.264 + AAC / HLS VOD (fMP4 segments) / Native video | 24.44 / 24.99 | +1.6%; -3.7 to +7.4% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| H.264 + AAC / HLS VOD (fMP4 segments) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC / HLS VOD (fMP4 segments) / AVPlayer | 24.44 / 40.77 | +40.2%; +40.0 to +42.7% | [raw rounds](../cpu-baseline-performance-catalogue-02/summary.json) |
| HEVC + AAC / HLS VOD (fMP4 segments) / Native video | — | N/A | Error: Excessive dropped frames; Error: Presentation cadence outside declared frame budget |
| HEVC + AAC / HLS VOD (fMP4 segments) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| HEVC + AAC / HLS VOD (fMP4 segments) / AVPlayer | — | N/A | Error: Excessive dropped frames; Error: Presentation cadence outside declared frame budget |
| H.264 + AAC / DASH VOD (fMP4 segments) / Native video | — | N/A | demuxe correctness failed: page.evaluate: PlayerError: Command timed out |
| H.264 + AAC / DASH VOD (fMP4 segments) / Movi | — | N/A | demuxe correctness failed: page.evaluate: PlayerError: Command timed out |
| H.264 + AAC / DASH VOD (fMP4 segments) / AVPlayer | — | N/A | demuxe correctness failed: page.evaluate: PlayerError: Command timed out |
| AV1 + Opus / DASH VOD (WebM segments) / Native video | — | N/A | video correctness failed: page.evaluate: NotSupportedError: Failed to load because no supported source was found. |
| AV1 + Opus / DASH VOD (WebM segments) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| AV1 + Opus / DASH VOD (WebM segments) / AVPlayer | — | N/A | libmedia correctness failed: page.waitForFunction: Timeout 7000ms exceeded. |
| H.264 + AAC / HLS live (sliding window) / Native video | — | N/A | video correctness failed: Error: Playback-rate progression outside bounded tolerance |
| H.264 + AAC / HLS live (sliding window) / Movi | — | N/A | movi correctness failed: page.waitForFunction: Timeout 10000ms exceeded. |
| H.264 + AAC / HLS live (sliding window) / AVPlayer | — | N/A | libmedia correctness failed: Error: Live audio missing/wrong across playlist updates |

## Verified run inputs

- [cpu-baseline-correctness-catalogue-01](../cpu-baseline-correctness-catalogue-01/REPORT.md): correctness, chromium/152.0.7977.83/chrome/headed.
- [cpu-baseline-correctness-original-01](../cpu-baseline-correctness-original-01/REPORT.md): correctness, chromium/152.0.7977.83/chrome/headed.
- [cpu-baseline-pilot-correctness-02](../cpu-baseline-pilot-correctness-02/REPORT.md): correctness, chromium/152.0.7977.83/chrome/headed.
- [cpu-baseline-correctness-catalogue-02](../cpu-baseline-correctness-catalogue-02/REPORT.md): correctness, chromium/152.0.7977.83/chrome/headed.
- [cpu-baseline-correctness-original-02](../cpu-baseline-correctness-original-02/REPORT.md): correctness, chromium/152.0.7977.83/chrome/headed.
- [cpu-baseline-pilot-performance-02](../cpu-baseline-pilot-performance-02/REPORT.md): performance, chromium/152.0.7977.83/chrome/headed.
- [cpu-baseline-performance-catalogue-02](../cpu-baseline-performance-catalogue-02/REPORT.md): performance, chromium/152.0.7977.83/chrome/headed.
- [cpu-baseline-performance-original-02](../cpu-baseline-performance-original-02/REPORT.md): performance, chromium/152.0.7977.83/chrome/headed.
