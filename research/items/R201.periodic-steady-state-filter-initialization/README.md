<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# periodic steady-state filter initialization

Full identity: `R201.periodic-steady-state-filter-initialization`. Reused R-numbers are separate mechanisms.

Current imported decision: **DEFER_SETUP** (full-completion).

The inspected audio output and native adaptation do not expose a requested periodic IIR loop recurrence or complete filter state. Solving the reported scalar fixed point cannot initialize arbitrary nonlinear/time-varying software filter graphs.

Next action: Select one explicit stable linear periodic filter and expose its full state/coefficient/rounding contract; compare first-loop output with converged reference and reject unstable or changing coefficients.

## Definition and contract

For the scalar stable IIR model y[n]=a·y[n−1]+(1−a)·x[n], one loop is represented as s_next=M·s+b. The prototype solves the fixed point and starts the first requested loop there. Across a=0.8, 0.98, 0.999, 0.9999, end-state closure is within 2.220e-16; maximum output difference from a 5,000–20,000-loop converged reference is 2.220e-16. This is strong evidence for periodic-state initialization on a controlled stable linear filter, not a general solution for nonlinear or time-varying filter graphs.

Output contract: Exact PCM/encoded output where claimed; otherwise declared numeric tolerance against a stronger independent reference, including delay, tails and state.

Primary metric: Complete specified audio operation, output sample count/phase and practical CPU/memory or repeated-query cost.

Adverse control: Extrema, invalid precision, changed predictor/phase/history or a nonlinear stage must invalidate assumptions. No covert resampling/downmix/quality change.

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

- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R201.periodic-steady-state-filter-initialization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/catalogue/cards/R201.periodic-steady-state-filter-initialization.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/sources/reports/R193-R202-report.md)
- [results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R201.periodic-steady-state-filter-initialization.md](../../../results/full-catalogue-v4/Demuxe_All_Items_Screening_v4/work/root3/audits/R201.periodic-steady-state-filter-initialization.md)
