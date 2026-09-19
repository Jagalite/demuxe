<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG mosaic from restart intervals

Full identity: `R182.jpeg-mosaic-from-restart-intervals`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

There is no JPEG restart-interval compositor or JPEG table/MCU identity parser in the current video boundary. The historical grayscale row-mosaic is a narrowly authored compressed composition capability, not arbitrary crop or a maintained delivery bottleneck.

Next action: For a requested compressed row mosaic, admit only matching tables/geometry and complete restart intervals, compare exact decoded selected rows, and reject a table mismatch or partial-MCU boundary.

## Definition and contract

Two 64×64 grayscale JPEGs were encoded with matching headers/tables and one restart interval per MCU row. Their entropy scans each contain eight independent row intervals. A new JPEG was authored by alternately copying row intervals from source A and B and rewriting the restart-marker sequence; no DCT coefficient or pixel-domain composition was used. The resulting 64×64 JPEG decodes pixel-for-pixel exactly to an oracle mosaic assembled from the corresponding decoded 8-pixel source rows. All eight compressed entropy intervals were reused. Integration implication: restart intervals can act as compressed composition tiles when JPEG coding parameters and MCU geometry are compatible. This is currently a grayscale, row-aligned, matching-table result—not arbitrary rectangle composition.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R182.jpeg-mosaic-from-restart-intervals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R182.jpeg-mosaic-from-restart-intervals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R182.jpeg-mosaic-from-restart-intervals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R182.jpeg-mosaic-from-restart-intervals.md)
