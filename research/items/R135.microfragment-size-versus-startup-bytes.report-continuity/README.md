<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# microfragment size versus startup bytes

Full identity: `R135.microfragment-size-versus-startup-bytes.report-continuity`. Reused R-numbers are separate mechanisms.

Prior imported decision: **ALREADY_IMPLEMENTED** (top100).

Reconciled completed prior evidence: Current maintained native mux defaults its first fragment to 0.5 s and subsequent fragments to 0.5 s, with actual packet-boundary constraints. The report compares 2 s with 500 ms; adopting that exact interval is not a new missing change here. This does not assert every output fragment has exact 500 ms duration.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

The first complete 2-second fragment required 182,325 B including init; the first complete 500-ms fragment required 47,919 B. Both presented H.264 frames in Chrome. The smaller fragment therefore reduced the first complete playable region by 73.7% in this fixture. This is a byte-to-first-region result, not a universal startup-latency win. Smaller fragments increase box/append frequency and may worsen overhead elsewhere. R132 also shows that a streaming partial-mdat strategy can weaken the need to choose very small physical fragments.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R135.microfragment-size-versus-startup-bytes.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R135.microfragment-size-versus-startup-bytes.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R135.microfragment-size-versus-startup-bytes.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R135.microfragment-size-versus-startup-bytes.report-continuity.md)
