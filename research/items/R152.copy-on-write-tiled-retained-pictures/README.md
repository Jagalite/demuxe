<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Copy-on-write tiled retained pictures

Full identity: `R152.copy-on-write-tiled-retained-pictures`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current frames are full AVFrame/VideoFrame surfaces and downstream draw expects them. Historical tiled sharing is postdecode after full comparisons, not decoder-internal COW. Tile table ownership plus flattening would be new representation work.

Next action: Profile one actual multi-frame retained owner, then compare postdecode tile sharing including equality scans and flattening before decoder changes.

## Definition and contract

Decoded a real MPEG-2 I/P clip with a mostly static background. Its Y/U/V planes were divided into corresponding 16×16/8×8 tiles. Tiles are shared only after byte equality with the previous decoded tile is established; a copied tile table plus a new immutable tile implements a COW edit. All 60 complete planar frames reconstruct byte-exactly, and the edit does not mutate previous references. For the final three retained pictures, unique tile payload is 94,208 bytes, versus 276,480 bytes for dense planes, plus 17,280 bytes of assumed eight-byte pointer tables. Python object/allocator overhead is not included. This is postdecode retained-storage sharing, not the proposed full decoder-internal optimization. Every source picture was still fully reconstructed, read and compared. Inferring unchanged tiles from valid codec dependency/residual state, avoiding reference writes, proving filter-boundary safety, and measuring presentation flattening remain unimplemented.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R152.copy-on-write-tiled-retained-pictures.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R152.copy-on-write-tiled-retained-pictures.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R146-R158-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R152.copy-on-write-tiled-retained-pictures.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_f/audits/R152.copy-on-write-tiled-retained-pictures.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
