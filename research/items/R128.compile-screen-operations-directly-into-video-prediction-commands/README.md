<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile screen operations directly into video prediction commands

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Demuxe consumes compressed media or decoded frames; it has no producer screen-operation log or encoder interface accepting copy/scroll decisions. Motion commands cannot be recovered merely from current presentation damage.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define a producer-assisted block-aligned scene operation trace and reference renderer, then encode one legal constrained prediction sequence with exact target frames.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
