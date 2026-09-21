<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Rewrap G.711 telephony audio rather than decoding it in application code

Full identity: `native-g711-wave-rewrap`.

Current decision: **pursue a bounded maintained-owner retest** (imported component evidence). Preparation, correctness and performance acceptance on the current owner remain pending. Integration and whole-player qualification have not started.

Finite AU G.711 to WAVE admission rewrap; R310 instead changes coded-domain processing operations, and R010 is a float destination contract.

The full source contract, controls and scope are retained in [item.json](item.json).

Next action: Inspect the current maintained owner, then run the smallest applicable source/destination test specified in the imported report and handoff; preserve controls and prior scoped decisions before any promotion.

## Imported D01–D73 screening supplement

These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D32 — Rewrap G.711 telephony audio rather than decoding it in application code**: new_candidate. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch06_D31-D35/demuxe_batch6/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
