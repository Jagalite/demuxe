<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Burn in an overlay by re-encoding only the spatial blocks it changes

Full identity: `R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current captions composite after decode and preserve video bytes. Fixed-quantization MJPEG burn-in is a requested persistent pixel change needing coefficient access and whole-image entropy serialization, not an overlay optimization of this existing presenter.

Next action: On one block-aligned MJPEG frame, preserve untouched coefficients and rewrite affected blocks; compare outside-region pixels and chroma edges while charging full serialization.

## Definition and contract

Begin with fixed-quantization MJPEG and block-aligned requested overlays; retain untouched coefficients and recompute affected blocks. Verify outside-region pixels and chroma boundaries, including whole-image entropy serialization cost.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R142.burn-in-an-overlay-by-re-encoding-only-the-spatial-blocks-it-changes.md)
