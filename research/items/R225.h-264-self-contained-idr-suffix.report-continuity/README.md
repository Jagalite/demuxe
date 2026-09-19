<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# H.264 self-contained IDR suffix

Full identity: `R225.h-264-self-contained-idr-suffix.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Generated Annex-B SPS/PPS/IDR suffix decoded by host FFmpeg 8.1.2 yields the exact 48-picture suffix of the 72-frame reference. Missing configuration and dependent start fail. This host oracle is not execution of pinned FFmpeg 7.1.1; browser/TS scanning cost remains unmeasured.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

The raw 6-second 30-fps AVC stream has 180 packets and IDRs at packet indexes 0, 30, 60, 90, 120, 150. x264 repeated SPS/PPS at IDRs. Starting the byte stream directly at packet 60 produces 120 decoded frames whose YUV420 bytes are exactly equal to frames 60–179 of the continuous decode. The retained coded suffix is 143,452/208,538 bytes (68.8%). This supports a qualified minimal-byte seek route for Annex-B AVC when the chosen random-access point carries everything the decoder needs.

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
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R225.h-264-self-contained-idr-suffix.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R225.h-264-self-contained-idr-suffix.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R225.h-264-self-contained-idr-suffix.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R225.h-264-self-contained-idr-suffix.report-continuity.md)
- [results/full-completion/r225/result.json](../../../results/full-completion/r225/result.json)
