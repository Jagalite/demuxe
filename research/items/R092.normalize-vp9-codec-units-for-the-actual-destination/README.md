<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Normalize VP9 codec units for the actual destination

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Reconciled actual existing aggregate/split VP9 superframe test against unchanged worker and fixture identities: six hidden frames retained, 72 exact visible frames/timestamps, seek passes, missing-hidden oracle and cold-dependent-start fail. Destination-specific normalized framing works; generic split policy not justified.

Correctness: **passed**. Performance: **pending**.

Actual worker compares aggregate versus split VP9 units: 78 components including six hidden frames yield 72 exact visible pictures/PTS; key24 seek yields 48 exact pictures. Missing hidden frame corrupts oracle, cold dependent start rejects; all frames close and workers terminate.

Next: Retain destination-specific framing predicate; investigate benefit only against current aggregate baseline, not generic splitting.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
