<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Invert FLAC polarity directly in the residual domain

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current adaptation does not expose fixed-predictor residuals or compressed polarity editing. Negating a two-complement minimum overflows at unchanged bit depth, and shifted LPC does not inherit the fixed-predictor proof.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Build a component writer for one fixed-predictor order with safe headroom, verify exact negated PCM and reject minimum-value overflow, then consider remaining admitted orders separately.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
