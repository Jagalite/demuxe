<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache prepared media by timeline and transformation recipe

Full identity: `R018.cache-prepared-media-by-timeline-and-transformation-recipe`.

Current decision: **pursue** (actual_repeated_interval_complete_cost).

Cold-empty-cache five-open jobs: nine alternating pairs, complete host remux/decode/output copies and source/recipe identity verification included. Every decoded picture equals original H264 oracle; four changed identities miss, poisoned prepared bytes reject. Median complete cost368.54ms uncached versus206.43ms cached; paired median saving39.48%,95%bootstrap[32.82,48.81] passes declared10% gate.

Next action: Scoped repeated-video-interval component research complete. Production browser cache integration must carry full immutable source/track/recipe/runtime identity and bounded retention; measure real hit rate separately.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Prepared fragment artifact cache hit returns exact bytes; five independent source/track/interval/recipe/runtime identity changes miss; corrupt entry rejects and entry limit is 1 MiB. Accepted immutable artifact cache component, no production concurrent cache lifecycle. |
| correctness | passed | Prepared fragment artifact cache hit returns exact bytes; five independent source/track/interval/recipe/runtime identity changes miss; corrupt entry rejects and entry limit is 1 MiB. Accepted immutable artifact cache component, no production concurrent cache lifecycle. |
| performance | passed | Cold-empty-cache five-open jobs: nine alternating pairs, complete host remux/decode/output copies and source/recipe identity verification included. Every decoded picture equals original H264 oracle; four changed identities miss, poisoned prepared bytes reject. Median complete cost368.54ms uncached versus206.43ms cached; paired median saving39.48%,95%bootstrap[32.82,48.81] passes declared10% gate. |
| results | passed | Cold-empty-cache five-open jobs: nine alternating pairs, complete host remux/decode/output copies and source/recipe identity verification included. Every decoded picture equals original H264 oracle; four changed identities miss, poisoned prepared bytes reject. Median complete cost368.54ms uncached versus206.43ms cached; paired median saving39.48%,95%bootstrap[32.82,48.81] passes declared10% gate. |
| decision | passed | Cold-empty-cache five-open jobs: nine alternating pairs, complete host remux/decode/output copies and source/recipe identity verification included. Every decoded picture equals original H264 oracle; four changed identities miss, poisoned prepared bytes reject. Median complete cost368.54ms uncached versus206.43ms cached; paired median saving39.48%,95%bootstrap[32.82,48.81] passes declared10% gate. |

[New run](../../shared/runs/20260919T205700Z-prepared-cache-cost/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
