<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# complete-sample versus arbitrary byte boundary

Full identity: `R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

For this actual A/V fMP4, neither complete first video sample nor 37-byte-truncated cut exposes a buffered range or early frame; both complete correctly after remaining data arrives. A complete video sample alone is insufficient for early muxed A/V output. No partial-delivery optimization justified on this fixture.

Next action: Find where bytes/timestamps actually change, are copied, or are withheld. Compare against current persistent mux/parser behavior.

## Definition and contract

A 2-second fragment was cut once exactly after the first H.264 sample and once 37 bytes before that point. - Complete-sample cut: buffered 0.066666–0.099999 s. - Truncated-sample cut: no buffered range. - Neither case emitted a frame callback within 350 ms; both remained parser-clean with no media error. This is useful because it separates two facts: Chrome can account for a complete compressed sample before the enclosing mdat completes, but one sample may still be insufficient to present a picture because of decode/reorder dependencies or presentation readiness.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R134.complete-sample-versus-arbitrary-byte-boundary.report-continuity.md)
- [results/full-completion/webm-boundaries/result.json](../../../results/full-completion/webm-boundaries/result.json)
