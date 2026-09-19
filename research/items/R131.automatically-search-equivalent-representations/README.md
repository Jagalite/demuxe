<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Automatically search equivalent representations

Full identity: `R131.automatically-search-equivalent-representations`. Original rank: 182.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Maintained pipeline has guarded fixed transforms, not a vetted recipe-search engine with relation oracles and budgets. Automated equivalent representation search is a separate offline system, not automatic route admission.

No matching candidate/reference/control execution for this exact gate. Two explicitly vetted offline recipes with preconditions, relation oracle and bounded search budget.

Next action: Define a two-recipe offline search only with explicit preconditions and payload/timing/seek oracle; intentionally non-equivalent recipe must be rejected and no result enters automatic routing. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Two explicitly vetted offline recipes with preconditions, relation oracle and bounded search budget. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Two explicitly vetted offline recipes with preconditions, relation oracle and bounded search budget. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
