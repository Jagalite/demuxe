<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# remove nonessential H.264 SEI

Full identity: `R243.remove-nonessential-h-264-sei.report-c`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Native packet copy preserves codec parameter side data and packets. The report saves only a known x264 nonessential SEI in a controlled fixture, not arbitrary type-6 semantics. No admitted metadata-discard contract exists; broad SEI stripping would violate requested color/timing/orientation semantics.

Next action: Reopen only for a positively identified redundant encoder annotation subtype and useful transfer cost; compare VCL, decoded output, timing and retained HDR/timing metadata.

## Definition and contract

The x264 source contains one type-6 SEI NAL. Removing type 6 leaves 90/90 VCL hashes, complete decoded-frame hashes and packet timing unchanged. The file shrinks from 116,070 to 115,381 bytes (689 bytes). Chromium presents all 90 frames with zero drops. This does not authorize indiscriminate SEI stripping. HDR/mastering data, timing, orientation and any other requested semantics must remain part of admission.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R243.remove-nonessential-h-264-sei.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R243.remove-nonessential-h-264-sei.report-c.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R243.remove-nonessential-h-264-sei.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R243.remove-nonessential-h-264-sei.report-c.md)
