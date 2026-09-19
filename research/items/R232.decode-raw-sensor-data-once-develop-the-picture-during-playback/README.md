<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Decode RAW sensor data once; develop the picture during playback

Full identity: `R232.decode-raw-sensor-data-once-develop-the-picture-during-playback`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Presenter receives decoded YUV/RGB; there is no retained Bayer sensor plane, DNG metadata/profile parser or development recipe owner. Existing 601/709 shader is not RAW development.

Next action: Scope one RGGB R16 sensor-plane adapter with integer color oracle before UI adjustments; gray-as-RGB and unsupported CFA/layout must fail, counting upload/retention.

## Definition and contract

Retain supported Bayer sensor planes after unpacking and apply a specified GPU development recipe repeatedly for requested exposure/white-balance views. Verify sensor samples exactly and declared demosaicing/color numerics independently.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R232.decode-raw-sensor-data-once-develop-the-picture-during-playback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R232.decode-raw-sensor-data-once-develop-the-picture-during-playback.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/conversation/PROPOSAL_SCOPE_EXTRACTS.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R232-R238-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R232-R238-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R232.decode-raw-sensor-data-once-develop-the-picture-during-playback.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R232.decode-raw-sensor-data-once-develop-the-picture-during-playback.md)
