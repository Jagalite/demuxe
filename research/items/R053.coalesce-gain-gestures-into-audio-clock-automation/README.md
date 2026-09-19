<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Coalesce gain gestures into audio-clock automation

Full identity: `R053.coalesce-gain-gestures-into-audio-clock-automation`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_OPTIONAL_QUALITY** (full-completion).

A requested10ms gain ramp reaches identical final gain and reduces abrupt sample step from0.25 to0.00052084 in the real Web Audio renderer. Pursue as optional transition quality, not CPU optimization or unchanged instantaneous semantics.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

New audio-control quality experiment · P2 · PROPOSED / NOT TESTED Extends: R26, R35. Reference primitives: S5, L3. Question. Can rapid volume/gain gestures avoid abrupt sample discontinuities and excessive main-thread updates while keeping the Native audio route? Mechanism. Use the existing single GainNode with a short explicitly specified ramp for ordinary gain gestures. Schedule in AudioContext time and replace pending ramps coherently. This changes the gain-transition contract, not the underlying audio codec. Smallest useful experiment. Compare direct steps and 3–10 ms ramps on a deterministic tone during a dense gesture burst and simulated main-thread delay. Use an OfflineAudioContext for a reference waveform if available, then validate the existing media-element graph separately. Test cancellation, zero/unity and pause/resume.

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
| decision | passed | Historical decision imported verbatim: PURSUE_OPTIONAL_QUALITY. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R053.coalesce-gain-gestures-into-audio-clock-automation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R053.coalesce-gain-gestures-into-audio-clock-automation.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R053.coalesce-gain-gestures-into-audio-clock-automation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R053.coalesce-gain-gestures-into-audio-clock-automation.md)
- [results/full-completion/audio-components/result.json](../../../results/full-completion/audio-components/result.json)
