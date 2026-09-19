<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Promote useful startup work instead of reopening

Full identity: `R002.promote-useful-startup-work-instead-of-reopening`. Reused R-numbers are separate mechanisms.

Current imported decision: **ALREADY_IMPLEMENTED** (top100).

Reconciled completed prior evidence: The accepted prepared backend is retained and later play invokes the same session backend, followed by output verification. This directly addresses the retained-candidate portion; optional metadata deferral and cross-backend sharing are not established. Imported direct-local-04: retainedPreparation.surface and backend are true, direct lifecycle and missing-video rejection pass, workersAfter is zero. Confirms the narrow existing prepared-session promotion; no optional metadata or cross-backend sharing claim.

Next action: Trace the precise owner, generation, reset/flush/commit or allocation being changed. Reproduce the present behavior before removing any guard.

## Definition and contract

First environment: Demuxe source + browser. Dependencies: None; verify prerequisites locally. Status: Untested hypothesis. Proposed mechanism. Let one candidate move from prepared to presented to accepted without rebuilding the same media element or repeating demux startup. Gather only the facts needed for the current request before opening; defer optional metadata and fonts until needed. Source basis. Browser acceptance and Demuxe feature admission are distinct. Chromium direct demuxing constructs supported streams and can reject individual stream configurations, so a first video image alone cannot prove required audio. [C1, D1] First agent experiment. Trace open-to-first-frame as source validation, inspection, runtime loading, candidate preparation, play request and acceptance. Compare the current path with retained-candidate promotion on ordinary MP4, unknown-audio MKV, paused open and missing-audio controls.

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
| decision | passed | Historical decision imported verbatim: ALREADY_IMPLEMENTED. No integration or qualification inferred. |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R002.promote-useful-startup-work-instead-of-reopening.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R002.promote-useful-startup-work-instead-of-reopening.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__direct-local-04__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/reconciled__runs__direct-local-04__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Routing_Optimization_Ideas.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R002.promote-useful-startup-work-instead-of-reopening.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_b/audits/R002.promote-useful-startup-work-instead-of-reopening.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/reconciliation/local-identity.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/reconciliation/local-identity.json)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
