<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AVIF image payloads as timed AV1 video, and eligible AV1 frames as AVIF

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current packet-copy mux can preserve admitted AV1 packets but does not extract AVIF items or author timed image sequences. The report narrows compatibility to single-item, matching sequence configuration; grids/auxiliary images need separate handling.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Parse one compatible three-image AVIF set and compare packet hashes through host mux plus current native playback before any public image-sequence route.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
