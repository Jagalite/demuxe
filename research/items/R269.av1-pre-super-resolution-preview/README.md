<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AV1 pre-super-resolution preview

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current bridge receives public reconstructed VideoFrames and AVFrames, not pre-super-resolution AV1 pixels. The report explicitly could not access those pixels; adding a custom decoder tap is substantial setup, whereas lower-resolution re-encode is a different mechanism.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Locate a pinned decoder-internal pre-super-resolution surface and its ownership/lifetime contract before any preview comparison.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
