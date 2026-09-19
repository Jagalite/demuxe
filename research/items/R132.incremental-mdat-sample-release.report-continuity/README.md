<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# incremental mdat sample release

Full identity: `R132.incremental-mdat-sample-release.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Worker emits complete rm_step batches; FFmpeg writes custom fragments after accumulated timing. Early mdat delivery requires truthful metadata before remaining payload, not merely splitting already buffered output. No streaming mux boundary is exposed.

Next action: First expose a bounded moof/header-plus-complete-sample production interface; withhold remaining mdat and verify actual early A/V, then truncate one sample to disprove false readiness.

## Definition and contract

Question. Can Chrome's MSE parser release complete coded samples before the entire enclosing mdat or movie fragment is present? The test appended the fMP4 initialization segment, the first moof, the mdat header, and only ~70 KiB of the first 2-second media payload. The rest of the mdat was deliberately withheld. Before the tail arrived, SourceBuffer.buffered already covered 0.066666–0.799999 s and requestVideoFrameCallback reported twelve presented frames from 0.066666 through 0.433333 s. readyState was 4 and playback had advanced to ~0.448 s. Appending the remainder extended the same range to 2.066666 s and playback continued without a media error. Implication. Demuxe does not necessarily need to materialize a complete fMP4 fragment before starting an MSE append. A streaming muxer can potentially emit fragment metadata and coded sample bytes incrementally, bounded by complete-sample availability.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R132.incremental-mdat-sample-release.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R132.incremental-mdat-sample-release.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R132.incremental-mdat-sample-release.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R132.incremental-mdat-sample-release.report-continuity.md)
