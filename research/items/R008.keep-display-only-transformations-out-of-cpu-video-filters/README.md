<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Keep display-only transformations out of CPU video filters

Full identity: `R008.keep-display-only-transformations-out-of-cpu-video-filters`. Original rank: 234.

Current decision: **pursue** (reconciled from **PURSUE**). No new media execution.

Existing retained presenter produces exact independently indexed 90-degree pixel rotation; unchanged orientation fails the pixel oracle. Pursue a distinct explicitly display-only operation API. Software filter semantics, subtitle/pointer geometry, HDR and arbitrary transforms are not qualified.

Existing retained presenter90degree rotation matches independently indexed pixels; unchanged orientation fails the oracle.

Next action: Add explicit display-operation contract and qualify subtitle/pointer geometry, color/HDR and context loss before integration.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Existing retained presenter90degree rotation matches independently indexed pixels; unchanged orientation fails the oracle. |
| performance | pending | No predeclared equivalent-work benchmark/cost analysis; counts and incidental timings cannot establish performance. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
