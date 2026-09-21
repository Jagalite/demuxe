<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sparse audio can be scheduled without expanding its held spans

Full identity: `sparse-wave-native-scheduling`.

Current decision: **pursue a bounded maintained-owner retest** (imported component evidence). Preparation, correctness and performance acceptance on the current owner remain pending. Integration and whole-player qualification have not started.

Parse WAVE wavl data/slnt semantics into held native spans; R243 silence cannot express a nonzero source-defined held value.

The full source contract, controls and scope are retained in [item.json](item.json).

Next action: Inspect the current maintained owner, then run the smallest applicable source/destination test specified in the imported report and handoff; preserve controls and prior scoped decisions before any promotion.

## Imported D01–D73 screening supplement

These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D57 — Sparse audio can be scheduled without expanding its held spans**: new_candidate. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch12_D56-D58/demuxe_batch12/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
