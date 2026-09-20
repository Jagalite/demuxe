<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Current research status

Derived from all 425 canonical item homes at 2026-09-20T01:08:49.564188+00:00. Run `python3 research/shared/tooling/refresh-research-status.py` to refresh. Item folders remain authoritative.

386 items have concluded all applicable research gates at their recorded scope; 33 await definitions and 6 have other incomplete gates. Concluded includes positive results, measured negatives and justified no-opportunity stops; it does not mean production-qualified.

425 items have post-migration updates; 0 retain imported decisions. Updates include new experiments and source/evidence reconciliation; this is not an experiment count.

| Stage | Passed | Failed | Blocked | Pending | Not applicable |
|---|---:|---:|---:|---:|---:|
| define | 392 | 0 | 33 | 0 | 0 |
| prepare | 296 | 0 | 39 | 0 | 90 |
| screen | 425 | 0 | 0 | 0 | 0 |
| correctness | 265 | 25 | 39 | 0 | 96 |
| performance | 90 | 110 | 39 | 0 | 186 |
| results | 425 | 0 | 0 | 0 | 0 |
| decision | 425 | 0 | 0 | 0 | 0 |

A passed screen or decision records a scoped finding, not production readiness. Passed correctness applies only to the stated run profile. Blocked prerequisites and failed outputs are distinct.

[Every ranked item](ITEMS.md) · [Process and stage meanings](PROCESS.md)

## Next high-priority incomplete gates

- Rank 12: [R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition](items/R295.preserve-hardware-overlay-eligibility-through-subtitle-and-ui-composition/README.md) — Use source-attributed physical surface telemetry for equivalent native video with and without required subtitle/UI compositions, including an intentional disqualifying composition control, then compare cost.
- Rank 25: [R101.keep-decoded-video-on-the-native-overlay-display-path](items/R101.keep-decoded-video-on-the-native-overlay-display-path/README.md) — Implement a source-frame/PTS to IOSurface attribution bridge and compare native video against equivalent canvas presentation on this actual display; validate promotion plus output before a cost comparison.
- Rank 88: [R169.make-custom-presentation-aware-of-display-cadence](items/R169.make-custom-presentation-aware-of-display-cadence/README.md) — Connect retained custom presenter source frame IDs and mpv masterclock to physical displayed-surface swaps; compare current deadline timer with a bounded display-opportunity scheduler. Native video events are not this owner.
- Rank 247: [R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility](items/R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility/README.md) — Supply a qualified adaptive transition owner and transactional selected-track boundary, then compare equivalent-role renditions under explicit user intent and full output constraints. A static initial-plan selector would be a separately scoped component, not fulfillment of this source-defined ABR hypothesis.
- Rank 311: [R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice](items/R134.sidecars-that-let-decoding-start-halfway-through-an-entropy-coded-slice/README.md) — Implement an explicit complete macroblock-boundary schema covering macroblock position, prediction/motion/reference/QP and neighbor caches, then continue complete slice syntax and reconstruct suffix pictures independently. Include non-RAP/reference dependencies, source change/cancel, and whole-job preparation/retention cost. Do not reuse the residual-only timing as a full-slice performance verdict.
- Rank 352: [R120.entropy-only-transcoding](items/R120.entropy-only-transcoding/README.md) — Implement or acquire a bounded pre-qmul syntax export plus inverse-binarization/slice writer for one restricted I/P corpus; verify original quantized levels, motion/prediction semantics and independent reconstructed frame hashes before cost. The R134 residual checkpoint component cannot serve as an entropy writer.

## Missing definitions

These remain unresolved identities, not experimental failures: [R076](items/R076.definition-not-recovered/README.md), [R077](items/R077.definition-not-recovered/README.md), [R078](items/R078.definition-not-recovered/README.md), [R079](items/R079.definition-not-recovered/README.md), [R080](items/R080.definition-not-recovered/README.md), [R081](items/R081.definition-not-recovered/README.md), [R247](items/R247.definition-not-recovered/README.md), [R248](items/R248.definition-not-recovered/README.md), [R249](items/R249.definition-not-recovered/README.md), [R250](items/R250.definition-not-recovered/README.md), [R251](items/R251.definition-not-recovered/README.md), [R252](items/R252.definition-not-recovered/README.md), [R253](items/R253.definition-not-recovered/README.md), [R254](items/R254.definition-not-recovered/README.md), [R255](items/R255.definition-not-recovered/README.md), [R256](items/R256.definition-not-recovered/README.md), [R257](items/R257.definition-not-recovered/README.md), [R258](items/R258.definition-not-recovered/README.md), [R259](items/R259.definition-not-recovered/README.md), [R260](items/R260.definition-not-recovered/README.md), [R276](items/R276.definition-not-recovered/README.md), [R277](items/R277.definition-not-recovered/README.md), [R278](items/R278.definition-not-recovered/README.md), [R279](items/R279.definition-not-recovered/README.md), [R280](items/R280.definition-not-recovered/README.md), [R281](items/R281.definition-not-recovered/README.md), [R282](items/R282.definition-not-recovered/README.md), [R283](items/R283.definition-not-recovered/README.md), [R284](items/R284.definition-not-recovered/README.md), [R285](items/R285.definition-not-recovered/README.md), [R286](items/R286.definition-not-recovered/README.md), [R287](items/R287.definition-not-recovered/README.md), [R288](items/R288.definition-not-recovered/README.md).
