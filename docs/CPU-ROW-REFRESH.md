<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Comparison table CPU refresh

Each row uses a frozen fixture, fresh correctness qualification, and three
20-second CPU rounds. Beginning with the third row, one Chrome launch covers all
arms and rounds, with fresh contexts per arm and idle checks before each round.
These rounds are correlated; inspect drift and confirm surprising differences
with independent launches. The first two rows below used a separate fresh
launch per round. The
[benchmark protocol](BENCHMARK-PROTOCOL.md) describes the controls.

| README row | Status | Evidence |
| --- | --- | --- |
| H.264 + AAC / MP4 | Complete: 5 pass, Movi fail | [row report](../results/head-to-head/row-h264-aac-mp4-20260925-01/REPORT.md) |
| H.264 + AAC / MKV | Complete: 5 pass, Movi fail | [row report](../results/head-to-head/row-h264-aac-mkv-20260925-01/REPORT.md) |

Remaining CPU cells are pending. The
[historical snapshot](HEAD-TO-HEAD-CPU-HISTORICAL-20260925.md) remains available
for provenance and is not numerically combined with refreshed rows.
