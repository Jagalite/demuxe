<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact waveform summaries from first-order FLAC

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

FLAC decoder currently reconstructs fixed-order PCM and adaptation consumes AVFrames. Source-order-1 residual bin summaries could avoid that only for a new waveform-summary consumer; no such request/bridge exists in current playback. It does not eliminate entropy decoding.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Specify one waveform-bin output over an order-1 mono source and compare residual traversal with decoded-PCM summaries including a bin crossing frame boundary.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
