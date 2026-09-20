<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# GPU representation gates

Prepared input, nine alternating owner pairs, exact output checks before and during timing. Metric complete owner wall time including independent output hash/readback verification and cleanup. Warm browser/cache; cold owners; other research work may run concurrently. No CPU utilization, physical energy or peak physical memory claim. Cold GPU creation and synchronous readback are included.

## R173

Actual128x128 FLC COPY/palette-only frames, indices/palette texture shader versus CPU palette expansion and RGBA texture upload. All30 requested pictures in order0,1,0 repeated10times exactly match independent FFmpeg RGBA, including backward checkpoint selection and palette-only change. Strict file/frame/chunk/palette/COPY bounds reject truncation. Every owner reparses immutable source, destroys textures/readback/device. Candidate522240 versus baseline1966080 application upload bytes per task. This restricted parser does not admit general FLIC delta chunks.

Baseline55.100ms; candidate31.600ms. Saving42.65%, paired bootstrap95[41.218564706395036, 44.052863438226474]. Predeclared lower95>=10% gate **passed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

## R172

Actual128x128 uncompressed BC1 Hap packet in AVI, compressed GPU texture versus CPU BC1 expansion/RGBA upload. All30 complete GPU output pictures per owner match independent FFmpeg RGBA; wrong packet type and truncated section reject. Fresh owner recreates same output and destroys allGPUresources. Candidate245760 versus baseline1966080 application upload bytes per task. Fixture uses endpoint colors; not general interpolation or Snappy/fragmented Hap qualification.

Baseline52.967ms; candidate38.544ms. Saving27.23%, paired bootstrap95[17.217084934442383, 35.782423396750794]. Predeclared lower95>=10% gate **passed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

