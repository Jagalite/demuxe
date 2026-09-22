<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache subtitle tiles and schedule only useful redraws

Disposition: **inconclusive**. Correctness **passed**, performance **failed**; other research gates passed.

Actual libass worker static/karaoke96renderrequests with repeat/rewind, track change and320/640layout changes. Exact glyph bytes/color/geometry/epoch cache bounded1MiB versus rasterize everytile. All composed RGBA hashes match untimed real libass baseline; native rendering still executes everyrequest, no next-change predictor. Complete worker/font/load/raster/key/cache/outputcheck/terminate costs included, retention zero at cleanup. Complete owner wall-time saving4.91%, bootstrap95[-0.7855216812002519, 10.038672730909337]; predeclared performance gate failed.

Research experiment complete without demonstrated cold-owner latency value. Reopen only for a specified persistent-worker or longer subtitle schedule where avoided work matters; declare new costs and threshold before measuring.

[Current record](item.json) · [History](history.jsonl) · [Analysis](../../shared/runs/20260919T210256Z-ass-owners/analysis.md)

## Ecosystem follow-up EB18

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **followup_required**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

Current rendering already suppresses unchanged output and closes discarded bitmaps. The standalone libass bridge treats any nonzero change as bitmap work; position-only changes are not separately exposed there. The current mpv subtitle service is another boundary and must be measured separately. R021's cold-owner failed benefit gate is retained.

Next gate / reopening condition: Compare position-only versus content changes on a persistent moving-ASS workload, font replacement and resize; independently verify glyph/color/placement and measure full rendering/upload cost before adding a tile cache.

This scoped supplement does not broaden earlier correctness or performance qualification.
