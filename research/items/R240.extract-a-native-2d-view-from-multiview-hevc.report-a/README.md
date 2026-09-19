<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Extract a native 2D view from multiview HEVC

Full identity: `R240.extract-a-native-2d-view-from-multiview-hevc.report-a`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The historical HEVC browser failure and x265 limitation are not transplanted to this machine: current secure WebCodecs HEVC configuration query succeeds. No marked-eye multiview fixture, view/dependency selector or stereo oracle is supplied to the maintained HEVC configuration bridge. Ordinary HEVC is not evidence of base-view extraction.

Next action: Acquire one conforming marked-eye MV-HEVC fixture and exact layer/dependency metadata, then validate a single requested 2D view and reconstructed configuration against the corresponding stereo-reference view before destination playback.

## Definition and contract

The first browser HEVC gate was executed with a locally generated ordinary Main-profile HEVC MP4. The file decoded successfully through host FFmpeg, but browser playback failed with DEMUXER_ERROR_NO_SUPPORTED_STREAMS and zero decoded frames. The installed x265 reported version 4.1+1-1d117be; its num-views parameter probe returned -1. No conforming marked-eye MV-HEVC fixture was available in this fresh container. Verdict: BLOCKED. The actual base-view extraction, eye identification, configuration reconstruction and stereo-reference comparison were not performed. A normal HEVC file was used only to test the destination, not relabeled as a successful MV-HEVC experiment.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R240.extract-a-native-2d-view-from-multiview-hevc.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R240.extract-a-native-2d-view-from-multiview-hevc.report-a.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R239-R246-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R240.extract-a-native-2d-view-from-multiview-hevc.report-a.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R240.extract-a-native-2d-view-from-multiview-hevc.report-a.md)
