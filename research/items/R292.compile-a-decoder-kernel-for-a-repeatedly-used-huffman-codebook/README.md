<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Compile a decoder kernel for a repeatedly used Huffman codebook

Full identity: `R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current custom browser bridge does not admit MJPEG and software decoding uses established codec machinery. Historical source-specialized Wasm is an offline-generated coefficient kernel, not a bounded runtime generator or full player. Real repeated table frequency and module amortization remain required.

Next action: Measure table reuse in one actual MJPEG source and identify the general lookup baseline; only then scope one trusted generated kernel.

## Definition and contract

Mechanism. For a controlled MJPEG software path with demonstrably reused validated Huffman tables, generate a bounded Wasm kernel specialized to those tables and the admitted scan layout. Evaluate trusted templates for inlined decisions or table-specialized constants while retaining a correct general escape path. The source bitstream remains unchanged. First experiment. Baseline sequential grayscale JPEGs sharing tables. Compare the same decoder with its ordinary prederived lookup tables, a specialized kernel, and native ImageDecoder where qualified. Require identical symbols, consumed bits, quantized coefficients, and reconstructed output. Exercise long codes, byte stuffing, restart boundaries, truncation, table changes, invalid tables, and first-frame behavior.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R289_R294_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R292.compile-a-decoder-kernel-for-a-repeatedly-used-huffman-codebook.md)
