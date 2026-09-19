<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Optimize JPEG Huffman tables for decoding cost, not only file size

Full identity: `R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current custom browser codec bridge does not author JPEG Huffman tables and does not admit MJPEG there. This proposal needs an entropy parser/serializer preserving coefficients, plus a decoder-cost workload rather than just smaller bytes.

Next action: First compare one image coefficient dump before/after a table rewrite with a corrupted-code control; identify repeated decode amortization before runtime integration.

## Definition and contract

Rewrite valid JPEG Huffman tables and entropy serialization while preserving quantized coefficients and other image semantics. Compare size-optimized tables, decoder cost, complete image output and preparation break-even.

Output contract: Independent known truth plus a specific expected observation, not self-reported counters from the candidate.

Primary metric: Decision power, reproducibility or diagnostic cost without changing the measured player outcome.

Adverse control: A different failure, stale source/hash or malformed record must not count as the intended finding.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R226.optimize-jpeg-huffman-tables-for-decoding-cost-not-only-file-size.md)
