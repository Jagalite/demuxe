<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MPEG-TS track elimination with payload preservation

Full identity: `R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Explicit program202 TS packet filter keeps selected elementary/PCR/PMT PIDs and rewrites PAT with valid CRC. Reversed PAT order produces identical selected payload/timing. Unchanged RemuxPlayer plays/seeks output, complete host decoded pixels/PCM exact. Missing program rejects; dynamic PSI/scrambled transport outside scope.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

The source transport contains one H.264 stream and two AAC tracks. Rebuilding the TS with only video + first audio preserves all 150 video packet payload hashes and all 236 selected-audio payload hashes. The unused 236 AAC packets are absent. Transport size falls from 345,920 to 281,248 bytes, a 18.7% reduction. This validates a payload-preserving track-pruning route; the TS container itself must still be rebuilt because PAT/PMT/PID/PCR/continuity semantics belong to the output transport.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R223-R231-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R229.mpeg-ts-track-elimination-with-payload-preservation.report-continuity.md)
- [results/top100/program/browser-result.json](../../../results/top100/program/browser-result.json)
- [results/top100/program/result.json](../../../results/top100/program/result.json)
