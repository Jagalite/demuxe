<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# configuration-interval seek

Full identity: `R262.configuration-interval-seek`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Explicit source-bound SPS/RAP intervals decode all96 authored pictures exactly through browser configuration change; indexed second interval matches48 pictures/timestamps, dependent cold start rejects. Container indexing and source replacement integration remain later.

Next action: Trace actual input representation, requested tracks/features, current accepted plan and the decoder boundary. Check whether this adapter or destination is already used.

## Definition and contract

Two independently authored Annex-B H.264 segments were concatenated: 3 s at 320×180 followed by 3 s at 640×360, both with repeated headers and 1 s keyframe cadence. The index records SPS configuration intervals and starts the second interval at its SPS/RAP boundary. Result. FFprobe on the full stream observes the resolution switch at frame 90 and the first 640×360 frame is a keyframe. The indexed second interval begins exactly at the second authored stream boundary (280,871 bytes) and is byte-identical to that authored stream. Frame 30 from the indexed interval is pixel-identical to frame 30 decoded from the authored second segment (dc278b9cdc52751edf076f9bf98e3815705e8c39081739c9e3a31670fa1fd11f). Starting at a non-RAP slice emits missing PPS/dependency errors, proving the entry/preroll requirement matters.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R262.configuration-interval-seek.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R262.configuration-interval-seek.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R261-R267-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R262.configuration-interval-seek.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R262.configuration-interval-seek.md)
- [results/top100/configuration/input.json](../../../results/top100/configuration/input.json)
- [results/top100/configuration/result.json](../../../results/top100/configuration/result.json)
