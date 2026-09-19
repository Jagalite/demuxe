<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Collapse chroma expansion and final resizing into one filter

Full identity: `R339.collapse-chroma-expansion-and-final-resizing-into-one-filter`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The maintained YUV presenter samples subsampled planes directly in the final draw with crop/rotation/color conversion. It does not first materialize a full-resolution chroma plane and then resize it. The specific removable intermediate in the proposal is absent from this owner; arbitrary filter substitution would not preserve its contract.

Next action: Reopen only on an actual two-stage plane/effect path with a materialized chroma intermediate; compare exact phase/crop/boundary composite taps and reject clipping/quantization between stages.

## Definition and contract

Type: Presentation graph simplification. Related: R23 and R237. Status: PROPOSED. Investigate a controlled path that expands subsampled chroma to the full source grid, only to resize that full grid to a smaller display. Replace those consecutive linear sampling stages by their exact mathematical composition, without constructing the intermediate plane. Let U map a stored chroma plane to the source luma grid and D map that grid to the requested output grid. Then the desired final chroma is (D U) c. Construct the combined sampling kernel K = D U, including every phase, crop, and boundary rule, and evaluate K directly on the stored plane. This is not permission to substitute an arbitrary one-pass resize. In general, a convenient off-the-shelf filter is not the composite of the two requested filters.

Output contract: Exact integer planes or an explicitly defined numerical/altered-output contract; compare the final requested region and later references where relevant.

Primary metric: Complete decode/process/present cost, transfers, command work or peak live storage for identical requested output.

Adverse control: Change stride, crop, phase, alpha, edge neighborhood or resource generation; exercise a case where the proposed shortcut is ineligible.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R339.collapse-chroma-expansion-and-final-resizing-into-one-filter.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R339.collapse-chroma-expansion-and-final-resizing-into-one-filter.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R338_R342_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R339.collapse-chroma-expansion-and-final-resizing-into-one-filter.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R339.collapse-chroma-expansion-and-final-resizing-into-one-filter.md)
