<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reconstruct fixed-predictor lossless audio with parallel scans

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The decoder delivers already reconstructed samples to the maintained adapter; fixed-predictor residuals are not exposed. Parallel exact scans require a decoder-internal stage plus entropy parsing/transfer accounting, not replacing the sample-copy loop.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Extract one admitted fixed-order residual block, perform bounded exact prefix reconstruction against a scalar integer oracle and include overflow/end-boundary controls.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
