<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compare whole frames on the graphics side and read back only the witness

Disposition: **pursue**. Correctness **passed**, performance **passed**; other research gates passed.

Actual GPU witness checks all1048576 resident RGBA pixels with4byte result versus reading both full buffers and CPU short-circuit comparison. Equal/first/middle/last/allchanged controls each repeatedtwice match independent change metadata. Tenchecks read40bytes candidate versus83886080bytes baseline. Whole task includes fresh GPU device/pipeline/buffers, initialization and percase uploads, generation, readback/verification and resource destruction. No GPU-driven pixel producer integration, CPU utilization, physical memory or energy claim. Complete owner wall-time saving33.40%, bootstrap95[21.580288821819792, 43.80232796379785]; predeclared performance gate passed.

Scoped component research gates complete. Production integration requires a separate owner/workload contract and representative media validation.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T210010Z-cue-witness/analysis.md)
