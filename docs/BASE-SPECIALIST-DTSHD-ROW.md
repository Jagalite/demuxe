<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HEVC + DTS-HD MA 7.1 / MKV — current source candidate screen

On 2026-09-28, the validated `hevc-dtshd` fixture passed fresh bounded
Demuxe Auto playback on `native-transcode` and a forced Software control.
This replaces the Auto row's Unqualified label with Screened. No CPU campaign
was run for this row, so the Auto CPU cell remains blank.

The exact fixture SHA-256 is
`86e4adf16e65d7bbce5a6d5dbd66570c43e80f3433963a2ad979716d844916fa`.
It is a 36-second Matroska file containing HEVC and eight-channel DTS-HD MA.
Its audio repeats a clean eight-second technical sample; source/profile and
host-decoded reference checks are in [fixture validation](BASE-SPECIALIST-FIXTURES.md).

The frozen runtime manifest was
`b3216b7e2041fb93987421acd630cf0181a74ca7af77a3001d37e253fba6d8d1`
with harness hash `62e844def5775b84325e2acb029467cb5792cffeb3839719941f79a6c41264d2`.
It records `7f4407d2` plus local source changes and their hashes. The browser
was Chrome 153.0.8010.53 on macOS. This is a local source-candidate result,
not a clean release-archive qualification.

| Lane | Result | Route | Evidence |
| --- | --- | --- | --- |
| Auto | Bounded screen passed | `native-transcode` | [Correctness archive](../results/head-to-head/base-dtshd-20260928-01-auto/summary.json) |
| Forced Software | Bounded screen passed | `software` | [Control archive](../results/head-to-head/base-dtshd-20260928-01-software/summary.json) |

Both screens observed visible changing video, stereo energy at host-verified
non-silent source windows, pause/resume, 1.25× rate, forward/backward seeks,
near EOF and cleanup with no remaining surfaces or workers. The two archives
passed `verify.mjs` integrity checks. Stereo energy does not prove DTS-HD
lossless output or discrete 7.1 channel mapping; those fidelity checks remain
open. Other player cells retain their previous evidence and labels.
