<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Hibernate long-paused presentations under an explicit memory policy

Full identity: `R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

Pause retains presentation; destroy releases it but no public idle hibernation policy/snapshot owner exists. Choosing when to discard live buffers is user-visible behavior, not a low-risk cleanup patch.

Next action: Specify opt-in idle threshold and saved tracks/rate/gain/captions/authorization first; one pause-release-resume pilot must reject live/PiP and cancel restoration cleanly.

## Definition and contract

New lifecycle/memory tradeoff · P2 · Risk: High · PROPOSED / NOT TESTED First environment: Sandbox pause/release/restore pilot with capped resources and a scripted idle trigger. Related cards: R18, R27. Proposed mechanism. For a user-paused VOD player or many idle embedded players, keep a compact source/position/settings snapshot and a bounded still image, then retire expensive presentation resources after an explicitly configured idle policy. Recreate the same accepted plan on resume rather than keeping every decoder and MSE buffer alive indefinitely. What is new. Earlier caches retained prepared bytes or compiled code, and disabled-track work followed explicit track intent. This deliberately trades resume cost for lower idle resource retention; it is not a claim that pause or CSS hiding automatically frees decoders.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R58_R69_Research_Backlog.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R58-R69-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R58-R69-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_d/audits/R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy.md)
