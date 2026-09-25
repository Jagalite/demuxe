# H.264 + PCM24 / MKV row refresh — 2026-09-25

This row uses the frozen release-supplement `pcm-mkv` fixture (`pcm.mkv`,
SHA-256 `eb2eef792c1c70ebb683c707dec50253b1b61b09bc5ed6c7b8d4bfa0320d6b98`).
Headed Chrome was 153.0.8010.53. The
[correctness run](../row-h264-pcm24-mkv-correctness-20260925-01/REPORT.md)
passed plain video, Demuxe Auto, forced Software, and Movi. AVPlayer failed
initial playback. The
[CPU run](../row-h264-pcm24-mkv-cpu-20260925-01/REPORT.md) had 11 accepted
windows and one rejected Movi window. Both artifacts passed integrity
verification with matching asset, harness, and browser-configuration hashes.

One fresh Chrome profile served the four passing arms across three rotated
rounds, with a fresh context per arm. The startup task completed and tracing
stopped before CPU sampling. Each arm had a 5-second warmup and 20-second
measurement window; the run took 9.29 minutes. Three rounds in one launch are
correlated and do not establish launch-to-launch reproducibility. CPU values
are percentages of one core; README values are whole-Chrome medians.

| Arm | Whole | Browser | Renderer | GPU | Audio | Min–max whole |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Plain `<video>` | 9.60 | 0.20 | 4.23 | 4.54 | 0.52 | 9.51–9.73 |
| Demuxe Auto (`hybrid`) | 27.47 | 0.20 | 16.48 | 10.00 | 0.76 | 26.40–28.06 |
| Demuxe forced Software | 26.55 | 0.21 | 15.15 | 10.43 | 0.76 | 25.55–36.51 |
| Movi default | — | — | — | — | — | One of three windows rejected |

Paired Auto minus plain whole-Chrome CPU was **+16.67, +18.55, +17.87**
points in rounds 1–3. The non-browser deltas were **+16.67, +18.51, +17.87**;
browser-process contributions were **0.00, +0.04, 0.00** after rounding.
Auto's measured route was `hybrid`, while plain video used the native browser
path. The difference is route-specific and does not establish a regression
against an older Demuxe build.

Movi passed bounded playback correctness but round 1 CPU failed the
presentation-cadence budget. Its other two accepted CPU windows were 28.35%
and 26.63%; two windows do not satisfy the three-window README rule, so its
CPU cell remains blank. The failed attempt is retained in the raw CPU run.
AVPlayer failed correctness at initial playback and was not measured for CPU.

The 20-second idle samples before rounds 1–3 measured browser-process CPU of
**0.33, 0.37, 0.35** and whole-Chrome CPU of **1.43, 1.37, 1.39**. Idle summed
RSS was **1395, 1369, 1181 MiB**; all idle windows had stable process IDs.
There is no clear browser-process CPU or RSS buildup. Software CPU fell from
36.51% in round 1 to 25.55% and 26.55% later, so its wide range matters.
No idle constant was subtracted. Summed RSS can count shared pages twice.

Playback progression passed all accepted CPU windows. Recorded dropped frames
were zero for plain video and the two accepted Movi windows; the Auto and
Software drop counters were unavailable. The harness did not record a decoder
backend, so no hardware-decoding claim is made. The local fixture server was
excluded from Chrome process CPU. All tracked Chrome processes retired after
the block; Playwright's close acknowledgement was false, a teardown limitation
preserved in the raw record.

**Interpretation:** Auto's Hybrid path cost about 17–19 more core points than
plain native playback on this fixture within one Chrome launch. That is a
route-specific observation, while the Software range and Movi rejection limit
fine-grained player comparisons.
