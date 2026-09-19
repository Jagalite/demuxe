<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Fetch WavPack correction data only when exact output is required

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current single-source packet decoder does not own a separate WavPack correction stream or exact/lossy mode transition. Dual-source authorization and block-aligned correction mapping are prerequisites.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define bounded source-paired correction map and one block-boundary mode switch; verify suffix PCM exactness and reject absent/stale correction without claiming lossless output.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
