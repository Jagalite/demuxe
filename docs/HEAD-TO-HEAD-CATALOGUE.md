<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Expanded player comparison results

Primary run: `expanded-matrix-01`. Browser: `chromium/152.0.7977.83/chrome/headless`. Demuxe source: `8666434920cd4f4fc35a5c099901826e03be8916` plus the captured dirty player diff.

[Raw report](../results/head-to-head/expanded-matrix-01/REPORT.md) · [Summary](../results/head-to-head/expanded-matrix-01/summary.json) · [Prepared catalogue](../results/head-to-head/expanded-matrix-01/files/preparation/fixtures/catalogue.json) · [Integrity hashes](../results/head-to-head/expanded-matrix-01/manifest.json)

All 56 planned combinations were processed against four default players. 51 generated fixtures were available; 5 combinations were blocked at fixture preparation. No performance measurements were taken.

| Player | Passed | Failed | Blocked |
| --- | ---: | ---: | ---: |
| video | 26 | 20 | 10 |
| demuxe | 38 | 4 | 14 |
| movi | 10 | 40 | 6 |
| libmedia | 22 | 21 | 13 |

Latest outcome per player/combination is shown. Supplemental runs replace only their exact rows; the original blocked records remain in the primary run.

- [Supplement expanded-subtitles-01](../results/head-to-head/expanded-subtitles-01/REPORT.md): 24 cases, source `8666434920cd4f4fc35a5c099901826e03be8916`; exact asset/harness identities are retained separately.
- [Supplement expanded-subtitles-02](../results/head-to-head/expanded-subtitles-02/REPORT.md): 6 cases, source `8666434920cd4f4fc35a5c099901826e03be8916`; exact asset/harness identities are retained separately.
- [Supplement expanded-live-01](../results/head-to-head/expanded-live-01/REPORT.md): 4 cases, source `8666434920cd4f4fc35a5c099901826e03be8916`; exact asset/harness identities are retained separately.
- [Supplement demuxe-with-engines-01](../results/head-to-head/demuxe-with-engines-01/REPORT.md): 56 cases, source `8666434920cd4f4fc35a5c099901826e03be8916`; exact asset/harness identities are retained separately.

## Reading the results

- Pass means the declared bounded synthetic output/lifecycle checks passed on this browser and snapshot. It is not general format support.
- Screen only remains blocked for full qualification: stereo downmix or tagged HDR decode may work, but discrete surround and reference HDR fidelity were not established.
- Earlier missing-engine blockers remain in their original records. Latest rows reflect the engine availability in their linked run; no older engine binaries were substituted.
- Text subtitles are checked with macOS Vision OCR for the exact marked phrase; ASS/PGS/VobSub require the visible magenta drawing. PGS/VobSub also pass independent host decode/overlay checks. These checks do not cover every style.
- Live HLS checks a short sliding-window progression, not indefinite live operation or recovery. VOD streams also undergo seeks and EOF checks.
- Failed cases stay failed. Timeouts, marker mismatches, and API errors are observations, not established root causes.
- Original four-combination results remain from matrix-01. Expanded results use the new frozen snapshot and harness; pilots are separate.

## Fixture blockers

- **HEVC + TrueHD 7.1 / MKV:** Fixture preparation failed: Generated channel count mismatch
- **HEVC + DTS-HD MA 7.1 / MKV:** Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available.
- **HEVC + E-AC-3 with Atmos metadata / MP4:** Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available.
- **Dolby Vision profile 5 HEVC + E-AC-3 / MP4:** No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available.
- **Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV:** No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available.

## Outcome details

| Combination | Player | Result | Reason / scope | Evidence |
| --- | --- | --- | --- | --- |
| H.264 + AAC 5.1 / MP4 | video | Native · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-aac51/result.json) |
| H.264 + AAC 5.1 / MP4 | demuxe | Native · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-aac51/result.json) |
| H.264 + AAC 5.1 / MP4 | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-aac51/result.json) |
| H.264 + AAC 5.1 / MP4 | libmedia | Custom · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-aac51/result.json) |
| H.264 + MP3 stereo / MP4 | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-mp3/result.json) |
| H.264 + MP3 stereo / MP4 | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-mp3/result.json) |
| H.264 + MP3 stereo / MP4 | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-mp3/result.json) |
| H.264 + MP3 stereo / MP4 | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-mp3/result.json) |
| H.264 + AC-3 5.1 / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-ac3/result.json) |
| H.264 + AC-3 5.1 / MKV | demuxe | Hybrid · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-ac3/result.json) |
| H.264 + AC-3 5.1 / MKV | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-ac3/result.json) |
| H.264 + AC-3 5.1 / MKV | libmedia | Custom · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-ac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-eac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV | demuxe | Hybrid · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-eac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-eac3/result.json) |
| H.264 + E-AC-3 5.1 / MKV | libmedia | Custom · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-eac3/result.json) |
| H.264 + DTS core 5.1 / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-dts/result.json) |
| H.264 + DTS core 5.1 / MKV | demuxe | Hybrid · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-dts/result.json) |
| H.264 + DTS core 5.1 / MKV | movi | Custom · fail | Error: Playback-rate progression outside bounded tolerance | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-dts/result.json) |
| H.264 + DTS core 5.1 / MKV | libmedia | Custom · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-dts/result.json) |
| H.264 + FLAC stereo / MKV | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-flac/result.json) |
| H.264 + FLAC stereo / MKV | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-flac/result.json) |
| H.264 + FLAC stereo / MKV | movi | Custom · fail | Error: Audio missing/wrong after seek | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-flac/result.json) |
| H.264 + FLAC stereo / MKV | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-flac/result.json) |
| H.264 + FLAC 5.1 / MKV | video | Native · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-flac51/result.json) |
| H.264 + FLAC 5.1 / MKV | demuxe | Native · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-flac51/result.json) |
| H.264 + FLAC 5.1 / MKV | movi | Custom · fail | Error: Audio missing/wrong after seek | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-flac51/result.json) |
| H.264 + FLAC 5.1 / MKV | libmedia | Custom · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-flac51/result.json) |
| H.264 + Opus stereo / MKV | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-opus/result.json) |
| H.264 + Opus stereo / MKV | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-opus/result.json) |
| H.264 + Opus stereo / MKV | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-opus/result.json) |
| H.264 + Opus stereo / MKV | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-opus/result.json) |
| H.264 + PCM16 stereo / MKV | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-pcm16/result.json) |
| H.264 + PCM16 stereo / MKV | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-pcm16/result.json) |
| H.264 + PCM16 stereo / MKV | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-pcm16/result.json) |
| H.264 + PCM16 stereo / MKV | libmedia | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-pcm16/result.json) |
| H.264 + PCM24 5.1 / MKV | video | Native · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-pcm51/result.json) |
| H.264 + PCM24 5.1 / MKV | demuxe | Native · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-pcm51/result.json) |
| H.264 + PCM24 5.1 / MKV | movi | Custom · screen only | Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified. | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-pcm51/result.json) |
| H.264 + PCM24 5.1 / MKV | libmedia | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-pcm51/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc-hvc1/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc-hvc1/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc-hvc1/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hvc1) | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc-hvc1/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc-hev1/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc-hev1/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc-hev1/result.json) |
| HEVC Main 8-bit + AAC / MP4 (hev1) | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc-hev1/result.json) |
| HEVC Main 10-bit SDR + AAC / MP4 | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc10-aac/result.json) |
| HEVC Main 10-bit SDR + AAC / MP4 | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc10-aac/result.json) |
| HEVC Main 10-bit SDR + AAC / MP4 | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc10-aac/result.json) |
| HEVC Main 10-bit SDR + AAC / MP4 | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc10-aac/result.json) |
| HEVC Main 10-bit SDR + AC-3 / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc10-ac3/result.json) |
| HEVC Main 10-bit SDR + AC-3 / MKV | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc10-ac3/result.json) |
| HEVC Main 10-bit SDR + AC-3 / MKV | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc10-ac3/result.json) |
| HEVC Main 10-bit SDR + AC-3 / MKV | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc10-ac3/result.json) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc10-eac3/result.json) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc10-eac3/result.json) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc10-eac3/result.json) |
| HEVC Main 10-bit SDR + E-AC-3 / MKV | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc10-eac3/result.json) |
| HEVC Main 10-bit SDR + DTS core / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc10-dts/result.json) |
| HEVC Main 10-bit SDR + DTS core / MKV | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc10-dts/result.json) |
| HEVC Main 10-bit SDR + DTS core / MKV | movi | Custom · fail | Error: Playback-rate progression outside bounded tolerance | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc10-dts/result.json) |
| HEVC Main 10-bit SDR + DTS core / MKV | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc10-dts/result.json) |
| AV1 8-bit + AAC / MP4 | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.av1-aac/result.json) |
| AV1 8-bit + AAC / MP4 | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.av1-aac/result.json) |
| AV1 8-bit + AAC / MP4 | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.av1-aac/result.json) |
| AV1 8-bit + AAC / MP4 | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.av1-aac/result.json) |
| AV1 10-bit SDR + Opus / MKV | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.av110-opus/result.json) |
| AV1 10-bit SDR + Opus / MKV | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.av110-opus/result.json) |
| AV1 10-bit SDR + Opus / MKV | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.av110-opus/result.json) |
| AV1 10-bit SDR + Opus / MKV | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.av110-opus/result.json) |
| AV1 + Opus / WebM | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.av1-webm/result.json) |
| AV1 + Opus / WebM | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.av1-webm/result.json) |
| AV1 + Opus / WebM | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.av1-webm/result.json) |
| AV1 + Opus / WebM | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.av1-webm/result.json) |
| VP9 8-bit + Opus / WebM | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.vp9-opus/result.json) |
| VP9 8-bit + Opus / WebM | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.vp9-opus/result.json) |
| VP9 8-bit + Opus / WebM | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.vp9-opus/result.json) |
| VP9 8-bit + Opus / WebM | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.vp9-opus/result.json) |
| VP9 10-bit SDR + Opus / WebM | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.vp910-opus/result.json) |
| VP9 10-bit SDR + Opus / WebM | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.vp910-opus/result.json) |
| VP9 10-bit SDR + Opus / WebM | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.vp910-opus/result.json) |
| VP9 10-bit SDR + Opus / WebM | libmedia | Unknown · fail | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1865] [fatal]: analyze stream failed, ret: -2097152 | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.vp910-opus/result.json) |
| VP8 + Vorbis / WebM | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.vp8-vorbis/result.json) |
| VP8 + Vorbis / WebM | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.vp8-vorbis/result.json) |
| VP8 + Vorbis / WebM | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.vp8-vorbis/result.json) |
| VP8 + Vorbis / WebM | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.vp8-vorbis/result.json) |
| H.264 + AAC / MPEG-TS | video | Custom · fail | page.evaluate: NotSupportedError: Failed to load because no supported source was found. | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-ts/result.json) |
| H.264 + AAC / MPEG-TS | demuxe | Native remux · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-ts/result.json) |
| H.264 + AAC / MPEG-TS | movi | Custom · fail | Error: Playback-rate progression outside bounded tolerance | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-ts/result.json) |
| H.264 + AAC / MPEG-TS | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-ts/result.json) |
| MPEG-2 video + AC-3 / MPEG-TS | video | Custom · fail | page.evaluate: NotSupportedError: Failed to load because no supported source was found. | [record](../results/head-to-head/expanded-matrix-01/video.default.mpeg2-ac3/result.json) |
| MPEG-2 video + AC-3 / MPEG-TS | demuxe | Software · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.mpeg2-ac3/result.json) |
| MPEG-2 video + AC-3 / MPEG-TS | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.mpeg2-ac3/result.json) |
| MPEG-2 video + AC-3 / MPEG-TS | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.mpeg2-ac3/result.json) |
| MPEG-2 video + MP2 / MPEG-PS | video | Custom · fail | page.evaluate: NotSupportedError: Failed to load because no supported source was found. | [record](../results/head-to-head/expanded-matrix-01/video.default.mpeg2-mp2/result.json) |
| MPEG-2 video + MP2 / MPEG-PS | demuxe | Software · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.mpeg2-mp2/result.json) |
| MPEG-2 video + MP2 / MPEG-PS | movi | Custom · fail | Error: Audio missing/wrong after seek | [record](../results/head-to-head/expanded-matrix-01/movi.default.mpeg2-mp2/result.json) |
| MPEG-2 video + MP2 / MPEG-PS | libmedia | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.mpeg2-mp2/result.json) |
| MPEG-4 Part 2 + MP3 / AVI | video | Custom · fail | page.evaluate: NotSupportedError: Failed to load because no supported source was found. | [record](../results/head-to-head/expanded-matrix-01/video.default.mpeg4-mp3/result.json) |
| MPEG-4 Part 2 + MP3 / AVI | demuxe | Software · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.mpeg4-mp3/result.json) |
| MPEG-4 Part 2 + MP3 / AVI | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.mpeg4-mp3/result.json) |
| MPEG-4 Part 2 + MP3 / AVI | libmedia | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.mpeg4-mp3/result.json) |
| ProRes + PCM / MOV | video | Native · fail | Error: Initial displayed timeline marker incorrect | [record](../results/head-to-head/expanded-matrix-01/video.default.prores-pcm/result.json) |
| ProRes + PCM / MOV | demuxe | Software · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.prores-pcm/result.json) |
| ProRes + PCM / MOV | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.prores-pcm/result.json) |
| ProRes + PCM / MOV | libmedia | Custom · fail | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 2238] [fatal]: not has any supported stream to play | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.prores-pcm/result.json) |
| H.264 + AAC / fragmented MP4 (single file) | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-fmp4/result.json) |
| H.264 + AAC / fragmented MP4 (single file) | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-fmp4/result.json) |
| H.264 + AAC / fragmented MP4 (single file) | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-fmp4/result.json) |
| H.264 + AAC / fragmented MP4 (single file) | libmedia | Custom · fail | Error: open deadline | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-fmp4/result.json) |
| H.264 video-only / MP4 | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.h264-silent/result.json) |
| H.264 video-only / MP4 | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-silent/result.json) |
| H.264 video-only / MP4 | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.h264-silent/result.json) |
| H.264 video-only / MP4 | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.h264-silent/result.json) |
| H.264 + AAC + embedded SRT / MKV | video | Native · fail | Error: Required subtitle text missing or incorrect | [record](../results/head-to-head/expanded-subtitles-01/video.default.h264-srt/result.json) |
| H.264 + AAC + embedded SRT / MKV | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-srt/result.json) |
| H.264 + AAC + embedded SRT / MKV | movi | Custom · fail | Error: Required subtitle text missing or incorrect | [record](../results/head-to-head/expanded-subtitles-01/movi.default.h264-srt/result.json) |
| H.264 + AAC + embedded SRT / MKV | libmedia | Custom · fail | Error: Required subtitle text missing or incorrect | [record](../results/head-to-head/expanded-subtitles-02/libmedia.default.h264-srt/result.json) |
| H.264 + AAC + external WebVTT / MP4 | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-subtitles-01/video.default.h264-vtt/result.json) |
| H.264 + AAC + external WebVTT / MP4 | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-vtt/result.json) |
| H.264 + AAC + external WebVTT / MP4 | movi | Custom · fail | Error: Required subtitle text missing or incorrect | [record](../results/head-to-head/expanded-subtitles-01/movi.default.h264-vtt/result.json) |
| H.264 + AAC + external WebVTT / MP4 | libmedia | Custom · fail | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1483] [fatal]: analyze stream failed, ret: -2 | [record](../results/head-to-head/expanded-subtitles-02/libmedia.default.h264-vtt/result.json) |
| H.264 + AAC + embedded mov_text / MP4 | video | Native · fail | Error: Required subtitle text missing or incorrect | [record](../results/head-to-head/expanded-subtitles-01/video.default.h264-movtext/result.json) |
| H.264 + AAC + embedded mov_text / MP4 | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-movtext/result.json) |
| H.264 + AAC + embedded mov_text / MP4 | movi | Custom · fail | Error: Required subtitle text missing or incorrect | [record](../results/head-to-head/expanded-subtitles-01/movi.default.h264-movtext/result.json) |
| H.264 + AAC + embedded mov_text / MP4 | libmedia | Custom · fail | Error: Required subtitle text missing or incorrect | [record](../results/head-to-head/expanded-subtitles-02/libmedia.default.h264-movtext/result.json) |
| H.264 + AAC + styled ASS / MKV | video | Native · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/expanded-subtitles-01/video.default.h264-ass/result.json) |
| H.264 + AAC + styled ASS / MKV | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-ass/result.json) |
| H.264 + AAC + styled ASS / MKV | movi | Custom · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/expanded-subtitles-01/movi.default.h264-ass/result.json) |
| H.264 + AAC + styled ASS / MKV | libmedia | Custom · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/expanded-subtitles-02/libmedia.default.h264-ass/result.json) |
| HEVC + AC-3 + PGS / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-subtitles-01/video.default.hevc-pgs/result.json) |
| HEVC + AC-3 + PGS / MKV | demuxe | Hybrid · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc-pgs/result.json) |
| HEVC + AC-3 + PGS / MKV | movi | Custom · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/expanded-subtitles-01/movi.default.hevc-pgs/result.json) |
| HEVC + AC-3 + PGS / MKV | libmedia | Custom · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/expanded-subtitles-02/libmedia.default.hevc-pgs/result.json) |
| H.264 + AC-3 + VobSub / MKV | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-subtitles-01/video.default.h264-vobsub/result.json) |
| H.264 + AC-3 + VobSub / MKV | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.h264-vobsub/result.json) |
| H.264 + AC-3 + VobSub / MKV | movi | Custom · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/expanded-subtitles-01/movi.default.h264-vobsub/result.json) |
| H.264 + AC-3 + VobSub / MKV | libmedia | Custom · fail | Error: Required marked subtitle drawing missing | [record](../results/head-to-head/expanded-subtitles-02/libmedia.default.h264-vobsub/result.json) |
| AAC audio-only / M4A | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.audio-aac/result.json) |
| AAC audio-only / M4A | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.audio-aac/result.json) |
| AAC audio-only / M4A | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.audio-aac/result.json) |
| AAC audio-only / M4A | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.audio-aac/result.json) |
| MP3 audio-only / MP3 | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.audio-mp3/result.json) |
| MP3 audio-only / MP3 | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.audio-mp3/result.json) |
| MP3 audio-only / MP3 | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.audio-mp3/result.json) |
| MP3 audio-only / MP3 | libmedia | Custom · fail | Error: seek deadline | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.audio-mp3/result.json) |
| FLAC audio-only / FLAC | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.audio-flac/result.json) |
| FLAC audio-only / FLAC | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.audio-flac/result.json) |
| FLAC audio-only / FLAC | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.audio-flac/result.json) |
| FLAC audio-only / FLAC | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.audio-flac/result.json) |
| Opus audio-only / Ogg | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.audio-opus/result.json) |
| Opus audio-only / Ogg | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.audio-opus/result.json) |
| Opus audio-only / Ogg | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.audio-opus/result.json) |
| Opus audio-only / Ogg | libmedia | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.audio-opus/result.json) |
| Vorbis audio-only / Ogg | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.audio-vorbis/result.json) |
| Vorbis audio-only / Ogg | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.audio-vorbis/result.json) |
| Vorbis audio-only / Ogg | movi | Custom · fail | Error: Audio missing/wrong after seek | [record](../results/head-to-head/expanded-matrix-01/movi.default.audio-vorbis/result.json) |
| Vorbis audio-only / Ogg | libmedia | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.audio-vorbis/result.json) |
| PCM16 audio-only / WAV | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.audio-pcm16/result.json) |
| PCM16 audio-only / WAV | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.audio-pcm16/result.json) |
| PCM16 audio-only / WAV | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.audio-pcm16/result.json) |
| PCM16 audio-only / WAV | libmedia | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.audio-pcm16/result.json) |
| PCM24 audio-only / WAV | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.audio-pcm24/result.json) |
| PCM24 audio-only / WAV | demuxe | Native · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.audio-pcm24/result.json) |
| PCM24 audio-only / WAV | movi | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/movi.default.audio-pcm24/result.json) |
| PCM24 audio-only / WAV | libmedia | Unknown · fail | page.evaluate: Error: [packages/avplayer/src/AVPlayer.ts][line 1858] [fatal]: open stream failed, ret: -2097152, taskId: 128e3ac9-188e-42c5-a014-7148f34a5430 | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.audio-pcm24/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | video | Native · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/video.default.hdr10-hevc/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | demuxe | Hybrid · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hdr10-hevc/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hdr10-hevc/result.json) |
| HEVC Main 10 + E-AC-3 / MKV (HDR10) | libmedia | Custom · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hdr10-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) | video | Native · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/expanded-matrix-01/video.default.hlg-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) | demuxe | Native · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hlg-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hlg-hevc/result.json) |
| HEVC Main 10 + AAC / MP4 (HLG) | libmedia | Custom · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hlg-hevc/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) | video | Native · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/expanded-matrix-01/video.default.hdr10-av1/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) | demuxe | Native · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hdr10-av1/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) | movi | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hdr10-av1/result.json) |
| AV1 10-bit + Opus / WebM (HDR10) | libmedia | Custom · screen only | Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hdr10-av1/result.json) |
| HEVC + TrueHD 7.1 / MKV | video | Blocked (fixture) | Fixture preparation failed: Generated channel count mismatch | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc-truehd/result.json) |
| HEVC + TrueHD 7.1 / MKV | demuxe | Blocked (fixture) | Fixture preparation failed: Generated channel count mismatch | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc-truehd/result.json) |
| HEVC + TrueHD 7.1 / MKV | movi | Blocked (fixture) | Fixture preparation failed: Generated channel count mismatch | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc-truehd/result.json) |
| HEVC + TrueHD 7.1 / MKV | libmedia | Blocked (fixture) | Fixture preparation failed: Generated channel count mismatch | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc-truehd/result.json) |
| HEVC + DTS-HD MA 7.1 / MKV | video | Blocked (fixture) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc-dtshd/result.json) |
| HEVC + DTS-HD MA 7.1 / MKV | demuxe | Blocked (fixture) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc-dtshd/result.json) |
| HEVC + DTS-HD MA 7.1 / MKV | movi | Blocked (fixture) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc-dtshd/result.json) |
| HEVC + DTS-HD MA 7.1 / MKV | libmedia | Blocked (fixture) | Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc-dtshd/result.json) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | video | Blocked (fixture) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. | [record](../results/head-to-head/expanded-matrix-01/video.default.hevc-atmos/result.json) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | demuxe | Blocked (fixture) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hevc-atmos/result.json) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | movi | Blocked (fixture) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hevc-atmos/result.json) |
| HEVC + E-AC-3 with Atmos metadata / MP4 | libmedia | Blocked (fixture) | Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hevc-atmos/result.json) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | video | Blocked (fixture) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. | [record](../results/head-to-head/expanded-matrix-01/video.default.dv5/result.json) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | demuxe | Blocked (fixture) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.dv5/result.json) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | movi | Blocked (fixture) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. | [record](../results/head-to-head/expanded-matrix-01/movi.default.dv5/result.json) |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | libmedia | Blocked (fixture) | No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.dv5/result.json) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | video | Blocked (fixture) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. | [record](../results/head-to-head/expanded-matrix-01/video.default.dv81/result.json) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | demuxe | Blocked (fixture) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.dv81/result.json) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | movi | Blocked (fixture) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. | [record](../results/head-to-head/expanded-matrix-01/movi.default.dv81/result.json) |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | libmedia | Blocked (fixture) | No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.dv81/result.json) |
| H.264 + AAC / HLS VOD (TS segments) | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.hls-ts/result.json) |
| H.264 + AAC / HLS VOD (TS segments) | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hls-ts/result.json) |
| H.264 + AAC / HLS VOD (TS segments) | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hls-ts/result.json) |
| H.264 + AAC / HLS VOD (TS segments) | libmedia | Custom · fail | Error: EOF timeline did not settle | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hls-ts/result.json) |
| H.264 + AAC / HLS VOD (fMP4 segments) | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.hls-fmp4/result.json) |
| H.264 + AAC / HLS VOD (fMP4 segments) | demuxe | Hybrid · fail | Error: seek deadline | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hls-fmp4/result.json) |
| H.264 + AAC / HLS VOD (fMP4 segments) | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hls-fmp4/result.json) |
| H.264 + AAC / HLS VOD (fMP4 segments) | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hls-fmp4/result.json) |
| HEVC + AAC / HLS VOD (fMP4 segments) | video | Native · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/video.default.hls-hevc/result.json) |
| HEVC + AAC / HLS VOD (fMP4 segments) | demuxe | Hybrid · fail | page.evaluate: PlayerError: Command timed out | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hls-hevc/result.json) |
| HEVC + AAC / HLS VOD (fMP4 segments) | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.hls-hevc/result.json) |
| HEVC + AAC / HLS VOD (fMP4 segments) | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.hls-hevc/result.json) |
| H.264 + AAC / DASH VOD (fMP4 segments) | video | Custom · fail | page.evaluate: NotSupportedError: Failed to load because no supported source was found. | [record](../results/head-to-head/expanded-matrix-01/video.default.dash-h264/result.json) |
| H.264 + AAC / DASH VOD (fMP4 segments) | demuxe | Hybrid · fail | page.evaluate: PlayerError: Command timed out | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.dash-h264/result.json) |
| H.264 + AAC / DASH VOD (fMP4 segments) | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.dash-h264/result.json) |
| H.264 + AAC / DASH VOD (fMP4 segments) | libmedia | Custom · pass | Declared checks passed | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.dash-h264/result.json) |
| AV1 + Opus / DASH VOD (WebM segments) | video | Custom · fail | page.evaluate: NotSupportedError: Failed to load because no supported source was found. | [record](../results/head-to-head/expanded-matrix-01/video.default.dash-av1/result.json) |
| AV1 + Opus / DASH VOD (WebM segments) | demuxe | Hybrid · pass | Declared checks passed | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.dash-av1/result.json) |
| AV1 + Opus / DASH VOD (WebM segments) | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/movi.default.dash-av1/result.json) |
| AV1 + Opus / DASH VOD (WebM segments) | libmedia | Custom · fail | page.waitForFunction: Timeout 7000ms exceeded. | [record](../results/head-to-head/expanded-matrix-01/libmedia.default.dash-av1/result.json) |
| H.264 + AAC / HLS live (sliding window) | video | Native · fail | Error: Playback-rate progression outside bounded tolerance | [record](../results/head-to-head/expanded-live-01/video.default.hls-live/result.json) |
| H.264 + AAC / HLS live (sliding window) | demuxe | Hybrid · pass | Bounded live-window progression only; long-running recovery and discontinuities not covered. | [record](../results/head-to-head/demuxe-with-engines-01/demuxe.auto.hls-live/result.json) |
| H.264 + AAC / HLS live (sliding window) | movi | Custom · fail | page.waitForFunction: Timeout 10000ms exceeded. | [record](../results/head-to-head/expanded-live-01/movi.default.hls-live/result.json) |
| H.264 + AAC / HLS live (sliding window) | libmedia | Custom · fail | Error: Live audio missing/wrong across playlist updates | [record](../results/head-to-head/expanded-live-01/libmedia.default.hls-live/result.json) |
