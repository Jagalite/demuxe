<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep decoded video on the native overlay/display path

Full identity: `R101.keep-decoded-video-on-the-native-overlay-display-path`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_ENV** (top100).

Current headless Chrome can exercise browser APIs but supplies no physical display overlay promotion, compositor scanout or refresh-cadence evidence. Physical fixed-display diagnostic run remains required; this is not an experimental negative.

Next action: Identify the CPU/GPU representation boundary and actual useful work removed. Check existing renderer fusions, caches, kernel fast paths and hardware gates.

## Definition and contract

Question. Which practical display compositions preserve the least expensive native surface path? What differs from earlier work. Distinct from R08 CPU filter avoidance: investigate postdecode surfaces, compositor copies and hardware overlay eligibility. Input scope. Identical supported video and equivalent visible UI layouts on a recorded physical Chrome/GPU/display setup. Mechanism to test. Compare direct video presentation with equivalent composition arrangements, looking for decoder-surface-to-display routes that avoid unnecessary intermediate rendering. Smallest experiment. 1. Compare simple direct video, equivalent DOM overlays, transformed/occluded layouts and a canvas-routed control. 2. Use available browser traces and platform counters to establish actual paths rather than infer from CSS. 3. Repeat fullscreen/windowed and one multi-video case at equivalent visible content.

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
| decision | passed | Historical decision imported verbatim: HOLD_ENV. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R101.keep-decoded-video-on-the-native-overlay-display-path.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R101.keep-decoded-video-on-the-native-overlay-display-path.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R101.keep-decoded-video-on-the-native-overlay-display-path.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R101.keep-decoded-video-on-the-native-overlay-display-path.md)
- [results/top100/environment.json](../../../results/top100/environment.json)
