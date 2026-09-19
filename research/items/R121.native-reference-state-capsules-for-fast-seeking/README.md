<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Native reference-state capsules for fast seeking

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current browser decoder requires ordinary key entry points and has no synthetic I_PCM reference-seed writer. Seed pixels alone omit frame-number/POC/reference management, and authoring a state capsule is a new codec subsystem.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Document one constrained seed and independently decode the following predictive frame before any runtime seek wiring.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
