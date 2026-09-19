<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reconstruct predictor-4 lossless JPEG with two-dimensional prefix sums

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Pinned lossless JPEG decoder handles boundary seeds, precision alignment and restart state serially. Historical predictor-4 scans prove a constrained component but no current GPU residual-grid interface; source may use another predictor and cannot be re-encoded merely to hide setup.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Count eligible source usage then compare one real parsed residual grid to the pinned decoder with initial-row/column seeds before GPU passes.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
