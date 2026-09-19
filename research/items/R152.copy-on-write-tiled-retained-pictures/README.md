<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Copy-on-write tiled retained pictures

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current frames are full AVFrame/VideoFrame surfaces and downstream draw expects them. Historical tiled sharing is postdecode after full comparisons, not decoder-internal COW. Tile table ownership plus flattening would be new representation work.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Profile one actual multi-frame retained owner, then compare postdecode tile sharing including equality scans and flattening before decoder changes.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
