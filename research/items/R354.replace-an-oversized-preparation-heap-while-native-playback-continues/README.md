<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Replace an oversized preparation heap while native playback continues

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

MediaSource lives on page while preparation uses a separate worker, so lifetime separation exists. Worker currently owns FFmpeg demux/mux state, not immutable continuation sample recipes. Historical 64 MiB scratch handoff is synthetic and no real temporary spike is established by that report.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: First observe a genuine remux high-water spike; if present, specify one fragment continuation identity and compare keeping instance with safe replacement peak overlap.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
