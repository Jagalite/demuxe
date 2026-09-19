<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Probe a real six-channel Native FLAC destination

Full identity: `R057.probe-a-real-six-channel-native-flac-destination`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Direct and MSE FLAC preserve six independently identified channels at the Web Audio boundary; intentional stereo downmix fails the same matrix oracle. Native adaptation work is worth pursuing without assuming physical speaker support.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

New output-profile feasibility study · P1 · PROPOSED / NOT TESTED Extends: R15, R51. Reference primitives: S5, E1. Question. Can the browser preserve six distinct audio channels internally, providing evidence for a future multichannel lossless-adaptation destination? Mechanism. Package known 5.1 integer PCM as FLAC beside copied H.264. Inspect the media-element audio output before the final device mix using six channel-analysis paths. This is a destination gate, not a claim about physical surround speakers. Smallest useful experiment. Generate a finite 48 kHz 16/24-bit 5.1 fixture with a different signal per declared channel, including a separate LFE marker. Verify host FLAC decode-back, then test direct and MSE playback, seeking and EOF. Compare against an intentional stereo-downmix negative control.

Output contract: Configuration and ordered codec payloads where copy is intended; requested frames/audio/timeline/features at the declared output boundary.

Primary metric: Correct additional admitted source/destination capability; otherwise full startup and CPU/resource cost.

Adverse control: Alter one admission-critical configuration, remove a required dependency, or preserve video while making selected audio unsupported. Candidate must reject or use a declared fallback.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R057.probe-a-real-six-channel-native-flac-destination.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R057.probe-a-real-six-channel-native-flac-destination.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R43_R57_Experiment_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R057.probe-a-real-six-channel-native-flac-destination.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_a/audits/R057.probe-a-real-six-channel-native-flac-destination.md)
- [results/full-completion/r57/result.json](../../../results/full-completion/r57/result.json)
