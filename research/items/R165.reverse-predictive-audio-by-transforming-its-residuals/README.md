<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reverse predictive audio by transforming its residuals

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current audio path decodes forward and streams ordered PCM. The first-order residual reversal identity needs the last sample, warmup rewrite and valid FLAC framing; no compressed reverse-audio owner is present.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: For one order1 block, derive last sample then reverse/negate residuals and compare exact reversed PCM, rejecting unsupported predictor orders and integer overflow.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
