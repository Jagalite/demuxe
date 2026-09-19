<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Give two independent videos separate reference banks inside one decoder

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

WebCodecs accepts conventional full AV1 chunks and owns references opaquely; no prepared alternating-stream encoder/reference-slot contract exists. Two unrelated videos cannot be interleaved safely by changing timestamps.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Provide a tiny authored AV1 reserved-slot pair and bitstream reference-state oracle before using one decoder; cross-bank reference or changed shared sequence state must fail.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
