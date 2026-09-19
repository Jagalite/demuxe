<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# continuous playback through H.264/fMP4 → VP9/WebM

Full identity: `R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Every start recreates MediaSource and packet processing rejects changed extradata. changeType support alone does not supply a source-queue timeline, two codec epochs or rollback transaction.

Next action: Define a two-asset mapping/commit boundary and test exactly one H264-to-VP9 changeType join with numbered frames; failed second init must preserve old source ownership, not relabel payloads.

## Definition and contract

The stronger follow-up put two H.264 fragments first, switched the same SourceBuffer to VP9/WebM at a 2-second offset, appended the VP9 media, ended the MediaSource, and played continuously. Frame callbacks cover H.264 through 1.900 s, then VP9 begins at 2.000 s and continues through 4.967 s. The element reached ended=true at 5.000 s with no exception or media error. Implication. A Demuxe route need not necessarily tear down the MediaSource or video element when a playlist/asset boundary changes codec/container, provided the exact browser/codecs admit changeType() and the application authors a valid continuous timeline.

Output contract: Independent parsing of sample payload, configuration, PTS/DTS/duration and required output; valid container plus continuing playback when this is the tested claim.

Primary metric: Complete preparation/startup/refill work, bytes and ownership; output parser acceptance alone is not the metric.

Adverse control: Wrong size/offset/configuration or a non-random-access cut must fail specifically; cancellation cannot publish another generation.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R139.continuous-playback-through-h-264-fmp4-vp9-webm.report-continuity.md)
