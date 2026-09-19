<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM DefaultDuration parser holdback [report paragraph label]

Full identity: `R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_AS_REGRESSION_TEST** (top100).

Reconciled completed prior evidence: Truthful 100ms VP8 DefaultDuration yields one early frame and [0,0.1] range from the first block. Replacing only this metadata with same-size Void yields neither until remaining bytes arrive. Worth retaining as parser-availability regression coverage; does not justify inventing VFR durations or claim a missing maintained mux feature.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

R125: removing only the 8-byte DefaultDuration element from an otherwise identical three-frame VP8 WebM changes Chrome's behavior under a partial MSE append. With the default, one block immediately produced [0,0.1] buffered and one presented frame. Without it, the exact first block produced no buffered range and no frame until more timestamp information exists. This generalizes R112: parser timing information can affect output availability without changing codec data or delivery timing.

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
| decision | passed | Historical decision imported verbatim: PURSUE_AS_REGRESSION_TEST. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R125.webm-defaultduration-parser-holdback-report-paragraph-label.report-frontier.md)
- [results/full-completion/webm-boundaries/result.json](../../../results/full-completion/webm-boundaries/result.json)
