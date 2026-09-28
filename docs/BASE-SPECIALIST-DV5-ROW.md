<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Dolby Vision profile 5 + E-AC-3 / MP4 — current source candidate screen

On 2026-09-28, the validated `dv5` fixture passed fresh bounded Demuxe Auto
playback on the Software fallback and a forced Software control. This replaces
the Auto row's Unqualified label with Screened. No CPU campaign was run.

The exact fixture SHA-256 is
`0bb4a83a59b8e5e8a49590c3f5508768705d52e6d9b90230f2ec4947520bd47d`.
Its HEVC stream carries profile 5 Dolby Vision configuration and actual RPU
side data; it has authored stereo E-AC-3 audio. The exact profile, container,
host references and source limits are in [fixture validation](BASE-SPECIALIST-FIXTURES.md).

The frozen runtime manifest was
`b3216b7e2041fb93987421acd630cf0181a74ca7af77a3001d37e253fba6d8d1`
and harness hash `09b9d3186898d5d3bde01ec3c16420f8318affe94b0eec3d65386fb140672f93`.
The runtime records `7f4407d2` plus local source changes and their hashes.
Chrome was 153.0.8010.53 on macOS. This is a local source-candidate screen,
not a clean release-archive qualification.

| Lane | Result | Route | Evidence |
| --- | --- | --- | --- |
| Auto | Bounded screen passed | `software` | [Correctness archive](../results/head-to-head/base-dv5-20260928-01-auto/summary.json) |
| Forced Software | Bounded screen passed | `software` | [Control archive](../results/head-to-head/base-dv5-20260928-01-software/summary.json) |

Both screens observed visible changing video, stereo energy in host-verified
non-silent source windows, pause/resume, 1.25× rate, forward/backward seeks,
near EOF and cleanup with no remaining surfaces or workers. The archives
passed `verify.mjs` integrity checks. Visible output does not establish Dolby
Vision color, RPU application, tone mapping or physical HDR fidelity.
