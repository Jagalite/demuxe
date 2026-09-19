<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Nonlinear speed curves without video re-encoding

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current playback speed is a scalar media-element/engine property, while remux preserves a fixed source mapping. There is no explicit nonlinear monotonic timeline plus synchronized single audio time-stretch owner. Piecewise packet timestamp edits alone cannot establish A/V semantics.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one monotonic speed curve and fixed audio-stretch contract; independently verify DTS/PTS order and mapped audio/video markers, rejecting a nonmonotonic or reorder-invalid curve.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
