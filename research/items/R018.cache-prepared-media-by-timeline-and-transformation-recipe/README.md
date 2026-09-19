<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache prepared media by timeline and transformation recipe

Full identity: `R018.cache-prepared-media-by-timeline-and-transformation-recipe`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Prepared fragment cache hit preserves actual artifact bytes; changed source ETag, tracks, interval, recipe, or runtime cause miss. Corrupt entry rejects within1MiB budget. No production cache integration or benefit measurement.

Next action: Specify one concrete wrong-output or provenance failure the proposed tool must detect beyond the existing harness.

## Definition and contract

Caching · New optimization hypothesis · P2 · Risk: Medium First environment: Demuxe source + browser. Dependencies: R01. Status: Untested hypothesis. Proposed mechanism. Cache bounded already-generated fragments and initialization data for repeated seeks/replays. Key by immutable source identity, selected tracks, decoder/encoder profile, timeline origin and exact runtime recipe; do not reuse only by URL and time. Source basis. FFmpeg exposes fragmented output, while MSE can reuse valid media segments in a reconstructed presentation. The cache policy and correctness key are proposed Demuxe work. [F1, M1] First agent experiment. Replay a recently converted interval, switch away/back to the same audio, and replace a source at the same URL. Compare generated work, seek delay and total retained bytes against the uncached path.

Output contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Primary metric: Decision power, reproducibility or diagnostic cost without changing the measured player outcome.

Adverse control: A different failure, stale source/hash or malformed record must not count as the intended finding.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R018.cache-prepared-media-by-timeline-and-transformation-recipe.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R018.cache-prepared-media-by-timeline-and-transformation-recipe.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R018.cache-prepared-media-by-timeline-and-transformation-recipe.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R018.cache-prepared-media-by-timeline-and-transformation-recipe.md)
- [results/top100/ownership/result.json](../../../results/top100/ownership/result.json)
