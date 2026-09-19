<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Reconstruct predictor-4 lossless JPEG with two-dimensional prefix sums

Full identity: `R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Pinned lossless JPEG decoder handles boundary seeds, precision alignment and restart state serially. Historical predictor-4 scans prove a constrained component but no current GPU residual-grid interface; source may use another predictor and cannot be re-encoded merely to hide setup.

Next action: Count eligible source usage then compare one real parsed residual grid to the pinned decoder with initial-row/column seeds before GPU passes.

## Definition and contract

Proposal key: 403d6f6f34a0fdb8a14338d1074f726fea9abfe82cd1c31e0ef65834524eb543 Mechanism: After independently parsing residuals from a qualified lossless-JPEG scan, reconstruct predictor-4 samples using modular row and column prefix sums, with the exact initial and boundary conditions. Initial scope: Huffman-coded lossless JPEG (SOF3), one grayscale component, predictor selection 4, one scan, eight-bit precision initially, point transform zero, no restarts, no interlacing or reversible color transform. Higher precisions and restart layouts are separate extensions. Acceptance contract: Exact residual values, exact reconstructed sample values and bit patterns after the same storage alignment, and correct malformed-input rejection within explicit resource bounds. No lossy approximation and no JPEG-LS claim.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R336.reconstruct-predictor-4-lossless-jpeg-with-two-dimensional-prefix-sums.md)
