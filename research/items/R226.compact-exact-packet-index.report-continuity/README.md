<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# compact exact packet index

Full identity: `R226.compact-exact-packet-index.report-continuity`. Original rank: 185.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Current owner retains only bounded RAP times and live segment metadata, not a full six-scalar packet index. The reported 79.5% saving compares padded fields, not current MP4 tables; a persistent source-bound index owner is prerequisite.

No matching candidate/reference/control execution for this exact gate. Actual required packet-index scalar contract and owner; compare with current sparse/container index rather than padded synthetic fields.

Next action: Define the actual required seek fields and compare a bounded varint sidecar against existing container index plus sparse RAP records, including signed CTS and malformed deltas. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Actual required packet-index scalar contract and owner; compare with current sparse/container index rather than padded synthetic fields. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Actual required packet-index scalar contract and owner; compare with current sparse/container index rather than padded synthetic fields. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
