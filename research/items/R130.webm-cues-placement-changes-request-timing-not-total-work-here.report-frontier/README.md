<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# WebM Cues placement changes request timing, not total work here

Full identity: `R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

RangeReader already exposes byte-aligned cache requests; no Cues relocating/virtual byte-view writer exists. Historical near-equal totals only support request-shaping hypothesis, not a local byte-saving result.

Next action: Before building relocation, inspect current request timing for a real target; only if startup-versus-seek latency tradeoff matters compare front/tail Cues with unchanged cluster payloads and stale-offset control.

## Definition and contract

Under a local server that caps each HTTP Range response at 256 KiB: Tail Cues caused a small 1,519-byte tail fetch during metadata and more bytes at seek time; front Cues pulled more early and less later. Total traffic differs by only 0.19%. This looks like a latency/request-shaping policy rather than a byte-saving optimization in this workload.

Output contract: Source/version identity, requested exact sample/frame, dependency coverage and byte-range accounting.

Primary metric: Total bytes and time to correct startup/target, including cold index/identity acquisition; bounded retained bytes.

Adverse control: Change the source/version or corrupt an offset/proof and cancel one consumer. No stale or unverified bytes may be published.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R130.webm-cues-placement-changes-request-timing-not-total-work-here.report-frontier.md)
