<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Coalesce range reads around useful media boundaries

Current disposition: **pursue**. Historical execution reconciled; no new media run.

Reconciled completed prior evidence: Actual remux read-window candidate reduced requests 73 to 24 while fetched bytes changed 4784128 to 5701632. Source identity replacement rejects, decoded-frame progress and distant seek pass, workers close. Worth a latency/abandoned-byte tradeoff study; this is not boundary-indexed coalescing or a CPU benchmark.

Correctness: **pending**. Performance: **pending**.

Adaptive read window reduces requests 73→24 while fetched bytes rise 4784128→5701632; real output progress, distant seek, source identity rejection and cleanup recorded. No full independent decoded-output comparison or abandoned-byte performance protocol.

Next: Verify output equivalence under cancellation/seek, then predeclare latency versus fetched/abandoned-byte tradeoff workload.

[Current record](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json) · [Acceptance review](../../shared/runs/20260919T201644Z-top100-31-65-reconciliation/analysis.md)
