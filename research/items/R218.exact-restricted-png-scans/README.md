<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# exact restricted PNG scans

Full identity: `R218.exact-restricted-png-scans`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current graphics path receives decoded YUV/RGB, not PNG inflated scanlines. Shared deflate correctness/API availability removes an inflate prerequisite only; a new restricted PNG parser/reconstruction destination remains setup. Historical absent GPU is not current.

Next action: Scope one validated IDAT-to-scanline component with independent PNG decode; preserve strict admission before GPU prefix experiments.

## Definition and contract

A custom 67×19 RGBA8 non-interlaced PNG alternates only filter types None, Sub and Up. Its continuous IDAT zlib payload expands to 5,111 bytes including filter bytes. Chromium's native DecompressionStream('deflate') inflated the IDAT payload. The restricted scan reconstruction then generated 5,092 RGBA bytes with zero differences versus Pillow's independent PNG decode. Sub was reconstructed as four independent byte-prefix scans and Up against the preceding reconstructed row. Average, Paeth, interlaced, wrong-bit-depth and oversized-profile controls are outside the admitted profile. WebGPU/WebGL is unavailable, so this test establishes the browser-inflate + exact scan algebra, not GPU performance.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R218.exact-restricted-png-scans.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R218.exact-restricted-png-scans.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R218.exact-restricted-png-scans.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R218.exact-restricted-png-scans.md)
