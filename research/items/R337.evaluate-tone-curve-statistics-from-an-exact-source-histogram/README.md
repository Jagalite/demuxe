<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Evaluate tone-curve statistics from an exact source histogram

Full identity: `R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Histogram push-forward is exact for declared pointwise integer LUT statistics, but the current player renders requested images and has no repeated candidate-statistics query stage. It cannot substitute for spatial effects or final rendering.

Next action: If an analysis UI is requested, validate one immutable 10-bit ROI histogram against per-pixel LUT output, with equal-histogram spatial permutations as the limitation control.

## Definition and contract

Proposal key: 9b12cf0f5ee09f1916436e6a92ba10b0473e8d361d8942e9e654c589f284e0ee Mechanism: For an immutable sample plane and a declared pointwise integer lookup-table transform, compute candidate output histograms and aggregate statistics by mapping histogram counts instead of rendering and rescanning all samples. Initial scope: One exactly represented 10-bit grayscale or luma-code plane, 1,024 source bins, one fixed ROI per histogram, and pointwise 10-bit integer output LUTs. No spatial filters, local tone mapping, cross-channel transforms, dithering, or temporal adaptation. Acceptance contract: Exact output-bin counts, sample count, integer sums and squared sums where requested, and correctly defined threshold counts relative to a per-pixel application of the same LUT. Perceptual quality and full-color gamut are not inferred.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R332_R337_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R337.evaluate-tone-curve-statistics-from-an-exact-source-histogram.md)
