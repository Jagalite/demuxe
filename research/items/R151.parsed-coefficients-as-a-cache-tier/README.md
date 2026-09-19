<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Parsed coefficients as a cache tier

Full identity: `R151.parsed-coefficients-as-a-cache-tier`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current retained caches hold decoded video frames, not repeated JPEG crop/downsample queries. The report itself shows coefficient storage larger than pixels and excludes object/RSS costs; it does not justify replacing this playback cache tier.

Next action: If an image ROI service is requested, compare compressed/coefficient/pixel policies with one shared byte budget and an optimized reconstruction oracle.

## Definition and contract

Used real libjpeg entropy parsing of twelve grayscale JPEGs. The three policies share an identical SciPy inverse-DCT implementation and receive 162 crop/downsample requests under a 512 KiB accounted cache budget. Every request’s final output hash matches across policies. A separate libjpeg pixel oracle differs by at most one grayscale level due to reconstruction rounding. The coefficient tier avoids repeated entropy parsing while allowing a crop to reconstruct fewer blocks. However, one coefficient image takes 153,728 bytes versus 76,800 bytes for decoded grayscale pixels. It is not intrinsically a memory-saving tier. All caches share resident fixture/oracle data outside the reported budget; object overhead and process RSS are excluded.

Output contract: Correct source/time/target and agreed fidelity. Approximate results cannot populate exact caches or qualify normal playback.

Primary metric: Time to the requested exact or explicitly approximate preview, total prerequisite work and retained state.

Adverse control: Move backward, request a non-RAP dependency, change source or cancel a pending request; stale previews must never become current.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R151.parsed-coefficients-as-a-cache-tier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R151.parsed-coefficients-as-a-cache-tier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R151.parsed-coefficients-as-a-cache-tier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R151.parsed-coefficients-as-a-cache-tier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
