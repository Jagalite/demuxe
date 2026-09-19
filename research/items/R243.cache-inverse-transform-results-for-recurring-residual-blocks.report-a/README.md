<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Cache inverse-transform results for recurring residual blocks

Full identity: `R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Browser decoding exposes packets and frames, not residual transforms. The historical cache is slower on unique/mixed synthetic traces and approximately tied on repetitive pools; no real decoder trace or hook establishes opportunity.

Next action: Collect a representative transform histogram from an existing software decoder only if cheap; compare against its actual SIMD/zero/DC paths before building a cache.

## Definition and contract

A standalone bounded 4×4 integer-transform/cache prototype was built in native C++. The transform arithmetic was checked against an independent Python wide-integer oracle for 8- and 10-bit predictions, coefficient values in [-512,512], forced hash collisions, clipping and buffer clearing. 160,000 output-sample comparisons had zero mismatches; no coefficients remained uncleared. A separate ASan/UBSan smoke run completed with empty stderr. The cached item is the residual block, not final prediction-added pixels. Actual coefficients and declared bit depth participate in the key and full key equality is checked. Zero/DC-only cases bypass the cache in both constructions. Capacity was 256 entries. No real encoded-corpus transform trace or actual FFmpeg decoder hook was available. Performance tests therefore use explicitly synthetic distributions, not purported real hit rates. Seven measured runs per construction followed one warmup, with rotated order and 200,000 blocks per run:

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
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R243.cache-inverse-transform-results-for-recurring-residual-blocks.report-a.md)
