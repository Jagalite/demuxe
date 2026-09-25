# H.264 + PCM24 / MKV + external ASS row screen — 2026-09-25

This screen uses the frozen release-supplement `pcm-ass` fixture: `pcm.mkv`
(SHA-256 `eb2eef792c1c70ebb683c707dec50253b1b61b09bc5ed6c7b8d4bfa0320d6b98`)
plus `captions.ass` (SHA-256
`cd38ad01927a0a7ee140dc92ed1db5feed62ed636b236bcbddbc17b115ecec74`).
Headed Chrome was 153.0.8010.53. The
[correctness run](../row-h264-pcm24-ass-correctness-20260925-01/REPORT.md)
passed Demuxe Auto (`hybrid`) and forced Software (`software`). Plain `<video>`
and Movi failed the required subtitle drawing check; AVPlayer failed initial
playback. The plain-video arm did not include the host libass overlay that
qualified the historical native reference, so its failure does not overturn
that historical Pass. No matched native CPU comparison was available.

The [CPU run](../row-h264-pcm24-ass-cpu-20260925-01/REPORT.md) accepted all six
Demuxe windows in one Chrome launch. Correctness and CPU assets, harness and
browser-configuration hashes matched, and both artifacts passed integrity
verification. Each arm had a fresh context, 5-second warmup and 20-second CPU
window; arm order rotated across three rounds. The run took 6.49 minutes.
All CPU figures below are percentages of one core and remain **diagnostic**;
none enters the README table.

| Arm | Whole median | Browser | Renderer | GPU | Audio | Min–max whole |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Demuxe Auto (`hybrid`) | 29.34 | 0.18 | 17.89 | 10.49 | 0.76 | 18.17–38.35 |
| Demuxe forced Software | 27.06 | 0.19 | 15.59 | 10.62 | 0.73 | 25.75–33.21 |

Auto minus Software whole-Chrome CPU by round was **+3.59, +5.13, −8.89**
points; the non-browser deltas were **+3.60, +5.09, −8.82**. Auto's whole
readings were 29.34, 38.35 and 18.17; Software's were 25.75, 33.21 and
27.06. The change in direction and Auto's 20-point range make the median a
poor README summary. These three rounds also share one browser launch and
cannot establish launch-to-launch reproducibility.

The 20-second idle samples before rounds 1–3 measured browser-process CPU of
**0.33, 0.35, 0.39** and whole-Chrome CPU of **1.35, 1.37, 1.58**. Idle summed
RSS was **1408, 1395, 1376 MiB**; all idle windows had stable process IDs.
There is no clear browser-process CPU or RSS buildup. No idle constant was
subtracted. Summed RSS can count shared pages twice. Playback progression
passed all accepted CPU windows; the drop-frame counter was unavailable for
both Demuxe routes. The harness did not record a decoder backend. The local
fixture server was excluded from Chrome process CPU, and all tracked browser
processes retired after the run.

**Disposition:** Preserve the historical playback labels in the README but
leave CPU blank for this row. A future matched host-ASS native reference and
stable Demuxe windows are needed to publish a meaningful row comparison.
