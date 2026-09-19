<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recall stored AV1 pictures with coded display instructions

Full identity: `R106.recall-stored-av1-pictures-with-coded-display-instructions`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The decoder bridge consumes complete encoded units and does not author AV1 reference dictionaries. Historical alt-ref overlays prove decoder support but did not build the proposed dictionary and were larger than the control.

Next action: Author one explicit A/B/A/C schedule with legal showable reference slots and compare to a normal reference-aware encode; reject missing/overwritten slots.

## Definition and contract

Type: Prepared temporal representation. Priority: P2. Question. Can a small repeating image sequence use little new coded picture data when revisiting earlier pictures? What differs from earlier work. R96 held a picture for a long duration; R85 cached decoded frames in application memory. This explores nonconsecutive reuse through the codec reference-picture mechanism itself. Mechanism. Prepare valid showable non-key reference pictures, preserve their slots, and author temporal units using show_existing_frame to display them later. Initial source profile. Tiny fixed-geometry AV1 sequence with a bounded dictionary and explicit reset/random-access epochs; no film grain initially. Source basis. AV1 defines stored-picture output, reference validity and showability. A stored KEY_FRAME has a specific one-use rule for this mechanism, so blindly reusing AVIF keyframes is not valid. [S5]

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R106.recall-stored-av1-pictures-with-coded-display-instructions.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R106.recall-stored-av1-pictures-with-coded-display-instructions.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R102-R115-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R106.recall-stored-av1-pictures-with-coded-display-instructions.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R106.recall-stored-av1-pictures-with-coded-display-instructions.md)
