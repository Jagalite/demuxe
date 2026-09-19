<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Derive audio-effect preroll from a guaranteed error budget

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current output delegates processing/synchronization to mpv and exposes no controlled first-order filter state bound. The source certificate is valid only for declared bounded approximation; this must not be substituted for exact effect-seek semantics or decoder history.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one opt-in first-order DSP instance and compare calculated preroll with continuous reference; inspect the near-unit-pole fallback.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
