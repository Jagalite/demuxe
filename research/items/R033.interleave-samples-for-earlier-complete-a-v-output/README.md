<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Interleave samples for earlier complete A/V output

Full identity: `R033.interleave-samples-for-earlier-complete-a-v-output`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Related report explicitly records frag_interleave=1,2,4 losing AAC packets/tail and no earlier joint A/V; current code deliberately omits this option. Stop the reported settings/profile rather than repeat a known equivalence failure. This is a source-reconciled historical negative, not a new local experiment.

Next action: Reopen only for a materially different pinned-FFmpeg construction that first proves all AAC packet/sample counts, tail and PTS/DTS identical; then compare live joint A/V release. Do not rerun the same failed settings as if untouched.

## Definition and contract

Follow-on optimization · P1 · extends R04 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. Keep the proven fragment duration and GOP structure, but change where audio/video samples appear inside each fragment so partial delivery becomes useful for both tracks earlier. New question versus prior work. R04 established early buffered video from partial bytes. It did not prove early complete audiovisual startup. This targets sample ordering, not shorter fragments or different codec output. Source primitive. FFmpeg documents frag_interleave as an intra-fragment sample-grouping control with an overhead tradeoff. [S6] Why testable here. Host FFmpeg exposes the mux controls; prebuilt and live-pipe output can be inspected without compiling Demuxe.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R033.interleave-samples-for-earlier-complete-a-v-output.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R033.interleave-samples-for-earlier-complete-a-v-output.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/RESULTS_R31_R42.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R033.interleave-samples-for-earlier-complete-a-v-output.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R033.interleave-samples-for-earlier-complete-a-v-output.md)
