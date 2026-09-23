# Demuxe forced software specialist screens

Browser: `chromium/153.0.8010.53/chrome/headed`. Player source: `283a8effb99c356f1d6eb8ee8163628bb6fa7493`.

**Result: 14/14 fixtures passed** bounded playback, pause/resume, 1.25× rate, seeks and EOF checks. This is a screen of the exact prepared local fixtures, not an acceptance claim for every profile or combination.

Qualification limits: 36-second local fixtures; visible changing frames, stereo audio energy and bounded lifecycle only. No CPU, discrete surround, losslessness, spatial objects, Dolby Vision color or physical HDR qualification.

| Fixture | Result record |
| --- | --- |
| `hevc-truehd` | [passed](hevc-truehd.demuxe.json) |
| `hevc-dtshd` | [passed](hevc-dtshd.demuxe.json) |
| `hevc-atmos` | [passed](hevc-atmos.demuxe.json) |
| `dv5` | [passed](dv5.demuxe.json) |
| `dv81` | [passed](dv81.demuxe.json) |
| `hevc10-aac-mkv` | [passed](hevc10-aac-mkv.demuxe.json) |
| `hevc10-flac-mkv` | [passed](hevc10-flac-mkv.demuxe.json) |
| `hevc10-opus-mkv` | [passed](hevc10-opus-mkv.demuxe.json) |
| `hevc10-flac-ass` | [passed](hevc10-flac-ass.demuxe.json) |
| `hevc10-opus-ass` | [passed](hevc10-opus-ass.demuxe.json) |
| `hdr10-truehd-pgs` | [passed](hdr10-truehd-pgs.demuxe.json) |
| `hdr10-dtshd-pgs` | [passed](hdr10-dtshd-pgs.demuxe.json) |
| `dv5-atmos-ass` | [passed](dv5-atmos-ass.demuxe.json) |
| `dv81-atmos-ass` | [passed](dv81-atmos-ass.demuxe.json) |

The recorded cases preserve their fixture metadata, rendered frame captures, audio oracles and request logs. No CPU measurements were taken in this specialist run.
