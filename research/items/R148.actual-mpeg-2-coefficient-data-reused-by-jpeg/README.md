<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Actual MPEG-2 coefficient data reused by JPEG

Full identity: `R148.actual-mpeg-2-coefficient-data-reused-by-jpeg`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The historical bridge admits only flat DC-only MPEG2 I blocks and rejects actual nonzero AC. Current playback uses general MPEG2 software decode where no browser bridge exists, so this restricted grayscale construction cannot replace that route.

Next action: If a matching DC-only image-extraction workload exists, test certificate rejection of AC, field DCT and truncation before considering JPEG emission.

## Definition and contract

Created a 32×32 MPEG-2 I picture composed of flat 8×8 blocks. The candidate parses actual DC Huffman codes for all 24 luminance/chroma blocks, checks a narrow frame-DCT profile, retains the 16 luminance blocks, accounts for JPEG’s DC level shift and MPEG-2 mismatch control, and writes coefficients through libjpeg’s coefficient API [S4, S5]. The candidate does not reconstruct MPEG pixels before writing JPEG. All 1,024 luminance samples match an independent FFmpeg decode exactly. Chromium’s JPEG decode also matches a PNG oracle made from those decoded luminance values exactly. A real nonzero-AC MPEG-2 picture and a truncated picture are rejected rather than silently accepted. This is a deliberately restricted success, not a general MPEG-2→JPEG bridge. Nonzero AC coefficients, predicted pictures, field DCT, alternate scan, clipping/IDCT differences and full-color reconstruction remain unimplemented. No speedup is claimed from this tiny fixture.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R148.actual-mpeg-2-coefficient-data-reused-by-jpeg.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R148.actual-mpeg-2-coefficient-data-reused-by-jpeg.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R148.actual-mpeg-2-coefficient-data-reused-by-jpeg.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R148.actual-mpeg-2-coefficient-data-reused-by-jpeg.md)
