<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sparse audio can be scheduled without expanding its held spans

Full identity: `sparse-wave-native-scheduling`.

Current scoped decision: **pursue**.

Sparse/held WAVE needs an explicit native scheduling owner and authoritative held-sample semantics. Current remux fails; global seek/cancel/A-V behavior remains pending. This is a deferred new-owner capability, not completed maintained-player qualification.

Next action: Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | pending |
| performance | pending |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D57 — maintained_owner_required**: Sparse/held WAVE needs an explicit native scheduling owner and authoritative held-sample semantics. Current remux fails; global seek/cancel/A-V behavior remains pending.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **pursue**. Sparse/held WAVE needs an explicit native scheduling owner and authoritative held-sample semantics. Current remux fails; global seek/cancel/A-V behavior remains pending. This is a deferred new-owner capability, not completed maintained-player qualification.

Next action: Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | pending |
| performance | pending |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full identity: `sparse-wave-native-scheduling`.

Earlier decision: **pursue a bounded maintained-owner retest** (imported component evidence). Preparation, correctness and performance acceptance on the current owner remain pending. Integration and whole-player qualification have not started.

Parse WAVE wavl data/slnt semantics into held native spans; R243 silence cannot express a nonzero source-defined held value.

The full source contract, controls and scope are retained in [item.json](item.json).

Earlier next action: Inspect the current maintained owner, then run the smallest applicable source/destination test specified in the imported report and handoff; preserve controls and prior scoped decisions before any promotion.

## Imported D01–D73 screening supplement

These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D57 — Sparse audio can be scheduled without expanding its held spans**: new_candidate. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch12_D56-D58/demuxe_batch12/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
