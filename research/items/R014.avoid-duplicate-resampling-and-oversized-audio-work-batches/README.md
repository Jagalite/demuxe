<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Avoid duplicate resampling and oversized audio work batches

Full identity: `R014.avoid-duplicate-resampling-and-oversized-audio-work-batches`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Current AO explicitly negotiates browser context rate and fixed ring transport; no duplicate resampling stage or oversized-work regression was identified in these owners. Retain required source-to-context conversion and current batching. Reopen only with a rate/occupancy trace demonstrating avoidable conversion or retained work; physical device conversion remains unobserved.

Next action: Write the exact requested signal operation, codec tool constraints, state and rounding contract. Check whether an optimized existing library already performs it.

## Definition and contract

Audio · New optimization hypothesis · P1 · Risk: Medium First environment: Matching mpv audio path + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Account for source, mpv-filter, AudioContext and device-side rates as separate stages. Compare output policies that eliminate redundant intermediate conversion and tune bounded PCM batches to playback rather than per-packet message timing. Source basis. mpv documents insertion of swresample when its selected output rate differs from media. Web Audio has context-rate processing; Chrome’s worklet guidance separates compute workers from real-time output. [V1, A1, A2] First agent experiment. Trace the actual rate/layout at every accessible stage for 44.1 and 48 kHz files. Compare existing buffering against a small set of PCM batch sizes under seek, rate change and simulated worker delay.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R014.avoid-duplicate-resampling-and-oversized-audio-work-batches.md)

## Ecosystem follow-up EB11

Evaluated at `20260922T131542Z-ecosystem-evaluation`: **no_new_work_current_scope**. [Assessment](evidence/20260922T131542Z-ecosystem-evaluation/evaluation.json) · [Shared report](../../shared/runs/20260922T131542Z-ecosystem-evaluation/REPORT.md).

The AO rejects writes beyond a fixed ring capacity, reports free/queued samples, negotiates context sample rate and separates pause from consumption. Current tests exercise variable output quantum and empty input. No new oversized batch or duplicate-resample workload is established.

Next gate / reopening condition: Keep the existing stop. Reopen with a pre-gesture producer/occupancy trace or measured callback deadline miss; do not infer callback timing from Node execution.

This scoped supplement does not broaden earlier correctness or performance qualification.
