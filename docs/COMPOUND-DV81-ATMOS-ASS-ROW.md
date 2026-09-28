<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Dolby Vision 8.1 + E-AC-3/Atmos + ASS — current source candidate screen

On 2026-09-28, the `dv81-atmos-ass` fixture passed fresh bounded Demuxe Auto
and forced Software screens. Auto selected the Software fallback. The two
Demuxe README cells move from Untested to Screened; other player lanes remain
Untested and no CPU campaign was run.

The exact fixture SHA-256 is
`bcac2ced56c33e105e805cecf872254256a2e01abad70e52efe5ac9fb0c7a92d`.
It contains copied Dolby Vision profile 8.1 HEVC/RPU video, copied E-AC-3
with Atmos metadata, and embedded ASS. This bounded synthetic combination
does not represent a studio-authored Dolby Vision/Atmos presentation.

The frozen runtime manifest was
`b3216b7e2041fb93987421acd630cf0181a74ca7af77a3001d37e253fba6d8d1`
and harness hash `09b9d3186898d5d3bde01ec3c16420f8318affe94b0eec3d65386fb140672f93`.
The runtime records `7f4407d2` plus local source changes and their hashes.
Chrome was 153.0.8010.53 on macOS. This is a local source-candidate screen,
not a clean release-archive qualification.

| Lane | Result | Route | Evidence |
| --- | --- | --- | --- |
| Auto | Bounded screen passed | `software` | [Correctness archive](../results/head-to-head/compound-dv81-atmos-20260928-01-auto/summary.json) |
| Forced Software | Bounded screen passed | `software` | [Control archive](../results/head-to-head/compound-dv81-atmos-20260928-01-software/summary.json) |

Both screens observed visible changing video, stereo energy at independently
host-verified non-silent source windows, selected ASS with the required
magenta subtitle marker before and after seeks, pause/resume, 1.25× rate,
forward/backward seeks, near EOF and cleanup with no remaining surfaces or
workers. Both archives passed `verify.mjs` integrity checks.

The screen does not establish Dolby Vision color or RPU application, physical
HDR, Atmos object rendering, discrete surround or long-form playback.
