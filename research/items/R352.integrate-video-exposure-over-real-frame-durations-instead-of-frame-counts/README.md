<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Integrate video exposure over real frame durations instead of frame counts

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Existing presentation selects/draws original frames; it does not request temporal box exposure. Implementing duration-aware blend changes presentation unless explicitly requested and needs a bounded exposure-frame owner and linear-light contract.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Use one requested VFR two-color exposure with 10/30 ms holds to compare exact 25/75 weighting against a bounded accumulator.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
