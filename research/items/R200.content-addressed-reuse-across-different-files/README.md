<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# content-addressed reuse across different files

Full identity: `R200.content-addressed-reuse-across-different-files`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (top100).

Two different owned file wrappers share exact coded packets/configuration through bounded content-addressed entries, retaining source timelines separately. Poisoned digest entry rejects, changed configuration misses, all references released. No workload benefit or cross-authority reuse claim.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

A 30-frame closed H.264 group was encoded once and stream-concatenated between different pre/post groups to create two different 90-frame files. The exact shared coded byte sequence appears at byte offsets 17051 and 1420. Frames 30–59 extracted from both complete files match the independent shared-group decode exactly and match each other exactly. The cache identity also changes when color metadata, dependency-boundary identity or decoder configuration changes. This supports caching verified immutable work for closed dependency groups across authorized files while keeping current-file timestamps/timeline semantics outside the cached object. It does not justify sharing mutable live decoder state.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R200.content-addressed-reuse-across-different-files.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R200.content-addressed-reuse-across-different-files.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R200.content-addressed-reuse-across-different-files.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_c/audits/R200.content-addressed-reuse-across-different-files.md)
- [results/top100/ownership/content-cache-result.json](../../../results/top100/ownership/content-cache-result.json)
