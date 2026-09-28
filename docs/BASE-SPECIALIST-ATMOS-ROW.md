<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC + E-AC-3/Atmos / MP4 — current source candidate screen

On 2026-09-28, the validated `hevc-atmos` fixture passed fresh bounded
Demuxe Auto playback on `native-transcode` and a forced Software control.
This replaces the Auto row's Unqualified label with Screened. No CPU campaign
was run for this row.

The exact fixture SHA-256 is
`d8c3989fb7df65b56d167d9061d267405814b56726b0a81f0a5098e4bf8da254`.
It is a 36-second MP4 with HEVC and copied E-AC-3 that ffprobe identifies as
Dolby Digital Plus with Atmos metadata. Host references and source limits are
in [fixture validation](BASE-SPECIALIST-FIXTURES.md). The screen establishes
stereo energy, not Atmos object rendering or discrete channel fidelity.

The frozen runtime manifest was
`b3216b7e2041fb93987421acd630cf0181a74ca7af77a3001d37e253fba6d8d1`
and the corrected harness hash was
`09b9d3186898d5d3bde01ec3c16420f8318affe94b0eec3d65386fb140672f93`.
The runtime records `7f4407d2` plus local source changes and their hashes.
Chrome was 153.0.8010.53 on macOS. This is a local source-candidate result,
not a clean release-archive qualification.

| Lane | Result | Route | Evidence |
| --- | --- | --- | --- |
| Auto | Bounded screen passed | `native-transcode` | [Correctness archive](../results/head-to-head/base-atmos-20260928-02-auto/summary.json) |
| Forced Software | Bounded screen passed | `software` | [Control archive](../results/head-to-head/base-atmos-20260928-02-software/summary.json) |

Both screens observed visible changing video, stereo energy in host-verified
non-silent source windows, pause/resume, 1.25× rate, forward/backward seeks,
near EOF and cleanup with no remaining surfaces or workers.

The first [Auto attempt](../results/head-to-head/base-atmos-20260928-01-auto/summary.json)
timed out while trying to observe audio within 0.5 seconds of a seek. Its
failure snapshot showed stereo energy later in playback. The harness now
host-decodes and observes a two-second window for all specialist fixtures;
the focused audio-oracle regression tests passed. The failed attempt and both
corrected results are retained, and all three archives passed integrity checks.
The timing correction does not establish waveform, channel or Atmos fidelity.
