<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# packed v210 without CPU planarization

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current YUV fast path admits planar 420P, while v210 needs packed 10-bit 4:2:2 words, stride and partial-group semantics. Shared WebGPU availability resolves the historical generic GPU block but does not supply a v210 destination shader or admission contract.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Specify a packed-v210 shader boundary on one width-50 buffer and compare recovered planes with independent host decode before live integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
