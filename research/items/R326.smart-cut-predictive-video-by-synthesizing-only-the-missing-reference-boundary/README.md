<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Smart-cut predictive video by synthesizing only the missing reference boundary

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current pipeline consumes original packets and legal keyframe boundaries; no exact synthetic-reference encoder/state validator exists. Matching one MPEG2 reference pixel plane does not establish hidden reference equivalence for other codecs.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Scope one no-B MPEG2 constant-block boundary in an isolated encoder oracle; preserve all suffix payloads and compare complete suffix, with missing synthetic reference as fail control.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
