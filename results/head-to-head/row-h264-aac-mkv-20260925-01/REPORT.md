# H.264 + AAC / MKV row refresh — 2026-09-25

This row uses the frozen release-supplement `aac-mkv` fixture
(`aac.mkv`, SHA-256 `8036086390b3c8c23d651e2fe053bd3a6a8793f42a1d02e1196fa892b4c26166`).
The headed browser was Chrome 153.0.8010.53. The
[correctness run](../row-h264-aac-mkv-correctness-20260925-01/REPORT.md)
qualified plain video, Demuxe Auto, forced Native, forced Software, and
AVPlayer. Movi failed its near-EOF check at media time 35.371/36 seconds; its
CPU cell remains empty. The
[CPU run](../row-h264-aac-mkv-cpu-20260925-01/REPORT.md) accepted all 15
windows across three independent Chrome launches. The asset and harness hashes
matched between the two runs. Both artifacts passed the evidence integrity
verifier.

CPU values are percentages of one core. Whole-Chrome medians are the README
figures; the range is the minimum and maximum of three rounds. Process columns
are three-round medians. Each round reused one browser across arms, with a
fresh context per arm; arm order rotated. Startup task completion was observed
and tracing stopped before CPU sampling. Each arm had a 5-second warmup and
20-second measurement window.

| Arm | Whole | Browser | Renderer | GPU | Audio | Min–max whole |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Plain `<video>` | 9.32 | 0.18 | 4.13 | 4.48 | 0.53 | 9.25–10.18 |
| Demuxe Auto | 9.62 | 0.25 | 4.43 | 4.06 | 0.74 | 7.51–10.56 |
| Demuxe forced Native | 10.22 | 0.26 | 4.81 | 4.37 | 0.79 | 10.18–10.54 |
| Demuxe forced Software | 27.38 | 0.18 | 15.84 | 10.59 | 0.75 | 27.18–27.69 |
| AVPlayer default | 28.30 | 0.14 | 13.88 | 13.18 | 0.75 | 25.98–28.34 |

Paired Auto minus plain deltas by round were **+0.38, +0.38, −1.82** core
points; forced Native minus plain were **+0.36, +0.97, +0.85**. The matching
non-browser Auto minus plain deltas were **+0.30, +0.24, −1.84**; the browser
contributions were **+0.08, +0.14, +0.02**. Auto's lower third-round total is
not evidence of a CPU advantage at this precision. The matched comparisons
show native-level overhead within this campaign's variation.

Post-startup idle browser-process CPU was **0.31, 0.38, 0.30** across launches;
idle whole-Chrome CPU was **1.31, 1.49, 1.25**. Playback browser-process CPU
ranged from 0.12 to 0.32 across these arms. No global idle constant was
subtracted. Peak summed process RSS and each process-role sample are preserved
in the raw records. Summed RSS can count shared pages twice.

Auto and forced Native both confirmed `native-direct`; plain video used the
native browser path. Software confirmed `software`, and AVPlayer used its
custom route. Playback progression passed all qualified correctness checks.
Recorded dropped frames were zero for plain video, Auto, forced Native and
AVPlayer; the Software dropped-frame counter was unavailable. The harness did
not record a decoder backend, so this report makes no hardware-decoding claim.
The local fixture server was excluded from Chrome process CPU.

**Interpretation:** The matched Auto and forced Native costs are close to plain
browser playback on this fixture. This campaign supplies no evidence of a
material Demuxe CPU regression. Absolute CPU levels from other fixtures or
campaigns are not numerically combined with this row.
