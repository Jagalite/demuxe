<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Checkpoint the software decoder inside a GOP

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current software fallback resets codec buffers and replays retained packets. There is no codec-aware versioned export of reference pictures/bookkeeping. Raw AVCodecContext copying would violate pointers and ownership; WebCodecs state export is not available through this owner.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Inventory one pinned decoder checkpoint field set and state hash against packet replay; reject any opaque pointer dependency before implementation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
