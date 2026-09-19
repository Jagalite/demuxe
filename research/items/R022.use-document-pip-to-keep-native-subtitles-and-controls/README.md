<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Use Document PiP to keep Native subtitles and controls

Full identity: `R022.use-document-pip-to-keep-native-subtitles-and-controls`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The intended ASS-bearing owner lacks its compiled subtitle runtime locally. The component also binds document listeners while player disconnection destroys its owner, so generic popup success would not validate the requested move. Defer the owner-transfer/restore test until that shared subtitle setup exists; no negative Document PiP API verdict.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Presentation · New destination-plan hypothesis · P1 · Risk: Medium First environment: Browser-only. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Where supported, move the existing player container—video, overlay and controls—into a Document Picture-in-Picture window instead of burning subtitles into video or replacing the playback engine. Source basis. Chrome documents Document PiP for arbitrary document content. Demuxe’s existing overlay disables video-only PiP because its separate canvas cannot accompany that destination. [P1, D2] First agent experiment. Enter/exit with ASS, gain, paused state and worker MSE if available. Test user activation, close/restore, resize, focus, source replacement and destruction. Check cross-document event listeners and coordinate calculations.

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
| decision | passed | Historical decision imported verbatim: DEFER_SETUP. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R022.use-document-pip-to-keep-native-subtitles-and-controls.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R022.use-document-pip-to-keep-native-subtitles-and-controls.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R022.use-document-pip-to-keep-native-subtitles-and-controls.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R022.use-document-pip-to-keep-native-subtitles-and-controls.md)
- [results/full-completion/r21/result.json](../../../results/full-completion/r21/result.json)
