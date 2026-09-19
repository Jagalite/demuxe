<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep frame-adaptive analysis and rendering on one GPU timeline

Full identity: `R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The inspected player presenter has no current-frame histogram/percentile/LUT CPU feedback round trip. It directly converts/samples video and renders overlays. Adding a requested contrast effect would be new functionality, not removal of a present synchronization bottleneck in this profile.

Next action: Reopen for an actual requested adaptive-contrast pipeline with a measured CPU round trip; verify histogram/threshold/LUT/output for the same frame and reject stale frame-N-minus-1 statistics.

## Definition and contract

Proposed path: owned input plane -> GPU histogram -> GPU percentile selection -> GPU integer lookup-table generation -> render using that same frame's table. Keep optional UI telemetry off the current frame's critical path. Compare the existing mixed CPU/GPU path, optimized CPU analysis, and the GPU-resident candidate. Start with synthetic owned integer planes, then integrate an already-qualified decoded-frame extraction path while holding that extraction constant across variants. Require exact histogram bins, selected thresholds, generated LUT values, and final integer samples against an independent CPU oracle. Begin with frame sizes whose counts and all integer intermediates are proven to fit their representations; other sizes require rejection or a qualified wider construction.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R358_R362_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R361.keep-frame-adaptive-analysis-and-rendering-on-one-gpu-timeline.md)
