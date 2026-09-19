<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sample B44-compressed HDR images without expanding the whole frame

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Presenter uses expanded 8-bit planes/RGBA; no B44 block parser/index or half-float demand sampler exists. Generic shader-f16 capability is not a B44 sampler and current color path cannot preserve arbitrary HALF values.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one bounded B44 block address/unpack oracle including negative HALF/nonzero window; reject raw-chunk fallback/truncation before shader implementation and compare dense-view recomputation cost.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
