<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compose Ogg checksums from reusable byte-range summaries

Full identity: `R305.compose-ogg-checksums-from-reusable-byte-range-summaries`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Maintained remux output is MP4/WebM, not Ogg page relayout. Historical exact Ogg CRC composition offers no repeated checksum scan in these owners to remove. Source integrity is not replaceable by CRC summaries.

Next action: Reopen with a real repeated Ogg page producer; compare summary combination against independent libogg and mutated span length.

## Definition and contract

Type: Mux-stage computation reuse, without changes to checksum semantics. Ogg computes a CRC over its header with the checksum field zeroed, followed by its body. Cache the exact length and Ogg-convention CRC of immutable payload spans. For later page layouts, checksum the small new header and combine it with the selected span summaries rather than rescanning every unchanged payload byte. [O1] For zero-initialized, zero-final-XOR CRC state in the chosen convention, let Z_n(c) mean advancing state c through n zero bytes. Then This is a compositional property of the CRC state transition. Zlib documents a combine API for its own CRC convention, but its stored CRC values are not to be substituted blindly for Ogg's. Implement and validate Ogg's exact polynomial, bit ordering, initialization, and final convention. [Z1, O1]

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R305.compose-ogg-checksums-from-reusable-byte-range-summaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R305.compose-ogg-checksums-from-reusable-byte-range-summaries.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R305.compose-ogg-checksums-from-reusable-byte-range-summaries.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R305.compose-ogg-checksums-from-reusable-byte-range-summaries.md)
