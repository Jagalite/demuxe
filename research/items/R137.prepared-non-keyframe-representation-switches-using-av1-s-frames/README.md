<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prepared non-keyframe representation switches using AV1 S-frames

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Existing configure/reset path starts with key requirement and no prepared S-frame switch transaction or shared-history representation pair. S-frame is not a cold-start substitute.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Provide two authored streams with known shared history and one S-frame boundary; compare complete suffix to reference and reject cold start or mismatched reference history.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
