<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# AAC selective channel-element reconstruction

Full identity: `R268.aac-selective-channel-element-reconstruction`. Original rank: 226.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

AAC initialization is parsed for muxing, but element-level SCE dependency admission/rewriting is not implemented. Whole audio-track selection is not independent channel-element selection; arbitrary CPE/SBR tools cannot inherit the six-SCE result.

No matching candidate/reference/control execution for this exact gate. Independent-SCE AAC fixture with exact selected-channel oracle and rejection of coupling/CPE/SBR/prediction before parser authoring.

Next action: Use one independent-SCE AAC fixture to select element4 and compare full source-channel PCM, rejecting CPE, SBR, prediction and coupling. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed fixture gate: Independent-SCE AAC fixture with exact selected-channel oracle and rejection of coupling/CPE/SBR/prediction before parser authoring. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Independent-SCE AAC fixture with exact selected-channel oracle and rejection of coupling/CPE/SBR/prediction before parser authoring. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
