<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Current research status

Derived from all 439 canonical item homes at 2026-09-22T13:21:50.151753+00:00. Run `python3 research/shared/tooling/refresh-research-status.py` to refresh. Item folders remain authoritative.

406 items have concluded all applicable research gates at their recorded scope; 27 are administratively closed for permanently unavailable sources; 0 await definitions and 6 have other incomplete gates. Concluded includes positive results, measured negatives and justified no-opportunity stops; it does not mean production-qualified.

439 items have post-migration updates; 0 retain imported decisions. Updates include new experiments and source/evidence reconciliation; this is not an experiment count.

| Stage | Passed | Failed | Blocked | Pending | Not applicable |
|---|---:|---:|---:|---:|---:|
| define | 412 | 0 | 0 | 0 | 27 |
| prepare | 320 | 0 | 0 | 1 | 118 |
| screen | 439 | 0 | 0 | 0 | 0 |
| correctness | 280 | 28 | 0 | 6 | 125 |
| performance | 94 | 119 | 0 | 6 | 220 |
| results | 439 | 0 | 0 | 0 | 0 |
| decision | 439 | 0 | 0 | 0 | 0 |

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
| not_measured | 130 |
| not_required_by_current_scoped_decision | 280 |
| not_required_dropped | 2 |
| scoped_admission_cost_passed | 5 |

- Rank None: [chained-ogg-native-link-scheduling](items/chained-ogg-native-link-scheduling/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [explicit-media-repair-accounting](items/explicit-media-repair-accounting/README.md) — Start with existing AAC timestamp and AVC/HEVC DTS repairs: emit bounded reason/source-epoch/input-output identities with unchanged-media controls. Then inject junk, truncated init and inconsistent metadata; distinguish strict rejection, requested salvage and live concealment before broadening.
- Rank None: [native-audio-isolated-cycle-loop](items/native-audio-isolated-cycle-loop/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [native-audio-sample-window-scheduling](items/native-audio-sample-window-scheduling/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [native-fir-window-rendering](items/native-fir-window-rendering/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.
- Rank None: [sparse-wave-native-scheduling](items/sparse-wave-native-scheduling/README.md) — Define and implement the bounded native audio owner, source identity/cancellation, public timeline and memory contract; then execute exact output/lifecycle and predeclared full-cost comparison. Keep the imported controls.

## Evaluated scoped follow-ups

These proposal-level records are separate from parent-item gates. A completed parent profile does not close a later extension. Counts overlap canonical items and must not be added to the item total. This table covers the campaigns using explicit research_followups records; it is not a count of every historical deferred profile.

| Campaign | Outcome | Proposals |
|---|---|---:|
| [ecosystem-expansion-2026-09-21](campaigns/ecosystem-expansion-2026-09-21.md) | deferred_until_trigger | 7 |
| [ecosystem-expansion-2026-09-21](campaigns/ecosystem-expansion-2026-09-21.md) | followup_required | 5 |
| [ecosystem-expansion-2026-09-21](campaigns/ecosystem-expansion-2026-09-21.md) | no_new_work_current_scope | 8 |
| [ecosystem-expansion-2026-09-21](campaigns/ecosystem-expansion-2026-09-21.md) | qualification_followup | 1 |
| [ecosystem-expansion-2026-09-21](campaigns/ecosystem-expansion-2026-09-21.md) | regression_only | 1 |

Active next gates:

- **EB01** [R005.move-mse-ownership-off-the-window-thread](items/R005.move-mse-ownership-off-the-window-thread/README.md): Extend the maintained append owner with bounded intended/committed/failed/observed states only if used for recovery or exact residency reporting. Test synchronous and asynchronous failure, browser eviction, overlapping appends and source replacement in real MSE before measuring avoided work.
- **EB05** [R100.transfer-owned-packet-storage-into-webcodecs-chunks](items/R100.transfer-owned-packet-storage-into-webcodecs-chunks/README.md): For one concrete new adapter, declare accepted chunk/frame family, format, memory domain, maximum outstanding objects and terminal release. Reject incompatible families and run exhaustion/cancel/source-replacement plus output comparisons before any conversion-cost claim.
- **EB09** [R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata](items/R094.sample-accurate-audio-boundaries-using-mux-trim-and-preroll-metadata/README.md): Use independently decoded impulse/channel-marked AAC, MP3 and Opus fixtures at head/tail and seek boundaries; declare each trim owner and sample units. Require exact counts/positions before admitting any new wrapper or split route.
- **EB18** [R021.cache-subtitle-tiles-and-schedule-only-useful-redraws](items/R021.cache-subtitle-tiles-and-schedule-only-useful-redraws/README.md): Compare position-only versus content changes on a persistent moving-ASS workload, font replacement and resize; independently verify glyph/color/placement and measure full rendering/upload cost before adding a tile cache.
- **EB19** [explicit-media-repair-accounting](items/explicit-media-repair-accounting/README.md): Start with existing AAC timestamp and AVC/HEVC DTS repairs: emit bounded reason/source-epoch/input-output identities with unchanged-media controls. Then inject junk, truncated init and inconsistent metadata; distinguish strict rejection, requested salvage and live concealment before broadening.
- **EB20** [R192.identity-coded-witness-media](items/R192.identity-coded-witness-media/README.md): For EB01/EB09/EB14/EB19 experiments, fill the matrix with a second structural implementation or independently authored parser and a failing negative control. Record lineage, tolerance and exact scope; do not label Node contracts browser conformance.

## Permanently closed source gaps

Closed at user direction, not tested or experimentally rejected: [R247](items/R247.definition-not-recovered/README.md), [R248](items/R248.definition-not-recovered/README.md), [R249](items/R249.definition-not-recovered/README.md), [R250](items/R250.definition-not-recovered/README.md), [R251](items/R251.definition-not-recovered/README.md), [R252](items/R252.definition-not-recovered/README.md), [R253](items/R253.definition-not-recovered/README.md), [R254](items/R254.definition-not-recovered/README.md), [R255](items/R255.definition-not-recovered/README.md), [R256](items/R256.definition-not-recovered/README.md), [R257](items/R257.definition-not-recovered/README.md), [R258](items/R258.definition-not-recovered/README.md), [R259](items/R259.definition-not-recovered/README.md), [R260](items/R260.definition-not-recovered/README.md), [R276](items/R276.definition-not-recovered/README.md), [R277](items/R277.definition-not-recovered/README.md), [R278](items/R278.definition-not-recovered/README.md), [R279](items/R279.definition-not-recovered/README.md), [R280](items/R280.definition-not-recovered/README.md), [R281](items/R281.definition-not-recovered/README.md), [R282](items/R282.definition-not-recovered/README.md), [R283](items/R283.definition-not-recovered/README.md), [R284](items/R284.definition-not-recovered/README.md), [R285](items/R285.definition-not-recovered/README.md), [R286](items/R286.definition-not-recovered/README.md), [R287](items/R287.definition-not-recovered/README.md), [R288](items/R288.definition-not-recovered/README.md).
