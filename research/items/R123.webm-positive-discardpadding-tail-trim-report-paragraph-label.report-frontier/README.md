<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM positive DiscardPadding tail trim [report paragraph label]

Full identity: `R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier`. Reused R-numbers are separate mechanisms.

Current imported decision: **ALREADY_WORKING_IN_TESTED_PROFILE** (full-completion).

Current maintained Wasm WebM output preserves13.5ms DiscardPadding:96000 samples. Zeroing only padding yields96648 with identical coded packets and PCM prefix. Preserve this behavior/oracle; no new trimming feature needed for this profile.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

R123: FFmpeg's normal Opus WebM had positive DiscardPadding=13,500,000 ns on the final block. Zeroing that metadata changed decoded output from 96,000 → 96,648 samples, exactly 648 samples = 13.5 ms at 48 kHz. Concatenated Opus packet payload SHA-256 stayed identical. Chrome plays both files and reports the same nominal 2.008 s container duration, so output trimming and HTML timeline metadata are separate observations.

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
| decision | passed | Historical decision imported verbatim: ALREADY_WORKING_IN_TESTED_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R123.webm-positive-discardpadding-tail-trim-report-paragraph-label.report-frontier.md)
- [results/full-completion/continuity/discard-padding.json](../../../results/full-completion/continuity/discard-padding.json)
