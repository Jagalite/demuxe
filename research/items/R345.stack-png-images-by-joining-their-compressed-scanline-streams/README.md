<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Stack PNG images by joining their compressed scanline streams

Full identity: `R345.stack-png-images-by-joining-their-compressed-scanline-streams`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Current player does not batch PNG previews into atlases. Historical splice is exact but cold assembly is slower than the tiny baseline; cached-metadata advantage would require repeated prepared-image reuse absent here. This is scoped no current profile, not unsupported deflate.

Next action: Reopen for a repeated prepared-preview atlas consumer with cached validated block metadata and compare full final-image decode/latency.

## Definition and contract

DEFLATE supplies independently described blocks with a last-block marker and dictionary-referenced payloads. Zlib's gzjoin demonstrates joining compressed streams without recompression, but its implementation still decompresses input to locate splice boundaries. That distinction is central: no recompression and no decompression are separate hypotheses. [S4, S5] Then investigate a token-walking construction that reads Huffman symbols and lengths/distances but does not expand every dictionary copy. It must preserve the original compressed tokens, modify termination/framing correctly, and align the next stream legally. Empty alignment blocks can avoid arbitrarily shifting an entire following stream, but their exact serialization must be validated.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R345.stack-png-images-by-joining-their-compressed-scanline-streams.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R345.stack-png-images-by-joining-their-compressed-scanline-streams.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R345.stack-png-images-by-joining-their-compressed-scanline-streams.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_i/audits/R345.stack-png-images-by-joining-their-compressed-scanline-streams.md)
