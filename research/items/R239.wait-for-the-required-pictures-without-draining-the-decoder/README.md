<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Wait for the required pictures without draining the decoder

Full identity: `R239.wait-for-the-required-pictures-without-draining-the-decoder`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (full-completion).

The browser decoder bridge submits ordinary packets without flush and requests operation 3 only for null-packet drain. Both workers flush at that drain operation. Thus the proposed removal of ordinary-batch drains is already satisfied at this owner; output watchdog and true EOF drain remain required.

Next action: Reopen only with a caller trace showing null-packet drain at an ordinary non-EOF application batch boundary; preserve delayed output and source-generation rejection in any correction.

## Definition and contract

Resolve application completion from required output identities while preserving continuing decode state across ordinary batches. Audit unnecessary flushes first; account for delayed output, bounded further submission and true EOF drains.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

## Current stage reconciliation

**already_implemented** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only already_implemented decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: already_implemented |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R239.wait-for-the-required-pictures-without-draining-the-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R239.wait-for-the-required-pictures-without-draining-the-decoder.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R239.wait-for-the-required-pictures-without-draining-the-decoder.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R239.wait-for-the-required-pictures-without-draining-the-decoder.md)
