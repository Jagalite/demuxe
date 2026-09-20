<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# keep Hap BC1 compressed to presentation

Disposition: **inconclusive**. Correctness **passed**, performance **failed**; other research gates passed.

Actual128x128 uncompressed BC1 Hap packet in AVI, compressed GPU texture versus packed32 CPU BC1 expansion/RGBA upload. All30 complete GPU output pictures per owner match independent FFmpeg RGBA; wrong packet type and truncated section reject. Fresh owner recreates same output and destroys allGPUresources. Candidate245760 versus baseline1966080 application upload bytes per task. Fixture uses endpoint colors; not general interpolation or Snappy/fragmented Hap qualification. Complete owner wall-time saving17.20%, bootstrap95[5.352571629574243, 26.571304718372847]; predeclared performance gate failed.

Research experiment complete: earlier naive-byte-store baseline advantage is not sufficient; packed32 baseline is the final comparison. Reopen only for a specified texture workload with a representative baseline and newly predeclared cost/threshold.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T205835Z-palette-hap-packed-baseline/analysis.md)
