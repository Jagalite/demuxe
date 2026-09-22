<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Import handoff — D86–D88

Read REPORT.md and evidence/verification.json before changing canonical research. These are external component screens, not maintained-player executions. Reconcile exact full R keys at the current repository head. Do not invent or reserve canonical R-numbers automatically. Prior research decisions, benchmarks, negative cases and source histories must remain intact.

## Proposed reconciliation

| Screening | Suggested lineage | Import action |
|---|---|---|
| D86: correct packet interleaving did not enable early A/V | R033 interleave-samples-for-earlier-complete-a-v-output | Add distinct packet-correct constructor negative; preserve old FFmpeg-settings/tail failure independently. |
| D87: two partial native track inputs, one media clock | R032 use-different-output-containers-for-different-tracks; R132 incremental-mdat-sample-release.report-continuity; D14 | Append the mixed-A/V partial-delivery profile. Select one canonical owner; cross-link rather than duplicate results. |
| D88: conditional append deduplication | R018 prepared media identity; current append-queue/source-generation owner | Treat as residency/order regression, not automatically a new cache. A distinct item needs a genuinely different owner/mechanism and measurable duplicate opportunity. |

## Smallest next experiments

**D87 first:** inspect whether current remux output already exposes independently available per-track packets and whether native/Shaka presentation already uses separate SourceBuffers. Reuse that owner. Test one real partial delivery while retaining one media clock. Compare the existing cheapest correct producer with the modified producer under identical source availability. Include exact complete video and sample-accurate audio, real delayed reads, pause/seek, source replacement, cancellation, quotas and cleanup. Charge source inspection/index acquisition, packet copies, both headers, both append queues and completed background work. The sandbox source was already completely local.

**D88 only after opportunity measurement:** count duplicated committed and in-flight append operations in the real owner. Preserve source/init/recipe/generation/timeline/window identity and both ordering negatives. A media `buffered` range does not identify its content. Automatic eviction and effects beyond an advertised interval require conservative invalidation. An aborted or failed operation cannot become a hit, and one cancelled consumer must not invalidate healthy surviving consumers without a declared contract. The sandbox immutable handles were verified on the host; do not infer production hash validation.

**D86:** do not integrate this interleave variant as a startup optimization. It preserved samples but failed its intended release benefit. Do not repeat the same matrix without a different demonstrated destination or parser/producer boundary.

## Evidence rules

Keep the v0 ledger implementation, wrong-timeline/eviction controls, and first-AAC FFprobe reporting difference. Keep live capture limitations: exact whole-file audio is separate from tone-positive real-time capture. Do not label the 9→3 crafted append count as 67% CPU savings. Do not label the 500 ms withheld tail as a measured network speedup. Reconcile with imported D01–D73 and D74–D85 without overwriting their original IDs.

`python3 scripts/reproduce.py --out <fresh-directory>` reproduces the synthetic fixture construction and actual browser tests. System dependencies are listed in requirements.txt and evidence/environment.json. The archive contains raw picture/audio artifacts and clean replay evidence; SHA256SUMS.txt hashes all retained files except itself.
