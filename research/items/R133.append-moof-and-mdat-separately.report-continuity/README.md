<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# append moof and mdat separately

Full identity: `R133.append-moof-and-mdat-separately.report-continuity`. Original rank: 127.

Current decision: **pursue** (reconciled from **PURSUE**). No new media execution.

Separate moof/mdat append reaches identical marked A/V through EOF; increases append count3to4 in this fixture. API feasibility supports localized copy-versus-event-overhead comparison, not measured CPU savings.

Separate moof/mdat append and whole baseline each reach marked A/V/EOF with cleanup; append count3to4, not a CPU win.

Next action: Compare equivalent owned-buffer copy/event costs only after a real copy bottleneck is identified.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | passed | Read and pinned historical fixture/output/control evidence; no rerun. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | passed | Separate moof/mdat append and whole baseline each reach marked A/V/EOF with cleanup; append count3to4, not a CPU win. |
| performance | pending | No predeclared equivalent-work benchmark/cost analysis; counts and incidental timings cannot establish performance. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
