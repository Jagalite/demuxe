<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# tighten verified H.264 decoder requirements

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current SPS reading establishes dimensions/reorder contract and preserves truthful configuration. It does not inspect every slice/reference operation to certify a lower advertised DPB requirement; changing SPS optimistically would weaken admission.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Audit one overstated progressive I/P stream across every reference-list operation, then rewrite only num_ref_frames with exact frame hashes and a hidden extra-reference negative.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
