<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Exact-frame dependency slicing

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current bridge delegates complete packet decoding and SIMD kernels reconstruct requested blocks without a frame-dependency slicing graph. Skipping picture reconstruction requires parsing reference management inside a controlled decoder, not merely dropping submitted packets.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Identify one constrained software GOP and compare a parsed dependency graph with full decode before suppressing one certified unused reconstruction.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
