<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Burn in an overlay by re-encoding only the spatial blocks it changes

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current captions composite after decode and preserve video bytes. Fixed-quantization MJPEG burn-in is a requested persistent pixel change needing coefficient access and whole-image entropy serialization, not an overlay optimization of this existing presenter.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: On one block-aligned MJPEG frame, preserve untouched coefficients and rewrite affected blocks; compare outside-region pixels and chroma edges while charging full serialization.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
