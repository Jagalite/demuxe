<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Animated-image disposal checkpoints

Full identity: `R322.animated-image-disposal-checkpoints.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Current retained state contains video frames and generations, not an animated-image compositor with disposal transactions. A checkpoint must capture post-disposal canvas state; historical controlled commands do not parse real GIF palettes/interlace/transparency.

Next action: Define one tiny real disposal fixture and reference compositor, checkpoint after prior disposal and compare random seeks, with restore-to-previous incorrectly timed as adverse control.

## Definition and contract

The controlled compositor exercised GIF-style keep, restore-to-background, and restore-to-previous semantics over 120 frames. Checkpoints store the canvas after prior disposal and before the checkpoint frame. Random seeks from those states reproduced the uninterrupted oracle exactly. The workload reduced frame compositions from 23,361 to 2,171, at a retained-state cost of 294,912 bytes. This proves the state-checkpoint concept; parsing palettes, transparency, interlace, timing, and malformed real GIF streams remain separate qualification.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R322.animated-image-disposal-checkpoints.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R322.animated-image-disposal-checkpoints.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R318-R323-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R322.animated-image-disposal-checkpoints.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/audits/R322.animated-image-disposal-checkpoints.report-continuity.md)
