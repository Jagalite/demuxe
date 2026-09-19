<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Repack independent stereo FLAC as mid-side using parity-state residuals

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current encoder can choose stereo representation; no residual-domain adapter exists. Historical parity conversion saves correlated-fixture bytes but is slightly slower than PCM M/S arithmetic, and source was forced to independent order1. Natural occurrence and total destination value are unproven.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Count independently coded order1 stereo frames in one real input; compare leave-unchanged, restricted encoder and parity transform including entropy and scratch costs.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
