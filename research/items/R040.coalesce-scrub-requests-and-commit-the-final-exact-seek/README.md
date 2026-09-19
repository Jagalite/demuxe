<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Coalesce scrub requests and commit the final exact seek

Full identity: `R040.coalesce-scrub-requests-and-commit-the-final-exact-seek`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (top100).

Reconciled completed prior evidence: The maintained slider input updates UI only; change commits a single exact seek. The proposed intermediate preview coalescer has no repeated backend seek work to remove in this UI profile. Imported direct-local-04 maintained component scrub: beforeCommit is empty, sole committed call and final position are 7.3, passed true. Existing input/change separation leaves no repeated backend preview work in this profile.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

Follow-on interaction optimization · P2 · extends R03, R18 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. During an explicit UI drag, service at most one in-flight preview seek and replace its pending successor with the newest target. On release, perform the final precise seek and restore the captured play/pause intent. New question versus prior work. The earlier work shortened one buffered seek. This reduces obsolete repeated seek work during a burst, without changing ordinary programmatic exact-seek behavior. Source primitive. HTML defines media seeking and precise currentTime updates. The coalescer is an application policy and does not require fastSeek, which must not be assumed available. [S9]

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R040.coalesce-scrub-requests-and-commit-the-final-exact-seek.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R040.coalesce-scrub-requests-and-commit-the-final-exact-seek.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__direct-local-04__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__direct-local-04__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R040.coalesce-scrub-requests-and-commit-the-final-exact-seek.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R040.coalesce-scrub-requests-and-commit-the-final-exact-seek.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/reconciliation/local-identity.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/reconciliation/local-identity.json)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
