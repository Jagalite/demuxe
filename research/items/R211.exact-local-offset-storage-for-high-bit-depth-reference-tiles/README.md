<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Exact local-offset storage for high-bit-depth reference tiles

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current fast presenter is 8-bit 420P; compact 10-bit reference tiles would require changed software decoder storage and reconstruction access. Report poststorage exactness does not establish codec-internal support or eliminate required plane materialization.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Audit one high-bit-depth retained reference owner and compare compact/uncompact tile access including checkerboard fallback before integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
