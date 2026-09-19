<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Prioritize the track that limits usable playback

Full identity: `R039.prioritize-the-track-that-limits-usable-playback`. Original rank: 176.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Controller already gates on joint usable buffered coverage, but one sequential demux/mux call produces both tracks. No independent per-track fetch/producer credits exist to prioritize audio without extra scanning.

No matching candidate/reference/control execution for this exact gate. Independently retrievable selected-track producer topology and bounded fairness/temporary-gap policy.

Next action: Show source representation permits independent required-track retrieval before defining asymmetric scheduling; one delayed-audio trace must preserve fairness and distinguish true tail from temporary gap. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Independently retrievable selected-track producer topology and bounded fairness/temporary-gap policy. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Independently retrievable selected-track producer topology and bounded fairness/temporary-gap policy. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
