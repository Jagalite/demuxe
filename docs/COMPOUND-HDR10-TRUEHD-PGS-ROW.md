<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# HDR10 + TrueHD 7.1 + PGS — current source candidate screen

On 2026-09-28, the `hdr10-truehd-pgs` fixture passed fresh bounded Demuxe Auto
and forced Software screens. Auto selected `native-transcode-mpv`, retaining
browser video and an mpv subtitle service. The two Demuxe README cells move
from Untested to Screened; no other player lane was qualified and no CPU
campaign was run.

The exact fixture SHA-256 is
`e9fdb4ba73ffc63ff1ecae1ecfc868b82ac7a4ea7d80fea709fe47d544af474f`.
It contains 320×180 HEVC Main 10 with PQ/BT.2020 tags, copied eight-channel
TrueHD and embedded PGS. The TrueHD stream repeats a short technical sample;
the authored HDR picture and bitmap subtitle do not represent a reference
movie presentation.

The frozen runtime manifest was
`b3216b7e2041fb93987421acd630cf0181a74ca7af77a3001d37e253fba6d8d1`
and harness hash `09b9d3186898d5d3bde01ec3c16420f8318affe94b0eec3d65386fb140672f93`.
The runtime records `7f4407d2` plus local source changes and their hashes.
Chrome was 153.0.8010.53 on macOS. This is a local source-candidate screen,
not a clean release-archive qualification.

| Lane | Result | Route | Evidence |
| --- | --- | --- | --- |
| Auto | Bounded screen passed | `native-transcode-mpv` | [Correctness archive](../results/head-to-head/compound-hdr10-truehd-20260928-01-auto/summary.json) |
| Forced Software | Bounded screen passed | `software` | [Control archive](../results/head-to-head/compound-hdr10-truehd-20260928-01-software/summary.json) |

Both screens observed visible changing video, stereo energy at host-verified
source windows, selected PGS with the required magenta bitmap before and
after seeks, pause/resume, 1.25× rate, forward/backward seeks, near EOF and
cleanup with no remaining surfaces or workers. Both archives passed
`verify.mjs` integrity checks. FFmpeg emitted a Matroska keyframe-marking
warning while extracting reference audio; full host decoding and browser seek
checks completed, and the warning remains in the archives.

These results do not establish physical HDR color, lossless browser output,
discrete 7.1 channel mapping, Atmos objects or sustained playback on longer
material. Other player cells remain Untested.
