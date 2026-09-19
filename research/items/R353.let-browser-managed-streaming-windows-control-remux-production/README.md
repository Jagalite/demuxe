<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Let browser-managed streaming windows control remux production

Full identity: `R353.let-browser-managed-streaming-windows-control-remux-production`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_ENV** (top100).

ManagedMediaSource is undefined in the actual Chrome152 environment. No simulated demand events substituted for real managed window/eviction behavior.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Can the preparation pipeline cooperate with ManagedMediaSource demand signals instead of only changing its network-fetch policy? ManagedMediaSource exposes startstreaming/endstreaming, and ManagedSourceBuffer exposes bufferedchange. Browser-managed eviction means that data once appended is not necessarily still resident. These are API primitives; their exact implementation must be qualified on the test browser. [S1, S2] On endstreaming, stop initiating speculative reads, demuxing, and remux jobs, while finishing or safely retaining in-flight work at valid boundaries. On renewed demand, produce the required next presentation interval. Maintain distinct records for source availability, prepared media, and actual browser-buffer residency. Repair demanded missing intervals together with their decode dependencies; do not refill every evicted interval reflexively.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: HOLD_ENV. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R353.let-browser-managed-streaming-windows-control-remux-production.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R353.let-browser-managed-streaming-windows-control-remux-production.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R353_R357_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R353.let-browser-managed-streaming-windows-control-remux-production.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R353.let-browser-managed-streaming-windows-control-remux-production.md)
- [results/top100/environment.json](../../../results/top100/environment.json)
