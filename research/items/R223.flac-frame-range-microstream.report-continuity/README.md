<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# FLAC frame-range microstream

Full identity: `R223.flac-frame-range-microstream.report-continuity`. Original rank: 222.

Current decision: **blocked** (reconciled from **DEFER_SETUP**). No new media execution.

Historical defer retained for the exact complete-frame identity gate. Exact complete-frame suffix writer and duration/checksum contract. R270 now supplies header/CRC/oracle tooling, but rewrites headers and does not prove original complete-frame identity for this item.

No matching candidate/reference/control execution for this exact gate. Exact complete-frame suffix writer and duration/checksum contract. R270 now supplies header/CRC/oracle tooling, but rewrites headers and does not prove original complete-frame identity for this item.

Next action: Extract complete frames from one FLAC suffix, fix total samples/checksum policy and compare exact suffix samples plus reported duration. Compare the smallest bounded component with its independent output oracle; production API absence alone does not preclude the experiment.

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
| define | passed | Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run. |
| prepare | blocked | Unperformed setup gate: Exact complete-frame suffix writer and duration/checksum contract. R270 now supplies header/CRC/oracle tooling, but rewrites headers and does not prove original complete-frame identity for this item. |
| screen | passed | Existing source/prerequisite/experimental screen reviewed; scientific verdict preserved at its exact scope. |
| correctness | blocked | No matching candidate/reference/control execution for this exact gate. Exact complete-frame suffix writer and duration/checksum contract. R270 now supplies header/CRC/oracle tooling, but rewrites headers and does not prove original complete-frame identity for this item. |
| performance | blocked | No relevant candidate correctness pass; no performance inference from source reports or existing-owner counters. |
| results | passed | Referenced evidence read and byte-pinned; historical claims remain imported, no new experiment inferred. |
| decision | passed | Normalized disposition preserves prior scoped scientific verdict and names the next missing gate. |

[Reconciliation](../../shared/runs/20260919T202508Z-r101-250-stage-reconciliation/run.json) · [Current metadata](item.json) · [History](history.jsonl) · [Evidence index](evidence/index.json)

Setup/fixture/environment blocks are not experimental failures. Integration and release qualification remain separate; historical definitions and bytes are retained.
