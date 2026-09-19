<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Produce dual-mono and silent channel slots through Opus mapping metadata

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current native remux selects MP4/WebM and copies existing channel metadata; there is no Ogg mapping-family writer. Legal dual-mono/silent-slot assignments represent an explicit changed output request, not preservation of original channel layout.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one Ogg Opus mono-to-dual mapping and compare decoded channels with source-plus-zero reference before adding any player API.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
