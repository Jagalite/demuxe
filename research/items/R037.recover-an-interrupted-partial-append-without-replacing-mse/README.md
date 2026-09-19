<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recover an interrupted partial append without replacing MSE

Full identity: `R037.recover-an-interrupted-partial-append-without-replacing-mse`. Original rank: 147.

Current decision: **pursue** (reconciled from **PURSUE**). No new media execution.

Actual SourceBuffer abort after incomplete moof or sample allows complete target-RAP append and marked A/V through EOF without replacing MSE. Generation flag in harness is only a model, not validation of maintained stale-message ownership.

Actual SourceBuffer abort during moof or sample parsing permits complete RAP retry and A/V/EOF without replacement. Stale-generation flag is a model, not maintained message-ownership qualification.

Next action: Exercise maintained generation/cancel/source replacement before integration.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Actual SourceBuffer abort during moof or sample parsing permits complete RAP retry and A/V/EOF without replacement. Stale-generation flag is a model, not maintained message-ownership qualification. |
| performance | pending | No predeclared equivalent-work benchmark/cost analysis; counts and incidental timings cannot establish performance. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
