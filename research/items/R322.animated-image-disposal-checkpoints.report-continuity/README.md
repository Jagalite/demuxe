<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Animated-image disposal checkpoints

Current disposition: **blocked** — **setup** prerequisite. Historical review; no new media execution.

Current retained state contains video frames and generations, not an animated-image compositor with disposal transactions. A checkpoint must capture post-disposal canvas state; historical controlled commands do not parse real GIF palettes/interlace/transparency.

Prepare: **blocked**. Correctness: **blocked**. Performance: **blocked**.

Next: Define one tiny real disposal fixture and reference compositor, checkpoint after prior disposal and compare random seeks, with restore-to-previous incorrectly timed as adverse control.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Review](../../shared/runs/20260919T202334Z-ranks251-392-reconciliation/analysis.md)
