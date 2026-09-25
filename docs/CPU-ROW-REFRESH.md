<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Comparison table CPU refresh

Each row uses a frozen fixture, fresh correctness qualification, and three
20-second CPU rounds. Chrome is reused across the passing arms within each
round, with a fresh browser launch for the next round. The
[benchmark protocol](BENCHMARK-PROTOCOL.md) describes the controls.

| README row | Status | Evidence |
| --- | --- | --- |
| H.264 + AAC / MP4 | Complete: 5 pass, Movi fail | [row report](../results/head-to-head/row-h264-aac-mp4-20260925-01/REPORT.md) |

Remaining CPU cells are pending. The
[historical snapshot](HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md) remains available
for provenance and is not numerically combined with refreshed rows.
