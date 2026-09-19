<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Insert a freeze with an empty edit

Full identity: `R121.insert-a-freeze-with-an-empty-edit.report-frontier`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The current path preserves the source timeline; native mux sets use_editlist=0 and no requested freeze-edit authoring API exists. The recovered report demonstrates an altered timeline and continued frame work, not sparse decode. A bounded metadata edit authoring/validation slice is needed for that explicit capability.

Next action: For an explicitly requested freeze edit, construct one source-bound elst change while retaining mdat bytes and independently check held/resumed pictures and audio policy; do not treat the freeze as an unchanged-playback speedup.

## Definition and contract

A second edit-list construction maps the first source second, inserts a one-second empty edit, then maps the second source second. Chrome holds the previous red image through the middle interval and resumes green after 2 s. The mdat is unchanged and the file grows only by the two additional edit records. At 8× Chrome reported 88 total frames for the ~2.967 s presentation, so this should be understood as metadata-directed timeline behavior, not a sparse-decode mechanism.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R121.insert-a-freeze-with-an-empty-edit.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R121.insert-a-freeze-with-an-empty-edit.report-frontier.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R116-R131-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R121.insert-a-freeze-with-an-empty-edit.report-frontier.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root2/audits/R121.insert-a-freeze-with-an-empty-edit.report-frontier.md)
