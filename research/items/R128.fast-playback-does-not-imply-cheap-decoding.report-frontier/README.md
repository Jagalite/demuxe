<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# fast playback does not imply cheap decoding

Full identity: `R128.fast-playback-does-not-imply-cheap-decoding.report-frontier`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The maintained rate setter changes playbackRate only. The supplied report shows every source frame decoded at faster rates, decisively rejecting faster playback itself as a dependable decode-work saving.

Next action: If lower cadence is explicitly requested, compare dependency-valid thinning against the same playback rate, counting decoded frames and retained output identities.

## Definition and contract

Chrome decoded all 300 frames at every rate. At 16× it presented very few callbacks and counted 277 dropped frames. Therefore a prepared dependency-valid temporal-thinning route remains meaningfully different from simply setting playbackRate high.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R128.fast-playback-does-not-imply-cheap-decoding.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R128.fast-playback-does-not-imply-cheap-decoding.report-frontier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R128.fast-playback-does-not-imply-cheap-decoding.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R128.fast-playback-does-not-imply-cheap-decoding.report-frontier.md)
