# Release Auto CPU retest

All 80 README Auto rows have fresh correctness or source-block evidence: 61 full passes with CPU, 17 bounded screens with CPU, 2 lifecycle passes whose CPU windows were rejected, and 0 fixture/source blocks. Auto failures: 0.

Each full Auto number is the median of at least three accepted 20-second headed Chrome windows on the named frozen URL fixture. Values are percentages of one CPU core, not relative savings. The range is the minimum to maximum accepted round. Screened rows retain their limited scope: they do not establish HDR, surround, spatial or physical output fidelity. This campaign uses URL input, so the local-file-only selective video + mpv audio plan is not exercised.

Movi and AVPlayer figures labeled **FAILED** are whole-Chrome diagnostic observations during a failed lifecycle. They are not accepted playback CPU or cross-player efficiency comparisons. Startup failures, stalls, errors and process turnover remain in the raw records; an unavailable CPU means the attempt did not yield a defensible window.

The first snapshot attempt (`release-auto-20260925-01`) is excluded because it omitted committed WebGPU runtime imports. The corrected frozen snapshot and focused H.264 MPEG-TS/dual-audio harness reruns supersede that negative attempt. The MPEG-TS correction permits a diagnosed AVC initialization incompatibility to fall back to Hybrid; the dual-audio correction waits for the selected-track state before judging its audio.

| Media | Auto status / route | Auto CPU (% core) | Movi failed CPU | AVPlayer failed CPU |
| --- | --- | ---: | ---: | ---: |
| H.264 + AAC / MP4 | passed / native-direct | 45.1 (43.9–46.1; 3 rounds) | **FAILED** · 54.6 diagnostic | — |
| H.264 + AAC / MKV | passed / native-direct | 44.7 (44.6–46.8; 3 rounds) | **FAILED** · 55.5 diagnostic | — |
| Dual-audio H.264 + AAC + AC-3 stereo / MKV | passed / native-direct | 43.6 (43.2–44.8; 3 rounds) | **FAILED** · 56.6 diagnostic | — |
| H.264 + PCM24 / MKV | passed / hybrid | 67.6 (65.5–67.8; 3 rounds) | — | **FAILED** · 52.8 diagnostic |
| H.264 + PCM24 / MKV + ASS | passed / hybrid | 65.8 (64.9–68.9; 3 rounds) | **FAILED** · 55.4 diagnostic | **FAILED** · 55.3 diagnostic |
| H.264 + AAC 5.1 / MP4 | passed / native-direct | 46.2 (46.2–47.1; 3 rounds) | **FAILED** · 58.1 diagnostic | — |
| H.264 + MP3 stereo / MP4 | passed / native-direct | 45.2 (44.5–45.7; 3 rounds) | **FAILED** · 55.3 diagnostic | — |
| H.264 + AC-3 5.1 / MKV | passed / hybrid | 65.5 (61.0–67.2; 3 rounds) | **FAILED** · 53.6 diagnostic | — |
| H.264 + E-AC-3 5.1 / MKV | passed / hybrid | 63.8 (52.7–65.0; 3 rounds) | **FAILED** · 57.3 diagnostic | — |
| H.264 + DTS core 5.1 / MKV | passed / hybrid | 67.1 (66.7–68.0; 3 rounds) | **FAILED** · 62.5 diagnostic | — |
| H.264 + AC-3 stereo / MKV | passed / hybrid | 64.5 (63.6–65.5; 3 rounds) | **FAILED** · 53.8 diagnostic | — |
| H.264 + E-AC-3 stereo / MKV | passed / hybrid | 64.8 (64.7–66.2; 3 rounds) | **FAILED** · 54.6 diagnostic | — |
| H.264 + DTS core stereo / MKV | passed / hybrid | 62.8 (57.7–65.4; 3 rounds) | **FAILED** · 64.8 diagnostic | — |
| H.264 + FLAC stereo / MKV | passed / native-direct | 44.7 (42.7–46.1; 3 rounds) | **FAILED** · 53.6 diagnostic | — |
| H.264 + FLAC 5.1 / MKV | passed / native-direct | 46.2 (45.9–46.6; 3 rounds) | **FAILED** · 47.2 diagnostic | — |
| H.264 + Opus stereo / MKV | passed / native-direct | 46.9 (46.1–47.3; 3 rounds) | — | — |
| H.264 + PCM16 stereo / MKV | passed / hybrid | 66.5 (65.6–68.2; 3 rounds) | **FAILED** · 55.4 diagnostic | **FAILED** · 55.2 diagnostic |
| H.264 + PCM24 5.1 / MKV | passed / hybrid | 65.8 (62.6–65.9; 3 rounds) | — | **FAILED** · 55.1 diagnostic |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | passed / native-direct | 47.1 (46.6–48.1; 3 rounds) | **FAILED** · 53.1 diagnostic | — |
| HEVC Main 8-bit + AAC / MP4 (hev1) | passed / native-direct | 47.5 (46.6–48.7; 3 rounds) | **FAILED** · 55.3 diagnostic | — |
| HEVC Main 10-bit SDR + AAC / MP4 | passed / native-direct | 50.0 (49.8–50.2; 3 rounds) | **FAILED** · 54.7 diagnostic | — |
| HEVC Main 10 4:2:2 + AAC / MKV | passed / native-direct | 49.0 (48.5–49.0; 3 rounds) | — | — |
| HEVC Main 10-bit SDR + AC-3 / MKV | passed / hybrid | 67.5 (67.0–69.6; 3 rounds) | **FAILED** · 54.4 diagnostic | — |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | passed / hybrid | 70.2 (67.8–70.4; 3 rounds) | **FAILED** · 54.1 diagnostic | — |
| HEVC Main 10-bit SDR + DTS core / MKV | passed / hybrid | 69.3 (69.1–70.1; 3 rounds) | **FAILED** · 61.4 diagnostic | — |
| AV1 8-bit + AAC / MP4 | passed / native-direct | 42.9 (42.1–45.9; 3 rounds) | **FAILED** · 64.0 diagnostic | — |
| AV1 10-bit SDR + Opus / MKV | passed / native-direct | 48.1 (48.0–48.2; 3 rounds) | **FAILED** · 63.9 diagnostic | — |
| AV1 + Opus / WebM | passed / native-direct | 45.2 (44.6–45.5; 3 rounds) | **FAILED** · 64.4 diagnostic | — |
| VP9 8-bit + Opus / WebM | passed / native-direct | 44.3 (43.6–44.8; 3 rounds) | **FAILED** · 51.2 diagnostic | — |
| VP9 10-bit SDR + Opus / WebM | passed / native-direct | 48.1 (47.5–48.4; 3 rounds) | **FAILED** · 57.4 diagnostic | **FAILED** · 35.7 diagnostic |
| VP8 + Vorbis / WebM | passed / native-direct | 45.3 (44.9–45.8; 3 rounds) | **FAILED** · 62.1 diagnostic | — |
| H.264 + AAC / MPEG-TS | passed / hybrid | 64.8 (63.9–66.1; 3 rounds) | **FAILED** · 60.5 diagnostic | — |
| MPEG-2 video + AC-3 / MPEG-TS | passed / software | 64.7 (62.9–64.8; 3 rounds) | — | — |
| Interlaced MPEG-2 + AC-3 stereo / MPEG-TS | passed / software | 63.2 (63.0–63.2; 3 rounds) | **FAILED** · 60.7 diagnostic | — |
| MPEG-2 video + MP2 / MPEG-PS | passed / software | 61.5 (60.3–63.7; 3 rounds) | **FAILED** · 58.5 diagnostic | **FAILED** · 49.5 diagnostic |
| MPEG-4 Part 2 + MP3 / AVI | passed / software | 62.9 (59.7–64.1; 3 rounds) | **FAILED** · 43.0 diagnostic | **FAILED** · 61.3 diagnostic |
| ProRes + PCM / MOV | passed / software | 70.3 (67.1–71.1; 3 rounds) | **FAILED** · 52.9 diagnostic | **FAILED** · 42.3 diagnostic |
| H.264 + AAC / fragmented MP4 (single file) | passed / native-direct | 45.3 (42.7–45.5; 3 rounds) | **FAILED** · 59.3 diagnostic | **FAILED** · 44.7 diagnostic |
| H.264 video-only / MP4 | passed / native-direct | 41.6 (40.0–42.4; 3 rounds) | — | — |
| H.264 High 10 + AAC / MKV | passed / native-direct | 46.1 (44.4–47.3; 3 rounds) | **FAILED** · 64.6 diagnostic | — |
| MPEG-2 video-only / MPEG-TS | passed / software | 58.4 (54.8–60.0; 3 rounds) | — | — |
| H.264 + AAC + embedded SRT / MKV | passed / hybrid | 66.1 (65.3–67.3; 3 rounds) | **FAILED** · 54.7 diagnostic | **FAILED** · 56.5 diagnostic |
| H.264 + AAC + external WebVTT / MP4 | passed / native-direct | 45.6 (45.1–45.7; 3 rounds) | **FAILED** · 55.6 diagnostic | **FAILED** · 39.8 diagnostic |
| H.264 + AAC + embedded mov_text / MP4 | passed / hybrid | 66.2 (65.9–66.5; 3 rounds) | **FAILED** · 54.7 diagnostic | **FAILED** · 61.9 diagnostic |
| H.264 + AAC + styled ASS / MKV | passed / hybrid | 66.8 (66.4–67.6; 3 rounds) | **FAILED** · 55.9 diagnostic | **FAILED** · 61.9 diagnostic |
| H.264 + AC-3 stereo + ASS / MKV | passed / hybrid | 61.9 (55.6–62.3; 3 rounds) | **FAILED** · 54.3 diagnostic | **FAILED** · 59.5 diagnostic |
| HEVC + AC-3 + PGS / MKV | passed / hybrid | 69.5 (68.5–70.5; 3 rounds) | **FAILED** · 53.9 diagnostic | **FAILED** · 59.4 diagnostic |
| H.264 + AC-3 + VobSub / MKV | passed / hybrid | 64.9 (63.9–65.0; 3 rounds) | **FAILED** · 49.4 diagnostic | **FAILED** · 60.0 diagnostic |
| H.264 + AAC + PGS / MKV (subtitle isolation) | passed / hybrid | 65.2 (63.7–66.5; 3 rounds) | — | — |
| H.264 + AAC + VobSub / MKV (subtitle isolation) | passed / hybrid | 65.9 (65.8–66.4; 3 rounds) | — | — |
| AAC audio-only / M4A | passed / native-direct | 33.7 (32.1–34.6; 3 rounds) | — | — |
| MP3 audio-only / MP3 | passed / native-direct | 34.4 (33.2–36.5; 3 rounds) | — | **FAILED** · 40.5 diagnostic |
| FLAC audio-only / FLAC | passed / native-direct | 33.3 (33.2–35.0; 3 rounds) | — | — |
| Opus audio-only / Ogg | passed / native-direct | 35.4 (34.4–35.9; 3 rounds) | — | **FAILED** · 43.6 diagnostic |
| Vorbis audio-only / Ogg | passed / native-direct | 32.9 (32.4–34.2; 3 rounds) | **FAILED** · 43.3 diagnostic | **FAILED** · 42.2 diagnostic |
| PCM16 audio-only / WAV | passed / native-direct | 33.5 (33.0–33.6; 3 rounds) | — | **FAILED** · 44.0 diagnostic |
| PCM24 audio-only / WAV | passed / native-direct | 33.7 (32.5–34.8; 3 rounds) | — | **FAILED** · 32.8 diagnostic |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | screened / hybrid | 65.1 (64.7–68.6; 3 rounds)* | **FAILED** · 53.6 diagnostic | — |
| HEVC Main 10 + AAC / MP4 (HLG) | screened / native-direct | 48.4 (48.3–49.4; 3 rounds)* | **FAILED** · 53.2 diagnostic | — |
| AV1 10-bit + Opus / WebM (HDR10) | screened / native-direct | 47.2 (44.6–47.6; 3 rounds)* | **FAILED** · 60.9 diagnostic | — |
| HEVC + TrueHD 7.1 / MKV | screened / hybrid | 75.1 (73.2–77.3; 3 rounds)* | **FAILED** · 67.2 diagnostic | **FAILED** · 55.6 diagnostic |
| HEVC + DTS-HD MA 7.1 / MKV | screened / hybrid | 77.4 (76.3–77.7; 3 rounds)* | **FAILED** · 72.8 diagnostic | — |
| HEVC + E-AC-3 with Atmos metadata / MP4 | screened / hybrid | 71.2 (70.8–74.6; 3 rounds)* | **FAILED** · 57.7 diagnostic | **FAILED** · 69.7 diagnostic |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | screened / software | 105.9 (105.8–106.9; 3 rounds)* | **FAILED** · 46.7 diagnostic | **FAILED** · 103.5 diagnostic |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | screened / software | 105.9 (105.2–106.7; 3 rounds)* | **FAILED** · 60.2 diagnostic | — |
| H.264 + AAC / HLS VOD (TS segments) | passed / native-direct | 47.0 (46.8–47.1; 3 rounds) | — | — |
| H.264 + AAC / HLS VOD (fMP4 segments) | passed / native-direct | 46.4 (45.8–46.5; 3 rounds) | — | — |
| HEVC + AAC / HLS VOD (fMP4 segments) | passed / native-direct | — | — | — |
| H.264 + AAC / DASH VOD (fMP4 segments) | passed / shaka-mse | 47.4 (43.3–49.1; 3 rounds) | — | — |
| AV1 + Opus / DASH VOD (WebM segments) | passed / shaka-mse | 48.0 (46.7–50.1; 3 rounds) | — | **FAILED** · 65.1 diagnostic |
| H.264 + AAC / HLS live (sliding window) | passed / shaka-mse | — | — | **FAILED** · 39.4 diagnostic |
| HEVC Main 10 + AAC / MKV | screened / native-direct | 44.5 (42.4–51.0; 3 rounds)* | — | — |
| HEVC Main 10 + FLAC / MKV | screened / native-direct | 46.6 (46.2–48.6; 3 rounds)* | **FAILED** · 46.1 diagnostic | — |
| HEVC Main 10 + Opus / MKV | screened / native-direct | 48.1 (47.5–48.2; 3 rounds)* | **FAILED** · 62.6 diagnostic | — |
| HEVC Main 10 + FLAC + ASS / MKV | screened / hybrid | 70.5 (70.3–71.4; 3 rounds)* | **FAILED** · 45.3 diagnostic | **FAILED** · 62.9 diagnostic |
| HEVC Main 10 + Opus + ASS / MKV | screened / hybrid | 70.0 (69.2–70.6; 3 rounds)* | **FAILED** · 54.8 diagnostic | **FAILED** · 64.8 diagnostic |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | screened / hybrid | 76.5 (72.9–78.4; 3 rounds)* | **FAILED** · 75.1 diagnostic | **FAILED** · 57.1 diagnostic |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | screened / hybrid | 78.0 (77.7–79.5; 3 rounds)* | **FAILED** · 77.1 diagnostic | **FAILED** · 78.9 diagnostic |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | screened / software | 107.8 (104.1–108.8; 3 rounds)* | **FAILED** · 53.5 diagnostic | **FAILED** · 104.8 diagnostic |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | screened / software | 107.8 (98.9–108.4; 3 rounds)* | **FAILED** · 56.4 diagnostic | **FAILED** · 102.5 diagnostic |

## Wide CPU ranges

- H.264 + E-AC-3 5.1 / MKV: 52.7–65.0 core points across three rounds; median is reported but should not be treated as a stable fine-grained difference.

## Missing values and failures

- H.264 + AAC / MP4 — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AAC / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- Dual-audio H.264 + AAC + AC-3 stereo / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + PCM24 / MKV — libmedia failed at initial-playback: page.waitForFunction: Timeout 10000ms exceeded.; diagnostic CPU recorded; window issues: Player reported errors during the window.
- H.264 + PCM24 / MKV + ASS — movi failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + PCM24 / MKV + ASS — libmedia failed at initial-playback: page.waitForFunction: Timeout 10000ms exceeded.; diagnostic CPU recorded; window issues: Player reported errors during the window.
- H.264 + AAC 5.1 / MP4 — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + MP3 stereo / MP4 — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AC-3 5.1 / MKV — movi failed at seek-1: Error: Audio missing/wrong after seek; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + E-AC-3 5.1 / MKV — movi failed at seek-1: Error: Audio missing/wrong after seek; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + DTS core 5.1 / MKV — movi failed at playback-rate: Error: Playback-rate progression outside bounded tolerance; diagnostic CPU recorded.
- H.264 + AC-3 stereo / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + E-AC-3 stereo / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + DTS core stereo / MKV — movi failed at playback-rate: Error: Playback-rate progression outside bounded tolerance; diagnostic CPU recorded.
- H.264 + FLAC stereo / MKV — movi failed at seek-10: Error: Audio missing/wrong after seek; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + FLAC 5.1 / MKV — movi failed at seek-1: Error: Audio missing/wrong after seek; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + PCM16 stereo / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + PCM16 stereo / MKV — libmedia failed at initial-playback: page.waitForFunction: Timeout 10000ms exceeded.; diagnostic CPU recorded; window issues: Player reported errors during the window.
- H.264 + PCM24 5.1 / MKV — libmedia failed at initial-playback: page.waitForFunction: Timeout 10000ms exceeded.; diagnostic CPU recorded; window issues: Player reported errors during the window.
- HEVC Main 8-bit + AAC / MP4 (hvc1) — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 8-bit + AAC / MP4 (hev1) — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10-bit SDR + AAC / MP4 — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10-bit SDR + AC-3 / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10-bit SDR + E-AC-3 / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10-bit SDR + DTS core / MKV — movi failed at playback-rate: Error: Playback-rate progression outside bounded tolerance; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- AV1 8-bit + AAC / MP4 — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- AV1 10-bit SDR + Opus / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- AV1 + Opus / WebM — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- VP9 8-bit + Opus / WebM — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- VP9 10-bit SDR + Opus / WebM — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- VP9 10-bit SDR + Opus / WebM — libmedia failed at open: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1865] [fatal]: analyze stream failed, ret: -2097152; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: TypeError: Cannot read properties of null (reading 'video'), open: Error: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1865] [fatal]: analyze stream failed, ret: -2097152
    at Object.w (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:191142)
    at Ue.load (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:279386)
    at async Object.start (http://127.0.0.1:57069/harness/adapters.mjs:140:5)
    at async <anonymous>:316:30, snapshot: Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'streams')
    at Ue.getDuration (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:306044)
    at Object.snapshot (http://127.0.0.1:57069/harness/adapters.mjs:156:112)
    at eval (eval at evaluate (:290:30), <anonymous>:1:9)
    at UtilityScript.evaluate (<anonymous>:292:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44), startup progress: Error: page.waitForFunction: TypeError: Cannot read properties of undefined (reading 'streams')
    at Ue.getDuration (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:306044)
    at Object.snapshot (http://127.0.0.1:57069/harness/adapters.mjs:156:112)
    at eval (eval at predicate (eval at evaluate (:290:30)), <anonymous>:1:9)
    at predicate (eval at evaluate (:290:30), <anonymous>:7:23)
    at next (eval at evaluate (:290:30), <anonymous>:29:29)
    at eval (eval at evaluate (:290:30), <anonymous>:42:9)
    at UtilityScript.evaluate (<anonymous>:292:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44).
- VP8 + Vorbis / WebM — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- H.264 + AAC / MPEG-TS — movi failed at seek-6: Error: Audio missing/wrong after seek; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- Interlaced MPEG-2 + AC-3 stereo / MPEG-TS — movi failed at seek-6: Error: Audio missing/wrong after seek; diagnostic CPU recorded.
- MPEG-2 video + MP2 / MPEG-PS — movi failed at seek-6: Error: Audio missing/wrong after seek; diagnostic CPU recorded.
- MPEG-2 video + MP2 / MPEG-PS — libmedia failed at seek-6: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- MPEG-4 Part 2 + MP3 / AVI — movi failed at initial-playback: page.waitForFunction: Timeout 10000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window, startup progress: TimeoutError: page.waitForFunction: Timeout 10000ms exceeded..
- MPEG-4 Part 2 + MP3 / AVI — libmedia failed at seek-1: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- ProRes + PCM / MOV — movi failed at initial-playback: page.waitForFunction: Timeout 10000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- ProRes + PCM / MOV — libmedia failed at open: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 2238] [fatal]: not has any supported stream to play; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window, open: Error: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 2238] [fatal]: not has any supported stream to play
    at Object.w (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:191142)
    at Ue.playUseDecoder (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:286915)
    at Ue.play (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:297624)
    at async Object.start (http://127.0.0.1:57069/harness/adapters.mjs:144:3)
    at async <anonymous>:316:30, startup progress: TimeoutError: page.waitForFunction: Timeout 10000ms exceeded..
- H.264 + AAC / fragmented MP4 (single file) — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AAC / fragmented MP4 (single file) — libmedia failed at open: Error: open deadline; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window, open: Error: open deadline, startup progress: TimeoutError: page.waitForFunction: Timeout 10000ms exceeded..
- H.264 High 10 + AAC / MKV — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- H.264 + AAC + embedded SRT / MKV — movi failed at initial-subtitles: Error: Required subtitle text missing or incorrect; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AAC + embedded SRT / MKV — libmedia failed at seek-6: Error: Required subtitle text missing or incorrect; diagnostic CPU recorded.
- H.264 + AAC + external WebVTT / MP4 — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AAC + external WebVTT / MP4 — libmedia failed at open: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1483] [fatal]: analyze stream failed, ret: -2; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window, open: Error: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1483] [fatal]: analyze stream failed, ret: -2
    at Object.w (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:191142)
    at Ue.loadExternalSubtitle (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:272580)
    at async Ue.load (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:280390)
    at async Object.start (http://127.0.0.1:57069/harness/adapters.mjs:140:5)
    at async <anonymous>:316:30, startup progress: TimeoutError: page.waitForFunction: Timeout 10000ms exceeded..
- H.264 + AAC + embedded mov_text / MP4 — movi failed at initial-subtitles: Error: Required subtitle text missing or incorrect; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AAC + embedded mov_text / MP4 — libmedia failed at seek-6: Error: Required subtitle text missing or incorrect; diagnostic CPU recorded.
- H.264 + AAC + styled ASS / MKV — movi failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AAC + styled ASS / MKV — libmedia failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded.
- H.264 + AC-3 stereo + ASS / MKV — movi failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AC-3 stereo + ASS / MKV — libmedia failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded.
- HEVC + AC-3 + PGS / MKV — movi failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC + AC-3 + PGS / MKV — libmedia failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded.
- H.264 + AC-3 + VobSub / MKV — movi failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded; window issues: frame quality: Error: Presentation cadence outside declared frame budget.
- H.264 + AC-3 + VobSub / MKV — libmedia failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded.
- MP3 audio-only / MP3 — libmedia failed at seek-6: Error: seek deadline; diagnostic CPU recorded.
- Opus audio-only / Ogg — libmedia failed at seek-10: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- Vorbis audio-only / Ogg — movi failed at seek-10: Error: Audio missing/wrong after seek; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence.
- Vorbis audio-only / Ogg — libmedia failed at seek-10: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- PCM16 audio-only / WAV — libmedia failed at initial-playback: page.waitForFunction: Timeout 10000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, startup progress: TimeoutError: page.waitForFunction: Timeout 10000ms exceeded..
- PCM24 audio-only / WAV — libmedia failed at open: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1858] [fatal]: open stream failed, ret: -2097152, taskId: 17449054-77ae-4b0b-8690-476175adac50; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, open: Error: page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1858] [fatal]: open stream failed, ret: -2097152, taskId: 8f4a4a5b-a0e4-410f-91ca-538c69301d65
    at Object.w (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:191142)
    at Ue.load (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:279212)
    at async Object.start (http://127.0.0.1:57069/harness/adapters.mjs:140:5)
    at async <anonymous>:316:30, snapshot: Error: page.evaluate: TypeError: Cannot read properties of undefined (reading 'streams')
    at Ue.getDuration (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:306044)
    at Object.snapshot (http://127.0.0.1:57069/harness/adapters.mjs:156:112)
    at eval (eval at evaluate (:290:30), <anonymous>:1:9)
    at UtilityScript.evaluate (<anonymous>:292:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44), startup progress: Error: page.waitForFunction: TypeError: Cannot read properties of undefined (reading 'streams')
    at Ue.getDuration (http://127.0.0.1:57069/packages/libmedia/package/dist/umd/avplayer.js:1:306044)
    at Object.snapshot (http://127.0.0.1:57069/harness/adapters.mjs:156:112)
    at eval (eval at predicate (eval at evaluate (:290:30)), <anonymous>:1:9)
    at predicate (eval at evaluate (:290:30), <anonymous>:7:23)
    at next (eval at evaluate (:290:30), <anonymous>:29:29)
    at eval (eval at evaluate (:290:30), <anonymous>:42:9)
    at UtilityScript.evaluate (<anonymous>:292:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44).
- HEVC Main 10 + E-AC-3 / MKV (HDR10) — Auto blocked: Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified.; not scored.
- HEVC Main 10 + E-AC-3 / MKV (HDR10) — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10 + AAC / MP4 (HLG) — Auto blocked: Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified.; not scored.
- HEVC Main 10 + AAC / MP4 (HLG) — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- AV1 10-bit + Opus / WebM (HDR10) — Auto blocked: Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified.; not scored.
- AV1 10-bit + Opus / WebM (HDR10) — movi failed at near-eof: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- HEVC + TrueHD 7.1 / MKV — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- HEVC + TrueHD 7.1 / MKV — bounded real specialist bitstream substituted for an unmakeable marked placeholder; source SHA-256 76e1aa581b2e974421824db36a79aefa4d635fabfb4ae1886dd5635a75072219. This is a different fixture and is not a matched CPU comparison with the placeholder.
- HEVC + TrueHD 7.1 / MKV — movi failed at playback-rate: AssertionError [ERR_ASSERTION]: rate advance -0.022000000000002018; diagnostic CPU recorded.
- HEVC + TrueHD 7.1 / MKV — libmedia failed at initial-playback: page.waitForFunction: Timeout 20000ms exceeded.; diagnostic CPU recorded.
- HEVC + DTS-HD MA 7.1 / MKV — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- HEVC + DTS-HD MA 7.1 / MKV — bounded real specialist bitstream substituted for an unmakeable marked placeholder; source SHA-256 86e4adf16e65d7bbce5a6d5dbd66570c43e80f3433963a2ad979716d844916fa. This is a different fixture and is not a matched CPU comparison with the placeholder.
- HEVC + DTS-HD MA 7.1 / MKV — movi failed at playback-rate: AssertionError [ERR_ASSERTION]: rate advance -0.007999999999999119; diagnostic CPU recorded.
- HEVC + DTS-HD MA 7.1 / MKV — libmedia fresh bounded basic screen passed; prior README error cell superseded.
- HEVC + E-AC-3 with Atmos metadata / MP4 — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- HEVC + E-AC-3 with Atmos metadata / MP4 — bounded real specialist bitstream substituted for an unmakeable marked placeholder; source SHA-256 d8c3989fb7df65b56d167d9061d267405814b56726b0a81f0a5098e4bf8da254. This is a different fixture and is not a matched CPU comparison with the placeholder.
- HEVC + E-AC-3 with Atmos metadata / MP4 — movi failed at cpu-window: Error: Basic-screen CPU window failed progress, error or process-stability gate; diagnostic CPU recorded.
- HEVC + E-AC-3 with Atmos metadata / MP4 — libmedia failed at near-eof: page.waitForFunction: Timeout 12000ms exceeded.; diagnostic CPU recorded.
- Dolby Vision profile 5 HEVC + E-AC-3 / MP4 — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- Dolby Vision profile 5 HEVC + E-AC-3 / MP4 — bounded real specialist bitstream substituted for an unmakeable marked placeholder; source SHA-256 0bb4a83a59b8e5e8a49590c3f5508768705d52e6d9b90230f2ec4947520bd47d. This is a different fixture and is not a matched CPU comparison with the placeholder.
- Dolby Vision profile 5 HEVC + E-AC-3 / MP4 — movi failed at cpu-window: Error: Basic-screen CPU window failed progress, error or process-stability gate; diagnostic CPU recorded.
- Dolby Vision profile 5 HEVC + E-AC-3 / MP4 — libmedia failed at cleanup: Cleanup failed; diagnostic CPU recorded.
- Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV — bounded real specialist bitstream substituted for an unmakeable marked placeholder; source SHA-256 a61bf2aaa7213a68fa93b3f3b0e8eba2c81a083fceb526baf21237884a3782c2. This is a different fixture and is not a matched CPU comparison with the placeholder.
- Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV — movi failed at cpu-window: Error: Basic-screen CPU window failed progress, error or process-stability gate; diagnostic CPU recorded.
- Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV — libmedia fresh bounded basic screen passed; prior README error cell superseded.
- HEVC + AAC / HLS VOD (fMP4 segments) — Auto passed: Three complete accepted rounds required: round 1: failed at setup — Error: Excessive dropped frames; Three complete accepted rounds required: round 1: failed at setup — Error: Excessive dropped frames.
- AV1 + Opus / DASH VOD (WebM segments) — libmedia failed at seek-6: page.waitForFunction: Timeout 7000ms exceeded.; diagnostic CPU recorded.
- H.264 + AAC / HLS live (sliding window) — Auto passed: Three complete accepted rounds required: round 2: failed at setup — Error: Playback stalled or reached EOF during measurement; round 3: failed at setup — Error: Playback stalled or reached EOF during measurement; Three complete accepted rounds required: round 2: failed at setup — Error: Playback stalled or reached EOF during measurement; round 3: failed at setup — Error: Playback stalled or reached EOF during measurement.
- H.264 + AAC / HLS live (sliding window) — libmedia failed at live-window: Error: Live audio missing/wrong across playlist updates; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10 + AAC / MKV — Auto blocked: 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification.; not scored.
- HEVC Main 10 + FLAC / MKV — Auto blocked: 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification.; not scored.
- HEVC Main 10 + FLAC / MKV — movi failed at seek-10: Error: Audio missing/wrong after seek; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10 + Opus / MKV — Auto blocked: 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification.; not scored.
- HEVC Main 10 + Opus / MKV — movi failed at cpu-window: Error: Basic-screen CPU window failed progress, error or process-stability gate; diagnostic CPU recorded.
- HEVC Main 10 + Opus / MKV — libmedia fresh bounded basic screen passed; prior README error cell superseded.
- HEVC Main 10 + FLAC + ASS / MKV — Auto blocked: 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification.; not scored.
- HEVC Main 10 + FLAC + ASS / MKV — movi failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10 + FLAC + ASS / MKV — libmedia failed at seek-6: Error: Required marked subtitle drawing missing; diagnostic CPU recorded.
- HEVC Main 10 + Opus + ASS / MKV — Auto blocked: 36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification.; not scored.
- HEVC Main 10 + Opus + ASS / MKV — movi failed at initial-subtitles: Error: Required marked subtitle drawing missing; diagnostic CPU recorded; window issues: Playback did not advance at normal 1x cadence, frame quality: Error: Video presentation stalled during CPU window.
- HEVC Main 10 + Opus + ASS / MKV — libmedia failed at seek-6: Error: Required marked subtitle drawing missing; diagnostic CPU recorded.
- HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV — movi failed at initial-subtitles: AssertionError [ERR_ASSERTION]: Initial subtitle drawing; diagnostic CPU recorded.
- HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV — libmedia failed at initial-playback: page.waitForFunction: Timeout 20000ms exceeded.; diagnostic CPU recorded.
- HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV — movi failed at initial-subtitles: AssertionError [ERR_ASSERTION]: Initial subtitle drawing; diagnostic CPU recorded.
- HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV — libmedia failed at initial-subtitles: AssertionError [ERR_ASSERTION]: Initial subtitle drawing; diagnostic CPU recorded.
- Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV — movi failed at initial-subtitles: AssertionError [ERR_ASSERTION]: Initial subtitle drawing; diagnostic CPU recorded.
- Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV — libmedia failed at seek-10: AssertionError [ERR_ASSERTION]: Seek subtitle drawing; diagnostic CPU recorded.
- Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV — Auto blocked: Real bitstream basic playback screen passed; marked audio, physical HDR and spatial fidelity unqualified.; not scored.
- Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV — movi failed at initial-subtitles: AssertionError [ERR_ASSERTION]: Initial subtitle drawing; diagnostic CPU recorded.
- Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV — libmedia failed at seek-10: AssertionError [ERR_ASSERTION]: Seek subtitle drawing; diagnostic CPU recorded.

## Evidence

- results/head-to-head/release-auto-20260925-02 — summary SHA-256 14b3f9fc97defb3c32ecd415efe46f4b992b590641cfd6ac918b3d55b6594807.
- results/head-to-head/release-auto-cpu-20260925-02 — summary SHA-256 3f86157638e52e559b67f6bd2c9ed40972ed7bbf6af83d20fd53393c86af803e.
- results/head-to-head/release-auto-fix-20260925-03 — summary SHA-256 a8542af9692b0b5db4306d59ca8b5ef0146fb40bc4d03879d0c5637c6e7468d8.
- results/head-to-head/release-auto-fix-cpu-20260925-03 — summary SHA-256 b519a83f3166417d4cdf7f8e4be5efc1d96651598e491be4524f681694ca52c3.
- results/head-to-head/release-supplement-20260925-04 — summary SHA-256 74e92e0e0c45b51d198b13e1d087071d8a706988bd3fb05434ee5d1d4e754e5f.
- results/head-to-head/release-supplement-cpu-20260925-04 — summary SHA-256 d002ea3ecdac08bc2672fbab8a6a692d9deb0a141a5204b28379eaafdf1b61ef.
- results/head-to-head/release-auto-streaming-retry-20260925-07 — summary SHA-256 70ee5172d2a953e36602ab152e6e92a0c825f0d0be9dcf232a4875c666d33a87.
- results/head-to-head/release-auto-streaming-retry-cpu-20260925-07 — summary SHA-256 ce70736a8c078d840ee375d253806dcf2d0491395e419f129dbe88119e4b23d3.
- results/head-to-head/release-auto-screen-20260925-06 — summary SHA-256 1ca9ba6646cf19a7412f996307b0e2d7e326400ff31a454ca029e096a7cac114.
- results/head-to-head/release-auto-screen-cpu-20260925-06 — summary SHA-256 393db4cb16d15549d2a1f77cdee81d201f34e4c1ef3924cf49523e535cf5fd7d.
- results/head-to-head/release-supplement-screen-20260925-06 — summary SHA-256 f71b06d8c3e63a3bab6fae0a95a4261177cf6a3529a82d00682371d6a1144581.
- results/head-to-head/release-supplement-screen-cpu-20260925-06 — summary SHA-256 c418d9b8df003fb3c89c89cd2d6ddca3fbd8b8e8f5c85b5ee8daeb269eb54757.
- results/head-to-head/release-competitor-a-20260925-06 — summary SHA-256 2b4ef6a6524c55f7aabdc1ba73cec89bd8a9e91d3766f075ec4005e057934526.
- results/head-to-head/release-competitor-a-cpu-20260925-06 — summary SHA-256 f35fde6a911c69061723dab822e674547c930ce16d571ae7c3571c8b97f032b7.
- results/head-to-head/release-competitor-b-20260925-06 — summary SHA-256 338537dab03e32ef246279073e368615257c9259d73beedd6f75da5f05dc528b.
- results/head-to-head/release-competitor-b-cpu-20260925-06 — summary SHA-256 d51b4f5834b7ff41dff35ed68a2455518b09102984215092484efa570d0cbc4e.
- results/head-to-head/release-specialist-cpu-r1-20260925-06 — basic real-bitstream screen, summary SHA-256 9a962e25820f4351cb6a2b12a98d026ce310b25e61feee4a750bf91c8fcc6d3d.
- results/head-to-head/release-specialist-auto-extra-r1-20260925-06 — basic real-bitstream screen, summary SHA-256 bc37ed30a370f6c22c120255f1d67be968c98e00a7043b43db880beed8feb388.
- results/head-to-head/release-specialist-cpu-r1-20260925-06 — basic-screen CPU run, summary SHA-256 9a962e25820f4351cb6a2b12a98d026ce310b25e61feee4a750bf91c8fcc6d3d.
- results/head-to-head/release-specialist-cpu-r2-20260925-06 — basic-screen CPU run, summary SHA-256 b8458d3e1cacf192908d32b25a562d287f689a40039d44704a139524d1a4ee32.
- results/head-to-head/release-specialist-cpu-r3-20260925-06 — basic-screen CPU run, summary SHA-256 a97c3d0038386b024c71ef739cd042aca919d6419ea5a77de1dd908c75f3ebf4.
- results/head-to-head/release-specialist-auto-extra-r1-20260925-06 — basic-screen CPU run, summary SHA-256 bc37ed30a370f6c22c120255f1d67be968c98e00a7043b43db880beed8feb388.
- results/head-to-head/release-specialist-auto-extra-r2-20260925-06 — basic-screen CPU run, summary SHA-256 96fbd61e5413fe1b27832a3b18f4096825e32963610607bcf2ba761cdb4c5ec3.
- results/head-to-head/release-specialist-auto-extra-r3-20260925-06 — basic-screen CPU run, summary SHA-256 71c5751b8537fb40dbe8c0d315f5bdcee8600797ba84847a7696317617b1e8a3.
- results/head-to-head/release-specialist-competitors-20260925-06 — specialist competitor diagnostic screen, summary SHA-256 f580b22742febcf4bf055d93a652f8ed47a3184685fea2450fd0a2aaf0f1c0c0.
- results/head-to-head/release-specialist-competitors-extra-20260925-06 — specialist competitor diagnostic screen, summary SHA-256 8ebef30c9eb1aadbc8d018bd9864987b1a204e799a54772acb800102450fe36f.
- results/head-to-head/release-competitor-targets-20260925.json — pre-refresh competitor error target list, SHA-256 7abd3d0bcfdc8981a7c88d9967c179ebd28d88ea63de5bc49e325ed1d39b2979.

## Compressed evidence

The [evidence index](evidence/index.json) records SHA-256 hashes of each original JSON file and its losslessly compressed copy. Full local run directories retain screenshots, request logs and per-case files. Superseded runs remain identified in the index.
