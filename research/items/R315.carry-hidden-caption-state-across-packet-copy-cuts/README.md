<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Carry hidden caption state across packet-copy cuts

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current subtitle bridge consumes already-rendered bitmap snapshots; NativeASS handles external ASS. No controlled CEA608 parser/logical state capsule restore owner exists. Visible bitmap/text snapshots cannot preserve hidden pop-on state.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define versioned logical CEA608 state and one cut between hidden write/EOC; compare entire suffix and reject visible-text-only, repeated-EOC or wrong-service/source capsule.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
