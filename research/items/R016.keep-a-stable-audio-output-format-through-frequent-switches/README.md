<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep a stable audio output format through frequent switches

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Audio track switch currently restarts remux at the existing position; FLAC output preserves source rate/layout rather than enforcing a stable session configuration. A persistent audio producer and permitted common profile are needed, especially where native tracks differ.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Trace one pair of compatible integer tracks through current switch and measure interruption before designing one stable FLAC producer boundary.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
