<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Snappy dependency graph

Full identity: `R266.snappy-dependency-graph`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Pinned Snappy copy primitive handles overlap sequentially; historical graph construction is 4.1x to 11.3x slower on both tested CPU shapes and incomplete for full Snappy framing. Do not replace the CPU decoder on this evidence. GPU availability is not a graph-executor result.

Next action: Reopen only with a bounded parallel executor and measured broad independent layers whose total graph/upload cost can beat current decode.

## Definition and contract

A raw Snappy subset (literals + COPY_2) was generated in two shapes: a 512 KiB chain-heavy block and a ~60 KiB fan-out block. A conventional optimized sequential decoder is the oracle. The graph path builds token dependencies and executes topological layers with the same overlap-safe copy primitive. Result. Both graph outputs exactly match the sequential decoder and generated source. But the chain has 8,192 levels with width 1, so it is essentially serial. The fan-out case has width 959 after its root literal, demonstrating that parallel structure can exist. On this CPU implementation, graph bookkeeping made decoding 11.3× slower for the chain and 4.1× slower for fan-out. Verdict. Correct representation, but do not treat it as a CPU optimization from this evidence. A parallel/GPU executor would need a separate test; full Snappy framing and all copy tag types were not implemented here.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R266.snappy-dependency-graph.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R266.snappy-dependency-graph.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R266.snappy-dependency-graph.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R266.snappy-dependency-graph.md)
