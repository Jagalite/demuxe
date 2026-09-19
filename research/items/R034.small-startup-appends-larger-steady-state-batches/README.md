<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Small startup appends, larger steady-state batches

Full identity: `R034.small-startup-appends-larger-steady-state-batches`. Reused R-numbers are separate mechanisms.

Current imported decision: **STOP_PROFILE** (full-completion).

Same supplied trace does not demonstrate a trickle-producer or batching-gap problem. This is scoped opportunity evidence, not a universal rejection. Actual local raw records and prior manifest identity were inspected in this v4 import.

Next action: Different producer/delivery conditions with demonstrable useful waiting.

## Definition and contract

Follow-on optimization · P1 · extends R04, R26 · PROPOSED — NOT TESTED IN THIS PASS Hypothesis. Use short bounded append batches until playable output exists, then aggregate transport chunks while a safe buffer remains. Return to smaller batches near starvation. Keep the encoded fragment bytes and timestamps unchanged. New question versus prior work. R04 compared fixed chunk sizes. This tests one controller that balances initial latency against steady updateend/event/allocation overhead. Source primitive. MSE supports incremental parsing and update-driven appends; the exact batch policy is a proposed algorithm, not a standardized optimization. [S3] Why testable here. Reuses the saved R04 bytes and window MSE harness; delivery delay is simulated in page code, not claimed as a real network benchmark.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R034.small-startup-appends-larger-steady-state-batches.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R034.small-startup-appends-larger-steady-state-batches.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/identity-check.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__caption-boundary-integrated__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__follow-up__opportunity-summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-authority-02__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-maintained-pairs-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__module-separated-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__result.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/evidence/imports/runs__r74-packed-cost-01__summary.json)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_Sandbox_Experiment_Addendum.md)
- [results/local-screening/README.md](../../../results/local-screening/README.md)
- [results/local-screening/follow-up.md](../../../results/local-screening/follow-up.md)
- [results/local-screening/full-queue-audit.md](../../../results/local-screening/full-queue-audit.md)
