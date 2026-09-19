<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# deadline slack before optimization

Full identity: `R267.deadline-slack-before-optimization`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_DIAGNOSTICS** (full-completion).

Policy probes separate fetched bytes, request counts, paused wakeups and buffer depth, preventing a request-count reduction from masquerading as a CPU/latency win. Stage-specific deadline slack is still absent. Worth adding bounded observation before further batching optimization; no injected stage-delay experiment or proven missed deadline claimed.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

A deterministic three-stage media pipeline model assigns explicit source-read, processing, and append boundaries before each presentation deadline. One middle segment receives a controlled delay at one stage at a time; binary search finds the last delay that does not miss a presentation deadline. Result. Measured safe slack is ~270 ms at read, ~138 ms at process, and ~37 ms at append. The method identifies append as the tightest stage; pushing append past that threshold produces a miss while baseline does not. Boundary. This validates the measurement method, not Demuxe's real scheduler. Production qualification requires real timestamps for read/demux/transform/append/presentation, queue depth, browser scheduling, and playback deadlines.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| performance | pending | Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Historical decision imported verbatim: PURSUE_DIAGNOSTICS. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R267.deadline-slack-before-optimization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R267.deadline-slack-before-optimization.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R267.deadline-slack-before-optimization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R267.deadline-slack-before-optimization.md)
- [results/full-completion/remux-policies/result.json](../../../results/full-completion/remux-policies/result.json)
