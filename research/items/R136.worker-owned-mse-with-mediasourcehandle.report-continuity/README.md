<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# worker-owned MSE with MediaSourceHandle

Full identity: `R136.worker-owned-mse-with-mediasourcehandle.report-continuity`. Reused R-numbers are separate mechanisms.

Current imported decision: **PURSUE** (full-completion).

Actual worker-owned MediaSourceHandle plays marked A/V, seeks, reaches EOF and terminates cleanly; malformed input rejects. Shared run withR005, independently applicable to this report identity.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

The environment reports MediaSource.canConstructInDedicatedWorker === true. A worker successfully created a MediaSource and transferred its handle to the main thread. However, attaching that handle to a video on the opaque about:blank/set_content lab page produced media error 4 and the worker never received sourceopen. A follow-on attempt to establish an intercepted secure HTTPS document was blocked by the environment's navigation administrator. No browser restriction was bypassed. Verdict: BLOCKED, not failed. The worker parser/append path was never reached, so this run says nothing negative about worker-owned MSE itself.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/prerequisites/result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R132-R145-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R136.worker-owned-mse-with-mediasourcehandle.report-continuity.md)
- [results/full-completion/continuity/worker-result.json](../../../results/full-completion/continuity/worker-result.json)
