<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Replace polling chains with bounded credits and deadlines

Full identity: `R026.replace-polling-chains-with-bounded-credits-and-deadlines`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Paused pump callbacks changed from 24 to 1 over the same 1.2s observation. Event wakes resume playback/seek, changed source rejects, and cleanup passes. Worth integrating this one-owner timer policy behind lifecycle checks, not replacing every scheduler.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Scheduling · New optimization hypothesis · P1 · Risk: Medium First environment: Demuxe source + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Coordinate source, mux, decoder and presenter through bounded credits, high/low watermarks and deadline wakeups. Coalesce diagnostics separately. Distinguish intentional backpressure from an actually blocked decoder. Source basis. Streams provides backpressure; WebCodecs exposes decode queues and output lifecycle. Chrome worklet guidance keeps heavy processing away from the audio callback. [S1, W1, A2] First agent experiment. Count wakeups/messages while paused, buffered, playing and under delayed output. Replace one redundant timer boundary at a time. Verify cancellation always wakes waiters and codec reordering cannot be mistaken for a deadlock.

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
| decision | passed | Historical decision imported verbatim: PURSUE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R026.replace-polling-chains-with-bounded-credits-and-deadlines.md)
- [results/full-completion/remux-policies/result.json](../../../results/full-completion/remux-policies/result.json)
