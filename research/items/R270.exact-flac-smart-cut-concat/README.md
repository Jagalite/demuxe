<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact FLAC smart-cut/concat

Full identity: `R270.exact-flac-smart-cut-concat`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current FLAC adaptation fully decodes/encodes selected audio; no smart-cut FLAC frame/subframe/header/CRC author exists. Correct variable sample numbering is a new authoring component, not trimming timestamps.

Next action: Scope one two-edge smart cut preserving interior subframes with CRC and variable-block sample numbering; seek into short-edge/interior transition must equal reference, stale STREAMINFO MD5 forbidden.

## Definition and contract

A five-second 48 kHz mono FLAC was cut at sample 41,737 and 105,565, both inside FLAC frames. Only the two intersecting edge frames were reconstructed; 14 complete interior compressed payloads were retained byte-for-byte. The first naive build exposed an important correctness issue: putting a short edge frame in a fixed-block-numbered stream decoded linearly but produced wrong seeks. The corrected output rewrites every retained frame header into FLAC variable-block strategy with exact cumulative sample numbers, repairs header CRC-8 and frame CRC-16, and keeps interior subframe payloads untouched. The final 63,828-sample output is sample-exact to the requested source interval. Four distributed seek checks match a full reference-segment encode exactly, every frame CRC validates, and the standalone result is 24,574 bytes versus the 91,875-byte source. STREAMINFO's whole-stream MD5 is truthfully left unknown rather than reusing a stale digest.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R270.exact-flac-smart-cut-concat.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R270.exact-flac-smart-cut-concat.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R268-R275-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R270.exact-flac-smart-cut-concat.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R270.exact-flac-smart-cut-concat.md)
