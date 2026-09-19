<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Roll back speculative audio when a late packet arrives

Full identity: `R161.roll-back-speculative-audio-when-a-late-packet-arrives`. Original rank: 210.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

PCM ring publication has consumed/written counters but no provisional rollback window; browser decoder state is opaque. Snapshotting software Opus state also requires a matching copyable decoder ABI and a pre-commit output owner.

No matching candidate/reference/control execution for this exact gate. Copyable software Opus decoder state and provisional pre-commit output transaction; consumed samples cannot roll back.

Next action: Define one host-only late-packet transaction before PCM publication and prove restored suffix equality; explicitly reject rollback after consumed advances. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Copyable software Opus decoder state and provisional pre-commit output transaction; consumed samples cannot roll back. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Copyable software Opus decoder state and provisional pre-commit output transaction; consumed samples cannot roll back. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
