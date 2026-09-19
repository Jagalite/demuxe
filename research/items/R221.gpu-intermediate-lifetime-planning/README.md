<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# GPU intermediate lifetime planning

Full identity: `R221.gpu-intermediate-lifetime-planning`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (top100).

Presenter owns simultaneously needed Y/U/V and overlay textures. No multi-pass transient effect graph or delayed preview allocation exists for lifetime aliasing to reclaim. Report planner savings do not apply to this owner.

Next action: Identify the CPU/GPU representation boundary and actual useful work removed. Check existing renderer fusions, caches, kernel fast paths and hardware gates.

## Definition and contract

A fixed graph models color processing, two effects, subtitle composition and a delayed preview consumer. The lifetime allocator only reuses a compatible texture after the previous logical resource's final consumer. All tested schedules were conflict-free. A symbolic execution verified that the delayed preview still read the exact effect1 value after unrelated texture reuse, and both final outputs matched the dedicated-resource model. Planned allocation reductions versus one dedicated resource per logical intermediate were: - one frame + delayed preview: 24.7%; - three frames in flight: 50.2%; - preview cancellation: 25.0%; - resolution change: 25.5%. These are planner/resource-count results. They must not be presented as physical GPU-memory savings until tested on a real GPU implementation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R221.gpu-intermediate-lifetime-planning.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R221.gpu-intermediate-lifetime-planning.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R214-R222-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R221.gpu-intermediate-lifetime-planning.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R221.gpu-intermediate-lifetime-planning.md)
- [results/top100/audits/R221.json](../../../results/top100/audits/R221.json)
