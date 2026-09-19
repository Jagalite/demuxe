<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# In-band video configuration changes with avc3, and qualified hev1

Current disposition: **pursue**. Historical execution reconciled; no new media run.

avc3 source-authored parameter change with fresh init and in-band headers renders both exact geometries, retained separate audio and EOF. This validates bounded AVC transition, not arbitrary no-init changes or HEVC hev1.

Correctness: **pending**. Performance: **pending**.

Fresh-init avc3 geometry transition and retained audio work to EOF. No arbitrary in-band no-init transition, hev1 execution, independent full output identity or incompatible-config negative; shared lane experiment is capability evidence.

Next: Add exact transition oracle and incompatible-header/seek cases for bounded avc3; qualify hev1 independently.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
