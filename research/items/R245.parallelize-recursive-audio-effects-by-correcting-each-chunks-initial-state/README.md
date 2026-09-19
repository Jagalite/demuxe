<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize recursive audio effects by correcting each chunk’s initial state

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

mpv owns user audio filters and one streaming output state; no fixed linear effect recipe or chunk-state transition export exists. Arbitrary existing filters cannot be assumed linear/stable or correction-compatible.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Select one explicit stable IIR recipe and logical transition representation; compare irregular chunk partitions with full suffix/tails and incorrect zero-history control before scheduling integration.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
