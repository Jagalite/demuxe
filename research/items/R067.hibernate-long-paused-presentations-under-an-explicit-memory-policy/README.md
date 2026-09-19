<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Hibernate long-paused presentations under an explicit memory policy

Full identity: `R067.hibernate-long-paused-presentations-under-an-explicit-memory-policy`. Original rank: 157.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Pause retains presentation; destroy releases it but no public idle hibernation policy/snapshot owner exists. Choosing when to discard live buffers is user-visible behavior, not a low-risk cleanup patch.

No matching candidate/reference/control execution for this exact gate. Opt-in idle policy, complete resumable snapshot and cancellation-safe restore owner.

Next action: Specify opt-in idle threshold and saved tracks/rate/gain/captions/authorization first; one pause-release-resume pilot must reject live/PiP and cancel restoration cleanly. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Opt-in idle policy, complete resumable snapshot and cancellation-safe restore owner. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Opt-in idle policy, complete resumable snapshot and cancellation-safe restore owner. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
