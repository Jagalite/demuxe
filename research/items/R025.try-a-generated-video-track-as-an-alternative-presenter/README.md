<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Try a generated video track as an alternative presenter

Full identity: `R025.try-a-generated-video-track-as-an-alternative-presenter`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

The current legacy generated-track sink accepts three delayed writes and presents red/green/blue in order, with clean close. No replacement advantage over existing canvas presentation or complete A/V clock was demonstrated. Keep as a destination-specific option only if a MediaStream consumer is required.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Frontier · New experimental sink hypothesis · P3 · Risk: High First environment: Feature-qualified browser; integration later. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Feed already-decoded frames into a generated video MediaStreamTrack and display it through a media element. Initially use video-only output to isolate presentation behavior; later assess an mpv-timed A/V adapter only if justified. Source basis. The insertable-media draft defines VideoTrackGenerator and automatic frame closure on write. It explicitly lacks consensus on an equivalent audio-generator API; browser interfaces/exposure can differ. [T1] First agent experiment. Compare frame order, scheduling, latency and copies with the retained canvas presenter. Test pause/seek by controlling upstream delivery. Establish whether the sink follows timestamps or live arrival behavior.

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
| decision | passed | Historical decision imported verbatim: STOP_PROFILE. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R025.try-a-generated-video-track-as-an-alternative-presenter.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R025.try-a-generated-video-track-as-an-alternative-presenter.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/api-gates.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/api-gates.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R025.try-a-generated-video-track-as-an-alternative-presenter.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_e/audits/R025.try-a-generated-video-track-as-an-alternative-presenter.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_h/active-owner-reconciliation.md)
- [results/full-completion/frame-boundaries/result.json](../../../results/full-completion/frame-boundaries/result.json)
