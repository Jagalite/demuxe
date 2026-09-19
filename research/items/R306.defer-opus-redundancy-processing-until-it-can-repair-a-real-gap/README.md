<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Defer Opus redundancy processing until it can repair a real gap

Full identity: `R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap`. Reused R-numbers are separate mechanisms.

Prior imported decision: **STOP_PROFILE** (full-completion).

Maintained finite-source path reads complete authorized bytes and has no packet-loss concealment deadline or DRED model state. Normal packets make redundancy irrelevant for this exact-file profile; historical encoder build blocker is not asserted about current SDK.

Next action: Reopen only for an actual loss-repair use case plus mutually compatible DRED encoder/model/decoder; then one missing-packet/deadline/cancellation comparison without increasing candidate playout delay.

## Definition and contract

Type: Optional loss-recovery scheduling and capability experiment; not lossless source recovery. Parse and retain bounded DRED coverage information, but defer its expensive processing while ordinary packets cover the required output. When an actual gap remains repairable before its playback deadline, process a selected redundancy payload and synthesize only the needed interval. Expire unused work. The inspected libopus API explicitly provides opus_dred_parse(..., defer_processing=1), opus_dred_process, and DRED audio synthesis using an OpusDecoder state. Therefore deferred processing exists as a primitive; the experiment is a deadline- and coverage-aware browser/Wasm integration. [P1] DRED represents redundant acoustic information and requires integration with buffering/latency decisions. It is not recovery of the lost original packet bytes or guaranteed sample-exact reconstruction of the no-loss primary output. [P2]

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

## Current stage reconciliation

**stop_current_profile** — retained source decision, no new experiment. [Run](../../shared/runs/20260919T200619Z-source-stage-reconciliation/run.json).

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| screen | passed | Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness. |
| correctness | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| performance | not_applicable | This investigation ended at a source-only stop_current_profile decision. No candidate correctness or performance qualification is claimed; reopen under the item-specific condition. |
| results | passed | Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record. |
| decision | passed | Prior scoped decision reconciled into the current checklist: stop_current_profile |

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/proposals/Demuxe_R301_R306_Proposals.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R301-R306-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R301-R306-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/batch_g/audits/R306.defer-opus-redundancy-processing-until-it-can-repair-a-real-gap.md)
