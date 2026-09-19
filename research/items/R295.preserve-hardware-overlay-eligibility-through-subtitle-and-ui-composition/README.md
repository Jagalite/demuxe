<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Preserve hardware-overlay eligibility through subtitle and UI composition

Full identity: `R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition`. Reused R-numbers are separate mechanisms.

Current imported decision: **HOLD_ENV** (top100).

Current headless Chrome can exercise browser APIs but supplies no physical display overlay promotion, compositor scanout or refresh-cadence evidence. Physical fixed-display diagnostic run remains required; this is not an experimental negative.

Next action: Identify the CPU/GPU representation boundary and actual useful work removed. Check existing renderer fusions, caches, kernel fast paths and hardware gates.

## Definition and contract

Type: Presentation/energy experiment. First owner: Local hardware/browser laboratory. Related: R19, R21, R23; not another subtitle decoder. Hypothesis. Two interfaces that display the same video, subtitles, and controls may cause the browser to choose different composition paths. Test whether an equivalent layer arrangement can keep the video eligible for a platform video overlay rather than forcing additional general-purpose composition. Source basis. Chromium separates overlay candidates from content requiring ordinary composition, and does so through platform-specific implementations. Its candidate construction checks such properties as transform support, clipping, mask filters, and backdrop filters. Those are implementation observations, not a portable promise that one CSS rule always enables or disables overlays. [S1, S2]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R295_R300_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition.md)
- [results/top100/environment.json](../../../results/top100/environment.json)
