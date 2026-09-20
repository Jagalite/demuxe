<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache subtitle tiles and schedule only useful redraws

Disposition: **inconclusive**. Correctness **passed**, performance **failed**; other research gates passed.

Actual libass worker static/karaoke96renderrequests with repeat/rewind, track change and320/640layout changes. Exact glyph bytes/color/geometry/epoch cache bounded1MiB versus rasterize everytile. All composed RGBA hashes match untimed real libass baseline; native rendering still executes everyrequest, no next-change predictor. Complete worker/font/load/raster/key/cache/outputcheck/terminate costs included, retention zero at cleanup. Complete owner wall-time saving4.91%, bootstrap95[-0.7855216812002519, 10.038672730909337]; predeclared performance gate failed.

Research experiment complete without demonstrated cold-owner latency value. Reopen only for a specified persistent-worker or longer subtitle schedule where avoided work matters; declare new costs and threshold before measuring.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T210256Z-ass-owners/analysis.md)
