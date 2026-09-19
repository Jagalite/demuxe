<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Treat intentionally disabled tracks as removable work

Full identity: `R013.treat-intentionally-disabled-tracks-as-removable-work`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE_DESIGN** (full-completion).

Explicit disabled-track intent has a concrete owner gap: current Native audio=no only mutes, while negative remux selection means automatic. Selected-track metadata experiment establishes packet-preserving exclusion is feasible, but no no-audio remux sentinel was implemented. Worth a separate explicit disable/re-enable contract; ordinary mute must keep audio prepared.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Routing · New policy hypothesis · P1 · Risk: Medium First environment: Demuxe source + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. When the application explicitly disables audio or enters a declared audio-only mode, evaluate a plan that never decodes/transcodes the unused track. Retain source-scoped identities and a bounded resume strategy for re-enabling it. Source basis. mpv exposes track selection, and MSE distinguishes active tracks. Neither ordinary volume zero nor merely hiding the video element proves that decode work stops. [V1, M1] First agent experiment. Compare audio disabled versus merely muted on a Native-blocking audio source. Separately test declared audio-only playback and return to video at a random-access point. Trace actual packet/decoder/encoder activity.

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
| decision | passed | Historical decision imported verbatim: PURSUE_DESIGN. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R013.treat-intentionally-disabled-tracks-as-removable-work.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R013.treat-intentionally-disabled-tracks-as-removable-work.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R013.treat-intentionally-disabled-tracks-as-removable-work.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R013.treat-intentionally-disabled-tracks-as-removable-work.md)
- [results/full-completion/r59/identity.json](../../../results/full-completion/r59/identity.json)
- [results/full-completion/r59/result.json](../../../results/full-completion/r59/result.json)
