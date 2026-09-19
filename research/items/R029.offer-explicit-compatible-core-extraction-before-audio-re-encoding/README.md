<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Offer explicit compatible-core extraction before audio re-encoding

Full identity: `R029.offer-explicit-compatible-core-extraction-before-audio-re-encoding`. Original rank: 194.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current finite plans preserve requested audio or explicitly allow lossy encoding; no separate permission represents discarding compatibility extensions. DTS core is not automatically browser-supported, so extraction alone does not establish a usable route.

No matching candidate/reference/control execution for this exact gate. True core-plus-extension source and an explicitly permitted, actually decodable compatibility-core destination.

Next action: Identify one true core-plus-extension fixture and explicitly permitted core output, then query/decode that exact core destination before adding a dca_core path. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: True core-plus-extension source and an explicitly permitted, actually decodable compatibility-core destination. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. True core-plus-extension source and an explicitly permitted, actually decodable compatibility-core destination. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
