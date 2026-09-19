<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache subtitle tiles and schedule only useful redraws

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Built isolated pinned libass runtime, then real static/karaoke tiles rendered exactly with bounded cache through time changes, rewind and resize:28 cache hits/20 misses,145496 peak retained bytes. Value is repeated-tile allocation avoidance, not proven CPU saving.

Correctness: **passed**. Performance: **pending**.

Real libass static/karaoke tiles compare cached versus uncached raster exactly through repeat times, rewind and 320→640 resize with track/layout epoch invalidation. 28 hits/20 misses and 145496 retained bytes below 1 MiB; worker terminates. No next-change prediction claim.

Next: Measure complete render/raster/retention workload and invalidation costs; avoid equating tile hits with CPU savings.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
