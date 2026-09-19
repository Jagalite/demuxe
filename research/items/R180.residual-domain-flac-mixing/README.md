<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# residual-domain FLAC mixing

Full identity: `R180.residual-domain-flac-mixing`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current adaptation handles one selected audio track, not aligned two-source residual mixing. Report exact order3 frame sum has a narrow compatible predictor/headroom contract; parsing/reencoding and source authority need a new preparation owner.

Next action: Find one explicit two-source mix request and validate alignment/predictor/headroom before comparing a single residual sum with PCM oracle.

## Definition and contract

Two real mono FLAC frames were parsed. Both use compatible fixed predictor order 3 and Rice parameter 1. Instead of reconstructing the complete PCM signals, the prototype sums the predictor warmups and all 4,093 coded residual values directly, chooses a valid output Rice parameter, authors a new FLAC frame, and rebuilds integrity fields. The output contains 4,096 samples and decodes sample-for-sample exactly to the ordinary PCM sum. The observed output range, −6,581 to 7,887, remains safely inside signed 16-bit headroom. Integration implication: exact lossless mixing can exist below the PCM layer for carefully admitted, aligned predictor-compatible FLAC. General gain, clipping, resampling, stereo coupling, mismatched predictors, and arbitrary frame alignment remain outside the proven route.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R180.residual-domain-flac-mixing.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R180.residual-domain-flac-mixing.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R172-R182-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R180.residual-domain-flac-mixing.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R180.residual-domain-flac-mixing.md)
