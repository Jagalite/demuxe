<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# one SourceBuffer, different codec and container

Full identity: `R138.one-sourcebuffer-different-codec-and-container.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Reconciled completed prior evidence: Rendered pictures and selected audio survive a codec/container transition through one SourceBuffer; useful explicit continuity capability, without claiming gapless or application integration.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

A single SourceBuffer began as video/mp4; codecs="avc1.64001e", buffered H.264/fMP4 through ~1.067 s, then called changeType() to VP9/WebM, set timestampOffset=1, and appended WebM initialization/media bytes. The final buffered range was 0.066666–4.000 s, with no exception or video error. This is more than codec switching: the parser also crossed ISO BMFF → WebM inside one MSE presentation.

Output contract: Actual output identity and timeline, surviving consumers, committed generations and cleanup; candidate execution must be visible.

Primary metric: User-visible operation latency, duplicated work or peak/steady live resource ownership; not object counts alone.

Adverse control: Cancel or replace a source at the changed boundary and delay a stale callback/consumer; reject late publication and premature reuse.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root/audits/R138.one-sourcebuffer-different-codec-and-container.report-continuity.md)
- [results/full-completion/continuity/result.json](../../../results/full-completion/continuity/result.json)
