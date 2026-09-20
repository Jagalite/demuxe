<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# preserve FLIC indices plus palette

Disposition: **inconclusive**. Correctness **passed**, performance **failed**; other research gates passed.

Actual128x128 FLC COPY/palette-only frames, indices/palette texture shader versus optimized packed32 CPU palette expansion and RGBA texture upload. All30 requested pictures in order0,1,0 repeated10times exactly match independent FFmpeg RGBA, including backward checkpoint selection and palette-only change. Strict file/frame/chunk/palette/COPY bounds reject truncation. Every owner reparses immutable source, destroys textures/readback/device. Candidate522240 versus baseline1966080 application upload bytes per task. This restricted parser does not admit general FLIC delta chunks. Complete owner wall-time saving6.24%, bootstrap95[-2.8209419393916635, 14.050267781750103]; predeclared performance gate failed.

Research experiment complete: earlier naive-byte-store baseline advantage is not sufficient; packed32 baseline is the final comparison. Reopen only for a specified texture workload with a representative baseline and newly predeclared cost/threshold.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T205835Z-palette-hap-packed-baseline/analysis.md)
