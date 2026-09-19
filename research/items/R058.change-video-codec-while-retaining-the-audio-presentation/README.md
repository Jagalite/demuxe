<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Change video codec while retaining the audio presentation

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Video configuration/resolution changes from160x96 to320x180 while the original audio SourceBuffer remains alive and audio signal continues. Same-codec geometry case only; cross-codec and gaplessness not asserted.

Correctness: **pending**. Performance: **pending**.

Video geometry changes 160x96→320x180 while original audio lane remains and tone continues to EOF. Same-codec case does not establish video codec change, sample gaplessness or independent transition timeline fidelity.

Next: Qualify actual codec transition, continuous sample timing, wrong-config control and affected seek/cancel ownership.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
