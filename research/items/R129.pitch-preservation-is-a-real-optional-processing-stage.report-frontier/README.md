<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# pitch preservation is a real optional processing stage

Full identity: `R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

The rate control does not expose changed-pitch permission. Disabling pitch preservation changes audible output; overlapping historical CPU samples cannot justify silently changing that contract.

Next action: With explicit pitch-shift semantics, compare pitch-preserving and non-preserving playback on one marked tone and include 1x control before cost measurements.

## Definition and contract

At 2× playback, the Web Audio analyser observed ~441.43 Hz with pitch preservation enabled and ~882.86 Hz with it disabled. That matches HTML's specified semantics. A small audio-only aggregate Chromium-process screen produced median CPU of 0.080 s with pitch preservation and 0.070 s without it over ~2 s runs (apparent reduction ~12.5%). These samples overlap, CPU accounting is coarse at 10 ms increments, and no physical audio-device path was measured, so this is not a qualified performance win. It is a plausible optional-cost removal when changed pitch is explicitly acceptable.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R129.pitch-preservation-is-a-real-optional-processing-stage.report-frontier.md)
