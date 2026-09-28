<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Dolby Vision profile 8.1 + E-AC-3 / MKV — current source candidate screen

On 2026-09-28, the validated `dv81` fixture passed fresh bounded Demuxe Auto
playback on the Software fallback and a forced Software control. This replaces
the last base specialist Auto Unqualified label with Screened. No CPU campaign
was run for this row.

The exact fixture SHA-256 is
`a61bf2aaa7213a68fa93b3f3b0e8eba2c81a083fceb526baf21237884a3782c2`.
Its HEVC stream carries Dolby Vision profile 8, compatibility ID 1 and actual
RPU side data; it has authored stereo E-AC-3 audio. The exact profile,
container, host references and source limits are in
[fixture validation](BASE-SPECIALIST-FIXTURES.md).

The frozen runtime manifest was
`b3216b7e2041fb93987421acd630cf0181a74ca7af77a3001d37e253fba6d8d1`
and harness hash `09b9d3186898d5d3bde01ec3c16420f8318affe94b0eec3d65386fb140672f93`.
The runtime records `7f4407d2` plus local source changes and their hashes.
Chrome was 153.0.8010.53 on macOS. This is a local source-candidate screen,
not a clean release-archive qualification.

| Lane | Result | Route | Evidence |
| --- | --- | --- | --- |
| Auto | Bounded screen passed | `software` | [Correctness archive](../results/head-to-head/base-dv81-20260928-01-auto/summary.json) |
| Forced Software | Bounded screen passed | `software` | [Control archive](../results/head-to-head/base-dv81-20260928-01-software/summary.json) |

Both screens observed visible changing video, stereo energy in host-verified
non-silent source windows, pause/resume, 1.25× rate, forward/backward seeks,
near EOF and cleanup with no remaining surfaces or workers. The archives
passed `verify.mjs` integrity checks. Visible output does not establish Dolby
Vision color, RPU application, tone mapping or physical HDR fidelity.
