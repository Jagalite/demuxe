<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Map repeated clip boundaries in integer media ticks

Full identity: `R056.map-repeated-clip-boundaries-in-integer-media-ticks`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current queue activates independent sources after ended rather than accumulating rounded clip durations onto one timeline. No cumulative float-offset algorithm exists at this owner; the historical arithmetic report also rejects a contrived rounded baseline.

Next action: If continuous composition is added, retain rational source timestamps and compare late joins directly against exact sample counts.

## Definition and contract

New timeline precision experiment · P2 · PROPOSED / NOT TESTED Extends: R36, R45. Reference primitives: S1, S8, S9, L3. Question. Can queue/loop mapping avoid cumulative rounding gaps without changing any encoded sample or the intended duration of an item? Mechanism. Derive boundaries from rational track timestamps and exact sample counts. Keep integer/rational arithmetic until converting once at the browser API boundary, rather than accumulating rounded display-time durations. Smallest useful experiment. First inspect the current R36 mapping. If it already preserves rational timing, do not duplicate it. Otherwise use short 30000/1001-fps clips with 44.1 kHz audio, non-integer item lengths and known priming. Compare many mapped boundaries and seek directly to late joins instead of playing hours.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R056.map-repeated-clip-boundaries-in-integer-media-ticks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R056.map-repeated-clip-boundaries-in-integer-media-ticks.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R056.map-repeated-clip-boundaries-in-integer-media-ticks.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R056.map-repeated-clip-boundaries-in-integer-media-ticks.md)
