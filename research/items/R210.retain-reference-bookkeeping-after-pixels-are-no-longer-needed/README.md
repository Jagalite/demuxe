<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Retain reference bookkeeping after pixels are no longer needed

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current app holds returned frames and replay packets; opaque decoder references remain FFmpeg/browser-owned. Closing displayed VideoFrames is not evidence that decoder bookkeeping can survive freed reference pixels. The source is only a dependency-DAG model.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Inspect one pinned software decoder reference structure and prove separate metadata/pixel lifetime on one independent boundary before modifying allocation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
