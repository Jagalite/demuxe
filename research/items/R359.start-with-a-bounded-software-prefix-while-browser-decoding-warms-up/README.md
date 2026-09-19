<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Start with a bounded software prefix while browser decoding warms up

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

The old report lacked VideoDecoder in an insecure origin; the shared current secure probe resolves that API block. Current browser/software paths implement fallback rather than two simultaneously decoded branches with an explicit prefix handoff. A dual-owner same-clock protocol is new setup.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: First specify video-only prefix limits and one handoff point in the retained presenter; compare adjacent handoff frame identities and immediate browser-win cancellation.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
