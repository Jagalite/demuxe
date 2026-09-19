<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Sparse native video with explicit long frame holds

Full identity: `R096.sparse-native-video-with-explicit-long-frame-holds`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Sparse long-held pictures are valid for an explicitly static authored timeline; ordinary source playback cannot drop changing/dependent pictures. Current direct route can already attempt prepared sparse files, so a new runtime mechanism is not justified for general playback.

Next action: For a slide/static-source product request, compare three long-duration pictures plus continuous audio to the same timeline encoded conventionally, including final-hold seek.

## Definition and contract

Question. How little coded video and scheduling work can represent a long static audiovisual presentation? What differs from earlier work. Distinct from R72 keyframe preview extraction: a complete continuous media timeline with intentionally sparse picture changes. Input scope. Prepared slides, screen changes or other intentionally static intervals, plus optional continuous audio. Mechanism to test. Encode only actual visual changes and assign explicit sample durations for each hold instead of representing the hold as repeated decoded pictures. Smallest experiment. 1. Create a one-minute presentation with a few clearly labeled picture changes. 2. Compare long-duration video samples against a conventional repeated-frame encode and a JS image-timeline reference. 3. Seek within a hold, across changes, and into the final hold with and without continuous audio.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R096.sparse-native-video-with-explicit-long-frame-holds.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R096.sparse-native-video-with-explicit-long-frame-holds.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/R88-R101-research-backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R096.sparse-native-video-with-explicit-long-frame-holds.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R096.sparse-native-video-with-explicit-long-frame-holds.md)
