<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sidecars that let decoding start halfway through an entropy-coded slice

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current H264 parser initializes CABAC contexts per slice and the browser bridge treats decode state as opaque. Mid-slice arithmetic/neighbor state restoration requires a maintained decoder instrumentation/export ABI, not source range seeking alone.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one logical CABAC checkpoint at a known syntax boundary in controlled decoder; compare full suffix symbols, then corrupt one context/neighbor field and reject. Charge initial state generation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
