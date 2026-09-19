<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# recover encoder decisions from the source

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current player exposes packet/frame flow, not source encoder decision logs or a target transcoder search interface. Historical x264 first-pass hints guided a separate block-matching model and did not demonstrate actual bitstream extraction or AVC-to-HEVC quality/cost.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Identify one available source hint and a real target encoder hook, then compare complete rate-distortion output to its own search baseline, including scene changes.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
