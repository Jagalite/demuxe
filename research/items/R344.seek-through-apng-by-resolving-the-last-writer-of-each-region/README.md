<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Seek through APNG by resolving the last writer of each region

Full identity: `R344.seek-through-apng-by-resolving-the-last-writer-of-each-region`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current software decoder yields complete animation frames; no APNG operation index, standalone per-frame PNG view or bounded unresolved-region planner exists. Historical checkpoint was faster than planner at different retention cost, so use equal memory baseline.

Next action: Define one validated APNG index/region planner with cap; test overlapping/transparent SOURCE and default-image exclusion, reject OVER/PREVIOUS and charge all selected-image decode/index reads.

## Definition and contract

APNG distinguishes region replacement (SOURCE), alpha compositing (OVER), and disposal operations. Its frame payloads form per-frame compressed image datastreams with inherited image properties. [S3] Start with SOURCE plus NONE disposal. Maintain an unresolved-region set, initially the complete requested canvas. Walking backward, a frame contributes only where its rectangle intersects the unresolved set; those intersections are assigned to that frame and removed from the set. Remaining regions at the beginning are transparent black. A transparent SOURCE pixel still replaces earlier contents; opacity is not required for this initial rule. Create standalone PNG views for selected frame payloads only through a validated reconstruction of dimensions and inherited properties. Decoder capability and pixel access are separate gates. Resolving a small contributing region does not prove the selected image decoder reconstructs only that region; initially count every selected frame image as fully decoded.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R343_R347_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R343-R347-rerun-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R343-R347-rerun-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R344.seek-through-apng-by-resolving-the-last-writer-of-each-region.md)
