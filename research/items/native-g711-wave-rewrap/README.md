<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Rewrap G.711 telephony audio rather than decoding it in application code

Full identity: `native-g711-wave-rewrap`.

Current scoped decision: **pursue**.

Finite AU G.711 wrapping preserves coded bytes; both laws and all-code controls match complete host/browser references. Maintained playback, seeks, EOF and teardown pass; the frozen-runtime representative admission-cost gate passes.

Next action: Integrate a finite source-bound input preparation hook with metadata policy; qualify real AU sources/platforms. Do not infer streaming MSE G.711 support.

## Current stages

| Stage | Status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Authoritative item contract/state](item.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl).

Production integration and release qualification are separate. Current stages apply to the scope above; earlier findings retain their original scope.

## Screened-owner follow-up (20260921T030620Z-screened-owner-completion)

**D32 — qualified_bounded_candidate**: Qualify bounded G.711 AU-to-WAVE admission with both laws, all-code controls, exact host/browser reference PCM and maintained lifecycle/cost.

[Shared report](../../shared/runs/20260921T030620Z-screened-owner-completion/REPORT.md) · [Current item state](item.json) · [Append-only history](history.jsonl).

Latest scoped decision: **pursue**. Finite AU G.711 wrapping preserves coded bytes; both laws and all-code controls match complete host/browser references. Maintained playback, seeks, EOF and teardown pass; the frozen-runtime representative admission-cost gate passes.

Next action: Integrate a finite source-bound input preparation hook with metadata policy; qualify real AU sources/platforms. Do not infer streaming MSE G.711 support.

| Stage | Current status |
|---|---|
| define | passed |
| prepare | passed |
| screen | passed |
| correctness | passed |
| performance | passed |
| results | passed |
| decision | passed |

Production integration and release qualification are separate. Earlier sections describe retained historical profiles.


## Retained earlier profile notes (historical)

Full identity: `native-g711-wave-rewrap`.

Earlier decision: **pursue a bounded maintained-owner retest** (imported component evidence). Preparation, correctness and performance acceptance on the current owner remain pending. Integration and whole-player qualification have not started.

Finite AU G.711 to WAVE admission rewrap; R310 instead changes coded-domain processing operations, and R010 is a float destination contract.

The full source contract, controls and scope are retained in [item.json](item.json).

Earlier next action: Inspect the current maintained owner, then run the smallest applicable source/destination test specified in the imported report and handoff; preserve controls and prior scoped decisions before any promotion.

## Imported D01–D73 screening supplement

These are external component findings, not a new maintained-player execution. All controls, failures and destination limits remain in the linked reports.

- **D32 — Rewrap G.711 telephony audio rather than decoding it in application code**: new_candidate. [Original report](../../shared/runs/20260921T023214Z-screened-ideas-d01-d73/snapshots/batches/batch06_D31-D35/demuxe_batch6/REPORT.md); [indexed contract and follow-up](evidence/20260921T023214Z-screened-ideas-d01-d73/screenings.json).

[Campaign reconciliation](../../campaigns/screened-ideas-d01-d73.md). Current-owner retesting is required before promoting this supplement.
