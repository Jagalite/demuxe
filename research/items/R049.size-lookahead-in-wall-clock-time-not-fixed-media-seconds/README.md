<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Size lookahead in wall-clock time, not fixed media seconds

Full identity: `R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: At 0.5x startup, peak buffered media changed 5.503999s to 3.007999s, fetched bytes 2359296 to 1572864. Actual 4x after seek is explicitly asserted; frame progress, source replacement rejection and worker cleanup pass. Worth a bounded rate-aware preparation policy; no generalized high-speed improvement claimed.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

New buffer-policy experiment · P1 · PROPOSED / NOT TESTED Extends: R26, R34, R39. Reference primitives: S1, S4, L3. Question. Can rate-aware buffer targets reduce starvation at fast playback and wasted preparation at slow playback? Mechanism. Set a positive-rate media target from a bounded wall-time reserve: media seconds ≈ playbackRate × desired wall seconds. Apply hard byte caps and hysteresis, and use the shortest contiguous usable track horizon. Keep the initial-play threshold separate. Smallest useful experiment. Replay deterministic byte-release traces at 0.5×, 1×, 2× and 4×, including abrupt changes and pause/resume. Compare a fixed-media target with the new controller using identical source availability and memory caps. Charge any extra production after the viewer stops.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds.md)
- [results/full-completion/remux-policies/result.json](../../../results/full-completion/remux-policies/result.json)
