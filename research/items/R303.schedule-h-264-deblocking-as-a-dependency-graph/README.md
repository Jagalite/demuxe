<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Schedule H.264 deblocking as a dependency graph

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Maintained Wasm SIMD deblocks CPU-resident samples with existing kernel ordering. No captured full edge graph or GPU-resident reconstruction owner exists, and readback may erase GPU benefit. Historical schedule graph is component-only.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Capture one actual single-slice edge trace with unfiltered plane and parameters; verify dependency schedule against optimized output plus unsafe reverse-order control before any GPU dispatch pipeline.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
