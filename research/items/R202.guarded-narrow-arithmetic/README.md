<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# guarded narrow arithmetic

Current disposition: **pursue**. Historical review; no new media execution.

Actual pinned 8-bit 4x4 IDCT body equals guarded int16-intermediate candidate on 65536 threshold-corner and 20000 random blocks under UBSan; 2673,-2673,-32768 reject. Scalar arithmetic component correctness only; no real coefficient admission or SIMD performance.

Prepare: **passed**. Correctness: **passed**. Performance: **pending**.

Next: Capture real coefficient guard-admission distribution and include guard/fallback/SIMD cost before integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
