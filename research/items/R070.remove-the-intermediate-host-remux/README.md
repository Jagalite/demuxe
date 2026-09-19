<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Remove the intermediate host remux

Full identity: `R070.remove-the-intermediate-host-remux`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (full-completion).

Maintained rm_open already bounded-prefetches AAC and derives initialization before direct fragmented output; there is no intermediate host MP4 stage in runtime. The lab two-pass removal is therefore not a missing production optimization.

Next action: Retain AAC initialization negative control when changing TS preparation; no duplicated pipeline simplification needed.

## Definition and contract

Question. Can selected H.264/AAC from a two-program transport stream be packaged directly into fragmented MP4 instead of first producing an ordinary MP4? This extends R65's construction rather than introducing a new player route. The six-second fixture contains red H.264 video plus a 440 Hz AAC signal in program 100, with unrelated blue video and 880 Hz AC-3 in program 200. The candidate selects program 100, applies aac_adtstoasc and uses delay_moov with fragmentation. The negative control removes delay_moov from that CLI construction. FFmpeg documents that this flag postpones the initial movie header until the first fragment cut or flush; it does not promise faster first-frame presentation. [F1]

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R070.remove-the-intermediate-host-remux.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R070.remove-the-intermediate-host-remux.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R70-R75-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R070.remove-the-intermediate-host-remux.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R070.remove-the-intermediate-host-remux.md)
