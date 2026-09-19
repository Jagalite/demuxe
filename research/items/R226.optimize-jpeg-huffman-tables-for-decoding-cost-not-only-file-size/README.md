<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Optimize JPEG Huffman tables for decoding cost, not only file size

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current custom browser codec bridge does not author JPEG Huffman tables and does not admit MJPEG there. This proposal needs an entropy parser/serializer preserving coefficients, plus a decoder-cost workload rather than just smaller bytes.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: First compare one image coefficient dump before/after a table rewrite with a corrupted-code control; identify repeated decode amortization before runtime integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
