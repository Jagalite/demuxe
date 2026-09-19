<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Recall stored AV1 pictures with coded display instructions

Full identity: `R106.recall-stored-av1-pictures-with-coded-display-instructions`. Original rank: 204.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

The decoder bridge consumes complete encoded units and does not author AV1 reference dictionaries. Historical alt-ref overlays prove decoder support but did not build the proposed dictionary and were larger than the control.

No matching candidate/reference/control execution for this exact gate. Legal AV1 showable-reference dictionary author and slot-lifetime oracle; generic altref decode is not this candidate.

Next action: Author one explicit A/B/A/C schedule with legal showable reference slots and compare to a normal reference-aware encode; reject missing/overwritten slots. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Legal AV1 showable-reference dictionary author and slot-lifetime oracle; generic altref decode is not this candidate. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Legal AV1 showable-reference dictionary author and slot-lifetime oracle; generic altref decode is not this candidate. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
