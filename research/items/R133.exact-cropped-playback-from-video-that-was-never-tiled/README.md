<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Exact cropped playback from video that was never tiled

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current crop occurs at presentation after full decoded planes. MPEG-2 region-limited reconstruction needs backward motion/interpolation/filter closure across pictures; changing viewport alone cannot implement the proposal.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Trace one constrained crop dependency region and compare full-decode pixels; measure whether closure expands to most of the picture before editing decoder.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
