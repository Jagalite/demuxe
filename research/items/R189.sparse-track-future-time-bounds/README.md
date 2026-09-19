<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# sparse-track future-time bounds

Full identity: `R189.sparse-track-future-time-bounds`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (top100).

Scoped mux selects only video and audio. No selected sparse metadata track is present to create the source model bottleneck; implementing sparse-frontier machinery here has no current opportunity.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

The mux model contains continuous 30 fps video, 20 ms audio, and sparse timed metadata at 45 and 90 seconds. Before the sparse parser has materialized its next packet: - strict interleave can prove 0 dense packets safe; - a 10-second max-delta-style escape can emit 800 packets; - a validated source-index statement that the next sparse DTS is >=45 s safely emits 3,600 packets, through 44.98 s. The bound-aware output is an exact prefix of the final canonical mux order. A deliberately false >=60 s bound crosses the real 45-second event and fails the prefix oracle. The key requirement is epistemic, not timeout-based: the bound must come from a validated source/sample index, be scoped to the source/timeline epoch, and be invalidated on seeks/discontinuities.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R189.sparse-track-future-time-bounds.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R189.sparse-track-future-time-bounds.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R183-R192-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R189.sparse-track-future-time-bounds.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R189.sparse-track-future-time-bounds.md)
- [results/top100/audits/R189.json](../../../results/top100/audits/R189.json)
