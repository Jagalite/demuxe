<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sample B44-compressed HDR images without expanding the whole frame

Full identity: `R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Presenter uses expanded 8-bit planes/RGBA; no B44 block parser/index or half-float demand sampler exists. Generic shader-f16 capability is not a B44 sampler and current color path cannot preserve arbitrary HALF values.

Next action: Define one bounded B44 block address/unpack oracle including negative HALF/nonzero window; reject raw-chunk fallback/truncation before shader implementation and compare dense-view recomputation cost.

## Definition and contract

Type: Existing-file rendering route and memory tradeoff. Mechanism. Retain validated OpenEXR B44 blocks in a GPU storage buffer. Implement a sampling function that locates the relevant block, reconstructs the required half-float sample representation, and feeds the ordinary color/presentation operation. Compare this against separately expanding all or selected blocks into a half-float texture before sampling. Source basis. OpenEXR documents B44 HALF data as 4×4 blocks packed into 14 bytes. B44A additionally permits three-byte flat blocks. Its implementation exposes the integer unpacking steps and optional pLinear conversion. B44 is lossy encoding; this proposal targets equality with decoding the existing file, not with pixels that preceded its encoding. [S1, S2]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R313_R317_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R313-R317-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R313-R317-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R313.sample-b44-compressed-hdr-images-without-expanding-the-whole-frame.md)
