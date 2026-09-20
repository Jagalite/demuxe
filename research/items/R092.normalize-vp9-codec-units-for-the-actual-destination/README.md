<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Normalize VP9 codec units for the actual destination

Full identity: `R092.normalize-vp9-codec-units-for-the-actual-destination`.

Current decision: **stop_current_profile** (opportunity-review-grounded-in-actual-route-evidence).

Actualmaintainedworker already accepts originalaggregateVP9 superframes, gives all72exactvisiblepictures andtimestamps, samekey24seek as split78componentvariant. Split adds6submissions and no admittedcapability for this destination. Requiredhiddenframes remainnecessary. This completes testedframing opportunity decision, not a generalizedspeed comparison.

Next action: Scopedresearch complete; reopen only for newdestination/configuration not covered by preservedactualroute.

## Stages

| Stage | Status | Basis |
|---|---|---|
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Historical fixture/runtime setup and actual outputs reconciled; latest declared artifact hashes match. No new setup or execution. |
| screen | passed | Historical outcome retained and individually reconciled. Actual worker compares aggregate versus split VP9 units: 78 components including six hidden frames yield 72 exact visible pictures/PTS; key24 seek yields 48 exact pictures. Missing hidden frame corrupts oracle, cold dependent start rejects; all frames close and workers terminate. |
| correctness | passed | Actual worker compares aggregate versus split VP9 units: 78 components including six hidden frames yield 72 exact visible pictures/PTS; key24 seek yields 48 exact pictures. Missing hidden frame corrupts oracle, cold dependent start rejects; all frames close and workers terminate. |
| performance | not_applicable | Actualmaintainedworker already accepts originalaggregateVP9 superframes, gives all72exactvisiblepictures andtimestamps, samekey24seek as split78componentvariant. Split adds6submissions and no admittedcapability for this destination. Requiredhiddenframes remainnecessary. This completes testedframing opportunity decision, not a generalizedspeed comparison. |
| results | passed | Actualmaintainedworker already accepts originalaggregateVP9 superframes, gives all72exactvisiblepictures andtimestamps, samekey24seek as split78componentvariant. Split adds6submissions and no admittedcapability for this destination. Requiredhiddenframes remainnecessary. This completes testedframing opportunity decision, not a generalizedspeed comparison. |
| decision | passed | Actualmaintainedworker already accepts originalaggregateVP9 superframes, gives all72exactvisiblepictures andtimestamps, samekey24seek as split78componentvariant. Split adds6submissions and no admittedcapability for this destination. Requiredhiddenframes remainnecessary. This completes testedframing opportunity decision, not a generalizedspeed comparison. |

[New run](../../shared/runs/20260919T214400Z-framing-opportunity-review/run.json) · [Evidence index](evidence/index.json) · [Complete history](history.jsonl) · [Item contract](item.json)
