<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Copy surviving packets to release oversized backing buffers

Full identity: `R298.copy-surviving-packets-to-release-oversized-backing-buffers`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

RangeReader returns views into bounded cache blocks, but the native source worker immediately copies them to its mailbox; encoded browser packets are copied out of Wasm before submission. No long-lived sparse JS packet handles retaining 16 MiB source slabs were found in these owners. Range cache itself retains intentional bounded reusable blocks.

Next action: Reopen only with a concrete retained packet-view owner whose unique backing bytes exceed useful bytes after other consumers finish; compare one compacted slab with delayed and duplicate consumers.

## Definition and contract

Type: Encoded-buffer ownership/memory optimization. First owner: JavaScript source/demux buffer component. Related: R42, R47, R124; targets encoded allocations rather than decoder surfaces. Hypothesis. Retaining a tiny packet view can retain a much larger source allocation. After most consumers finish, copy the small remaining live regions into compact owned storage and drop the obsolete views and allocation references. Source basis. ECMAScript defines TypedArray.prototype.subarray() as a new typed array referencing the same ArrayBuffer. The proposed retained-memory consequence follows from that shared ownership; the specification does not promise immediate physical-memory reclamation after references disappear. [S6]

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R298.copy-surviving-packets-to-release-oversized-backing-buffers.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R298.copy-surviving-packets-to-release-oversized-backing-buffers.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R298.copy-surviving-packets-to-release-oversized-backing-buffers.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R298.copy-surviving-packets-to-release-oversized-backing-buffers.md)
