<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Current research status

Derived from all 436 canonical item homes at 2026-09-22T00:11:30.617445+00:00. Run `python3 research/shared/tooling/refresh-research-status.py` to refresh. Item folders remain authoritative.

404 items have concluded all applicable research gates at their recorded scope; 27 are administratively closed for permanently unavailable sources; 0 await definitions and 5 have other incomplete gates. Concluded includes positive results, measured negatives and justified no-opportunity stops; it does not mean production-qualified.

436 items have post-migration updates; 0 retain imported decisions. Updates include new experiments and source/evidence reconciliation; this is not an experiment count.

| Stage | Passed | Failed | Blocked | Pending | Not applicable |
|---|---:|---:|---:|---:|---:|
| define | 409 | 0 | 0 | 0 | 27 |
| prepare | 320 | 0 | 0 | 0 | 116 |
| screen | 436 | 0 | 0 | 0 | 0 |
| correctness | 280 | 28 | 0 | 5 | 123 |
| performance | 94 | 119 | 0 | 5 | 218 |
| results | 436 | 0 | 0 | 0 | 0 |
| decision | 436 | 0 | 0 | 0 | 0 |

A passed screen or decision records a scoped finding, not production readiness. Passed correctness applies only to the stated run profile. Blocked prerequisites and failed outputs are distinct.

[Every ranked item](ITEMS.md) · [Process and stage meanings](PROCESS.md)

## Research gates and whole-player follow-up

Whole-player qualification is a separate follow-up: earlier scoped research completion does not mean this measurement has been done. [Prioritized whole-player campaign](campaigns/whole-player-tier-classification.md).

| Whole-player status | Items |
|---|---:|
| benefit_gate_failed | 5 |
| correctness_failed | 2 |
| deferred_integration_not_prioritized | 1 |
| lifecycle_failed | 1 |
| measured_lab_benefit | 3 |
| measured_scoped_integration_tradeoffs | 5 |
| new_owner_pending | 5 |
| not_measured | 129 |
| not_required_by_current_scoped_decision | 278 |
| not_required_dropped | 2 |
| scoped_admission_cost_passed | 5 |

- Rank None: [chained-ogg-native-link-scheduling](items/chained-ogg-native-link-scheduling/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [native-audio-isolated-cycle-loop](items/native-audio-isolated-cycle-loop/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [native-audio-sample-window-scheduling](items/native-audio-sample-window-scheduling/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [native-fir-window-rendering](items/native-fir-window-rendering/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [sparse-wave-native-scheduling](items/sparse-wave-native-scheduling/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.

## Permanently closed source gaps

Closed at user direction, not tested or experimentally rejected: [R247](items/R247.definition-not-recovered/README.md), [R248](items/R248.definition-not-recovered/README.md), [R249](items/R249.definition-not-recovered/README.md), [R250](items/R250.definition-not-recovered/README.md), [R251](items/R251.definition-not-recovered/README.md), [R252](items/R252.definition-not-recovered/README.md), [R253](items/R253.definition-not-recovered/README.md), [R254](items/R254.definition-not-recovered/README.md), [R255](items/R255.definition-not-recovered/README.md), [R256](items/R256.definition-not-recovered/README.md), [R257](items/R257.definition-not-recovered/README.md), [R258](items/R258.definition-not-recovered/README.md), [R259](items/R259.definition-not-recovered/README.md), [R260](items/R260.definition-not-recovered/README.md), [R276](items/R276.definition-not-recovered/README.md), [R277](items/R277.definition-not-recovered/README.md), [R278](items/R278.definition-not-recovered/README.md), [R279](items/R279.definition-not-recovered/README.md), [R280](items/R280.definition-not-recovered/README.md), [R281](items/R281.definition-not-recovered/README.md), [R282](items/R282.definition-not-recovered/README.md), [R283](items/R283.definition-not-recovered/README.md), [R284](items/R284.definition-not-recovered/README.md), [R285](items/R285.definition-not-recovered/README.md), [R286](items/R286.definition-not-recovered/README.md), [R287](items/R287.definition-not-recovered/README.md), [R288](items/R288.definition-not-recovered/README.md).
