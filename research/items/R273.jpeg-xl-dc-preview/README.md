<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG XL DC preview

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The report uses libjxl progressive events and intentionally approximate DC output. Current player has no JPEG XL decoder/event bridge or progressive still-preview consumer, so a new codec service exceeds a first-pass candidate patch.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Identify an existing libjxl runtime and scope only progression event/FlushImage plus cancel on a tiny image before UI integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
