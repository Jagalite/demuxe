<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# Out-of-order GOP decode and reverse presentation

Full identity: `R085.out-of-order-gop-decode-and-reverse-presentation`. Original rank: 198.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

The retained owner holds a bounded forward queue plus current frame, not independent GOP caches or reverse scheduling. Historical success used prepared independent GOP encodes and its concurrent decoder stress missed frames.

No matching candidate/reference/control execution for this exact gate. Single closed-GOP reverse owner with byte cap and frame-ID oracle before any concurrent decode scheduling.

Next action: Scope a single closed-GOP reverse buffer with an explicit byte cap and exact frame IDs before parallel decode; include a non-independent GOP rejection. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Single closed-GOP reverse owner with byte cap and frame-ID oracle before any concurrent decode scheduling. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Single closed-GOP reverse owner with byte cap and frame-ID oracle before any concurrent decode scheduling. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
