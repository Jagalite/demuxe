<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Replace general FLAC predictors with equivalent fixed predictors

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The decoder supports fixed and LPC forms while preparation currently runs full decoding/encoding; there is no FLAC syntax transformer. Historical equivalence checks leave serialization/CRC roundtrip open. A useful source must actually contain shift-zero exact fixed coefficients.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: First count exact eligible LPC subframes in a real source; if nonzero, rewrite one frame and independently check residual bits, CRC and samples.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
