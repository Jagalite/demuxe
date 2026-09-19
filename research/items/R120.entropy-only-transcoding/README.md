<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Entropy-only transcoding

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current AVC parsing validates parameter sets/packet framing and passes entropy-coded slices unchanged. CABAC-to-CAVLC translation requires full symbol/context parsing and new slice serialization, far beyond a metadata relabel.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Use a restricted I/P slice corpus with independent reconstruction hashes; demonstrate one entropy representation conversion preserving coefficients/motion and reject unsupported slice tools.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
