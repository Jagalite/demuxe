<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Destination-specific recovery of mislabeled random-access samples

Full identity: `verified-mp4-sync-label-repair`.

Current scoped decision: **pursue**.

Restricted source-bound sync-label repair reconstructs the original bytes, rejects all 76 dependent samples and wrong source identity, and restores ten exact maintained-player seek pictures plus EOF. Damaged-input seeking fails. Capability repair only; no performance claim.

Next action: Require affected real sources and authoritative configuration/access-unit proof before integration; never relabel arbitrary pictures from decoder acceptance.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D60 — qualified_bounded_candidate**: Re-executed source-bound IDR-flag repair exactly reconstructs the authored original, rejects 76 dependent samples and restores ten maintained seeks/EOF. No arbitrary-source sync relabeling.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **pursue**. Restricted source-bound sync-label repair reconstructs the original bytes, rejects all 76 dependent samples and wrong source identity, and restores ten exact maintained-player seek pictures plus EOF. Damaged-input seeking fails. Capability repair only; no performance claim.

Next action: Require affected real sources and authoritative configuration/access-unit proof before integration; never relabel arbitrary pictures from decoder acceptance.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | not_applicable |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full identity: `verified-mp4-sync-label-repair`.

Earlier decision: **pursue a bounded maintained-owner retest** (imported component evidence). Preparation, correctness and performance acceptance on the current owner remain pending. Integration and whole-player qualification have not started.

Verify actual random-access pictures before repairing false MP4 sync labels for direct seeking; R150 recovery windows assumes a different coded dependency problem.

The full source contract, controls and scope are retained in [item.json](item.json).

Earlier next action: Inspect the current maintained owner, then run the smallest applicable source/destination test specified in the imported report and handoff; preserve controls and prior scoped decisions before any promotion.

## Imported D01–D73 screening supplement

These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D60 — Destination-specific recovery of mislabeled random-access samples**: new_candidate. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch13_D59-D61/demuxe_batch13/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
