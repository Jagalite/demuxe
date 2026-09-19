<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compute GIF color statistics without expanding LZW strings

Full identity: `R365.compute-gif-color-statistics-without-expanding-lzw-strings`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Historical aggregate-query kernel is exact and beneficial on repetitive GIF but slower on noise; current player requires spatial decoded pixels and has no GIF histogram request. An added aggregate parse cannot be credited as replacing rendering.

Next action: Reopen for a source-level histogram consumer; compare propagation with fused no-image-allocation decode/count on repetitive and noisy sources.

## Definition and contract

Hypothesis. Exact palette-index histograms can be calculated from a GIF's LZW dictionary and emitted-code frequencies without constructing the expanded index image or walking every expanded phrase byte. Source basis. GIF defines variable-width LZW codes and explicit clear/end behavior, including the case where the dictionary is full but no clear code has occurred. FFmpeg's pinned LZW decoder represents phrases using prefix/suffix arrays and expands them through a stack. These supply a concrete structural starting point. The occurrence-propagation algorithm below is a proposed composition, not a newly measured decoder feature. [S4, S5] Mechanism. Within one dictionary generation, a composite entry e denotes phrase(parent(e)) followed by one literal suffix(e). Count how often each entry is emitted into the decoded sequence. After the generation is complete, process composite entries in reverse creation order. For accumulated multiplicity w[e], add w[e] to the histogram of suffix(e), and add w[e] to w[parent(e)]. Finally add each literal entry's accumulated multiplicity to its own histo

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R365.compute-gif-color-statistics-without-expanding-lzw-strings.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R365.compute-gif-color-statistics-without-expanding-lzw-strings.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R363_R366_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R365.compute-gif-color-statistics-without-expanding-lzw-strings.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R365.compute-gif-color-statistics-without-expanding-lzw-strings.md)
