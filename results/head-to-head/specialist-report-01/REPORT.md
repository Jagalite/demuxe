<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Specialist and library playback screening

Chrome 152.0.7977.83 / macOS, headed, fresh browser per case. This is a local-file functional screen, not a CPU campaign or HDR/spatial-audio qualification. Default player policies are used in the comparison; forced modes, if recorded below, are separate diagnostics.

The earlier eight-second pilot (`specialist-screen-01`) is retained but is not the README source: short clips could reach EOF during route negotiation. This run uses 36-second fixtures and a 60-second open budget.

Pass* requires visible changing video, audible stereo energy, pause/resume, 1.25× rate progression, forward/back seeks, EOF and cleanup. Marked synthetic Main10 cases additionally check timeline colors and stereo tones. Subtitle cases require the magenta ASS/PGS drawing initially and after seeks; PGS fixtures have independent host-rendered oracles. A failed lifecycle check is not proof that a codec cannot decode.

All numeric CPU cells elsewhere retain their original campaign evidence. No CPU values were collected here. No pass certifies discrete 7.1, lossless output, DTS-HD extension fidelity, Atmos object rendering, Dolby Vision RPU application, accurate tone mapping or physical HDR output.

DTS results use the targeted rescreen at audible source positions 12 and 4 seconds. The earlier targets at 10 and 1 seconds fell in genuine source silence; those audio-after-seek failures were harness false negatives and are superseded. The corrected runner independently decodes host stereo energy at every selected seek target before browser testing.

## Default outcomes

| Media | Native video | Demuxe auto | Movi | AVPlayer |
| --- | --- | --- | --- | --- |
| HEVC + TrueHD 7.1 / MKV | Fail | Pass* | Fail | Fail |
| HEVC + DTS-HD MA 7.1 / MKV | Fail | Pass* | Fail | Pass* |
| HEVC + E-AC-3 with Atmos metadata / MP4 | Fail | Pass* | Fail | Fail |
| Dolby Vision profile 5 HEVC + E-AC-3 / MP4 | Fail | Fail | Fail | Pass* |
| Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV | Fail | Fail | Fail | Pass* |
| HEVC Main 10 + AAC / MKV | Pass* | Pass* | Pass* | Pass* |
| HEVC Main 10 + FLAC / MKV | Pass* | Pass* | Fail | Pass* |
| HEVC Main 10 + Opus / MKV | Pass* | Pass* | Pass* | Pass* |
| HEVC Main 10 + FLAC + ASS / MKV | Fail | Pass* | Fail | Fail |
| HEVC Main 10 + Opus + ASS / MKV | Fail | Pass* | Fail | Fail |
| HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV | Fail | Fail | Fail | Fail |
| HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV | Fail | Fail | Fail | Fail |
| Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV | Fail | Fail | Fail | Fail |
| Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV | Fail | Fail | Fail | Fail |

## Fixture scope and provenance

- TrueHD 7.1 repeats a genuine ~0.107-second FFmpeg FATE Atmos/TrueHD regression sample. It exercises the decoder but is not long-form movie-audio coverage.
- DTS-HD MA 7.1 repeats a clean eight-second portion of the FFmpeg sample; its truncated tail is excluded. Base/core-only output is not ruled out by stereo energy checks.
- E-AC-3/JOC audio is copied from Dolby’s Shattered demonstration. No encoder-created E-AC-3 is mislabeled Atmos.
- DV5/8.1 video is copied from Dolby’s Sol Levante sources. Initial parameter sets and actual RPU payloads are retained; DV5 MP4 keeps `hev1`. Basic picture decoding does not establish correct DV5 colors.
- Main10 AAC/FLAC/Opus and ASS cases use generated stereo tones and marked 10-bit 4:2:0 pictures. HDR10+PGS cases use authored 320×180 PQ/BT.2020-tagged synthetic video with mastering/content-light metadata; they are format-composition checks, not UHD-resolution/performance evidence and the same specialist audio excerpts.
- The two DV+Atmos+ASS additions use MKV, copied JOC audio and embedded ASS. They do not qualify Dolby Vision HLS, encrypted streaming or studio-authored A/V synchronization.
- Source URLs, hashes, full probes and exact preparation commands are retained in the input run. Media stays local under `build/`. External media and derived screenshots retain their rights; see [media notices](../../../docs/MEDIA-NOTICES.md).

## Per-case evidence

| Case | Outcome | Observed route | Completed checks | Failure |
| --- | --- | --- | --- | --- |
| [hevc-truehd.video](records/hevc-truehd.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [hevc-truehd.demuxe](records/hevc-truehd.demuxe.json) | passed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc-truehd.movi](records/hevc-truehd.movi.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume | AssertionError [ERR_ASSERTION]: rate advance -0.018000000000000238 |
| [hevc-truehd.libmedia](records/hevc-truehd.libmedia.json) | failed | custom |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [hevc-dtshd.video](records/hevc-dtshd.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [hevc-dtshd.demuxe](records/hevc-dtshd.demuxe.json) | passed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc-dtshd.movi](records/hevc-dtshd.movi.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume | AssertionError [ERR_ASSERTION]: rate advance -0.009999999999999787 |
| [hevc-dtshd.libmedia](records/hevc-dtshd.libmedia.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc-atmos.video](records/hevc-atmos.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [hevc-atmos.demuxe](records/hevc-atmos.demuxe.json) | passed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc-atmos.movi](records/hevc-atmos.movi.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy | page.waitForFunction: Timeout 12000ms exceeded. |
| [hevc-atmos.libmedia](records/hevc-atmos.libmedia.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy | page.waitForFunction: Timeout 12000ms exceeded. |
| [dv5.video](records/dv5.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [dv5.demuxe](records/dv5.demuxe.json) | failed | native-direct |  | page.evaluate: PlayerError: FFmpeg error -1094995529: Missing HEVC parameter sets |
| [dv5.movi](records/dv5.movi.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy | page.waitForFunction: Timeout 12000ms exceeded. |
| [dv5.libmedia](records/dv5.libmedia.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [dv81.video](records/dv81.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [dv81.demuxe](records/dv81.demuxe.json) | failed | native-direct |  | page.evaluate: PlayerError: FFmpeg error -1094995529: Missing HEVC parameter sets |
| [dv81.movi](records/dv81.movi.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy | page.waitForFunction: Timeout 12000ms exceeded. |
| [dv81.libmedia](records/dv81.libmedia.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-aac-mkv.video](records/hevc10-aac-mkv.video.json) | passed | native-direct | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-aac-mkv.demuxe](records/hevc10-aac-mkv.demuxe.json) | passed | native-direct | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-aac-mkv.movi](records/hevc10-aac-mkv.movi.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-aac-mkv.libmedia](records/hevc10-aac-mkv.libmedia.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-flac-mkv.video](records/hevc10-flac-mkv.video.json) | passed | native-direct | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-flac-mkv.demuxe](records/hevc10-flac-mkv.demuxe.json) | passed | native-direct | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-flac-mkv.movi](records/hevc10-flac-mkv.movi.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy | page.waitForFunction: Timeout 12000ms exceeded. |
| [hevc10-flac-mkv.libmedia](records/hevc10-flac-mkv.libmedia.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-opus-mkv.video](records/hevc10-opus-mkv.video.json) | passed | native-direct | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-opus-mkv.demuxe](records/hevc10-opus-mkv.demuxe.json) | passed | native-direct | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-opus-mkv.movi](records/hevc10-opus-mkv.movi.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-opus-mkv.libmedia](records/hevc10-opus-mkv.libmedia.json) | passed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-flac-ass.video](records/hevc10-flac-ass.video.json) | failed | native-direct |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [hevc10-flac-ass.demuxe](records/hevc10-flac-ass.demuxe.json) | passed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-flac-ass.movi](records/hevc10-flac-ass.movi.json) | failed | custom |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [hevc10-flac-ass.libmedia](records/hevc10-flac-ass.libmedia.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |
| [hevc10-opus-ass.video](records/hevc10-opus-ass.video.json) | failed | native-direct |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [hevc10-opus-ass.demuxe](records/hevc10-opus-ass.demuxe.json) | passed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hevc10-opus-ass.movi](records/hevc10-opus-ass.movi.json) | failed | custom |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [hevc10-opus-ass.libmedia](records/hevc10-opus-ass.libmedia.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |
| [hdr10-truehd-pgs.video](records/hdr10-truehd-pgs.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [hdr10-truehd-pgs.demuxe](records/hdr10-truehd-pgs.demuxe.json) | failed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |
| [hdr10-truehd-pgs.movi](records/hdr10-truehd-pgs.movi.json) | failed | custom |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [hdr10-truehd-pgs.libmedia](records/hdr10-truehd-pgs.libmedia.json) | failed | custom |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [hdr10-dtshd-pgs.video](records/hdr10-dtshd-pgs.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [hdr10-dtshd-pgs.demuxe](records/hdr10-dtshd-pgs.demuxe.json) | failed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |
| [hdr10-dtshd-pgs.movi](records/hdr10-dtshd-pgs.movi.json) | failed | custom |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [hdr10-dtshd-pgs.libmedia](records/hdr10-dtshd-pgs.libmedia.json) | failed | custom |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [dv5-atmos-ass.video](records/dv5-atmos-ass.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [dv5-atmos-ass.demuxe](records/dv5-atmos-ass.demuxe.json) | failed | hybrid | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy | Error: EOF seek timed out |
| [dv5-atmos-ass.movi](records/dv5-atmos-ass.movi.json) | failed | custom |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [dv5-atmos-ass.libmedia](records/dv5-atmos-ass.libmedia.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |
| [dv81-atmos-ass.video](records/dv81-atmos-ass.video.json) | failed | native-direct |  | page.waitForFunction: Timeout 20000ms exceeded. |
| [dv81-atmos-ass.demuxe](records/dv81-atmos-ass.demuxe.json) | failed | hybrid |  | page.evaluate: PlayerError: Error: Duplicate retained frame timestamp |
| [dv81-atmos-ass.movi](records/dv81-atmos-ass.movi.json) | failed | custom |  | AssertionError [ERR_ASSERTION]: Initial subtitle drawing |
| [dv81-atmos-ass.libmedia](records/dv81-atmos-ass.libmedia.json) | failed | custom | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |

## Forced Software diagnostics

These results do not replace automatic selection in the comparison. They answer whether an explicit software request changes the observed failure.

| Case | Outcome | Observed route | Completed checks | Failure |
| --- | --- | --- | --- | --- |
| [hevc-dtshd.demuxe](records/software-hevc-dtshd.demuxe.json) | passed | software | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [dv5.demuxe](records/software-dv5.demuxe.json) | passed | software | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [dv81.demuxe](records/software-dv81.demuxe.json) | passed | software | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [hdr10-truehd-pgs.demuxe](records/software-hdr10-truehd-pgs.demuxe.json) | failed | software | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |
| [hdr10-dtshd-pgs.demuxe](records/software-hdr10-dtshd-pgs.demuxe.json) | failed | software | position advances with audible stereo energy and visible video, pause/resume, rate 1.25 | AssertionError [ERR_ASSERTION]: Seek subtitle drawing |
| [dv5-atmos-ass.demuxe](records/software-dv5-atmos-ass.demuxe.json) | passed | software | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |
| [dv81-atmos-ass.demuxe](records/software-dv81-atmos-ass.demuxe.json) | passed | software | position advances with audible stereo energy and visible video, pause/resume, rate 1.25, forward/back seek with visible video and audio energy, reaches EOF |  |

## Next work

Use the first failing check and captured selection trace to target runtime work. Prioritize failures on the common Main10 audio/subtitle combinations, selected-track audio verification and seek recovery, then in-band HEVC parameter-set admission for Dolby Vision. Add independent color/channel/object oracles and longer unrepeated source clips before fidelity or release qualification. Benchmark only after matching correctness passes; retain diagnostic routes separately.
