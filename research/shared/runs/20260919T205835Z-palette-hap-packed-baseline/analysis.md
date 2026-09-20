<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# GPU representation gates

Prepared input, nine alternating owner pairs, exact output checks before and during timing. One diagnosed baseline correction replaces per-pixel byte stores with packed32 stores; prior immutable run20260919T205520Z-palette-hap retained and superseded for performance acceptance. Metric complete owner wall time including independent output hash/readback verification and cleanup. Warm browser/cache; cold owners; other research work may run concurrently. No CPU utilization, physical energy or peak physical memory claim. Cold GPU creation and synchronous readback are included.

## R173

Actual128x128 FLC COPY/palette-only frames, indices/palette texture shader versus optimized packed32 CPU palette expansion and RGBA texture upload. All30 requested pictures in order0,1,0 repeated10times exactly match independent FFmpeg RGBA, including backward checkpoint selection and palette-only change. Strict file/frame/chunk/palette/COPY bounds reject truncation. Every owner reparses immutable source, destroys textures/readback/device. Candidate522240 versus baseline1966080 application upload bytes per task. This restricted parser does not admit general FLIC delta chunks.

Baseline51.244ms; candidate48.044ms. Saving6.24%, paired bootstrap95[-2.8209419393916635, 14.050267781750103]. Predeclared lower95>=10% gate **failed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

## R172

Actual128x128 uncompressed BC1 Hap packet in AVI, compressed GPU texture versus packed32 CPU BC1 expansion/RGBA upload. All30 complete GPU output pictures per owner match independent FFmpeg RGBA; wrong packet type and truncated section reject. Fresh owner recreates same output and destroys allGPUresources. Candidate245760 versus baseline1966080 application upload bytes per task. Fixture uses endpoint colors; not general interpolation or Snappy/fragmented Hap qualification.

Baseline49.611ms; candidate41.078ms. Saving17.20%, paired bootstrap95[5.352571629574243, 26.571304718372847]. Predeclared lower95>=10% gate **failed**. A failed acceptance gate with interval crossing zero is inconclusive benefit, not proof of regression.

