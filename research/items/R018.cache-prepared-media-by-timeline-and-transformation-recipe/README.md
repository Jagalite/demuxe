<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache prepared media by timeline and transformation recipe

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Prepared fragment cache hit preserves actual artifact bytes; changed source ETag, tracks, interval, recipe, or runtime cause miss. Corrupt entry rejects within1MiB budget. No production cache integration or benefit measurement.

Correctness: **passed**. Performance: **pending**.

Prepared fragment artifact cache hit returns exact bytes; five independent source/track/interval/recipe/runtime identity changes miss; corrupt entry rejects and entry limit is 1 MiB. Accepted immutable artifact cache component, no production concurrent cache lifecycle.

Next: Add cache owner concurrency/lifetime if integrated; measure hashing, retention and hit opportunity before benefit claim.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
