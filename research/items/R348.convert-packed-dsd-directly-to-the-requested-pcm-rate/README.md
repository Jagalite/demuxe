<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Convert packed DSD directly to the requested PCM rate

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Local adaptation accepts restricted integer inputs and preserves sample rate; DSD-to-44.1 kHz fused packed conversion is not this path. Software output selects device-rate float, but its two actual conversion filters/rounding boundaries must be identified before fusion.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Trace one DSD64 software path and compare optimized packed-byte cascade with an independently high-precision composed kernel on chunk edges.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
