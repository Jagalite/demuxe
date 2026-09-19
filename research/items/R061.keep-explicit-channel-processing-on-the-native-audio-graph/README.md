<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep explicit channel processing on the Native audio graph

Current disposition: **pursue**. Historical review; no new media execution.

Historical browser explicit six-index channel permutation yields exact Float32 samples; intentionally wrong routing fails the independent channel oracle. Scope is specified indices, not inferred speaker semantics, physical output or complete route ownership.

Prepare: **passed**. Correctness: **passed**. Performance: **pending**.

Next: Integrate only an explicitly requested channel matrix with source/graph replacement lifecycle; compare equivalent full graph cost before benefit claim.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
