<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM negative DiscardPadding head-crop composition [report paragraph label]

Full identity: `R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_BROWSER_ORACLE_DIVERGENCE** (top100).

Corrected prior transcription: Chrome native decode applies requested additional480-sample head trim exactly, output95520 samples; host FFmpeg output stays unchanged96000 despite identical packet payloads. Browser composition is viable for this profile, but cross-decoder trim semantics/oracle divergence must be resolved before integration. No universal trimming rule.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

R124: RFC 9559 defines negative DiscardPadding as beginning padding. However, naively adding -5 ms to the first Opus block on top of the file's existing Opus CodecDelay/pre-skip state did not compose as an extra 240-sample crop: output became 96,072 samples instead of 96,000. The encoded packets remained identical. Do not treat arbitrary negative DiscardPadding insertion as a standalone head-trim operation without reconciling the codec's existing delay model.

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
| decision | passed | Historical decision imported verbatim: PURSUE_BROWSER_ORACLE_DIVERGENCE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R124.webm-negative-discardpadding-head-crop-composition-report-paragraph-label.report-frontier.md)
- [results/top100/head-trim/browser-result.json](../../../results/top100/head-trim/browser-result.json)
- [results/top100/head-trim/result.json](../../../results/top100/head-trim/result.json)
