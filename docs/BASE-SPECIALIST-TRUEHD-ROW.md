<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC + TrueHD 7.1 / MKV — current source candidate screen

On 2026-09-28, the hash-pinned `hevc-truehd` fixture passed a fresh bounded
Demuxe Auto screen on `native-transcode` and a forced Software control. This
replaces the Auto row's Unqualified label with Screened. CPU remains withheld:
two accepted 20-second windows were followed by a window with 77 dropped video
frames. The failed window is retained and no three-round median is published.

The exact fixture is the 36-second Matroska file with SHA-256
`76e1aa581b2e974421824db36a79aefa4d635fabfb4ae1886dd5635a75072219`.
It contains HEVC Main 10 and eight-channel TrueHD. The audio repeats a short
genuine regression bitstream and is not representative program material. Its
profile and host-decoded reference windows are recorded in the
[source validation](BASE-SPECIALIST-FIXTURES.md). FFmpeg emitted a Matroska
keyframe-marking warning while extracting reference audio; full host decoding
and the browser seek checks completed, and the warning remains in the archive.

The runtime snapshot was built from `7f4407d2` plus local source changes, with
manifest SHA-256 `b3216b7e2041fb93987421acd630cf0181a74ca7af77a3001d37e253fba6d8d1`.
Its manifest preserves source hashes and the dirty source diff. This is a local
source-candidate result, not a clean release-archive qualification. Chrome was
153.0.8010.53 on macOS. The screen harness hash was
`62e844def5775b84325e2acb029467cb5792cffeb3839719941f79a6c41264d2`.

| Lane | Result | Route | Evidence |
| --- | --- | --- | --- |
| Auto | Bounded screen passed | `native-transcode` | [Correctness archive](../results/head-to-head/base-truehd-20260928-01-auto/summary.json) |
| Forced Software | Bounded screen passed | `software` | [Control archive](../results/head-to-head/base-truehd-20260928-01-software/summary.json) |

Both screens observed visible changing video, stereo energy in independently
host-decoded non-silent windows, pause/resume, 1.25× rate, backward/forward
seeks, near EOF and cleanup with no remaining surfaces or workers. Energy
establishes audible output; it does not prove waveform identity, channel
mapping, lossless output or Atmos objects.

| Auto CPU window | One-core CPU | Playback advance | Dropped frames | Gate |
| --- | ---: | ---: | ---: | --- |
| [1](../results/head-to-head/base-truehd-20260928-01-auto-cpu1/summary.json) | 23.10% | 19.92 s | 0 | Accepted |
| [2](../results/head-to-head/base-truehd-20260928-01-auto-cpu2/summary.json) | 25.50% | 20.13 s | 0 | Accepted |
| [3](../results/head-to-head/base-truehd-20260928-01-auto-cpu3/summary.json) | 23.57% | 19.94 s | 77 | Rejected |

The third window's 77 drops occurred across roughly 600 presented frames.
Its CPU number is diagnostic only. All three archives preserve process samples,
route and frame counters. The startup, stable-process and progress gates were
applied; all five correctness/CPU archives passed `verify.mjs` integrity checks.
Investigate the intermittent presentation loss before another CPU campaign.
The remaining player columns retain their previous provenance and labels.
