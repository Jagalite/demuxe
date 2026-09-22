<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Focused research batch 22 — D86–D88

[Original report](../../research/shared/runs/20260922T001856Z-research-batches-import/snapshots/demuxe_batch22/REPORT.md) · [Import verification](../../research/shared/runs/20260922T001856Z-research-batches-import/REPORT.md) · [Handoff](../../research/shared/runs/20260922T001856Z-research-batches-import/snapshots/demuxe_batch22/LOCAL_AGENT_HANDOFF.md)

External component screens imported without rerunning experiments; current decisions and stages unchanged. No production or performance qualification inferred.

- **D86** — Test packet-preserving intra-fragment interleaving for early joint A/V. Owner: [R033.interleave-samples-for-earlier-complete-a-v-output](../items/R033.interleave-samples-for-earlier-complete-a-v-output/README.md). Imported disposition: `stop_tested_release_profile`. Complete within-endpoint media identity passes; intended early A/V release fails.
- **D87** — Feed partial per-track fragments through independent native parser inputs. Owner: [R032.use-different-output-containers-for-different-tracks](../items/R032.use-different-output-containers-for-different-tracks/README.md). Imported disposition: `pursue_scoped_component`. Early video/audio activity; checked pixels/PTS/tones and EOF pass. Exact live A/V sync unqualified.
- **D88** — Deduplicate append requests with residency and mutation-order identity. Owner: [R018.cache-prepared-media-by-timeline-and-transformation-recipe](../items/R018.cache-prepared-media-by-timeline-and-transformation-recipe/README.md). Imported disposition: `conditional_opportunity_required`. Restricted final guard passes; two initial false-success variants retained and reproduced.

D87 also relates to [R132.incremental-mdat-sample-release.report-continuity](../items/R132.incremental-mdat-sample-release.report-continuity/README.md); evidence is stored once. D88 remains an opportunity-dependent residency/order regression lead; append-queue ownership needs reconciliation before implementation. No new R-numbers allocated.

Retain the v0 ledger failures, AAC reporting discrepancy and live audio capture limits. Crafted append-count reduction is not CPU savings; a withheld tail is not measured network speedup.
