<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# MSE timestampOffset concatenation [report paragraph label]

Full identity: `R117.mse-timestampoffset-concatenation-report-paragraph-label.report-frontier`. Original rank: 140.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current SourceBuffers use segments mode and zero offset for one already biased source timeline. Explicit 0/2/4 concatenation needs asset/source mapping and boundary priming, not just timestampOffset changes.

No matching candidate/reference/control execution for this exact gate. Two-asset timeline and priming map; existing offset primitives do not prove nonzero-origin/B-frame concatenation.

Next action: Define one two-clip source-to-presentation map and compare explicit offset join to reference; a B-frame/nonzero-origin clip must retain internal timing and not double-apply bias. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Two-asset timeline and priming map; existing offset primitives do not prove nonzero-origin/B-frame concatenation. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Two-asset timeline and priming map; existing offset primitives do not prove nonzero-origin/B-frame concatenation. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
