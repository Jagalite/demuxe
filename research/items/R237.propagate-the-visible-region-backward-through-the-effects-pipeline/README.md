<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Propagate the visible region backward through the effects pipeline

Current disposition: **stop_current_profile**, source review. No candidate experiment or general algorithm rejection.

No effect graph or filter-footprint owner exists in the current custom presenter. The shader crops final texture sampling; CPU staging copies and uploads all three source planes first. Backward ROI propagation cannot remove effect intermediate work in this current owner because no such intermediates exist. A fixed blur demonstration would establish a different, newly invented graph.

Define, screen, results and decision passed. Prepare, correctness and performance are not applicable after this scoped opportunity stop.

Reopen: Reopen when an actual fixed-filter graph processes material off-viewport intermediate pixels. Then compare full graph versus halo-expanded ROI and omit the halo as a wrong-output control, with unknown/temporal effects falling back to full frame.

[Current record](item.json) · [History](history.jsonl) · [Review](../../shared/runs/20260919T201245Z-presentation-owner-review/analysis.md)
