<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# JPEG 90° DCT-domain rotation

Full identity: `R241.jpeg-90-dct-domain-rotation.report-c`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Existing display rotation operates after decode and preserves current presentation semantics. Coefficient-domain JPEG rotation is an export/representation operation with up-to-two-level IDCT differences, not an exact pixel replacement for present display rotation.

Next action: For requested JPEG export without requantization, compare all coefficients/quantization tables and report decoded rounding difference separately.

## Definition and contract

A libjpeg coefficient transformer rotates a 64×48 4:4:4 JPEG without reconstructing pixels: block geometry rotates, each 8×8 coefficient block is transposed with the required sign changes, and quantization tables are transposed consistently. An independent coefficient dump checks all 9,216 quantized coefficients: zero differences, maximum coefficient error zero, and zero quant-table differences. Chromium decodes the result as 48×64. Rotating the already-decoded RGB source is not pixel-bit-identical to decoding the coefficient-rotated JPEG: MAE is 0.0211 and maximum component difference is 2. This is the expected integer-IDCT rounding distinction. The durable claim is no coefficient requantization/generational transform loss.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R241.jpeg-90-dct-domain-rotation.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R241.jpeg-90-dct-domain-rotation.report-c.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R245-rerun-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R241.jpeg-90-dct-domain-rotation.report-c.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R241.jpeg-90-dct-domain-rotation.report-c.md)
