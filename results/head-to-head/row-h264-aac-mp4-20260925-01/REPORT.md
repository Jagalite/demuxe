# H.264 + AAC / MP4 row refresh — 2026-09-25

This row uses the exact frozen `aac-mp4` fixture from the release supplement
(SHA-256 `37670a8ef2c82d8d99ef9b66e7cd68ee7fc74e279a86e4e7d248f4cc22bb0b4d`).
The headed browser was Chrome 153.0.8010.53. The
[correctness run](../row-h264-aac-mp4-correctness-20260925-01/REPORT.md)
qualified plain video, Demuxe Auto, forced Native, forced Software, and AVPlayer.
Movi failed its near-EOF check at media time 35.35/36 seconds; its CPU cell
remains empty. The [CPU run](../row-h264-aac-mp4-cpu-20260925-01/REPORT.md)
accepted all 15 windows across three independent Chrome launches. The asset and
harness hashes matched between the two runs. Both artifacts passed the evidence
integrity verifier.

CPU values are percentages of one core. Whole-Chrome medians are the README
figures; the range is the minimum and maximum of the three rounds. Process
columns are three-round medians. Each round reused one browser across arms,
with a fresh context per arm; arm order rotated. Startup task completion was
observed and tracing stopped before CPU sampling. Each arm had a 5-second
warmup and 20-second measurement window.

| Arm | Whole | Browser | Renderer | GPU | Audio | Min–max whole |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Plain `<video>` | 11.72 | 0.21 | 5.21 | 5.72 | 0.54 | 9.63–12.09 |
| Demuxe Auto | 13.01 | 0.28 | 6.04 | 5.84 | 0.83 | 9.49–14.16 |
| Demuxe forced Native | 12.88 | 0.28 | 5.95 | 5.68 | 0.88 | 10.29–13.74 |
| Demuxe forced Software | 31.98 | 0.20 | 19.00 | 11.99 | 0.76 | 26.44–34.63 |
| AVPlayer default | 32.44 | 0.17 | 16.34 | 15.15 | 0.76 | 26.34–34.21 |

Paired Auto minus plain deltas by round were **+2.07, +1.29, −0.14** core
points; forced Native minus plain were **+0.79, +2.02, +0.66**. The matching
non-browser Auto minus plain deltas were **+1.96, +1.26, −0.21**. The browser
contribution to each Auto-minus-plain delta was **+0.10, +0.04, +0.07**.
The total CPU fell in round 3 across all passing arms, so differences of one
or two points should not be treated as a precise player ranking.

The post-startup idle browser-process CPU was **0.39, 0.34, 0.31** across
the launches; idle whole-Chrome CPU was **1.51, 1.55, 1.34**. Playback browser
CPU stayed between 0.17 and 0.33 across these arms. Thus the prior 20–30%
browser-process idle behavior did not recur in this controlled campaign. No
global idle constant was subtracted. Peak summed process RSS varied by arm and
round; the raw records retain it. Summed RSS can count shared pages twice.

Auto and forced Native both confirmed `native-direct`; plain video used the
native browser path. Software confirmed `software`, and AVPlayer used its
custom route. Playback progression passed all qualified correctness checks.
Recorded dropped frames were zero for plain video, Auto, forced Native and
AVPlayer; the Software dropped-frame counter was unavailable. The harness did
not record a decoder backend, so this report makes no hardware-decoding claim.
The local fixture server was excluded from Chrome process CPU.

**Interpretation:** The matched Auto and forced Native costs are close to plain
browser playback on this fixture. This campaign supplies no evidence of a
material Demuxe CPU regression. The historical ~20% Auto and ~22% native
figures and the separate 45% Auto result are from different campaigns and
cannot be subtracted from these values to attribute the absolute change.
