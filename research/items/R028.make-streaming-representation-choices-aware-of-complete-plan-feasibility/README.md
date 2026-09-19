<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Make streaming representation choices aware of complete-plan feasibility

Full identity: `R028.make-streaming-representation-choices-aware-of-complete-plan-feasibility`. Original rank: 247.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

chooseVariant uses explicit representation or bandwidth while planAdmission separately enforces complete playback requirements. There is a genuine compatibility-policy separation, but current bounded manifest selection is not a qualified dynamic ABR owner; per-track invalidation requires a larger streaming transition contract.

No matching candidate/reference/control execution for this exact gate. Two-rendition complete-plan selection audit and scoped per-track transition contract respecting explicit representation intent.

Next action: Audit one two-rendition manifest selection against complete-plan facts before introducing runtime switching; retain explicit representation intent. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Two-rendition complete-plan selection audit and scoped per-track transition contract respecting explicit representation intent. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Two-rendition complete-plan selection audit and scoped per-track transition contract respecting explicit representation intent. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
