<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Factor repeated fMP4 sample metadata into defaults

Full identity: `R111.factor-repeated-fmp4-sample-metadata-into-defaults`. Reused R-numbers are separate mechanisms.

Current imported decision: **ALREADY_IMPLEMENTED** (full-completion).

Pinned FFmpeg movenc writes default duration/size/flags in tfhd and emits trun exceptions for differing duration, size, flags and CTS. Current mux uses this writer; another equivalent defaults rewriter duplicates the stated mechanism.

Next action: Reopen only if a concrete captured output has redundant equivalent fields beyond these defaults; independently expand sample tables including VFR/CTS/short-tail exceptions before any rewrite.

## Definition and contract

Question. How much metadata can be removed from short fragments without changing sample semantics or availability? What differs from earlier work. Different from append batching or fragment-size changes: preserve sample and fragment boundaries and change only redundant metadata representation. Mechanism. Use valid trex/tfhd defaults for fields that really repeat, retaining trun entries for exceptions such as sizes, composition offsets, first-keyframe flags and final audio duration. Initial source profile. Clear qualified fMP4, fixed-rate control first; variable-rate and B-frame fixtures as adversarial controls. Source basis. Chromium PopulateSampleInfo implements trun/tfhd/trex fallback. Its run iterator still allocates a per-sample representation, so wire savings do not imply elimination of browser metadata objects. [S12, S13]

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
| decision | passed | Historical decision imported verbatim: ALREADY_IMPLEMENTED. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R111.factor-repeated-fmp4-sample-metadata-into-defaults.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R111.factor-repeated-fmp4-sample-metadata-into-defaults.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R102-R115-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R102-R115-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R111.factor-repeated-fmp4-sample-metadata-into-defaults.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R111.factor-repeated-fmp4-sample-metadata-into-defaults.md)
