<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Chained audio needs independent configuration, trimming, and decoder state

Full identity: `chained-ogg-native-link-scheduling`.

Current decision: **pursue a bounded maintained-owner retest** (imported component evidence). Preparation, correctness and performance acceptance on the current owner remain pending. Integration and whole-player qualification have not started.

Per-link chained Ogg configuration, trim and decoder lifetime; neither whole Opus stream selection nor same-source resampling owns this parser/scheduler contract.

The full source contract, controls and scope are retained in [item.json](item.json).

Next action: Inspect the current maintained owner, then run the smallest applicable source/destination test specified in the imported report and handoff; preserve controls and prior scoped decisions before any promotion.

## Imported D01–D73 screening supplement

These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D42 — Chained audio needs independent configuration, trimming, and decoder state**: new_candidate. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch08_D40-D43/demuxe_batch8/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
