<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parallelize phase-vocoder accumulation without resetting phase at job boundaries

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Playback rate delegates to mpv speed; no selected simple phase-vocoder algorithm or exposed phase/OLA state exists. Replacing a production stretcher with a teaching algorithm changes semantics.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Specify one fixed FFT/hop/stretch/padding recipe before irregular-chunk prefix oracle; test pi-wrap ties, tiny magnitudes and impulse at chunk boundary, charging complete transforms/OLA.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
